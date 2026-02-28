import { afterEach, describe, expect, it, vi } from "vitest";
import { signalBus } from "@/services/signalBus";
import {
    ERROR_TELEMETRY_CAPTURED_SIGNAL,
    ERROR_TELEMETRY_CLEARED_SIGNAL,
    createErrorTelemetry,
} from "@/services/errorTelemetry";

describe("error telemetry service", () => {
    afterEach(() => {
        signalBus.clear();
    });

    it("captures structured runtime error events with context", () => {
        const telemetry = createErrorTelemetry({
            now: () => 1200,
            maxEvents: 5,
        });

        const event = telemetry.capture(new TypeError("Physics blew up"), {
            subsystem: "physics",
            statePhase: "play",
            entityRefs: [{ id: " player-1 " }, { id: " " }],
            metadata: { frame: 24 },
            source: "collision-system",
        });

        expect(event).toMatchObject({
            atMs: 1200,
            severity: "error",
            subsystem: "physics",
            statePhase: "play",
            message: "Physics blew up",
            name: "TypeError",
            entityRefs: [{ id: "player-1" }],
            source: "collision-system",
            metadata: { frame: 24 },
        });
        expect(telemetry.size()).toBe(1);
        expect(telemetry.getLatest()?.id).toBe(event.id);
    });

    it("keeps bounded history and supports snapshot filters", () => {
        let nowMs = 10;
        const telemetry = createErrorTelemetry({
            now: () => nowMs,
            maxEvents: 2,
        });

        telemetry.record("startup info", {
            severity: "info",
            subsystem: "boot",
            statePhase: "boot",
        });
        nowMs = 20;
        telemetry.record("render warning", {
            severity: "warning",
            subsystem: "render",
            statePhase: "play",
        });
        nowMs = 30;
        telemetry.record("logic error", {
            severity: "error",
            subsystem: "logic",
            statePhase: "play",
        });

        const snapshot = telemetry.getSnapshot();
        expect(snapshot.total).toBe(2);
        expect(snapshot.events.map((event) => event.message)).toEqual([
            "render warning",
            "logic error",
        ]);

        const playOnly = telemetry.getSnapshot({ statePhase: "play" });
        expect(playOnly.events).toHaveLength(2);

        const errorsOnly = telemetry.getSnapshot({ severity: "error" });
        expect(errorsOnly.events.map((event) => event.message)).toEqual([
            "logic error",
        ]);

        const sinceTwenty = telemetry.getSnapshot({ sinceMs: 20, limit: 1 });
        expect(sinceTwenty.events.map((event) => event.message)).toEqual([
            "logic error",
        ]);
    });

    it("emits lifecycle signals and tolerates subscriber failures", () => {
        const capturedEvents: string[] = [];
        const clearedEvents: number[] = [];

        signalBus.on(
            ERROR_TELEMETRY_CAPTURED_SIGNAL,
            (event: { message: string }) => {
                capturedEvents.push(event.message);
            },
        );
        signalBus.on(
            ERROR_TELEMETRY_CLEARED_SIGNAL,
            (event: { removedCount: number }) => {
                clearedEvents.push(event.removedCount);
            },
        );

        const telemetry = createErrorTelemetry();

        telemetry.subscribe(() => {
            throw new Error("listener failed");
        });

        const observed: string[] = [];
        telemetry.subscribe((event) => {
            observed.push(event.message);
        });

        expect(() => {
            telemetry.record("first", { subsystem: "data" });
            telemetry.record("second", { subsystem: "data" });
        }).not.toThrow();

        telemetry.clear();

        expect(observed).toEqual(["first", "second"]);
        expect(capturedEvents).toEqual(["first", "second"]);
        expect(clearedEvents).toEqual([2]);
        expect(telemetry.size()).toBe(0);
    });

    it("creates removable dev log hooks", () => {
        const sink = vi.fn();
        const telemetry = createErrorTelemetry({ now: () => 7 });

        const offLog = telemetry.createLogHook({ sink });

        telemetry.record("map warning", {
            severity: "warning",
            subsystem: "worldgen",
            statePhase: "play",
            entityRefs: [{ id: "zone-a" }],
        });

        expect(sink).toHaveBeenCalledTimes(1);
        const [line] = sink.mock.calls[0] as [string];
        expect(line).toContain("[telemetry][warning][worldgen][play]");
        expect(line).toContain("entities=zone-a");

        offLog();
        telemetry.record("after unhook", { subsystem: "worldgen" });

        expect(sink).toHaveBeenCalledTimes(1);
    });
});
