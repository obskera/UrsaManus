import { afterEach, describe, expect, it } from "vitest";
import { signalBus } from "@/services/signalBus";
import {
    PROFILING_SNAPSHOT_CAPTURED_SIGNAL,
    PROFILING_SNAPSHOT_COMPARED_SIGNAL,
    createProfilingSnapshotService,
} from "@/services/profilingSnapshots";

describe("profiling snapshots service", () => {
    afterEach(() => {
        signalBus.clear();
    });

    it("captures one-click snapshots and emits capture signal", () => {
        const capturedIds: string[] = [];

        signalBus.on(
            PROFILING_SNAPSHOT_CAPTURED_SIGNAL,
            (snapshot: { id: string }) => {
                capturedIds.push(snapshot.id);
            },
        );

        const service = createProfilingSnapshotService({
            now: () => 50,
            idFactory: (_atMs, sequence) => `snap-${sequence}`,
        });

        const snapshot = service.captureSnapshot({
            label: " baseline ",
            frameMs: 12.3,
            entityCount: 44,
            activeEffects: 7,
            subsystemTimings: [
                { subsystem: " render ", durationMs: 5 },
                { subsystem: "physics", durationMs: 4 },
                { subsystem: "", durationMs: 99 },
            ],
            metadata: { source: "dev-button" },
        });

        expect(snapshot).toMatchObject({
            id: "snap-1",
            label: "baseline",
            atMs: 50,
            frameMs: 12.3,
            entityCount: 44,
            activeEffects: 7,
            metadata: { source: "dev-button" },
        });
        expect(snapshot.subsystemTimings).toEqual([
            { subsystem: "physics", durationMs: 4 },
            { subsystem: "render", durationMs: 5 },
        ]);
        expect(capturedIds).toEqual(["snap-1"]);
    });

    it("supports snapshot diff comparisons and regression detection", () => {
        const comparedPairs: string[] = [];
        signalBus.on(
            PROFILING_SNAPSHOT_COMPARED_SIGNAL,
            (comparison: { baseId: string; targetId: string }) => {
                comparedPairs.push(
                    `${comparison.baseId}->${comparison.targetId}`,
                );
            },
        );

        const service = createProfilingSnapshotService({
            now: () => 1,
            idFactory: (_atMs, sequence) => `snap-${sequence}`,
        });

        service.captureSnapshot({
            frameMs: 14,
            entityCount: 100,
            activeEffects: 10,
            subsystemTimings: [{ subsystem: "physics", durationMs: 3 }],
        });
        service.captureSnapshot({
            frameMs: 18,
            entityCount: 130,
            activeEffects: 24,
            subsystemTimings: [
                { subsystem: "physics", durationMs: 7 },
                { subsystem: "render", durationMs: 8 },
            ],
        });

        const comparison = service.compareSnapshots("snap-1", "snap-2", {
            thresholds: {
                frameMsDelta: 2,
                entityCountDelta: 20,
                activeEffectsDelta: 10,
                subsystemMsDelta: 2,
            },
        });

        expect(comparison).not.toBeNull();
        expect(comparison?.deltas).toEqual({
            frameMs: 4,
            entityCount: 30,
            activeEffects: 14,
            subsystemMs: {
                physics: 4,
                render: 8,
            },
        });
        expect(comparison?.hasRegression).toBe(true);
        expect(comparison?.regressions.map((entry) => entry.metric)).toEqual([
            "physicsMs",
            "renderMs",
            "frameMs",
            "entityCount",
            "activeEffects",
        ]);
        expect(comparedPairs).toEqual(["snap-1->snap-2"]);
    });

    it("compares latest to previous and handles missing snapshots safely", () => {
        const service = createProfilingSnapshotService({ maxSnapshots: 2 });

        expect(service.compareLatestToPrevious()).toBeNull();

        service.captureSnapshot({
            frameMs: 10,
            entityCount: 5,
            activeEffects: 1,
        });
        expect(service.compareLatestToPrevious()).toBeNull();

        service.captureSnapshot({
            frameMs: 11,
            entityCount: 7,
            activeEffects: 1,
        });
        service.captureSnapshot({
            frameMs: 13,
            entityCount: 8,
            activeEffects: 2,
        });

        const snapshots = service.getRecentSnapshots();
        expect(snapshots).toHaveLength(2);

        const latestComparison = service.compareLatestToPrevious({
            thresholds: { frameMsDelta: 10 },
        });
        expect(latestComparison?.hasRegression).toBe(false);

        expect(service.compareSnapshots("missing", snapshots[0].id)).toBeNull();
    });

    it("supports listeners and cleanup flows", () => {
        const service = createProfilingSnapshotService({
            idFactory: (_atMs, sequence) => `snap-${sequence}`,
        });

        const observed: string[] = [];
        const off = service.subscribe((snapshot, comparison) => {
            observed.push(`${snapshot.id}:${comparison ? "cmp" : "cap"}`);
        });

        service.subscribe(() => {
            throw new Error("bad listener");
        });

        service.captureSnapshot({
            frameMs: 8,
            entityCount: 3,
            activeEffects: 1,
        });
        service.captureSnapshot({
            frameMs: 9,
            entityCount: 6,
            activeEffects: 1,
        });
        service.compareLatestToPrevious();

        off();
        service.captureSnapshot({
            frameMs: 9,
            entityCount: 6,
            activeEffects: 2,
        });

        expect(observed).toEqual(["snap-1:cap", "snap-2:cap", "snap-2:cmp"]);

        expect(service.getLatestSnapshot()?.id).toBe("snap-3");
        expect(service.getSnapshot("snap-1")?.id).toBe("snap-1");

        service.clearSnapshots();
        expect(service.getRecentSnapshots()).toEqual([]);
    });
});
