import { describe, expect, it } from "vitest";
import {
    BALANCING_SIMULATOR_PRESET_VERSION,
    createBalancingSimulatorService,
} from "@/services/balancingSimulator";

function createSequenceRng(sequence: number[]) {
    let index = 0;
    return () => {
        const value = sequence[index] ?? sequence[sequence.length - 1] ?? 0;
        index += 1;
        return value;
    };
}

describe("balancing simulator service", () => {
    it("runs deterministic combat scenario summaries", () => {
        const service = createBalancingSimulatorService({ now: () => 5000 });

        const report = service.runCombatScenario({
            id: "combat-basic",
            rounds: 10,
            stepMs: 100,
            targetMaxHp: 100,
            targetResistances: { physical: 0.25 },
            hit: {
                amount: 20,
                damageType: "physical",
            },
        });

        expect(report).not.toBeNull();
        if (!report) {
            return;
        }

        expect(report.defeated).toBe(true);
        expect(report.roundsSimulated).toBe(7);
        expect(report.defeatAtRound).toBe(7);
        expect(report.totalDamage).toBe(105);
        expect(report.averageDamagePerAppliedHit).toBe(15);
        expect(report.finalTargetHp).toBe(0);
    });

    it("runs deterministic economy scenario summaries", () => {
        const service = createBalancingSimulatorService({
            rng: createSequenceRng([0.1, 0.95, 0.2]),
        });

        const report = service.runEconomyScenario({
            id: "economy-basic",
            iterations: 3,
            dropRolls: 1,
            dropTable: {
                id: "drops-basic",
                rollsMin: 1,
                rollsMax: 1,
                entries: [
                    {
                        id: "drop-potion",
                        itemId: "potion-small",
                        weight: 70,
                        minQuantity: 1,
                        maxQuantity: 1,
                    },
                    {
                        id: "drop-relic",
                        itemId: "relic-fragment",
                        weight: 30,
                        minQuantity: 1,
                        maxQuantity: 1,
                    },
                ],
            },
            economyTable: {
                id: "economy-basic",
                rows: [
                    { itemId: "potion-small", buyPrice: 20, sellPrice: 10 },
                    { itemId: "relic-fragment", buyPrice: 100, sellPrice: 50 },
                    { itemId: "shard", buyPrice: 5, sellPrice: 2 },
                ],
            },
            rewardBundle: {
                id: "bundle-basic",
                items: [{ itemId: "shard", quantity: 2 }],
                currencies: [{ currency: "gold", amount: 10 }],
            },
        });

        expect(report).not.toBeNull();
        if (!report) {
            return;
        }

        expect(report.totalItemsResolved).toBe(6);
        expect(report.totalQuantityResolved).toBe(9);
        expect(report.quantityByItemId).toEqual({
            "potion-small": 2,
            "relic-fragment": 1,
            shard: 6,
        });
        expect(report.totalSellValue).toBe(82);
        expect(report.totalBuyValue).toBe(170);
        expect(report.averageSellValuePerIteration).toBe(27.333);
        expect(report.averageBuyValuePerIteration).toBe(56.667);
        expect(report.currencyTotals).toEqual({ gold: 30 });
    });

    it("parses and runs batch payloads with aggregate summaries", () => {
        const service = createBalancingSimulatorService({
            now: () => 4242,
            rng: createSequenceRng([0.2, 0.2, 0.2]),
        });

        const raw = JSON.stringify({
            version: BALANCING_SIMULATOR_PRESET_VERSION,
            combatScenarios: [
                {
                    id: "combat-agg",
                    rounds: 3,
                    targetMaxHp: 30,
                    hit: { amount: 10, damageType: "true" },
                },
            ],
            economyScenarios: [
                {
                    id: "economy-agg",
                    iterations: 2,
                    dropRolls: 1,
                    dropTable: {
                        id: "drop-agg",
                        entries: [
                            {
                                id: "entry-coin",
                                itemId: "coin",
                                weight: 1,
                                minQuantity: 1,
                                maxQuantity: 1,
                            },
                        ],
                    },
                },
            ],
        });

        const parsed = service.parsePresetPayload(raw);
        expect(parsed.ok).toBe(true);
        if (!parsed.ok) {
            return;
        }

        const batch = service.runBatch(parsed.payload);
        expect(batch).not.toBeNull();
        if (!batch) {
            return;
        }

        expect(batch.generatedAtMs).toBe(4242);
        expect(batch.combat.scenarioCount).toBe(1);
        expect(batch.combat.defeatedCount).toBe(1);
        expect(batch.economy.scenarioCount).toBe(1);
        expect(batch.economy.totalQuantityResolved).toBe(2);
    });

    it("rejects invalid versions and empty scenario payloads", () => {
        const service = createBalancingSimulatorService();

        const invalidVersion = service.parsePresetPayload(
            JSON.stringify({ version: 99, combatScenarios: [] }),
        );
        expect(invalidVersion.ok).toBe(false);
        if (invalidVersion.ok) {
            return;
        }
        expect(invalidVersion.validation.code).toBe("invalid-version");

        const emptyScenarios = service.parsePresetPayload(
            JSON.stringify({ version: BALANCING_SIMULATOR_PRESET_VERSION }),
        );
        expect(emptyScenarios.ok).toBe(false);
        if (emptyScenarios.ok) {
            return;
        }
        expect(emptyScenarios.validation.code).toBe("invalid-scenarios");
    });
});
