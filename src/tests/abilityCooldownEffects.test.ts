import { afterEach, describe, expect, it } from "vitest";
import { signalBus } from "@/services/signalBus";
import {
    ABILITY_CAST_APPLIED_SIGNAL,
    ABILITY_CAST_BLOCKED_SIGNAL,
    ABILITY_COOLDOWN_UPDATED_SIGNAL,
    ABILITY_EFFECT_APPLIED_SIGNAL,
    ABILITY_EFFECT_EXPIRED_SIGNAL,
    createAbilityCooldownEffectsService,
} from "@/services/abilityCooldownEffects";

describe("ability cooldown effects service", () => {
    afterEach(() => {
        signalBus.clear();
    });

    it("supports typed active/passive ability definitions and lifecycle listing", () => {
        const service = createAbilityCooldownEffectsService({
            now: () => 1000,
        });

        expect(
            service.registerAbility({
                id: "dash",
                label: "Dash",
                kind: "active",
                cooldownMs: 1200,
                costs: [{ resource: "stamina", amount: 20 }],
            }),
        ).toBe(true);

        expect(
            service.registerAbility({
                id: "agility-passive",
                label: "Agility",
                kind: "passive",
            }),
        ).toBe(true);

        expect(
            service.listAbilities({ kind: "active" }).map((x) => x.id),
        ).toEqual(["dash"]);
        expect(
            service.listAbilities({ kind: "passive" }).map((x) => x.id),
        ).toEqual(["agility-passive"]);

        const passiveBlocked = service.canCast("agility-passive");
        expect(passiveBlocked?.code).toBe("passive-ability");

        expect(service.unregisterAbility("agility-passive")).toBe(true);
        expect(service.getAbility("agility-passive")).toBeNull();
    });

    it("applies cast conditions, resource costs, and shared cooldown groups", () => {
        const service = createAbilityCooldownEffectsService({ now: () => 0 });

        service.setResource("mana", 100);

        service.registerAbility({
            id: "firebolt",
            label: "Firebolt",
            kind: "active",
            cooldownMs: 1000,
            cooldownGroup: "spell-global",
            costs: [{ resource: "mana", amount: 30 }],
            castCondition: ({ context }) => context?.metadata?.combat === true,
        });

        service.registerAbility({
            id: "icebolt",
            label: "Icebolt",
            kind: "active",
            cooldownMs: 700,
            cooldownGroup: "spell-global",
            costs: [{ resource: "mana", amount: 15 }],
        });

        const blockedCondition = service.cast("firebolt", {
            metadata: { combat: false },
        });
        expect(blockedCondition.ok).toBe(false);
        if (!blockedCondition.ok) {
            expect(blockedCondition.code).toBe("condition-failed");
        }

        const cast = service.cast("firebolt", {
            metadata: { combat: true },
        });
        expect(cast.ok).toBe(true);
        expect(service.getResource("mana")).toBe(70);

        const groupedBlocked = service.cast("icebolt");
        expect(groupedBlocked.ok).toBe(false);
        if (!groupedBlocked.ok) {
            expect(groupedBlocked.code).toBe("group-on-cooldown");
            expect(groupedBlocked.cooldownRemainingMs).toBe(1000);
        }

        service.tick(1000);
        const next = service.cast("icebolt");
        expect(next.ok).toBe(true);
        expect(service.getResource("mana")).toBe(55);
    });

    it("supports cost hooks and effect hooks for active/passive effects integration", () => {
        const service = createAbilityCooldownEffectsService({ now: () => 50 });
        service.setResource("energy", 40);

        service.registerAbility({
            id: "charged-shot",
            label: "Charged Shot",
            kind: "active",
            cooldownMs: 500,
            costs: [{ resource: "energy", amount: 10 }],
            resolveCosts: ({ context, baseCosts }) => {
                if (context?.metadata?.empowered) {
                    return [{ ...baseCosts[0], amount: 25 }];
                }

                return baseCosts;
            },
            resolveEffects: ({ context }) => {
                return [
                    {
                        id: "weapon-buff",
                        type: "buff",
                        durationMs: context?.metadata?.empowered ? 300 : 120,
                        tags: ["weapon"],
                    },
                ];
            },
        });

        const first = service.cast("charged-shot");
        expect(first.ok).toBe(true);
        expect(service.getResource("energy")).toBe(30);
        expect(service.getSnapshot().activeEffects).toHaveLength(1);

        service.tick(120);
        expect(service.getSnapshot().activeEffects).toHaveLength(0);

        service.tick(500);
        const second = service.cast("charged-shot", {
            metadata: { empowered: true },
        });
        expect(second.ok).toBe(true);
        expect(service.getResource("energy")).toBe(5);

        const third = service.cast("charged-shot", {
            metadata: { empowered: true },
        });
        expect(third.ok).toBe(false);
        if (!third.ok) {
            expect(["on-cooldown", "insufficient-resource"]).toContain(
                third.code,
            );
        }
    });

    it("emits cast/cooldown/effect lifecycle signals usable by HUD action button flows", () => {
        const castEvents: string[] = [];
        const blockedEvents: string[] = [];
        const cooldownUpdates: number[] = [];
        const effectEvents: string[] = [];

        signalBus.on(
            ABILITY_CAST_APPLIED_SIGNAL,
            (event: { abilityId: string }) => {
                castEvents.push(event.abilityId);
            },
        );
        signalBus.on(ABILITY_CAST_BLOCKED_SIGNAL, (event: { code: string }) => {
            blockedEvents.push(event.code);
        });
        signalBus.on(
            ABILITY_COOLDOWN_UPDATED_SIGNAL,
            (event: { cooldownRemainingMs: number }) => {
                cooldownUpdates.push(event.cooldownRemainingMs);
            },
        );
        signalBus.on(
            ABILITY_EFFECT_APPLIED_SIGNAL,
            (event: { effectId: string }) => {
                effectEvents.push(`apply:${event.effectId}`);
            },
        );
        signalBus.on(
            ABILITY_EFFECT_EXPIRED_SIGNAL,
            (event: { effectId: string }) => {
                effectEvents.push(`expire:${event.effectId}`);
            },
        );

        const service = createAbilityCooldownEffectsService({ now: () => 0 });
        service.setResource("stamina", 50);
        service.registerAbility({
            id: "dash",
            label: "Dash",
            kind: "active",
            cooldownMs: 300,
            costs: [{ resource: "stamina", amount: 10 }],
            resolveEffects: () => [
                {
                    id: "dash-haste",
                    type: "status",
                    durationMs: 100,
                },
            ],
        });

        expect(service.cast("dash").ok).toBe(true);
        expect(service.cast("dash").ok).toBe(false);

        service.tick(120);
        service.tick(200);

        expect(castEvents).toEqual(["dash"]);
        expect(blockedEvents).toContain("on-cooldown");
        expect(cooldownUpdates.some((value) => value > 0)).toBe(true);
        expect(cooldownUpdates.at(-1)).toBe(0);
        expect(effectEvents).toEqual(["apply:dash-haste", "expire:dash-haste"]);
    });
});
