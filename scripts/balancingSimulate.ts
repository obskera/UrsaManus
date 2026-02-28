import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
    createBalancingSimulatorService,
    type BalancingSimulationBatchReport,
} from "../src/services/balancingSimulator";

type CliOptions = {
    files: string[];
    allowEmpty: boolean;
    json: boolean;
    pretty: boolean;
    seed: number;
};

function normalizeSeed(value: number | undefined): number {
    if (!Number.isFinite(value)) {
        return 1337;
    }

    return Math.abs(Math.floor(value ?? 1337));
}

function createSeededRng(seedInput: number): () => number {
    let state = normalizeSeed(seedInput) || 1337;

    return () => {
        state = (state * 1_664_525 + 1_013_904_223) >>> 0;
        return state / 0x1_0000_0000;
    };
}

function parseArgs(argv: string[]): CliOptions {
    const options: CliOptions = {
        files: [],
        allowEmpty: false,
        json: false,
        pretty: false,
        seed: 1337,
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

        if (token === "--seed") {
            const next = argv[index + 1];
            index += 1;
            options.seed = normalizeSeed(
                next ? Number.parseInt(next, 10) : NaN,
            );
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
        path.join(cwd, "content", "balancing"),
        path.join(cwd, "data", "balancing"),
        path.join(cwd, "public", "content", "balancing"),
    ];

    const files = await Promise.all(
        defaultRoots.map((root) => collectJsonFiles(root)),
    );
    return files.flat().sort((left, right) => left.localeCompare(right));
}

function toRelativePath(filePath: string): string {
    return path.relative(globalThis.process.cwd(), filePath) || filePath;
}

function formatCurrencyTotals(currencyTotals: Record<string, number>): string {
    const entries = Object.entries(currencyTotals);
    if (entries.length === 0) {
        return "none";
    }

    return entries
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([currency, amount]) => `${currency}:${amount}`)
        .join(", ");
}

function printHumanSummary(
    filePath: string,
    report: BalancingSimulationBatchReport,
) {
    console.log(`✓ ${toRelativePath(filePath)}`);
    console.log(
        `  combat: scenarios=${report.combat.scenarioCount}, defeated=${report.combat.defeatedCount}, totalDamage=${report.combat.totalDamage}, avgDamagePerScenario=${report.combat.averageDamagePerScenario}`,
    );
    console.log(
        `  economy: scenarios=${report.economy.scenarioCount}, totalQuantity=${report.economy.totalQuantityResolved}, sell=${report.economy.totalSellValue}, buy=${report.economy.totalBuyValue}, currencies=${formatCurrencyTotals(report.economy.currencyTotals)}`,
    );
}

async function main(): Promise<void> {
    const options = parseArgs(globalThis.process.argv.slice(2));
    const files = await resolveTargetFiles(options);

    if (files.length === 0) {
        if (options.allowEmpty) {
            console.log(
                "No balancing preset JSON files found; skipping simulator run (--allow-empty).",
            );
            return;
        }

        console.error(
            "No balancing preset JSON files found. Provide file paths or add files under content/balancing, data/balancing, or public/content/balancing.",
        );
        globalThis.process.exitCode = 1;
        return;
    }

    let failed = 0;
    const reportsByFile: Array<{
        filePath: string;
        report: BalancingSimulationBatchReport;
    }> = [];

    for (const filePath of files) {
        let raw: string;
        try {
            raw = await readFile(filePath, "utf-8");
        } catch (error) {
            failed += 1;
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to read preset file.";
            console.error(`✗ ${toRelativePath(filePath)}: ${message}`);
            continue;
        }

        const simulator = createBalancingSimulatorService({
            rng: createSeededRng(options.seed),
        });
        const parsed = simulator.parsePresetPayload(raw);
        if (!parsed.ok) {
            failed += 1;
            console.error(
                `✗ ${toRelativePath(filePath)}: ${parsed.validation.message ?? "Invalid preset payload."}`,
            );
            continue;
        }

        const report = simulator.runBatch(parsed.payload);
        if (!report) {
            failed += 1;
            console.error(
                `✗ ${toRelativePath(filePath)}: failed to run balancing simulation batch.`,
            );
            continue;
        }

        reportsByFile.push({ filePath, report });
        if (!options.json) {
            printHumanSummary(filePath, report);
        }
    }

    if (options.json) {
        const payload = reportsByFile.map((entry) => ({
            filePath: toRelativePath(entry.filePath),
            report: entry.report,
        }));
        console.log(JSON.stringify(payload, null, options.pretty ? 2 : 0));
    }

    if (failed > 0) {
        console.error(
            `Balancing simulation run failed for ${failed}/${files.length} preset file(s).`,
        );
        globalThis.process.exitCode = 1;
        return;
    }

    console.log(
        `Balancing simulation run completed (${reportsByFile.length}/${files.length} preset file(s)).`,
    );
}

main().catch((error) => {
    const message =
        error instanceof Error
            ? error.message
            : "Unknown balancing simulator failure.";
    console.error(`Balancing simulator CLI failed: ${message}`);
    globalThis.process.exitCode = 1;
});
