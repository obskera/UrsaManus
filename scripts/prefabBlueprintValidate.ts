import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
    validatePrefabBlueprintCatalog,
    type PrefabBlueprintCatalogValidationEntry,
} from "../src/services/prefabBlueprintValidation";
import { createDefaultPrefabRegistry } from "../src/services/prefabRegistryDefaults";

type CliOptions = {
    files: string[];
    allowEmpty: boolean;
    json: boolean;
    pretty: boolean;
    requireKnownModules: boolean;
};

function toRelativePath(filePath: string): string {
    return path.relative(globalThis.process.cwd(), filePath) || filePath;
}

function parseArgs(argv: string[]): CliOptions {
    const options: CliOptions = {
        files: [],
        allowEmpty: false,
        json: false,
        pretty: false,
        requireKnownModules: true,
    };

    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
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

        if (token === "--skip-known-module-check") {
            options.requireKnownModules = false;
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

async function readEntries(
    files: string[],
): Promise<PrefabBlueprintCatalogValidationEntry[]> {
    const entries: PrefabBlueprintCatalogValidationEntry[] = [];
    for (const filePath of files) {
        try {
            const raw = await readFile(filePath, "utf-8");
            entries.push({
                filePath,
                raw,
            });
        } catch {
            entries.push({
                filePath,
                raw: "",
            });
        }
    }

    return entries;
}

async function main(): Promise<void> {
    const options = parseArgs(globalThis.process.argv.slice(2));
    const targetFiles = await resolveTargetFiles(options);

    if (targetFiles.length <= 0) {
        if (options.allowEmpty) {
            console.log(
                "No prefab blueprint JSON files found; skipping validation (--allow-empty).",
            );
            return;
        }

        console.error(
            "No prefab blueprint JSON files found. Provide file paths or add files under src/prefabs/blueprints or public/prefabs/blueprints.",
        );
        globalThis.process.exitCode = 1;
        return;
    }

    const registry = createDefaultPrefabRegistry();
    const entries = await readEntries(targetFiles);
    const report = validatePrefabBlueprintCatalog(entries, {
        registry,
        requireKnownModules: options.requireKnownModules,
    });

    if (options.json) {
        const payload = {
            ok: report.ok,
            filesChecked: report.filesChecked,
            filesFailed: report.filesFailed,
            results: report.results.map((entry) => ({
                file: toRelativePath(entry.filePath),
                ok: entry.result.ok,
                issues: entry.result.issues,
            })),
        };
        console.log(JSON.stringify(payload, null, options.pretty ? 2 : 0));
    } else {
        for (const entry of report.results) {
            if (entry.result.ok) {
                console.log(`✓ ${toRelativePath(entry.filePath)}`);
                continue;
            }

            console.error(`✗ ${toRelativePath(entry.filePath)}`);
            for (const issue of entry.result.issues) {
                console.error(`  - ${issue.path}: ${issue.message}`);
            }
        }

        if (report.ok) {
            console.log(
                `Prefab blueprint validation passed (${report.filesChecked}/${report.filesChecked} files).`,
            );
        } else {
            console.error(
                `Prefab blueprint validation failed (${report.filesFailed}/${report.filesChecked} files).`,
            );
        }
    }

    if (!report.ok) {
        globalThis.process.exitCode = 1;
    }
}

main().catch((error) => {
    const message =
        error instanceof Error
            ? error.message
            : "Unknown prefab validation failure.";
    console.error(`Prefab blueprint validation CLI failed: ${message}`);
    globalThis.process.exitCode = 1;
});
