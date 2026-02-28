import { afterEach, describe, expect, it, vi } from "vitest";
import { signalBus } from "@/services/signalBus";
import {
    PERFORMANCE_BUDGET_ALERT_SIGNAL,
    PERFORMANCE_BUDGET_EVALUATED_SIGNAL,
    createPerformanceBudgetService,
} from "@/services/performanceBudgets";

describe("performance budgets service", () => {
    afterEach(() => {
        signalBus.clear();
    });

    it("evaluates frame/entity/effect/subsystem thresholds and emits alerts", () => {
        const evaluatedIds: string[] = [];
        const alertMessages: string[] = [];

        signalBus.on(
            PERFORMANCE_BUDGET_EVALUATED_SIGNAL,
            (report: { id: string }) => {
                evaluatedIds.push(report.id);
            },
        );
        signalBus.on(
            PERFORMANCE_BUDGET_ALERT_SIGNAL,
            (event: { message: string }) => {
                alertMessages.push(event.message);
            },
        );

        const service = createPerformanceBudgetService({
            now: () => 100,
            thresholds: {
                frameMs: 16,
                entityCount: 10,
                effectCount: 5,
                subsystemMs: {
                    physics: 4,
                },
            },
            idFactory: (_atMs, sequence) => `report-${sequence}`,
        });

        const report = service.evaluateFrame({
            frameMs: 24,
            entityCount: 12,
            effectCount: 8,
            subsystemTimings: [
                { subsystem: "physics", durationMs: 6 },
                { subsystem: "render", durationMs: 2 },
            ],
        });

        expect(report.id).toBe("report-1");
        expect(report.exceeded).toBe(true);
        expect(report.violations.map((violation) => violation.type)).toEqual([
            "frame-ms",
            "entity-count",
            "effect-count",
            "subsystem-ms",
        ]);
        expect(evaluatedIds).toEqual(["report-1"]);
        expect(alertMessages).toHaveLength(1);
        expect(alertMessages[0]).toContain("frameMs 24.00>16.00");
        expect(alertMessages[0]).toContain("physicsMs 6.00>4.00ms");
    });

    it("tracks subsystem timing summaries and recent bounded reports", () => {
        let nowMs = 0;
        const service = createPerformanceBudgetService({
            now: () => nowMs,
            maxReports: 2,
            thresholds: {
                subsystemMs: {
                    physics: 100,
                    ai: 100,
                },
            },
        });

        nowMs = 10;
        service.evaluateFrame({
            frameMs: 8,
            entityCount: 3,
            effectCount: 1,
            subsystemTimings: [
                { subsystem: "physics", durationMs: 2 },
                { subsystem: "ai", durationMs: 6 },
            ],
        });

        nowMs = 20;
        service.evaluateFrame({
            frameMs: 9,
            entityCount: 4,
            effectCount: 1,
            subsystemTimings: [
                { subsystem: "physics", durationMs: 4 },
                { subsystem: "ai", durationMs: 10 },
            ],
        });

        nowMs = 30;
        service.evaluateFrame({
            frameMs: 10,
            entityCount: 4,
            effectCount: 2,
            subsystemTimings: [{ subsystem: "physics", durationMs: 8 }],
        });

        const reports = service.getRecentReports();
        expect(reports).toHaveLength(2);
        expect(reports.map((report) => report.atMs)).toEqual([20, 30]);

        const summary = service.getSubsystemSummary();
        expect(summary[0]).toMatchObject({
            subsystem: "ai",
            samples: 2,
            latestMs: 10,
            maxMs: 10,
            avgMs: 8,
        });
        expect(summary[1]).toMatchObject({
            subsystem: "physics",
            samples: 3,
            latestMs: 8,
            maxMs: 8,
            avgMs: 14 / 3,
        });

        expect(service.getSubsystemSummary({ limit: 1 })).toHaveLength(1);
    });

    it("supports listener subscriptions and removable alert log hooks", () => {
        const service = createPerformanceBudgetService({
            thresholds: {
                frameMs: 5,
            },
        });

        const reportsSeen: string[] = [];
        const offListener = service.subscribe((report, alert) => {
            reportsSeen.push(`${report.id}:${alert ? "alert" : "ok"}`);
        });

        service.subscribe(() => {
            throw new Error("bad listener");
        });

        const sink = vi.fn();
        const offLog = service.createAlertLogHook({ sink });

        service.evaluateFrame({
            frameMs: 8,
            entityCount: 0,
            effectCount: 0,
        });

        offListener();
        offLog();

        service.evaluateFrame({
            frameMs: 1,
            entityCount: 0,
            effectCount: 0,
        });

        expect(reportsSeen).toHaveLength(1);
        expect(reportsSeen[0]).toContain(":alert");
        expect(sink).toHaveBeenCalledTimes(1);

        service.clearHistory();
        expect(service.getRecentReports()).toHaveLength(0);
        expect(service.getSubsystemSummary()).toHaveLength(0);
    });

    it("updates thresholds incrementally and returns immutable threshold snapshots", () => {
        const service = createPerformanceBudgetService({
            thresholds: {
                frameMs: 20,
                subsystemMs: { physics: 7 },
            },
        });

        const before = service.getThresholds();
        before.subsystemMs.physics = 999;

        service.setThresholds({
            frameMs: 12,
            subsystemMs: { render: 9 },
        });

        const after = service.getThresholds();
        expect(after.frameMs).toBe(12);
        expect(after.subsystemMs.physics).toBe(7);
        expect(after.subsystemMs.render).toBe(9);

        const report = service.evaluateFrame({
            frameMs: 13,
            entityCount: 0,
            effectCount: 0,
            subsystemTimings: [{ subsystem: "render", durationMs: 8 }],
        });

        expect(report.violations.map((violation) => violation.type)).toEqual([
            "frame-ms",
        ]);
    });
});
