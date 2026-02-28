import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
    inferContentDomainFromPath,
    validateAuthoredContent,
    type AuthoredContentDomain,
} from "../src/services/contentValidation";

type CliOptions = {
    domain?: AuthoredContentDomain;
    allowEmpty: boolean;
    files: string[];
};

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

function parseArgs(argv: string[]): CliOptions {
    const options: CliOptions = {
        allowEmpty: false,
        files: [],
    };

    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (token === "--domain") {
            const next = argv[index + 1];
            index += 1;
            if (
                next === "dialogue" ||
                next === "quest" ||
                next === "loot" ||
                next === "placement"
            ) {
                options.domain = next;
            }
            continue;
        }

        if (token === "--allow-empty") {
            options.allowEmpty = true;
            continue;
        }

        options.files.push(path.resolve(token));
    }

    return options;
}

async function resolveTargetFiles(options: CliOptions): Promise<string[]> {
    if (options.files.length > 0) {
        return options.files;
    }

    const cwd = globalThis.process.cwd();
    const defaultRoots = [
        path.join(cwd, "content"),
        path.join(cwd, "data"),
        path.join(cwd, "public", "content"),
    ];

    const discovered = new Set<string>();
    for (const rootPath of defaultRoots) {
        const files = await collectJsonFiles(rootPath);
        for (const file of files) {
            discovered.add(file);
        }
    }

    return Array.from(discovered).sort((left, right) =>
        left.localeCompare(right),
    );
}

async function main(): Promise<void> {
    const argv = globalThis.process.argv.slice(2);
    const options = parseArgs(argv);
    const targetFiles = await resolveTargetFiles(options);

    if (targetFiles.length === 0) {
        if (options.allowEmpty) {
            const domainLabel = options.domain
                ? ` for domain "${options.domain}"`
                : "";
            console.log(
                `No JSON files found${domainLabel}; skipping validation (--allow-empty).`,
            );
            return;
        }

        console.error(
            "No JSON files found. Provide file paths or add content under content/, data/, or public/content/.",
        );
        globalThis.process.exitCode = 1;
        return;
    }

    let filesFailed = 0;
    let filesChecked = 0;

    for (const filePath of targetFiles) {
        const domain = options.domain ?? inferContentDomainFromPath(filePath);
        if (!domain) {
            continue;
        }

        let raw: string;
        try {
            raw = await readFile(filePath, "utf-8");
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Failed to read file.";
            filesChecked += 1;
            filesFailed += 1;
            console.error(`✗ ${toRelativePath(filePath)} (${domain})`);
            console.error(`  - $: ${message}`);
            continue;
        }

        const report = validateAuthoredContent(domain, raw);

        filesChecked += 1;
        if (report.ok) {
            console.log(`✓ ${toRelativePath(filePath)} (${domain})`);
            continue;
        }

        filesFailed += 1;
        console.error(`✗ ${toRelativePath(filePath)} (${domain})`);
        report.issues.forEach((issue) => {
            console.error(`  - ${issue.path}: ${issue.message}`);
        });
    }

    if (filesChecked === 0) {
        if (options.allowEmpty) {
            const domainLabel = options.domain
                ? ` for domain "${options.domain}"`
                : "";
            console.log(
                `No matching content domains found${domainLabel}; skipping validation (--allow-empty).`,
            );
            return;
        }

        console.error(
            "No matching content domains found. Use --domain or include domain keywords in JSON filenames.",
        );
        globalThis.process.exitCode = 1;
        return;
    }

    if (filesFailed > 0) {
        console.error(
            `Validation failed (${filesFailed}/${filesChecked} files).`,
        );
        globalThis.process.exitCode = 1;
        return;
    }

    console.log(`Validation passed (${filesChecked}/${filesChecked} files).`);
}

main().catch((error) => {
    const message =
        error instanceof Error ? error.message : "Unknown validation failure.";
    console.error(`Content validation CLI failed: ${message}`);
    globalThis.process.exitCode = 1;
});
