import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTimerSignals } from "@/services/timerSignals";
import { signalBus } from "@/services/signalBus";

describe("timerSignals", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-02-28T00:00:00.000Z"));
    });

    afterEach(() => {
        signalBus.clear();
        vi.useRealTimers();
    });

    it("emits once timer started/tick and supports pause/resume", () => {
        const emit = vi.fn<(signal: string, payload: unknown) => void>();
        const helper = createTimerSignals({ emit });

        const once = helper.once({
            id: "spawn-wave",
            delayMs: 1000,
            signal: "timer:spawn",
            data: { wave: 1 },
        });

        expect(emit).toHaveBeenCalledTimes(1);
        expect(emit).toHaveBeenLastCalledWith(
            "timer:spawn",
            expect.objectContaining({
                id: "spawn-wave",
                kind: "once",
                phase: "started",
                data: { wave: 1 },
            }),
        );

        vi.advanceTimersByTime(400);
        expect(once.pause()).toBe(true);
        expect(once.isPaused()).toBe(true);
        expect(once.getRemainingMs()).toBeGreaterThanOrEqual(590);
        expect(once.getRemainingMs()).toBeLessThanOrEqual(610);

        vi.advanceTimersByTime(1000);
        expect(emit).toHaveBeenCalledTimes(1);

        expect(once.resume()).toBe(true);
        vi.advanceTimersByTime(600);

        expect(emit).toHaveBeenCalledTimes(2);
        expect(emit).toHaveBeenLastCalledWith(
            "timer:spawn",
            expect.objectContaining({
                id: "spawn-wave",
                kind: "once",
                phase: "tick",
                tick: 1,
            }),
        );
        expect(once.isRunning()).toBe(false);
    });

    it("emits interval ticks and preserves next tick after pause/resume", () => {
        const emit = vi.fn<(signal: string, payload: unknown) => void>();
        const helper = createTimerSignals({ emit });

        const interval = helper.interval({
            id: "objective-tick",
            intervalMs: 250,
            signal: "timer:objective",
        });

        vi.advanceTimersByTime(510);

        const tickCallsBeforePause = emit.mock.calls.filter(
            ([, payload]) => (payload as { phase?: string }).phase === "tick",
        );
        expect(tickCallsBeforePause).toHaveLength(2);

        expect(interval.pause()).toBe(true);
        const remainingAtPause = interval.getRemainingMs();
        expect(remainingAtPause).toBeGreaterThan(0);
        expect(remainingAtPause).toBeLessThanOrEqual(250);

        vi.advanceTimersByTime(500);
        const tickCallsWhilePaused = emit.mock.calls.filter(
            ([, payload]) => (payload as { phase?: string }).phase === "tick",
        );
        expect(tickCallsWhilePaused).toHaveLength(2);

        expect(interval.resume()).toBe(true);
        vi.advanceTimersByTime(remainingAtPause);
        const tickCallsAfterResume = emit.mock.calls.filter(
            ([, payload]) => (payload as { phase?: string }).phase === "tick",
        );
        expect(tickCallsAfterResume).toHaveLength(3);

        expect(interval.cancel()).toBe(true);
        vi.advanceTimersByTime(500);
        const tickCallsAfterCancel = emit.mock.calls.filter(
            ([, payload]) => (payload as { phase?: string }).phase === "tick",
        );
        expect(tickCallsAfterCancel).toHaveLength(3);
    });

    it("supports cooldown trigger semantics with blocked + ready emissions", () => {
        const emit = vi.fn<(signal: string, payload: unknown) => void>();
        const helper = createTimerSignals({ emit });

        const cooldown = helper.cooldown({
            id: "dash",
            cooldownMs: 800,
            signal: "timer:dash",
        });

        expect(cooldown.trigger({ source: "input" })).toBe(true);
        expect(cooldown.trigger({ source: "input" })).toBe(false);

        expect(emit).toHaveBeenNthCalledWith(
            1,
            "timer:dash",
            expect.objectContaining({
                id: "dash",
                kind: "cooldown",
                phase: "started",
                tick: 1,
                data: { source: "input" },
            }),
        );

        expect(emit).toHaveBeenNthCalledWith(
            2,
            "timer:dash",
            expect.objectContaining({
                id: "dash",
                kind: "cooldown",
                phase: "blocked",
            }),
        );

        vi.advanceTimersByTime(800);

        expect(emit).toHaveBeenNthCalledWith(
            3,
            "timer:dash",
            expect.objectContaining({
                id: "dash",
                kind: "cooldown",
                phase: "ready",
                remainingMs: 0,
            }),
        );

        expect(cooldown.trigger({ source: "hotkey" })).toBe(true);
        expect(emit).toHaveBeenNthCalledWith(
            4,
            "timer:dash",
            expect.objectContaining({
                phase: "started",
                tick: 2,
                data: { source: "hotkey" },
            }),
        );
    });

    it("cancelAll stops active timers", () => {
        const emit = vi.fn<(signal: string, payload: unknown) => void>();
        const helper = createTimerSignals({ emit });

        helper.once({ id: "a", delayMs: 300, signal: "timer:a" });
        helper.interval({ id: "b", intervalMs: 100, signal: "timer:b" });

        expect(helper.activeCount()).toBe(2);
        helper.cancelAll();
        expect(helper.activeCount()).toBe(0);

        vi.advanceTimersByTime(1000);

        const tickCalls = emit.mock.calls.filter(
            ([, payload]) => (payload as { phase?: string }).phase === "tick",
        );
        expect(tickCalls).toHaveLength(0);
    });

    it("handles zero/invalid durations and guard-path controls", () => {
        const emit = vi.fn<(signal: string, payload: unknown) => void>();
        const helper = createTimerSignals({ emit });

        const immediate = helper.once({
            id: "once-immediate",
            delayMs: Number.NaN,
            signal: "timer:once-immediate",
        });

        expect(immediate.pause()).toBe(true);
        expect(immediate.pause()).toBe(false);
        expect(immediate.resume()).toBe(true);
        expect(immediate.resume()).toBe(false);

        vi.advanceTimersByTime(0);
        expect(immediate.cancel()).toBe(false);
        expect(immediate.isRunning()).toBe(false);
        expect(immediate.isPaused()).toBe(false);

        const started = emit.mock.calls.find(
            ([, payload]) =>
                (payload as { id?: string; phase?: string }).id ===
                    "once-immediate" &&
                (payload as { phase?: string }).phase === "started",
        );
        const tick = emit.mock.calls.find(
            ([, payload]) =>
                (payload as { id?: string; phase?: string }).id ===
                    "once-immediate" &&
                (payload as { phase?: string }).phase === "tick",
        );

        expect(started).toBeTruthy();
        expect(tick).toBeTruthy();
    });

    it("supports interval emitOnStart and replaces timers by id", () => {
        const emit = vi.fn<(signal: string, payload: unknown) => void>();
        const helper = createTimerSignals({ emit });

        const intervalA = helper.interval({
            id: "shared-id",
            intervalMs: 0,
            signal: "timer:shared",
            emitOnStart: true,
        });

        const immediateTicks = emit.mock.calls.filter(
            ([, payload]) =>
                (payload as { id?: string; phase?: string }).id ===
                    "shared-id" &&
                (payload as { phase?: string }).phase === "tick",
        );
        expect(immediateTicks.length).toBeGreaterThanOrEqual(1);

        const intervalB = helper.interval({
            id: "shared-id",
            intervalMs: 200,
            signal: "timer:shared",
        });

        expect(intervalA.cancel()).toBe(false);
        expect(helper.activeCount()).toBe(1);
        expect(intervalB.pause()).toBe(true);
        expect(intervalB.resume()).toBe(true);
        expect(intervalB.cancel()).toBe(true);
        expect(intervalB.cancel()).toBe(false);
    });

    it("supports cooldown blocked suppression and cancellation lifecycle", () => {
        const emit = vi.fn<(signal: string, payload: unknown) => void>();
        const helper = createTimerSignals({ emit });

        const cooldown = helper.cooldown({
            id: "ability",
            cooldownMs: 300,
            signal: "timer:ability",
            emitBlocked: false,
        });

        expect(cooldown.pause()).toBe(false);
        expect(cooldown.resume()).toBe(false);
        expect(cooldown.trigger({ step: 1 })).toBe(true);
        expect(cooldown.pause()).toBe(true);
        expect(cooldown.trigger({ step: 2 })).toBe(false);
        expect(cooldown.resume()).toBe(true);
        expect(cooldown.cancel()).toBe(true);
        expect(cooldown.cancel()).toBe(false);

        expect(cooldown.trigger({ step: 3 })).toBe(true);
        vi.advanceTimersByTime(300);

        const blockedCalls = emit.mock.calls.filter(
            ([, payload]) =>
                (payload as { phase?: string }).phase === "blocked",
        );
        expect(blockedCalls).toHaveLength(0);

        const cancelledCalls = emit.mock.calls.filter(
            ([, payload]) =>
                (payload as { id?: string; phase?: string }).id === "ability" &&
                (payload as { phase?: string }).phase === "cancelled",
        );
        expect(cancelledCalls).toHaveLength(1);
    });

    it("uses signalBus emit when custom emitter is not provided", () => {
        const helper = createTimerSignals();
        const payloads: unknown[] = [];
        const off = signalBus.on("timer:default-emit", (payload) => {
            payloads.push(payload);
        });

        helper.once({
            id: "default-emitter",
            delayMs: 0,
            signal: "timer:default-emit",
        });

        vi.advanceTimersByTime(0);
        off();

        expect(payloads).toHaveLength(2);
        expect(payloads[0]).toEqual(
            expect.objectContaining({ phase: "started", kind: "once" }),
        );
        expect(payloads[1]).toEqual(
            expect.objectContaining({ phase: "tick", kind: "once" }),
        );
    });
});
