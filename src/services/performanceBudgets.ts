import { signalBus, type Unsubscribe } from "@/services/signalBus";

export type PerformanceBudgetThresholds = {
    frameMs: number;
    entityCount: number;
    effectCount: number;
    subsystemMs: Record<string, number>;
};

export type PerformanceSubsystemTiming = {
    subsystem: string;
    durationMs: number;
};

export type PerformanceFrameMetrics = {
    frameMs: number;
    entityCount: number;
    effectCount: number;
    subsystemTimings?: PerformanceSubsystemTiming[];
    atMs?: number;
};

export type PerformanceBudgetViolationType =
    | "frame-ms"
    | "entity-count"
    | "effect-count"
    | "subsystem-ms";

export type PerformanceBudgetViolation = {
    type: PerformanceBudgetViolationType;
    metric: string;
    value: number;
    threshold: number;
    subsystem?: string;
};

export type PerformanceSubsystemSummaryItem = {
    subsystem: string;
    samples: number;
    latestMs: number;
    maxMs: number;
    avgMs: number;
};

export type PerformanceBudgetReport = {
    id: string;
    atMs: number;
    metrics: {
        frameMs: number;
        entityCount: number;
        effectCount: number;
    };
    violations: PerformanceBudgetViolation[];
    exceeded: boolean;
};

export type PerformanceBudgetAlertEvent = {
    report: PerformanceBudgetReport;
    violations: PerformanceBudgetViolation[];
    message: string;
};

export type PerformanceBudgetListener = (
    report: PerformanceBudgetReport,
    alert: PerformanceBudgetAlertEvent | null,
) => void;

export type PerformanceBudgetService = {
    evaluateFrame: (
        metrics: PerformanceFrameMetrics,
    ) => PerformanceBudgetReport;
    setThresholds: (thresholds: Partial<PerformanceBudgetThresholds>) => void;
    getThresholds: () => PerformanceBudgetThresholds;
    getLastReport: () => PerformanceBudgetReport | null;
    getRecentReports: (limit?: number) => PerformanceBudgetReport[];
    getSubsystemSummary: (options?: {
        limit?: number;
    }) => PerformanceSubsystemSummaryItem[];
    subscribe: (listener: PerformanceBudgetListener) => Unsubscribe;
    createAlertLogHook: (options?: {
        sink?: (line: string, event: PerformanceBudgetAlertEvent) => void;
        formatter?: (event: PerformanceBudgetAlertEvent) => string;
    }) => Unsubscribe;
    clearHistory: () => void;
};

export const PERFORMANCE_BUDGET_EVALUATED_SIGNAL =
    "performance:budget:evaluated";
export const PERFORMANCE_BUDGET_ALERT_SIGNAL = "performance:budget:alert";

const DEFAULT_THRESHOLDS: PerformanceBudgetThresholds = {
    frameMs: 16,
    entityCount: 300,
    effectCount: 120,
    subsystemMs: {
        physics: 6,
        collision: 4,
        render: 10,
    },
};

const DEFAULT_MAX_REPORTS = 240;

function normalizeNumber(value: number | undefined, fallback: number): number {
    if (!Number.isFinite(value)) {
        return fallback;
    }

    return Math.max(0, value ?? fallback);
}

function normalizeThresholds(
    thresholds: Partial<PerformanceBudgetThresholds> | undefined,
    previous: PerformanceBudgetThresholds,
): PerformanceBudgetThresholds {
    const subsystemMs = thresholds?.subsystemMs
        ? { ...previous.subsystemMs, ...thresholds.subsystemMs }
        : { ...previous.subsystemMs };

    return {
        frameMs: normalizeNumber(thresholds?.frameMs, previous.frameMs),
        entityCount: normalizeNumber(
            thresholds?.entityCount,
            previous.entityCount,
        ),
        effectCount: normalizeNumber(
            thresholds?.effectCount,
            previous.effectCount,
        ),
        subsystemMs,
    };
}

