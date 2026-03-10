import {
    createPrefabAttachmentRuntime,
    type PrefabAttachRequest,
    type PrefabRegistry,
} from "@/services/prefabCore";
import {
    createPrefabDiagnosticsService,
    type PrefabHealthReport,
} from "@/services/prefabDiagnostics";
import { migratePrefabBlueprint } from "@/services/prefabMigration";
import { createDefaultPrefabRegistry } from "@/services/prefabRegistryDefaults";

export const PREFAB_SIMULATION_SANDBOX_VERSION =
    "um-prefab-simulation-sandbox-v1";

export type PrefabSandboxScenarioType =
    | "attach-detach-loop"
    | "contract-stress"
    | "migration-edge";

export type PrefabAttachDetachLoopScenario = {
    type: "attach-detach-loop";
    id: string;
    domain: "player" | "enemy" | "object";
    moduleIds: string[];
    loops: number;
    updateStepsPerLoop?: number;
};

export type PrefabContractStressScenario = {
    type: "contract-stress";
    id: string;
    domain: "player" | "enemy" | "object";
    moduleIds: string[];
    expectedIssueCodes?: string[];
};

export type PrefabMigrationEdgeScenario = {
    type: "migration-edge";
    id: string;
    payload: unknown;
    expectOk?: boolean;
    expectMigration?: boolean;
};

export type PrefabSandboxScenario =
    | PrefabAttachDetachLoopScenario
    | PrefabContractStressScenario
    | PrefabMigrationEdgeScenario;

export type PrefabSandboxScenarioReport = {
    scenarioId: string;
    scenarioType: PrefabSandboxScenarioType;
    ok: boolean;
    issues: string[];
    summary: Record<string, number | string | boolean>;
    health: PrefabHealthReport;
};

export type PrefabSandboxBatchReport = {
    version: typeof PREFAB_SIMULATION_SANDBOX_VERSION;
    seed: number;
    generatedAtMs: number;
    ok: boolean;
    scenariosRun: number;
    scenariosFailed: number;
    reports: PrefabSandboxScenarioReport[];
};

export type PrefabSimulationSandboxService = {
    runScenario: (
        scenario: PrefabSandboxScenario,
    ) => PrefabSandboxScenarioReport;
    runScenarios: (
        scenarios: PrefabSandboxScenario[],
    ) => PrefabSandboxBatchReport;
    runDefaultScenarios: () => PrefabSandboxBatchReport;
    exportBatchSnapshot: (
        report: PrefabSandboxBatchReport,
        options?: { pretty?: boolean },
    ) => string;
};

function normalizeId(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

function normalizeInteger(value: unknown, fallback: number): number {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return fallback;
    }

    return Math.max(0, Math.floor(value));
}

function createSeededRng(seedInput: number): () => number {
    let seed = Math.abs(Math.floor(seedInput)) || 1;
    return () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
    };
}

function toRequests(moduleIds: string[]): PrefabAttachRequest[] {
    return Array.from(
        new Set(moduleIds.map((entry) => normalizeId(entry)).filter(Boolean)),
    )
        .sort((left, right) => left.localeCompare(right))
        .map((moduleId) => ({ moduleId }));
}

function toDefaultScenarios(seed: number): PrefabSandboxScenario[] {
    const rng = createSeededRng(seed);
    const weightedEnemyLoops = 2 + Math.floor(rng() * 3);

    return [
        {
            type: "attach-detach-loop",
            id: "enemy-loop-starter",
            domain: "enemy",
            moduleIds: ["enemy.core", "enemy.pathing", "enemy.melee-ability"],
            loops: weightedEnemyLoops,
            updateStepsPerLoop: 3,
        },
        {
            type: "contract-stress",
            id: "stress-conflict",
            domain: "enemy",
            moduleIds: [
                "enemy.core",
                "enemy.melee-ability",
                "enemy.ranged-ability",
            ],
            expectedIssueCodes: ["module-conflict"],
        },
        {
            type: "contract-stress",
            id: "stress-missing-dependency",
            domain: "enemy",
            moduleIds: ["enemy.melee-ability"],
            expectedIssueCodes: ["missing-dependency"],
        },
        {
            type: "migration-edge",
            id: "migration-legacy-v0",
            payload: {
                id: "sandbox-legacy",
                domain: "enemy",
                modules: [{ id: "enemy.core", config: { health: 10 } }],
            },
            expectOk: true,
            expectMigration: true,
        },
        {
            type: "migration-edge",
            id: "migration-invalid",
            payload: {
                version: "um-prefab-blueprint-v1",
                id: "",
                domain: "enemy",
                modules: [],
            },
            expectOk: false,
            expectMigration: false,
        },
    ];
}

