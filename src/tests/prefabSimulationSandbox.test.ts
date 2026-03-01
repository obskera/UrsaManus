import { describe, expect, it } from "vitest";
import {
    createPrefabSimulationSandboxService,
    PREFAB_SIMULATION_SANDBOX_VERSION,
} from "@/services/prefabSimulationSandbox";

describe("prefabSimulationSandbox", () => {
    it("runs deterministic default scenarios by seed", () => {
        const serviceA = createPrefabSimulationSandboxService({
            seed: 42,
            now: () => 1000,
        });
        const serviceB = createPrefabSimulationSandboxService({
            seed: 42,
            now: () => 1000,
        });

        const reportA = serviceA.runDefaultScenarios();
        const reportB = serviceB.runDefaultScenarios();

        expect(reportA.version).toBe(PREFAB_SIMULATION_SANDBOX_VERSION);
        expect(reportA.seed).toBe(42);
        expect(reportA.generatedAtMs).toBe(1000);
        expect(reportA).toEqual(reportB);
    });

    it("reports expected stress issues for conflicts and missing deps", () => {
        const sandbox = createPrefabSimulationSandboxService({
            seed: 7,
            now: () => 1,
        });
        const report = sandbox.runScenarios([
            {
                type: "contract-stress",
                id: "conflict-test",
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
                id: "missing-dep-test",
                domain: "enemy",
                moduleIds: ["enemy.melee-ability"],
                expectedIssueCodes: ["missing-dependency"],
            },
        ]);

        expect(report.ok).toBe(true);
        expect(report.scenariosFailed).toBe(0);
        expect(report.reports).toHaveLength(2);
    });

    it("captures migration edge success and failure expectations", () => {
        const sandbox = createPrefabSimulationSandboxService({
            seed: 11,
            now: () => 1,
        });
        const report = sandbox.runScenarios([
            {
                type: "migration-edge",
                id: "legacy",
                payload: {
                    id: "legacy-blueprint",
                    domain: "enemy",
                    modules: [{ id: "enemy.core", config: {} }],
                },
                expectOk: true,
                expectMigration: true,
            },
            {
                type: "migration-edge",
                id: "invalid",
                payload: {
                    version: "um-prefab-blueprint-v1",
                    id: "",
                    domain: "enemy",
                    modules: [],
                },
                expectOk: false,
                expectMigration: false,
            },
        ]);

        expect(report.ok).toBe(true);
        expect(report.scenariosFailed).toBe(0);
    });

    it("exports CI-friendly snapshot JSON", () => {
        const sandbox = createPrefabSimulationSandboxService({
            seed: 99,
            now: () => 555,
        });
        const report = sandbox.runDefaultScenarios();
        const raw = sandbox.exportBatchSnapshot(report, { pretty: true });
        const parsed = JSON.parse(raw) as {
            version: string;
            seed: number;
            reports: unknown[];
        };

        expect(parsed.version).toBe(PREFAB_SIMULATION_SANDBOX_VERSION);
        expect(parsed.seed).toBe(99);
        expect(Array.isArray(parsed.reports)).toBe(true);
        expect(parsed.reports.length).toBeGreaterThan(0);
    });
});
