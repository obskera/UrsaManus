import { describe, expect, it, vi } from "vitest";
import {
    createGrowthTickSimulation,
    GROWTH_STAGE_TRANSITION_SIGNAL,
    resolveGrowthStageDurationMs,
    type GrowthStageTransitionEvent,
} from "@/logic/simulation";
import { signalBus } from "@/services/signalBus";

describe("growthTick simulation", () => {
    it("progresses seed -> sprout -> mature and emits stage transition events", () => {
        const emit = vi.fn();
        const growth = createGrowthTickSimulation({ emit, initialNowMs: 100 });

        growth.addNode({
            id: "crop-a",
            seed: 42,
            profile: {
                durations: {
                    seedToSproutMs: 100,
                    sproutToMatureMs: 120,
                },
            },
        });

        expect(growth.getNode("crop-a")?.stage).toBe("seed");

        growth.tick(100);
        expect(growth.getNode("crop-a")?.stage).toBe("sprout");

        growth.tick(120);
        expect(growth.getNode("crop-a")?.stage).toBe("mature");

        expect(emit).toHaveBeenCalledTimes(2);
        expect(emit).toHaveBeenNthCalledWith(
            1,
            GROWTH_STAGE_TRANSITION_SIGNAL,
            expect.objectContaining({
                id: "crop-a",
                from: "seed",
                to: "sprout",
            }),
        );
        expect(emit).toHaveBeenNthCalledWith(
            2,
            GROWTH_STAGE_TRANSITION_SIGNAL,
            expect.objectContaining({
                id: "crop-a",
                from: "sprout",
                to: "mature",
            }),
        );
    });

    it("supports pause/resume semantics", () => {
        const growth = createGrowthTickSimulation({ initialNowMs: 0 });

        growth.addNode({
            id: "crop-b",
            profile: {
                durations: {
                    seedToSproutMs: 80,
                    sproutToMatureMs: 90,
                },
            },
        });

        growth.pause();
        expect(growth.tick(100)).toBe(false);
        expect(growth.getNode("crop-b")?.stage).toBe("seed");

        growth.resume();
        expect(growth.tick(80)).toBe(true);
        expect(growth.getNode("crop-b")?.stage).toBe("sprout");
    });

    it("produces deterministic duration values from id + stage + seed", () => {
        const base = {
            id: "crop-c",
            stage: "seed" as const,
            profile: {
                durations: {
                    seedToSproutMs: 1000,
                    sproutToMatureMs: 1600,
                },
                jitterRatio: 0.2,
            },
        };

        const a = resolveGrowthStageDurationMs({ ...base, seed: 11 });
        const b = resolveGrowthStageDurationMs({ ...base, seed: 11 });
        const c = resolveGrowthStageDurationMs({ ...base, seed: 12 });

        expect(a).toBe(b);
        expect(c).not.toBe(a);
        expect(a).toBeGreaterThanOrEqual(800);
        expect(a).toBeLessThanOrEqual(1200);
    });

    it("supports node removal and clear", () => {
        const growth = createGrowthTickSimulation();

        growth.addNode({ id: "crop-d" });
        growth.addNode({ id: "crop-e" });

        expect(growth.getNodes()).toHaveLength(2);
        expect(growth.removeNode("crop-d")).toBe(true);
        expect(growth.getNode("crop-d")).toBeNull();

        growth.clear();
        expect(growth.getNodes()).toHaveLength(0);
    });

    it("emits transition events through signalBus by default", () => {
        const received: GrowthStageTransitionEvent[] = [];

        const unsubscribe = signalBus.on<GrowthStageTransitionEvent>(
            GROWTH_STAGE_TRANSITION_SIGNAL,
            (event) => {
                received.push(event);
            },
        );

        const growth = createGrowthTickSimulation({ initialNowMs: 0 });
        growth.addNode({
            id: "crop-signal",
            seed: 7,
            profile: {
                durations: {
                    seedToSproutMs: 50,
                    sproutToMatureMs: 75,
                },
            },
        });

        growth.tick(50);
        growth.tick(75);

        expect(received).toHaveLength(2);
        expect(received[0]).toEqual(
            expect.objectContaining({
                id: "crop-signal",
                from: "seed",
                to: "sprout",
                atMs: 50,
                seed: 7,
            }),
        );
        expect(received[1]).toEqual(
            expect.objectContaining({
                id: "crop-signal",
                from: "sprout",
                to: "mature",
                atMs: 125,
                seed: 7,
            }),
        );

        unsubscribe();
        signalBus.clear(GROWTH_STAGE_TRANSITION_SIGNAL);
    });
});
