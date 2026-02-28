import { describe, expect, it } from "vitest";
import {
    evaluateBalancingGovernance,
    parseBalancingGovernancePolicy,
    parseBalancingGovernanceReport,
} from "@/services/balancingGovernance";

describe("balancing governance service", () => {
    const policyRaw = JSON.stringify({
        version: 1,
        policyId: "policy-2026-q1",
        ownership: {
            combat: ["combat-lead"],
            economy: ["economy-lead"],
        },
        benchmarks: [
            {
                id: "combat-dps-baseline",
                domain: "combat",
                metricThresholds: [
                    { id: "avgTimeToDefeatMs", max: 9_000 },
                    { id: "avgPlayerHpRemaining", min: 20 },
                ],
            },
            {
                id: "economy-drop-baseline",
                domain: "economy",
                metricThresholds: [{ id: "avgGoldPerRun", min: 80, max: 140 }],
            },
        ],
    });

    it("evaluates valid report payloads with required benchmark thresholds", () => {
        const parsedPolicy = parseBalancingGovernancePolicy(policyRaw);
        expect(parsedPolicy.ok).toBe(true);
        if (!parsedPolicy.ok) {
            return;
        }

        const parsedReport = parseBalancingGovernanceReport(
            JSON.stringify({
                version: 1,
                policyId: "policy-2026-q1",
                domains: ["combat"],
                majorUpdate: false,
                benchmarkResults: [
                    {
                        scenarioId: "combat-dps-baseline",
                        metrics: {
                            avgTimeToDefeatMs: 8_500,
                            avgPlayerHpRemaining: 25,
                        },
                    },
                ],
            }),
        );

        expect(parsedReport.ok).toBe(true);
        if (!parsedReport.ok) {
            return;
        }

        const evaluation = evaluateBalancingGovernance(
            parsedPolicy.payload,
            parsedReport.payload,
        );

        expect(evaluation.ok).toBe(true);
        expect(evaluation.issues).toEqual([]);
        expect(evaluation.summary.metricCheckCount).toBe(2);
    });

    it("flags missing benchmarks and threshold violations", () => {
        const parsedPolicy = parseBalancingGovernancePolicy(policyRaw);
        expect(parsedPolicy.ok).toBe(true);
        if (!parsedPolicy.ok) {
            return;
        }

        const parsedReport = parseBalancingGovernanceReport(
            JSON.stringify({
                version: 1,
                policyId: "policy-2026-q1",
                domains: ["combat", "economy"],
                majorUpdate: false,
                benchmarkResults: [
                    {
                        scenarioId: "combat-dps-baseline",
                        metrics: {
                            avgTimeToDefeatMs: 12_000,
                            avgPlayerHpRemaining: 10,
                        },
                    },
                ],
            }),
        );

        expect(parsedReport.ok).toBe(true);
        if (!parsedReport.ok) {
            return;
        }

        const evaluation = evaluateBalancingGovernance(
            parsedPolicy.payload,
            parsedReport.payload,
        );

        expect(evaluation.ok).toBe(false);
        expect(evaluation.issues).toEqual([
            {
                path: "$.benchmarkResults",
                message:
                    'Missing benchmark result for required scenario "economy-drop-baseline" (economy).',
            },
            {
                path: "$.benchmarkResults[0].metrics.avgTimeToDefeatMs",
                message:
                    'Metric "avgTimeToDefeatMs" exceeds maximum threshold (12000 > 9000).',
            },
            {
                path: "$.benchmarkResults[0].metrics.avgPlayerHpRemaining",
                message:
                    'Metric "avgPlayerHpRemaining" is below minimum threshold (10 < 20).',
            },
        ]);
    });

    it("requires ownership signoffs for major updates", () => {
        const parsedPolicy = parseBalancingGovernancePolicy(policyRaw);
        expect(parsedPolicy.ok).toBe(true);
        if (!parsedPolicy.ok) {
            return;
        }

        const parsedReport = parseBalancingGovernanceReport(
            JSON.stringify({
                version: 1,
                policyId: "policy-2026-q1",
                domains: ["combat", "economy"],
                majorUpdate: true,
                benchmarkResults: [
                    {
                        scenarioId: "combat-dps-baseline",
                        metrics: {
                            avgTimeToDefeatMs: 8_500,
                            avgPlayerHpRemaining: 30,
                        },
                    },
                    {
                        scenarioId: "economy-drop-baseline",
                        metrics: {
                            avgGoldPerRun: 100,
                        },
                    },
                ],
                signoffs: [
                    {
                        ownerId: "combat-lead",
                        approvedAt: "2026-02-28T10:00:00.000Z",
                    },
                ],
            }),
        );

        expect(parsedReport.ok).toBe(true);
        if (!parsedReport.ok) {
            return;
        }

        const evaluation = evaluateBalancingGovernance(
            parsedPolicy.payload,
            parsedReport.payload,
        );

        expect(evaluation.ok).toBe(false);
        expect(evaluation.issues).toEqual([
            {
                path: "$.signoffs",
                message:
                    'Major update requires signoff from owner "economy-lead".',
            },
        ]);
    });

    it("rejects invalid policy/report versions", () => {
        const policy = parseBalancingGovernancePolicy(
            JSON.stringify({
                version: 99,
                policyId: "x",
                ownership: {
                    combat: ["a"],
                    economy: ["b"],
                },
                benchmarks: [],
            }),
        );
        expect(policy.ok).toBe(false);

        const report = parseBalancingGovernanceReport(
            JSON.stringify({
                version: 99,
                policyId: "x",
                domains: ["combat"],
                majorUpdate: false,
                benchmarkResults: [],
            }),
        );
        expect(report.ok).toBe(false);
    });
});
