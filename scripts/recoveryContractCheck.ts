import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { getRecoveryContractViolations } from "../src/services/recoveryContractPolicy";

type CliOptions = {
    files: string[];
};

function toRelativePath(filePath: string): string {
    return path.relative(globalThis.process.cwd(), filePath) || filePath;
}

function parseArgs(argv: string[]): CliOptions {
    const files = argv.map((item) => path.resolve(item));
    return { files };
}

async function collectExampleFiles(rootPath: string): Promise<string[]> {
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
            files.push(...(await collectExampleFiles(absolutePath)));
            continue;
        }

        if (entry.isFile() && entry.name.endsWith(".tsx")) {
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
    const defaultRoot = path.join(cwd, "src", "components", "examples");
    const discovered = await collectExampleFiles(defaultRoot);

    return discovered.sort((left, right) => left.localeCompare(right));
}

async function main(): Promise<void> {
    const options = parseArgs(globalThis.process.argv.slice(2));
    const targetFiles = await resolveTargetFiles(options);

    if (targetFiles.length === 0) {
        console.log("No example files found for recovery contract check.");
        return;
    }

    let failed = 0;
    for (const filePath of targetFiles) {
        const raw = await readFile(filePath, "utf8");
        const violations = getRecoveryContractViolations(raw);

        if (violations.length === 0) {
            continue;
        }

        failed += 1;
        console.error(`✗ ${toRelativePath(filePath)}`);
        for (const violation of violations) {
            console.error(`  - ${violation.message}`);
        }
    }

    if (failed > 0) {
        console.error(
            `Recovery contract check failed (${failed}/${targetFiles.length} files).`,
        );
        globalThis.process.exitCode = 1;
        return;
    }

    console.log(
        `Recovery contract check passed (${targetFiles.length}/${targetFiles.length} files).`,
    );
}

main().catch((error) => {
    const message =
        error instanceof Error
            ? error.message
            : "Unknown recovery contract check failure.";
    console.error(`Recovery contract check failed: ${message}`);
    globalThis.process.exitCode = 1;
});
