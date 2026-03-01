import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
    parsePrefabEncounterBundle,
    simulatePrefabEncounterBundle,
} from "../src/services/prefabEncounterBundles";

function toRelativePath(filePath: string): string {
    return path.relative(globalThis.process.cwd(), filePath) || filePath;
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

async function resolveTargetFiles(): Promise<string[]> {
    const cwd = globalThis.process.cwd();
    const roots = [
        path.join(cwd, "src", "prefabs", "encounters"),
        path.join(cwd, "public", "prefabs", "encounters"),
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
    const files = await resolveTargetFiles();
    if (files.length <= 0) {
        console.error(
            "No encounter bundle JSON files found under src/prefabs/encounters or public/prefabs/encounters.",
        );
        globalThis.process.exitCode = 1;
        return;
    }

    let failed = 0;
    for (const filePath of files) {
        const raw = await readFile(filePath, "utf-8");
        const parsed = parsePrefabEncounterBundle(raw);
        if (!parsed.ok) {
            failed += 1;
            console.error(`✗ ${toRelativePath(filePath)}`);
            console.error(`  - ${parsed.message}`);
            continue;
        }

        const report = simulatePrefabEncounterBundle(parsed.value);
        if (!report.ok) {
            failed += 1;
            console.error(`✗ ${toRelativePath(filePath)}`);
            for (const issue of report.issues) {
                console.error(`  - ${issue}`);
            }
            continue;
        }

        console.log(
            `✓ ${toRelativePath(filePath)} (${report.entitiesSimulated} entities, ${report.moduleAttachments} attachments)`,
        );
    }

    if (failed > 0) {
        console.error(
            `Prefab encounter smoke failed (${failed}/${files.length} files).`,
        );
        globalThis.process.exitCode = 1;
        return;
    }

    console.log(
        `Prefab encounter smoke passed (${files.length}/${files.length} files).`,
    );
}

main().catch((error) => {
    const message =
        error instanceof Error
            ? error.message
            : "Unknown encounter smoke failure.";
    console.error(`Prefab encounter smoke failed: ${message}`);
    globalThis.process.exitCode = 1;
});
