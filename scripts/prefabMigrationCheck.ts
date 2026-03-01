import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { preflightMigratablePrefabBlueprint } from "../src/services/prefabMigration";

type CliOptions = {
    files: string[];
    allowEmpty: boolean;
    allowMigrationNeeded: boolean;
};

function toRelativePath(filePath: string): string {
    return path.relative(globalThis.process.cwd(), filePath) || filePath;
}

function parseArgs(argv: string[]): CliOptions {
    const options: CliOptions = {
        files: [],
        allowEmpty: false,
        allowMigrationNeeded: false,
    };

    for (const token of argv) {
        if (token === "--allow-empty") {
            options.allowEmpty = true;
            continue;
        }

        if (token === "--allow-migration-needed") {
            options.allowMigrationNeeded = true;
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
                "No prefab blueprint JSON files found; skipping migration check (--allow-empty).",
            );
            return;
        }

        console.error(
            "No prefab blueprint JSON files found. Provide file paths or add files under src/prefabs/blueprints or public/prefabs/blueprints.",
        );
        globalThis.process.exitCode = 1;
        return;
    }

    let failed = 0;
    let migrationNeeded = 0;

    for (const filePath of files) {
        let raw = "";
        try {
            raw = await readFile(filePath, "utf-8");
        } catch {
            failed += 1;
            console.error(`✗ ${toRelativePath(filePath)}`);
            console.error("  - $: Failed to read JSON file.");
            continue;
        }

        let parsed: unknown;
        try {
            parsed = JSON.parse(raw);
        } catch {
            failed += 1;
            console.error(`✗ ${toRelativePath(filePath)}`);
            console.error("  - $: Invalid JSON.");
            continue;
        }

        const preflight = preflightMigratablePrefabBlueprint(parsed);
        if (!preflight.ok) {
            failed += 1;
            console.error(`✗ ${toRelativePath(filePath)}`);
            console.error(`  - $: ${preflight.message ?? "Invalid payload."}`);
            continue;
        }

        if (preflight.requiresMigration) {
            migrationNeeded += 1;
            if (options.allowMigrationNeeded) {
                console.log(`~ ${toRelativePath(filePath)} (migration needed)`);
            } else {
                failed += 1;
                console.error(`✗ ${toRelativePath(filePath)}`);
                console.error(
                    "  - $: Prefab blueprint requires migration; update file to current schema before release.",
                );
            }
            continue;
        }

        console.log(`✓ ${toRelativePath(filePath)}`);
    }

    if (failed > 0) {
        console.error(
            `Prefab migration check failed (${failed}/${files.length} files).`,
        );
        globalThis.process.exitCode = 1;
        return;
    }

    console.log(
        `Prefab migration check passed (${files.length}/${files.length} files).${
            migrationNeeded > 0
                ? ` Migration-needed files: ${migrationNeeded}.`
                : ""
        }`,
    );
}

main().catch((error) => {
    const message =
        error instanceof Error ? error.message : "Unknown migration failure.";
    console.error(`Prefab migration check failed: ${message}`);
    globalThis.process.exitCode = 1;
});
