import {
    createPrefabSimulationSandboxService,
    type PrefabSandboxBatchReport,
} from "../src/services/prefabSimulationSandbox";

type CliOptions = {
    seed: number;
    json: boolean;
    pretty: boolean;
};

function parseArgs(argv: string[]): CliOptions {
    const options: CliOptions = {
        seed: 1337,
        json: false,
        pretty: false,
    };

    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (token === "--json") {
            options.json = true;
            continue;
        }

        if (token === "--pretty") {
            options.pretty = true;
            continue;
        }

        if (token === "--seed") {
            const next = Number(argv[index + 1]);
            if (Number.isFinite(next)) {
                options.seed = Math.max(0, Math.floor(next));
            }
            index += 1;
        }
    }

    return options;
}

function printHumanSummary(report: PrefabSandboxBatchReport): void {
    for (const scenario of report.reports) {
        if (scenario.ok) {
            console.log(`✓ ${scenario.scenarioId} (${scenario.scenarioType})`);
            continue;
        }

        console.error(`✗ ${scenario.scenarioId} (${scenario.scenarioType})`);
        for (const issue of scenario.issues) {
            console.error(`  - ${issue}`);
        }
    }

    if (report.ok) {
        console.log(
            `Prefab simulation sandbox passed (${report.scenariosRun}/${report.scenariosRun} scenarios, seed=${report.seed}).`,
        );
        return;
    }

    console.error(
        `Prefab simulation sandbox failed (${report.scenariosFailed}/${report.scenariosRun} scenarios, seed=${report.seed}).`,
    );
}

async function main(): Promise<void> {
    const options = parseArgs(globalThis.process.argv.slice(2));
    const sandbox = createPrefabSimulationSandboxService({
        seed: options.seed,
    });

    const report = sandbox.runDefaultScenarios();
    if (options.json) {
        console.log(
            sandbox.exportBatchSnapshot(report, {
                pretty: options.pretty,
            }),
        );
    } else {
        printHumanSummary(report);
    }

    if (!report.ok) {
        globalThis.process.exitCode = 1;
    }
}

main().catch((error) => {
    const message =
        error instanceof Error
            ? error.message
            : "Unknown prefab simulation sandbox failure.";
    console.error(`Prefab simulation sandbox failed: ${message}`);
    globalThis.process.exitCode = 1;
});
