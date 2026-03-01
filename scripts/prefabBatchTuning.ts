import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
    createPrefabBatchTuningService,
    parsePrefabBlueprintCatalogForBatchTuning,
    type PrefabBatchTuningPresetMode,
} from "../src/services/prefabBatchTuning";
import { exportPrefabBlueprint } from "../src/services/prefabCore";

type CliOptions = {
    files: string[];
    mode: PrefabBatchTuningPresetMode;
    apply: boolean;
    allowEmpty: boolean;
    json: boolean;
    pretty: boolean;
    targetBlueprintIds: string[];
    snapshotDir: string;
    scalars: {
        hp?: number;
        damage?: number;
        speed?: number;
        reward?: number;
    };
};

function normalizeId(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

function toRelativePath(filePath: string): string {
    return path.relative(globalThis.process.cwd(), filePath) || filePath;
}

function toMode(value: string | undefined): PrefabBatchTuningPresetMode {
    const normalized = normalizeId(value).toLowerCase();
    if (
        normalized === "easy" ||
        normalized === "normal" ||
        normalized === "hard" ||
        normalized === "nightmare"
    ) {
        return normalized;
    }

    return "normal";
}

function parseNumber(value: string | undefined): number | undefined {
    if (!value) {
        return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function parseArgs(argv: string[]): CliOptions {
    const options: CliOptions = {
        files: [],
        mode: "normal",
        apply: false,
        allowEmpty: false,
        json: false,
        pretty: false,
        targetBlueprintIds: [],
        snapshotDir: path.join(
            globalThis.process.cwd(),
            "tmp",
            "prefab-tuning-snapshots",
        ),
        scalars: {},
    };

    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (token === "--apply") {
            options.apply = true;
            continue;
        }

        if (token === "--allow-empty") {
            options.allowEmpty = true;
            continue;
        }

        if (token === "--json") {
            options.json = true;
            continue;
        }

        if (token === "--pretty") {
            options.pretty = true;
            continue;
        }

        if (token === "--mode") {
            options.mode = toMode(argv[index + 1]);
            index += 1;
            continue;
        }

        if (token === "--target") {
            const next = normalizeId(argv[index + 1]);
            if (next) {
                options.targetBlueprintIds.push(next);
            }
            index += 1;
            continue;
        }

        if (token === "--snapshot-dir") {
            const next = normalizeId(argv[index + 1]);
            if (next) {
                options.snapshotDir = path.resolve(next);
            }
            index += 1;
            continue;
        }

        if (token === "--hp") {
            options.scalars.hp = parseNumber(argv[index + 1]);
            index += 1;
            continue;
        }

        if (token === "--damage") {
            options.scalars.damage = parseNumber(argv[index + 1]);
            index += 1;
            continue;
        }

        if (token === "--speed") {
            options.scalars.speed = parseNumber(argv[index + 1]);
            index += 1;
            continue;
        }

        if (token === "--reward") {
            options.scalars.reward = parseNumber(argv[index + 1]);
            index += 1;
            continue;
        }

        options.files.push(path.resolve(token));
    }

    return options;
}

async function collectJsonFiles(rootPath: string): Promise<string[]> {
    let entries;
    try {
        entries = await readdir(rootPath, { withFileTypes: true });
    } catch {
        return [];
    }

    const files: string[] = [];
    for (const entry of entries) {
        const absolutePath = path.join(rootPath, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await collectJsonFiles(absolutePath)));
            continue;
        }

        if (entry.isFile() && entry.name.toLowerCase().endsWith(".json")) {
            files.push(absolutePath);
        }
    }

    return files;
}

async function resolveTargetFiles(options: CliOptions): Promise<string[]> {
    if (options.files.length > 0) {
        return options.files;
    }

    const cwd = globalThis.process.cwd();
    const roots = [
        path.join(cwd, "src", "prefabs", "blueprints"),
        path.join(cwd, "public", "prefabs", "blueprints"),
    ];

    const discovered = new Set<string>();
    for (const rootPath of roots) {
        const files = await collectJsonFiles(rootPath);
        for (const filePath of files) {
            discovered.add(filePath);
        }
    }

    return Array.from(discovered).sort((left, right) =>
        left.localeCompare(right),
    );
}

