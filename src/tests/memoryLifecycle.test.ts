import { afterEach, describe, expect, it } from "vitest";
import { signalBus } from "@/services/signalBus";
import {
    MEMORY_ALLOCATED_SIGNAL,
    MEMORY_DISPOSED_SIGNAL,
    MEMORY_LEAK_DETECTED_SIGNAL,
    MEMORY_LEAK_SCAN_COMPLETED_SIGNAL,
    createMemoryLifecycleService,
} from "@/services/memoryLifecycle";

describe("memory lifecycle service", () => {
    afterEach(() => {
        signalBus.clear();
    });

    it("tracks allocate/dispose contracts and snapshot totals", () => {
        const events: string[] = [];

        signalBus.on(MEMORY_ALLOCATED_SIGNAL, () => {
            events.push("allocated");
        });
        signalBus.on(MEMORY_DISPOSED_SIGNAL, () => {
            events.push("disposed");
        });

        const service = createMemoryLifecycleService({
            now: () => 100,
            idFactory: (_atMs, sequence) => `res-${sequence}`,
        });

        const texture = service.allocate({
            type: "texture",
            label: "player-atlas",
            sizeBytes: 4096,
        });
        const cache = service.allocate({
            type: "runtime-cache",
            sizeBytes: 2048,
        });

        expect(texture.id).toBe("res-1");
        expect(cache.id).toBe("res-2");

        expect(service.dispose(texture.id)).toBe(true);
        expect(service.dispose(texture.id)).toBe(false);

        const snapshot = service.getSnapshot();
        expect(snapshot.activeCount).toBe(1);
        expect(snapshot.disposedCount).toBe(1);
        expect(snapshot.activeBytes).toBe(2048);
        expect(snapshot.disposedBytes).toBe(4096);
        expect(snapshot.byType.texture.activeCount).toBe(0);
        expect(snapshot.byType["runtime-cache"].activeCount).toBe(1);

        expect(events).toEqual(["allocated", "allocated", "disposed"]);
    });

    it("touches active records and supports typed disposal", () => {
        let nowMs = 0;
        const service = createMemoryLifecycleService({ now: () => nowMs });

        const emitterA = service.allocate({ type: "emitter", sizeBytes: 10 });
        service.allocate({ type: "emitter", sizeBytes: 12 });
        const texture = service.allocate({ type: "texture", sizeBytes: 25 });

        nowMs = 50;
        expect(service.touch(emitterA.id)).toBe(true);

        const touched = service.getAllocation(emitterA.id);
        expect(touched?.lastTouchedAtMs).toBe(50);

        const disposed = service.disposeByType("emitter");
        expect(disposed).toBe(2);

        const active = service.listActiveAllocations();
        expect(active.map((record) => record.id)).toEqual([texture.id]);
    });

    it("detects leak diagnostics for long-lived allocations", () => {
        let nowMs = 0;
        const detected: string[] = [];
        const scans: number[] = [];

        signalBus.on(
            MEMORY_LEAK_DETECTED_SIGNAL,
            (payload: { allocationId: string }) => {
                detected.push(payload.allocationId);
            },
        );
        signalBus.on(
            MEMORY_LEAK_SCAN_COMPLETED_SIGNAL,
            (payload: { inspected: number }) => {
                scans.push(payload.inspected);
            },
        );

        const service = createMemoryLifecycleService({
            now: () => nowMs,
            defaultLeakThresholdMs: 100,
            idFactory: (_atMs, sequence) => `res-${sequence}`,
        });

        const oldTexture = service.allocate({
            type: "texture",
            sizeBytes: 5000,
        });
        const smallCache = service.allocate({
            type: "runtime-cache",
            sizeBytes: 4,
        });

        nowMs = 150;
        const scan = service.scanForLeaks({ minBytes: 100 });

        expect(scan.inspected).toBe(2);
        expect(scan.leaks).toHaveLength(1);
        expect(scan.leaks[0]?.allocationId).toBe(oldTexture.id);
        expect(scan.leaks[0]?.ageMs).toBe(150);

        expect(detected).toEqual([oldTexture.id]);
        expect(scans).toEqual([2]);

        const history = service.getLeakDiagnostics();
        expect(history).toHaveLength(1);

        service.dispose(oldTexture.id);
        service.dispose(smallCache.id);
        service.clearDisposedHistory();

        expect(service.getAllocation(oldTexture.id)).toBeNull();
    });

    it("filters active allocations by type and max age", () => {
        let nowMs = 0;
        const service = createMemoryLifecycleService({ now: () => nowMs });

        service.allocate({ type: "audio-buffer", sizeBytes: 10 });
        nowMs = 20;
        service.allocate({ type: "audio-buffer", sizeBytes: 20 });
        service.allocate({ type: "custom", sizeBytes: 5 });

        nowMs = 40;
        const typeOnly = service.listActiveAllocations({
            type: "audio-buffer",
        });
        expect(typeOnly).toHaveLength(2);

        const recentOnly = service.listActiveAllocations({
            type: "audio-buffer",
            maxAgeMs: 25,
        });
        expect(recentOnly).toHaveLength(1);

        const noLeaks = service.scanForLeaks({
            maxAgeMs: 100,
            types: ["custom"],
        });
        expect(noLeaks.leaks).toHaveLength(0);
    });
});
