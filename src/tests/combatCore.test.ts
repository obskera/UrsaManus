import { afterEach, describe, expect, it } from "vitest";
import { signalBus } from "@/services/signalBus";
import {
    COMBAT_ENTITY_DEFEATED_SIGNAL,
    COMBAT_HIT_APPLIED_SIGNAL,
    COMBAT_HIT_BLOCKED_SIGNAL,
    createCombatCoreService,
} from "@/services/combatCore";

describe("combat core service", () => {
    afterEach(() => {
        signalBus.clear();
    });

    it("applies typed damage, invulnerability windows, and knockback", () => {
        let nowMs = 100;
        const appliedEvents: Array<{ targetId: string }> = [];

        signalBus.on(
            COMBAT_HIT_APPLIED_SIGNAL,
            (event: { targetId: string }) => {
                appliedEvents.push(event);
            },
        );

        const service = createCombatCoreService({ now: () => nowMs });
        expect(
            service.registerCombatant({
                id: "enemy-1",
                maxHp: 100,
                resistances: { physical: 0.25 },
            }),
        ).toBe(true);

        const hit = service.applyHit({
            targetId: "enemy-1",
            sourceId: "player-1",
            amount: 20,
            damageType: "physical",
            invulnerabilityMs: 200,
            knockback: { x: 12, y: -4 },
        });

        expect(hit.ok).toBe(true);
        if (!hit.ok) {
            return;
        }

        expect(hit.finalAmount).toBe(15);
        expect(hit.hpBefore).toBe(100);
        expect(hit.hpAfter).toBe(85);

        const enemy = service.getCombatant("enemy-1");
        expect(enemy?.hp).toBe(85);
        expect(enemy?.invulnerableUntilMs).toBe(300);
        expect(enemy?.lastKnockback).toEqual({ x: 12, y: -4 });
        expect(appliedEvents).toHaveLength(1);

        nowMs = 250;
        const blocked = service.applyHit({
            targetId: "enemy-1",
            amount: 10,
            damageType: "magic",
        });

        expect(blocked.ok).toBe(false);
        if (!blocked.ok) {
            expect(blocked.code).toBe("target-invulnerable");
        }
    });

    it("supports damage blocked diagnostics for invalid amount and missing target", () => {
        const blockedCodes: string[] = [];

        signalBus.on(COMBAT_HIT_BLOCKED_SIGNAL, (event: { code: string }) => {
            blockedCodes.push(event.code);
        });

        const service = createCombatCoreService({ now: () => 5 });
        service.registerCombatant({ id: "target-a", maxHp: 50 });

        const invalidAmount = service.applyHit({
            targetId: "target-a",
            amount: 0,
        });
        expect(invalidAmount.ok).toBe(false);

        const missingTarget = service.applyHit({
            targetId: "missing",
            amount: 10,
        });
        expect(missingTarget.ok).toBe(false);

        expect(blockedCodes).toEqual(["invalid-amount", "missing-target"]);
    });

    it("emits defeated signal and blocks further hits until revived", () => {
        const defeated: string[] = [];
        signalBus.on(
            COMBAT_ENTITY_DEFEATED_SIGNAL,
            (event: { targetId: string }) => {
                defeated.push(event.targetId);
            },
        );

        let nowMs = 10;
        const service = createCombatCoreService({ now: () => nowMs });
        service.registerCombatant({ id: "boss-1", maxHp: 30 });

        const first = service.applyHit({
            targetId: "boss-1",
            sourceId: "player-1",
            amount: 30,
            damageType: "true",
            invulnerabilityMs: 0,
        });
        expect(first.ok).toBe(true);
        if (first.ok) {
            expect(first.defeated).toBe(true);
        }

        const blocked = service.applyHit({
            targetId: "boss-1",
            sourceId: "player-1",
            amount: 1,
        });
        expect(blocked.ok).toBe(false);
        if (!blocked.ok) {
            expect(blocked.code).toBe("target-defeated");
        }

        expect(defeated).toEqual(["boss-1"]);

        nowMs = 50;
        expect(service.reviveCombatant("boss-1", 15)).toBe(true);
        const afterRevive = service.applyHit({
            targetId: "boss-1",
            amount: 5,
            damageType: "magic",
            invulnerabilityMs: 0,
        });
        expect(afterRevive.ok).toBe(true);
        if (afterRevive.ok) {
            expect(afterRevive.hpAfter).toBe(10);
        }
    });

    it("lists alive combatants and supports unregister", () => {
        const service = createCombatCoreService({ now: () => 0 });
        service.registerCombatant({ id: "a", maxHp: 10 });
        service.registerCombatant({ id: "b", maxHp: 5, hp: 1 });

        service.applyHit({
            targetId: "b",
            amount: 1,
            damageType: "true",
            invulnerabilityMs: 0,
        });

        expect(service.listCombatants().map((entity) => entity.id)).toEqual([
            "a",
            "b",
        ]);
        expect(
            service
                .listCombatants({ aliveOnly: true })
                .map((entity) => entity.id),
        ).toEqual(["a"]);

        expect(service.unregisterCombatant("b")).toBe(true);
        expect(service.getCombatant("b")).toBeNull();
    });
});