async function main(): Promise<void> {
    const options = parseArgs(globalThis.process.argv.slice(2));
    const files = await resolveTargetFiles(options);

    if (files.length <= 0) {
        if (options.allowEmpty) {
            console.log(
                "No prefab blueprint JSON files found; skipping batch tuning (--allow-empty).",
            );
            return;
        }

        console.error(
            "No prefab blueprint JSON files found. Provide file paths or add files under src/prefabs/blueprints or public/prefabs/blueprints.",
        );
        globalThis.process.exitCode = 1;
        return;
    }

    const entries = await Promise.all(
        files.map(async (filePath) => ({
            filePath,
            raw: await readFile(filePath, "utf-8"),
        })),
    );

    const parsedCatalog = parsePrefabBlueprintCatalogForBatchTuning({
        entries,
    });
    if (!parsedCatalog.ok) {
        for (const issue of parsedCatalog.issues) {
            console.error(
                `✗ ${toRelativePath(issue.filePath)}: ${issue.message}`,
            );
        }
        globalThis.process.exitCode = 1;
        return;
    }

    const fileByBlueprintId = new Map<string, string>();
    for (let index = 0; index < parsedCatalog.blueprints.length; index += 1) {
        fileByBlueprintId.set(parsedCatalog.blueprints[index].id, files[index]);
    }

    const service = createPrefabBatchTuningService({
        initialBlueprints: parsedCatalog.blueprints,
    });

    const preview = service.previewOverlay({
        mode: options.mode,
        scalars: options.scalars,
        targetBlueprintIds: options.targetBlueprintIds,
    });

    if (!options.json) {
        console.log(
            `Overlay preview (${options.mode}) => ${preview.summary.blueprintsChanged}/${preview.summary.blueprintsScanned} blueprints changed, ${preview.summary.scalarChanges} scalar patches.`,
        );
    }

    if (options.apply) {
        const applied = service.applyOverlay({
            mode: options.mode,
            scalars: options.scalars,
            targetBlueprintIds: options.targetBlueprintIds,
        });

        const snapshotFolder = path.join(
            options.snapshotDir,
            applied.snapshot.snapshotId,
        );
        await mkdir(snapshotFolder, { recursive: true });

        const changedIdSet = new Set(applied.preview.changedBlueprintIds);
        for (const original of applied.snapshot.blueprints) {
            const sourceFilePath = fileByBlueprintId.get(original.id);
            if (!sourceFilePath) {
                continue;
            }

            if (!changedIdSet.has(original.id)) {
                continue;
            }

            const snapshotFilePath = path.join(
                snapshotFolder,
                path.basename(sourceFilePath),
            );
            await writeFile(
                snapshotFilePath,
                exportPrefabBlueprint(original, { pretty: true }),
                "utf-8",
            );
        }

        for (const blueprint of applied.blueprints) {
            const sourceFilePath = fileByBlueprintId.get(blueprint.id);
            if (!sourceFilePath) {
                continue;
            }

            if (!changedIdSet.has(blueprint.id)) {
                continue;
            }

            await writeFile(
                sourceFilePath,
                exportPrefabBlueprint(blueprint, { pretty: true }),
                "utf-8",
            );
        }

        if (!options.json) {
            console.log(
                `Applied overlay and wrote rollback snapshot: ${toRelativePath(snapshotFolder)}`,
            );
        }
    }

    if (options.json) {
        console.log(
            JSON.stringify(
                {
                    mode: options.mode,
                    apply: options.apply,
                    summary: preview.summary,
                    changedBlueprintIds: preview.changedBlueprintIds,
                    changes: preview.changes,
                },
                null,
                options.pretty ? 2 : 0,
            ),
        );
    }
}

main().catch((error) => {
    const message =
        error instanceof Error
            ? error.message
            : "Unknown prefab tuning failure.";
    console.error(`Prefab batch tuning failed: ${message}`);
    globalThis.process.exitCode = 1;
});
