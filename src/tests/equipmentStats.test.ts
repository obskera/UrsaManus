import { afterEach, describe, expect, it } from "vitest";
import { signalBus } from "@/services/signalBus";
import {
    EQUIPMENT_STATS_CHANGED_SIGNAL,
    EQUIPMENT_STATS_EFFECT_APPLIED_SIGNAL,
    EQUIPMENT_STATS_EQUIPPED_SIGNAL,
    createEquipmentStatsService,
} from "@/services/equipmentStats";

describe("equipment stats service", () => {
    afterEach(() => {
        signalBus.clear();
    });

    it("resolves base + gear + effect modifiers into deterministic totals", () => {
        const service = createEquipmentStatsService();
        service.registerEntity("player", {
            maxHealth: 100,
            attackPower: 10,
            defense: 20,
            moveSpeed: 100,
            critChance: 0.1,
        });

        service.equipItem("player", {
            id: "sword-a",
            slot: "weapon",
            modifiers: [
                { stat: "attackPower", flat: 15 },
                { stat: "critChance", flat: 0.05 },
            ],
        });

        service.equipItem("player", {
            id: "boots-a",
            slot: "legs",
            modifiers: [{ stat: "moveSpeed", percent: 0.2 }],
        });

        service.applyEffect("player", {
            id: "battle-cry",
            modifiers: [
                { stat: "attackPower", percent: 0.1 },
                { stat: "defense", flat: 5 },
            ],
        });

        const resolved = service.getResolvedStats("player");
        expect(resolved).not.toBeNull();
        if (!resolved) {
            return;
        }

        expect(resolved.total.attackPower).toBeCloseTo(27.5, 5);
        expect(resolved.total.moveSpeed).toBe(120);
        expect(resolved.total.defense).toBe(25);
        expect(resolved.total.critChance).toBeCloseTo(0.15, 6);
    });

    it("exposes combat and movement projections for downstream modules", () => {
        const service = createEquipmentStatsService();
        service.registerEntity("npc-1", {
            maxHealth: 140,
            attackPower: 20,
            defense: 60,
            moveSpeed: 80,
            critChance: 0.02,
        });

        const resolved = service.getResolvedStats("npc-1");
        expect(resolved?.combat.damageReduction).toBeCloseTo(0.375, 6);
        expect(resolved?.movement.maxSpeedScale).toBeCloseTo(0.8, 6);
        expect(resolved?.combat.maxHealth).toBe(140);
    });

    it("emits lifecycle signals on equip/effect/change", () => {
        const events: string[] = [];

        signalBus.on(EQUIPMENT_STATS_EQUIPPED_SIGNAL, () => {
            events.push("equipped");
        });
        signalBus.on(EQUIPMENT_STATS_EFFECT_APPLIED_SIGNAL, () => {
            events.push("effect");
        });
        signalBus.on(EQUIPMENT_STATS_CHANGED_SIGNAL, () => {
            events.push("changed");
        });

        const service = createEquipmentStatsService();
        service.registerEntity("player");
        service.equipItem("player", {
            id: "shield-a",
            slot: "offhand",
            modifiers: [{ stat: "defense", flat: 5 }],
        });
        service.applyEffect("player", {
            id: "fortify",
            modifiers: [{ stat: "defense", percent: 0.1 }],
        });

        expect(events).toEqual([
            "changed",
            "equipped",
            "changed",
            "effect",
            "changed",
        ]);
    });

    it("supports unequip/effect removal and rejects invalid operations", () => {
        const service = createEquipmentStatsService();

        expect(service.registerEntity("", {})).toBe(false);
        expect(
            service.equipItem("missing", {
                id: "x",
                slot: "weapon",
                modifiers: [],
            }),
        ).toBe(false);

        service.registerEntity("player", {
            attackPower: 10,
            moveSpeed: 100,
        });

        service.equipItem("player", {
            id: "weapon-1",
            slot: "weapon",
            modifiers: [{ stat: "attackPower", flat: 10 }],
        });
        service.applyEffect("player", {
            id: "haste-1",
            modifiers: [{ stat: "moveSpeed", percent: 0.5 }],
        });

        expect(service.getResolvedStats("player")?.total.attackPower).toBe(20);
        expect(service.getResolvedStats("player")?.total.moveSpeed).toBe(150);

        expect(service.unequipItem("player", "weapon")).toBe(true);
        expect(service.removeEffect("player", "haste-1")).toBe(true);

        const resolved = service.getResolvedStats("player");
        expect(resolved?.total.attackPower).toBe(10);
        expect(resolved?.total.moveSpeed).toBe(100);

        expect(service.unregisterEntity("player")).toBe(true);
        expect(service.getEntitySnapshot("player")).toBeNull();
    });
});