export function createPrefabSimulationSandboxService(options?: {
    registry?: PrefabRegistry;
    now?: () => number;
    seed?: number;
}): PrefabSimulationSandboxService {
    const registry = options?.registry ?? createDefaultPrefabRegistry();
    const now = options?.now ?? (() => Date.now());
    const seed = normalizeInteger(options?.seed, 1337) || 1337;

    const runScenario: PrefabSimulationSandboxService["runScenario"] = (
        scenario,
    ) => {
        const diagnostics = createPrefabDiagnosticsService({ now });
        const issues: string[] = [];

        if (scenario.type === "attach-detach-loop") {
            const runtime = createPrefabAttachmentRuntime({ registry });
            const loops = Math.max(1, normalizeInteger(scenario.loops, 1));
            const updateSteps = Math.max(
                1,
                normalizeInteger(scenario.updateStepsPerLoop, 1),
            );
            const requests = toRequests(scenario.moduleIds);
            let updatesSimulated = 0;

            for (let loopIndex = 0; loopIndex < loops; loopIndex += 1) {
                const entityId = `${scenario.id}:entity-${loopIndex + 1}`;
                const attachReport = runtime.attachPrefabModules(
                    entityId,
                    requests,
                    {},
                );
                diagnostics.recordAttachmentReport({
                    blueprintId: scenario.id,
                    report: attachReport,
                });

                for (const failed of attachReport.failed) {
                    issues.push(
                        `${entityId}: attach failed (${failed.moduleId}) ${failed.error}`,
                    );
                }

                for (
                    let stepIndex = 0;
                    stepIndex < updateSteps;
                    stepIndex += 1
                ) {
                    runtime.getAttachedModuleIds(entityId);
                    updatesSimulated += 1;
                }

                const detachReport = runtime.detachPrefabModules(
                    entityId,
                    undefined,
                    {},
                );
                diagnostics.recordAttachmentReport({
                    blueprintId: scenario.id,
                    report: detachReport,
                });

                for (const failed of detachReport.failed) {
                    issues.push(
                        `${entityId}: detach failed (${failed.moduleId}) ${failed.error}`,
                    );
                }
            }

            const health = diagnostics.getHealthReport();
            const summary: Record<string, number | string | boolean> = {
                loops,
                updateStepsPerLoop: updateSteps,
                updatesSimulated,
                modulesRequested: requests.length,
            };
            return {
                scenarioId: scenario.id,
                scenarioType: scenario.type,
                ok: issues.length <= 0,
                issues,
                summary,
                health,
            };
        }

        if (scenario.type === "contract-stress") {
            const requests = toRequests(scenario.moduleIds);
            const composition = registry.validateComposition({
                domain: scenario.domain,
                moduleIds: requests.map((entry) => entry.moduleId),
            });

            const issueCodes = composition.issues.map((entry) => entry.code);
            for (const expected of scenario.expectedIssueCodes ?? []) {
                if (
                    !issueCodes.includes(
                        expected as (typeof issueCodes)[number],
                    )
                ) {
                    issues.push(
                        `${scenario.id}: expected composition issue "${expected}" not found.`,
                    );
                }
            }

            const runtime = createPrefabAttachmentRuntime({ registry });
            const report = runtime.attachPrefabModules(
                `${scenario.id}:entity`,
                requests,
                {},
            );
            diagnostics.recordAttachmentReport({
                blueprintId: scenario.id,
                report,
            });

            const health = diagnostics.getHealthReport();
            const runtimeFailureCount =
                report.failed.length + report.skipped.length;
            const summary: Record<string, number | string | boolean> = {
                moduleIds: requests.length,
                compositionIssues: composition.issues.length,
                runtimeFailures: runtimeFailureCount,
            };

            return {
                scenarioId: scenario.id,
                scenarioType: scenario.type,
                ok: issues.length <= 0,
                issues,
                summary,
                health,
            };
        }

        const migration = migratePrefabBlueprint(scenario.payload);
        const expectOk = scenario.expectOk;
        const expectMigration = scenario.expectMigration;
        if (typeof expectOk === "boolean" && migration.ok !== expectOk) {
            issues.push(
                `${scenario.id}: expected migrate ok=${String(expectOk)}, got ${String(migration.ok)}.`,
            );
        }

        const migrationApplied = migration.ok
            ? migration.appliedVersions.length > 0
            : false;
        if (
            typeof expectMigration === "boolean" &&
            migrationApplied !== expectMigration
        ) {
            issues.push(
                `${scenario.id}: expected migrationApplied=${String(expectMigration)}, got ${String(migrationApplied)}.`,
            );
        }

        const health = diagnostics.getHealthReport();
        const summary: Record<string, number | string | boolean> = {
            migrateOk: migration.ok,
            migrationApplied,
            appliedVersionCount: migration.ok
                ? migration.appliedVersions.length
                : 0,
        };
        return {
            scenarioId: scenario.id,
            scenarioType: scenario.type,
            ok: issues.length <= 0,
            issues,
            summary,
            health,
        };
    };

    const runScenarios: PrefabSimulationSandboxService["runScenarios"] = (
        scenarios,
    ) => {
        const reports = scenarios.map((scenario) => runScenario(scenario));
        const scenariosFailed = reports.filter((entry) => !entry.ok).length;

        return {
            version: PREFAB_SIMULATION_SANDBOX_VERSION,
            seed,
            generatedAtMs: Math.max(0, now()),
            ok: scenariosFailed <= 0,
            scenariosRun: reports.length,
            scenariosFailed,
            reports,
        };
    };

    const runDefaultScenarios: PrefabSimulationSandboxService["runDefaultScenarios"] =
        () => {
            return runScenarios(toDefaultScenarios(seed));
        };

    const exportBatchSnapshot: PrefabSimulationSandboxService["exportBatchSnapshot"] =
        (report, options) => {
            return JSON.stringify(
                report,
                null,
                options?.pretty === false ? 0 : 2,
            );
        };

    return {
        runScenario,
        runScenarios,
        runDefaultScenarios,
        exportBatchSnapshot,
    };
}