function normalizeTimingEntries(
    entries: PerformanceSubsystemTiming[] | undefined,
): PerformanceSubsystemTiming[] {
    if (!entries || entries.length === 0) {
        return [];
    }

    return entries
        .map((entry) => {
            const subsystem = entry.subsystem.trim();
            if (!subsystem) {
                return null;
            }

            return {
                subsystem,
                durationMs: normalizeNumber(entry.durationMs, 0),
            };
        })
        .filter((entry): entry is PerformanceSubsystemTiming => Boolean(entry));
}

function createAlertMessage(event: PerformanceBudgetAlertEvent): string {
    const details = event.violations
        .map((violation) => {
            if (violation.type === "subsystem-ms") {
                return `${violation.metric} ${violation.value.toFixed(2)}>${violation.threshold.toFixed(2)}ms`;
            }

            return `${violation.metric} ${violation.value.toFixed(2)}>${violation.threshold.toFixed(2)}`;
        })
        .join(" | ");

    return `[perf-budget] ${details}`;
}

export function createPerformanceBudgetService(options?: {
    now?: () => number;
    emit?: <TPayload>(signal: string, payload: TPayload) => void;
    maxReports?: number;
    thresholds?: Partial<PerformanceBudgetThresholds>;
    idFactory?: (atMs: number, sequence: number) => string;
}): PerformanceBudgetService {
    const now = options?.now ?? (() => Date.now());
    const emit =
        options?.emit ??
        (<TPayload>(signal: string, payload: TPayload) => {
            signalBus.emit(signal, payload);
        });

    const maxReports = Math.max(
        1,
        Math.floor(normalizeNumber(options?.maxReports, DEFAULT_MAX_REPORTS)),
    );

    const listeners = new Set<PerformanceBudgetListener>();
    const reports: PerformanceBudgetReport[] = [];
    const subsystemHistory = new Map<string, number[]>();

    let sequence = 0;
    let thresholds = normalizeThresholds(
        options?.thresholds,
        DEFAULT_THRESHOLDS,
    );

    const getThresholds: PerformanceBudgetService["getThresholds"] = () => ({
        frameMs: thresholds.frameMs,
        entityCount: thresholds.entityCount,
        effectCount: thresholds.effectCount,
        subsystemMs: { ...thresholds.subsystemMs },
    });

    const setThresholds: PerformanceBudgetService["setThresholds"] = (
        partial,
    ) => {
        thresholds = normalizeThresholds(partial, thresholds);
    };

    const getLastReport: PerformanceBudgetService["getLastReport"] = () => {
        return reports[reports.length - 1] ?? null;
    };

    const getRecentReports: PerformanceBudgetService["getRecentReports"] = (
        limit,
    ) => {
        const normalizedLimit = Number.isFinite(limit)
            ? Math.max(0, Math.floor(limit ?? reports.length))
            : reports.length;

        if (normalizedLimit === 0) {
            return [];
        }

        return reports.slice(Math.max(0, reports.length - normalizedLimit));
    };

    const getSubsystemSummary: PerformanceBudgetService["getSubsystemSummary"] =
        (summaryOptions) => {
            const all = Array.from(subsystemHistory.entries()).map(
                ([subsystem, samples]) => {
                    const latestMs = samples[samples.length - 1] ?? 0;
                    const maxMs = samples.reduce(
                        (currentMax, value) => Math.max(currentMax, value),
                        0,
                    );
                    const total = samples.reduce(
                        (sum, value) => sum + value,
                        0,
                    );
                    const avgMs =
                        samples.length > 0 ? total / samples.length : 0;

                    return {
                        subsystem,
                        samples: samples.length,
                        latestMs,
                        maxMs,
                        avgMs,
                    };
                },
            );

            const sorted = all.sort((a, b) => {
                if (a.avgMs === b.avgMs) {
                    return a.subsystem.localeCompare(b.subsystem);
                }

                return b.avgMs - a.avgMs;
            });

            const normalizedLimit = Number.isFinite(summaryOptions?.limit)
                ? Math.max(
                      0,
                      Math.floor(summaryOptions?.limit ?? sorted.length),
                  )
                : sorted.length;

            if (normalizedLimit === 0) {
                return [];
            }

            return sorted.slice(0, normalizedLimit);
        };

    const evaluateFrame: PerformanceBudgetService["evaluateFrame"] = (
        metrics,
    ) => {
        const atMs = normalizeNumber(metrics.atMs, normalizeNumber(now(), 0));
        sequence += 1;

        const reportId =
            options?.idFactory?.(atMs, sequence) ?? `perf-${atMs}-${sequence}`;

        const frameMs = normalizeNumber(metrics.frameMs, 0);
        const entityCount = Math.floor(normalizeNumber(metrics.entityCount, 0));
        const effectCount = Math.floor(normalizeNumber(metrics.effectCount, 0));
        const subsystemTimings = normalizeTimingEntries(
            metrics.subsystemTimings,
        );

        const violations: PerformanceBudgetViolation[] = [];

        if (frameMs > thresholds.frameMs) {
            violations.push({
                type: "frame-ms",
                metric: "frameMs",
                value: frameMs,
                threshold: thresholds.frameMs,
            });
        }

        if (entityCount > thresholds.entityCount) {
            violations.push({
                type: "entity-count",
                metric: "entityCount",
                value: entityCount,
                threshold: thresholds.entityCount,
            });
        }

        if (effectCount > thresholds.effectCount) {
            violations.push({
                type: "effect-count",
                metric: "effectCount",
                value: effectCount,
                threshold: thresholds.effectCount,
            });
        }

        for (const timing of subsystemTimings) {
            const entries = subsystemHistory.get(timing.subsystem) ?? [];
            entries.push(timing.durationMs);
            subsystemHistory.set(timing.subsystem, entries);

            const subsystemThreshold = thresholds.subsystemMs[timing.subsystem];
            if (
                Number.isFinite(subsystemThreshold) &&
                timing.durationMs > subsystemThreshold
            ) {
                violations.push({
                    type: "subsystem-ms",
                    metric: `${timing.subsystem}Ms`,
                    subsystem: timing.subsystem,
                    value: timing.durationMs,
                    threshold: subsystemThreshold,
                });
            }
        }

        const report: PerformanceBudgetReport = {
            id: reportId,
            atMs,
            metrics: {
                frameMs,
                entityCount,
                effectCount,
            },
            violations,
            exceeded: violations.length > 0,
        };

        reports.push(report);
        if (reports.length > maxReports) {
            reports.splice(0, reports.length - maxReports);
        }

        emit<PerformanceBudgetReport>(
            PERFORMANCE_BUDGET_EVALUATED_SIGNAL,
            report,
        );

        const alertEvent = report.exceeded
            ? {
                  report,
                  violations,
                  message: "",
              }
            : null;

        if (alertEvent) {
            alertEvent.message = createAlertMessage(alertEvent);
            emit<PerformanceBudgetAlertEvent>(
                PERFORMANCE_BUDGET_ALERT_SIGNAL,
                alertEvent,
            );
        }

        for (const listener of listeners) {
            try {
                listener(report, alertEvent);
            } catch {
                continue;
            }
        }

        return report;
    };

    const subscribe: PerformanceBudgetService["subscribe"] = (listener) => {
        listeners.add(listener);

        return () => {
            listeners.delete(listener);
        };
    };

    const createAlertLogHook: PerformanceBudgetService["createAlertLogHook"] = (
        hookOptions,
    ) => {
        const formatter =
            hookOptions?.formatter ??
            ((event: PerformanceBudgetAlertEvent) => createAlertMessage(event));
        const sink =
            hookOptions?.sink ??
            ((line: string) => {
                console.warn(line);
            });

        return subscribe((_report, alert) => {
            if (!alert) {
                return;
            }

            sink(formatter(alert), alert);
        });
    };

    const clearHistory: PerformanceBudgetService["clearHistory"] = () => {
        reports.length = 0;
        subsystemHistory.clear();
    };

    return {
        evaluateFrame,
        setThresholds,
        getThresholds,
        getLastReport,
        getRecentReports,
        getSubsystemSummary,
        subscribe,
        createAlertLogHook,
        clearHistory,
    };
}

export const performanceBudgets = createPerformanceBudgetService();
