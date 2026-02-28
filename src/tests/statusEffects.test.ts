import { describe, expect, it, vi } from "vitest";
import {
    createStatusEffectsSimulation,
    STATUS_EFFECT_EXPIRED_SIGNAL,
    STATUS_EFFECT_TICK_SIGNAL,
} from "@/logic/simulation";

describe("statusEffects simulation", () => {
    it("supports stacked slow/haste modifiers and resolves movement scale", () => {
        const sim = createStatusEffectsSimulation({ initialNowMs: 0 });

        sim.applySlow("player", {
            durationMs: 1200,
            magnitude: 0.2,
        });
        sim.applySlow("player", {
            durationMs: 1200,
            magnitude: 0.1,
        });
        sim.applyHaste("player", {
            durationMs: 1200,
            magnitude: 0.25,
        });

        expect(sim.getEntityEffects("player")).toHaveLength(3);
        expect(sim.getMovementSpeedScale("player")).toBeCloseTo(0.95);
    });

    it("refreshes burn effects by default instead of adding duplicate stacks", () => {
        const sim = createStatusEffectsSimulation({ initialNowMs: 0 });

        const first = sim.applyBurn("enemy-1", {
            durationMs: 1000,
            magnitude: 2,
        });
        sim.tick(400);
        const refreshed = sim.applyBurn("enemy-1", {
            durationMs: 900,
            magnitude: 3,
        });

        const effects = sim.getEntityEffects("enemy-1");
        expect(effects).toHaveLength(1);
        expect(refreshed?.id).toBe(first?.id);
        expect(effects[0].magnitude).toBe(3);
        expect(effects[0].expiresAtMs).toBe(1300);
    });

    it("emits interval ticks and expiry events deterministically", () => {
        const emit = vi.fn();
        const sim = createStatusEffectsSimulation({
            initialNowMs: 0,
            emit,
        });

        sim.applyRegen("player", {
            durationMs: 2500,
            magnitude: 4,
            tickIntervalMs: 1000,
        });

        sim.tick(1000);
        sim.tick(1000);
        sim.tick(600);

        const tickCalls = emit.mock.calls.filter(
            (call) => call[0] === STATUS_EFFECT_TICK_SIGNAL,
        );
        const expiredCalls = emit.mock.calls.filter(
            (call) => call[0] === STATUS_EFFECT_EXPIRED_SIGNAL,
        );

        expect(tickCalls).toHaveLength(2);
        expect(tickCalls[0][1]).toEqual(
            expect.objectContaining({
                entityId: "player",
                type: "regen",
                atMs: 1000,
            }),
        );
        expect(tickCalls[1][1]).toEqual(
            expect.objectContaining({
                entityId: "player",
                type: "regen",
                atMs: 2000,
            }),
        );
        expect(expiredCalls).toHaveLength(1);
        expect(expiredCalls[0][1]).toEqual(
            expect.objectContaining({
                entityId: "player",
                type: "regen",
                atMs: 2600,
            }),
        );
        expect(sim.getEntityEffects("player")).toEqual([]);
    });
});
