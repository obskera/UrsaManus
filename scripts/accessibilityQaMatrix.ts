import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
    evaluateAccessibilityQaMatrix,
    parseAccessibilityQaMatrixReport,
    type AccessibilityQaMatrixEvaluation,
} from "../src/services/accessibilityQaMatrix";

type CliOptions = {
    files: string[];
    allowEmpty: boolean;
    json: boolean;
    pretty: boolean;
};

function parseArgs(argv: string[]): CliOptions {
    const options: CliOptions = {
        files: [],
        allowEmpty: false,
        json: false,
        pretty: false,
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

        options.files.push(path.resolve(token));
    }

    return options;
}

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

async function resolveTargetFiles(options: CliOptions): Promise<string[]> {
    if (options.files.length > 0) {
        return options.files;
    }

    const cwd = globalThis.process.cwd();
    const defaultRoots = [
        path.join(cwd, "content", "accessibility", "qa-matrix"),
        path.join(cwd, "data", "accessibility", "qa-matrix"),
        path.join(cwd, "public", "content", "accessibility", "qa-matrix"),
    ];

    const discovered = new Set<string>();
    for (const rootPath of defaultRoots) {
        const files = await collectJsonFiles(rootPath);
        files.forEach((filePath) => discovered.add(filePath));
    }

    return Array.from(discovered).sort((left, right) =>
        left.localeCompare(right),
    );
}

async function main(): Promise<void> {
    const options = parseArgs(globalThis.process.argv.slice(2));
    const targetFiles = await resolveTargetFiles(options);

    if (targetFiles.length === 0) {
        if (options.allowEmpty) {
            console.log(
                "No accessibility QA matrix report files found; skipping checks (--allow-empty).",
            );
            return;
        }

        console.error(
            "No accessibility QA matrix report JSON files found. Provide files or add reports under content/accessibility/qa-matrix, data/accessibility/qa-matrix, or public/content/accessibility/qa-matrix.",
        );
        globalThis.process.exitCode = 1;
        return;
    }

    let failed = 0;
    const evaluations: Array<{
        filePath: string;
        report: AccessibilityQaMatrixEvaluation;
    }> = [];

    for (const filePath of targetFiles) {
        let raw: string;
        try {
            raw = await readFile(filePath, "utf-8");
        } catch (error) {
            failed += 1;
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to read accessibility QA matrix report.";
            console.error(`✗ ${toRelativePath(filePath)}: ${message}`);
            continue;
        }

        const parsedReport = parseAccessibilityQaMatrixReport(raw);
        if (!parsedReport.ok) {
            failed += 1;
            console.error(
                `✗ ${toRelativePath(filePath)} (${parsedReport.issue.path}): ${parsedReport.issue.message}`,
            );
            continue;
        }

        const evaluation = evaluateAccessibilityQaMatrix(parsedReport.payload);
        evaluations.push({
            filePath,
            report: evaluation,
        });

        if (!evaluation.ok) {
            failed += 1;
            console.error(`✗ ${toRelativePath(filePath)}`);
            evaluation.issues.forEach((issue) => {
                console.error(`  - ${issue.path}: ${issue.message}`);
            });
            continue;
        }

        if (!options.json) {
            console.log(
                `✓ ${toRelativePath(filePath)} (areas=${evaluation.summary.reportedAreaCount}, checks=${evaluation.summary.reportedCheckCount}, pass=${evaluation.summary.passCount})`,
            );
        }
    }

    if (options.json) {
        console.log(
            JSON.stringify(
                {
                    reports: evaluations.map((entry) => ({
                        filePath: toRelativePath(entry.filePath),
                        report: entry.report,
                    })),
                },
                null,
                options.pretty ? 2 : 0,
            ),
        );
    }

    if (failed > 0) {
        console.error(
            `Accessibility QA matrix validation failed for ${failed}/${targetFiles.length} report file(s).`,
        );
        globalThis.process.exitCode = 1;
        return;
    }

    console.log(
        `Accessibility QA matrix validation passed (${targetFiles.length}/${targetFiles.length} report file(s)).`,
    );
}

main().catch((error) => {
    const message =
        error instanceof Error
            ? error.message
            : "Unknown accessibility QA matrix failure.";
    console.error(`Accessibility QA matrix CLI failed: ${message}`);
    globalThis.process.exitCode = 1;
});
