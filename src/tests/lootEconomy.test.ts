import { afterEach, describe, expect, it } from "vitest";
import { signalBus } from "@/services/signalBus";
import {
    LOOT_BUNDLE_RESOLVED_SIGNAL,
    LOOT_DROP_RESOLVED_SIGNAL,
    LOOT_ECONOMY_TABLE_UPDATED_SIGNAL,
    createLootEconomyService,
} from "@/services/lootEconomy";

function createSequenceRng(sequence: number[]) {
    let index = 0;
    return () => {
        const value = sequence[index] ?? sequence[sequence.length - 1] ?? 0;
        index += 1;
        return value;
    };
}

describe("loot economy service", () => {
    afterEach(() => {
        signalBus.clear();
    });

    it("resolves deterministic weighted drops with tier and quantity controls", () => {
        const service = createLootEconomyService({
            rng: createSequenceRng([0.2, 0.9, 0.05, 0.49]),
        });

        expect(
            service.registerDropTable({
                id: "encounter-basic",
                rollsMin: 2,
                rollsMax: 2,
                entries: [
                    {
                        id: "entry-potion",
                        itemId: "potion-small",
                        tier: "common",
                        weight: 80,
                        minQuantity: 1,
                        maxQuantity: 2,
                    },
                    {
                        id: "entry-relic",
                        itemId: "relic-fragment",
                        tier: "rare",
                        weight: 20,
                        minQuantity: 1,
                        maxQuantity: 1,
                    },
                ],
            }),
        ).toBe(true);

        const result = service.resolveDropTable("encounter-basic");
        expect(result).not.toBeNull();
        expect(result?.rolls).toBe(2);
        expect(result?.items).toEqual([
            {
                itemId: "potion-small",
                quantity: 2,
                tier: "common",
                affixes: [],
                source: "table",
                sourceId: "encounter-basic",
            },
            {
                itemId: "potion-small",
                quantity: 1,
                tier: "common",
                affixes: [],
                source: "table",
                sourceId: "encounter-basic",
            },
        ]);
    });

    it("supports affix pools and optional affix hook override", () => {
        const service = createLootEconomyService({
            rng: createSequenceRng([0, 0, 0.7]),
        });

        service.registerAffixPool({
            id: "weapon-affixes",
            options: [
                { id: "crit+5", weight: 70 },
                { id: "bleed+1", weight: 30 },
            ],
        });

        service.registerDropTable({
            id: "elite-drop",
            rollsMin: 1,
            rollsMax: 1,
            entries: [
                {
                    id: "elite-sword",
                    itemId: "sword-iron",
                    tier: "uncommon",
                    weight: 100,
                    affixPoolIds: ["weapon-affixes"],
                    affixRollsMin: 1,
                    affixRollsMax: 1,
                },
            ],
        });

        const pooled = service.resolveDropTable("elite-drop");
        expect(pooled?.items[0].affixes).toEqual(["crit+5"]);

        const hooked = service.resolveDropTable("elite-drop", {
            resolveAffixes: () => ["hooked-affix"],
        });
        expect(hooked?.items[0].affixes).toEqual(["hooked-affix"]);
    });

    it("composes reusable reward bundles from static rewards and drop tables", () => {
        const service = createLootEconomyService({
            rng: createSequenceRng([0, 0, 0]),
        });

        service.registerDropTable({
            id: "vendor-cache",
            rollsMin: 1,
            rollsMax: 1,
            entries: [
                {
                    id: "cache-herb",
                    itemId: "herb",
                    weight: 100,
                    minQuantity: 2,
                    maxQuantity: 2,
                },
            ],
        });

        service.registerRewardBundle({
            id: "quest-tier-a",
            items: [{ itemId: "token", quantity: 3, tier: "rare" }],
            currencies: [
                { currency: "gold", amount: 25 },
                { currency: "gold", amount: 15 },
                { currency: "gems", amount: 1 },
            ],
            dropTables: [{ tableId: "vendor-cache", rollsMin: 1, rollsMax: 1 }],
        });

        const result = service.resolveRewardBundle("quest-tier-a");
        expect(result).not.toBeNull();
        expect(result?.items).toEqual([
            {
                itemId: "token",
                quantity: 3,
                tier: "rare",
                affixes: [],
                source: "bundle",
                sourceId: "quest-tier-a",
            },
            {
                itemId: "herb",
                quantity: 2,
                tier: "common",
                affixes: [],
                source: "table",
                sourceId: "vendor-cache",
            },
        ]);
        expect(result?.currencies).toEqual([
            { currency: "gems", amount: 1 },
            { currency: "gold", amount: 40 },
        ]);
    });

    it("provides economy table quotes and emits lifecycle signals", () => {
        const events: string[] = [];

        signalBus.on(LOOT_DROP_RESOLVED_SIGNAL, () => {
            events.push("drop");
        });
        signalBus.on(LOOT_BUNDLE_RESOLVED_SIGNAL, () => {
            events.push("bundle");
        });
        signalBus.on(LOOT_ECONOMY_TABLE_UPDATED_SIGNAL, () => {
            events.push("economy");
        });

        const service = createLootEconomyService({
            rng: createSequenceRng([0, 0]),
        });

        service.registerDropTable({
            id: "signal-table",
            entries: [{ id: "entry", itemId: "ore", weight: 100 }],
        });
        service.registerRewardBundle({
            id: "signal-bundle",
            dropTables: [{ tableId: "signal-table" }],
        });

        expect(
            service.registerEconomyTable({
                id: "vendor-main",
                rows: [{ itemId: "ore", buyPrice: 12, sellPrice: 5 }],
            }),
        ).toBe(true);

        const quote = service.quoteItem("vendor-main", "ore");
        expect(quote).toEqual({
            tableId: "vendor-main",
            itemId: "ore",
            currency: "gold",
            buyPrice: 12,
            sellPrice: 5,
        });

        service.resolveDropTable("signal-table");
        service.resolveRewardBundle("signal-bundle");

        expect(events).toEqual(["economy", "drop", "drop", "bundle"]);
        expect(service.getSnapshot()).toEqual({
            dropTableCount: 1,
            affixPoolCount: 0,
            economyTableCount: 1,
            rewardBundleCount: 1,
        });
    });
});
