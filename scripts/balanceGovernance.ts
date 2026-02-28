import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
    evaluateBalancingGovernance,
    parseBalancingGovernancePolicy,
    parseBalancingGovernanceReport,
    type BalancingGovernanceEvaluation,
} from "../src/services/balancingGovernance";

type CliOptions = {
    files: string[];
    policyFile?: string;
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

        if (token === "--policy") {
            const next = argv[index + 1];
            index += 1;
            if (next) {
                options.policyFile = path.resolve(next);
            }
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
    const defaultRoots = [
        path.join(cwd, "content", "balancing", "reports"),
        path.join(cwd, "data", "balancing", "reports"),
        path.join(cwd, "public", "content", "balancing", "reports"),
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

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function resolvePolicyFile(options: CliOptions): Promise<string | null> {
    if (options.policyFile) {
        return options.policyFile;
    }

    const cwd = globalThis.process.cwd();
    const candidates = [
        path.join(cwd, "content", "balancing", "governance.policy.json"),
        path.join(cwd, "data", "balancing", "governance.policy.json"),
        path.join(
            cwd,
            "public",
            "content",
            "balancing",
            "governance.policy.json",
        ),
    ];

    for (const candidate of candidates) {
        if (await fileExists(candidate)) {
            return candidate;
        }
    }

    return null;
}

function toRelativePath(filePath: string): string {
    return path.relative(globalThis.process.cwd(), filePath) || filePath;
}

async function main(): Promise<void> {
    const options = parseArgs(globalThis.process.argv.slice(2));
    const targetFiles = await resolveTargetFiles(options);

    if (targetFiles.length === 0) {
        if (options.allowEmpty) {
            console.log(
                "No balancing governance report files found; skipping governance checks (--allow-empty).",
            );
            return;
        }

        console.error(
            "No balancing governance report JSON files found. Provide files or add reports under content/balancing/reports, data/balancing/reports, or public/content/balancing/reports.",
        );
        globalThis.process.exitCode = 1;
        return;
    }

    const policyFile = await resolvePolicyFile(options);
    if (!policyFile) {
        console.error(
            "No governance policy file found. Provide --policy or add governance.policy.json under content/balancing, data/balancing, or public/content/balancing.",
        );
        globalThis.process.exitCode = 1;
        return;
    }

    let policyRaw: string;
    try {
        policyRaw = await readFile(policyFile, "utf-8");
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Failed to read policy.";
        console.error(`Failed to read governance policy: ${message}`);
        globalThis.process.exitCode = 1;
        return;
    }

    const parsedPolicy = parseBalancingGovernancePolicy(policyRaw);
    if (!parsedPolicy.ok) {
        console.error(
            `Governance policy invalid (${parsedPolicy.issue.path}): ${parsedPolicy.issue.message}`,
        );
        globalThis.process.exitCode = 1;
        return;
    }

    let failed = 0;
    const evaluations: Array<{
        filePath: string;
        report: BalancingGovernanceEvaluation;
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
                    : "Failed to read governance report.";
            console.error(`✗ ${toRelativePath(filePath)}: ${message}`);
            continue;
        }

        const parsedReport = parseBalancingGovernanceReport(raw);
        if (!parsedReport.ok) {
            failed += 1;
            console.error(
                `✗ ${toRelativePath(filePath)} (${parsedReport.issue.path}): ${parsedReport.issue.message}`,
            );
            continue;
        }

        const evaluation = evaluateBalancingGovernance(
            parsedPolicy.payload,
            parsedReport.payload,
        );
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
                `✓ ${toRelativePath(filePath)} (benchmarks=${evaluation.summary.benchmarkCount}, checks=${evaluation.summary.metricCheckCount}, signoffs=${evaluation.summary.signoffCount}, major=${evaluation.summary.majorUpdate})`,
            );
        }
    }

    if (options.json) {
        console.log(
            JSON.stringify(
                {
                    policyFile: toRelativePath(policyFile),
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
            `Balancing governance validation failed for ${failed}/${targetFiles.length} report file(s).`,
        );
        globalThis.process.exitCode = 1;
        return;
    }

    console.log(
        `Balancing governance validation passed (${targetFiles.length}/${targetFiles.length} report file(s)).`,
    );
}

main().catch((error) => {
    const message =
        error instanceof Error
            ? error.message
            : "Unknown balancing governance failure.";
    console.error(`Balancing governance CLI failed: ${message}`);
    globalThis.process.exitCode = 1;
});
