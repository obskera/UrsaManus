import { afterEach, describe, expect, it } from "vitest";
import { signalBus } from "@/services/signalBus";
import {
    OBSERVABILITY_EVENT_RECORDED_SIGNAL,
    OBSERVABILITY_REPORT_SIGNAL,
    createObservabilityBaselineService,
} from "@/services/observabilityBaseline";

describe("observability baseline service", () => {
    afterEach(() => {
        signalBus.clear();
    });

    it("records structured crash/perf/content-validation events", () => {
        const recordedIds: string[] = [];
        signalBus.on(
            OBSERVABILITY_EVENT_RECORDED_SIGNAL,
            (event: { id: string }) => {
                recordedIds.push(event.id);
            },
        );

        const service = createObservabilityBaselineService({
            now: () => 100,
            idFactory: (_atMs, sequence) => `obs-${sequence}`,
        });

        const crash = service.recordCrash({
            source: "runtime.loop",
            code: "unhandled",
            message: "Unhandled exception",
        });
        const perf = service.recordPerfRegression({
            source: "render",
            code: "frame-budget",
            message: "Frame budget exceeded",
        });
        const content = service.recordContentValidationFailure({
            source: "content.import",
            code: "schema-mismatch",
            message: "Dialogue payload invalid",
        });

        expect(crash.category).toBe("crash");
        expect(perf.category).toBe("perf-regression");
        expect(content.category).toBe("content-validation-failure");
        expect(service.size()).toBe(3);
        expect(recordedIds).toEqual(["obs-1", "obs-2", "obs-3"]);
    });

    it("applies retention and snapshot filters", () => {
        let nowMs = 1;
        const service = createObservabilityBaselineService({
            now: () => nowMs,
            maxEvents: 2,
        });

        service.recordCrash({ message: "crash-a", source: "runtime" });
        nowMs = 2;
        service.recordPerfRegression({ message: "perf-b", source: "render" });
        nowMs = 3;
        service.recordContentValidationFailure({
            message: "content-c",
            source: "import",
        });

        expect(service.size()).toBe(2);

        const errors = service.getSnapshot({ severity: "error" });
        expect(errors.events.map((event) => event.message)).toEqual([
            "content-c",
        ]);

        const sinceTwo = service.getSnapshot({ sinceMs: 2 });
        expect(sinceTwo.events.map((event) => event.message)).toEqual([
            "perf-b",
            "content-c",
        ]);

        const limited = service.getSnapshot({ limit: 1 });
        expect(limited.events.map((event) => event.message)).toEqual([
            "content-c",
        ]);
    });

    it("generates baseline report and emits report signal", () => {
        const nowMs = 1000;
        const reports: number[] = [];

        signalBus.on(
            OBSERVABILITY_REPORT_SIGNAL,
            (report: { totalEvents: number }) => {
                reports.push(report.totalEvents);
            },
        );

        const service = createObservabilityBaselineService({
            now: () => nowMs,
        });

        service.recordCrash({ atMs: 100, message: "c1" });
        service.recordCrash({ atMs: 600, message: "c2" });
        service.recordPerfRegression({ atMs: 800, message: "p1" });
        service.recordContentValidationFailure({ atMs: 900, message: "v1" });

        const all = service.getBaselineReport();
        expect(all.totalEvents).toBe(4);
        expect(all.countsByCategory.crash).toBe(2);
        expect(all.countsByCategory["perf-regression"]).toBe(1);
        expect(all.countsByCategory["content-validation-failure"]).toBe(1);

        const windowed = service.getBaselineReport({ windowMs: 250 });
        expect(windowed.totalEvents).toBe(2);
        expect(windowed.countsByCategory.crash).toBe(0);
        expect(windowed.countsByCategory["perf-regression"]).toBe(1);
        expect(windowed.countsByCategory["content-validation-failure"]).toBe(1);

        expect(reports).toEqual([4, 2]);
    });

    it("supports subscription lifecycle and clear events", () => {
        const service = createObservabilityBaselineService();

        const seen: string[] = [];
        const off = service.subscribe((event) => {
            seen.push(event.message);
        });

        service.subscribe(() => {
            throw new Error("listener failed");
        });

        service.recordEvent({
            category: "crash",
            message: "a",
            source: "test",
        });

        off();

        service.recordEvent({
            category: "crash",
            message: "b",
            source: "test",
        });

        expect(seen).toEqual(["a"]);

        service.clearEvents();
        expect(service.size()).toBe(0);
    });
});
