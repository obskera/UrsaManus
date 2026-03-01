import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

type VerificationCommandStatus = "pass" | "fail" | "skipped";

type VerificationCommandResult = {
    name: string;
    status: VerificationCommandStatus;
    durationMs: number;
    outputExcerpt: string;
};

type PrefabAiVerificationReport = {
    artifactVersion: "um-prefab-ai-verification-v1";
    prefabId: string;
    generatedBy: string;
    commands: VerificationCommandResult[];
    rejectReasons: string[];
    reviewer: string;
    timestamp: string;
};

type CliOptions = {
    prefabId: string;
    generatedBy: string;
    reviewer: string;
    outPath: string;
};

const MAX_OUTPUT_EXCERPT = 1400;

function parseArgs(argv: string[]): CliOptions {
    const options: CliOptions = {
        prefabId: "prefab-catalog",
        generatedBy: "ai",
        reviewer: "ci-bot",
        outPath: path.resolve("tmp/cert/prefab-ai-verification-report.json"),
    };

    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (token === "--prefab-id") {
            const value = argv[index + 1]?.trim();
            if (value) {
                options.prefabId = value;
            }
            index += 1;
            continue;
        }

        if (token === "--generated-by") {
            const value = argv[index + 1]?.trim();
            if (value) {
                options.generatedBy = value;
            }
            index += 1;
            continue;
        }

        if (token === "--reviewer") {
            const value = argv[index + 1]?.trim();
            if (value) {
                options.reviewer = value;
            }
            index += 1;
            continue;
        }

        if (token === "--out") {
            const value = argv[index + 1]?.trim();
            if (value) {
                options.outPath = path.resolve(value);
            }
            index += 1;
        }
    }

    return options;
}

function toOutputExcerpt(raw: string): string {
    const normalized = raw.trim();
    if (!normalized) {
        return "";
    }

    if (normalized.length <= MAX_OUTPUT_EXCERPT) {
        return normalized;
    }

    return `${normalized.slice(0, MAX_OUTPUT_EXCERPT)}...`;
}

function runNpmScript(scriptName: string): VerificationCommandResult {
    const startedAt = Date.now();
    const result = spawnSync("npm", ["run", scriptName], {
        encoding: "utf-8",
    });

    const durationMs = Date.now() - startedAt;
    const stdout = result.stdout ?? "";
    const stderr = result.stderr ?? "";
    const outputExcerpt = toOutputExcerpt(`${stdout}\n${stderr}`);

    return {
        name: scriptName,
        status: result.status === 0 ? "pass" : "fail",
        durationMs,
        outputExcerpt,
    };
}

function deriveRejectReasons(commands: VerificationCommandResult[]): string[] {
    const reasons = new Set<string>();

    for (const command of commands) {
        if (command.status !== "fail") {
            continue;
        }

        const output = command.outputExcerpt.toLowerCase();

        if (output.includes("missing dependency")) {
            reasons.add("Missing dependency modules.");
        }

        if (output.includes("conflict") || output.includes("module-conflict")) {
            reasons.add("Conflicting modules attached together.");
        }

        if (
            output.includes("unknown module") ||
            output.includes("missing-module")
        ) {
            reasons.add("Unknown or misspelled module IDs.");
        }

        if (
            output.includes("requires migration") ||
            output.includes("invalid prefab blueprint version") ||
            output.includes("schema")
        ) {
            reasons.add(
                "Schema version drift without migration justification.",
            );
        }

        if (
            output.includes("invalid json") ||
            output.includes("validation failed") ||
            output.includes("failed")
        ) {
            reasons.add("Validation or migration command failures.");
        }

        if (output.includes("contract") || output.includes("test files")) {
            reasons.add("Contract test regressions.");
        }
    }

    return Array.from(reasons).sort((left, right) => left.localeCompare(right));
}

async function writeReport(
    report: PrefabAiVerificationReport,
    outPath: string,
): Promise<void> {
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, JSON.stringify(report, null, 2), "utf8");
}

async function main(): Promise<void> {
    const options = parseArgs(process.argv.slice(2));
    const commandSequence = [
        "prefab:validate",
        "prefab:migration:check",
        "quality:prefab:contracts",
    ];

    const results: VerificationCommandResult[] = [];
    let shouldSkipRemaining = false;

    for (const scriptName of commandSequence) {
        if (shouldSkipRemaining) {
            results.push({
                name: scriptName,
                status: "skipped",
                durationMs: 0,
                outputExcerpt: "Skipped because a previous command failed.",
            });
            continue;
        }

        const result = runNpmScript(scriptName);
        results.push(result);
        if (result.status === "fail") {
            shouldSkipRemaining = true;
        }
    }

    const rejectReasons = deriveRejectReasons(results);
    const report: PrefabAiVerificationReport = {
        artifactVersion: "um-prefab-ai-verification-v1",
        prefabId: options.prefabId,
        generatedBy: options.generatedBy,
        commands: results,
        rejectReasons,
        reviewer: options.reviewer,
        timestamp: new Date().toISOString(),
    };

    await writeReport(report, options.outPath);

    console.log(JSON.stringify(report, null, 2));
    console.log(`Wrote prefab AI verification artifact: ${options.outPath}`);

    const failed = results.some((entry) => entry.status === "fail");
    if (failed) {
        process.exitCode = 1;
    }
}

main().catch((error) => {
    const message =
        error instanceof Error
            ? error.message
            : "Unknown prefab AI verification failure.";
    console.error(`Prefab AI verification failed: ${message}`);
    process.exitCode = 1;
});
