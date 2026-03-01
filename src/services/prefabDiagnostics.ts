import { signalBus } from "@/services/signalBus";
import type {
    PrefabAttachmentReport,
    PrefabAttachFailedStatus,
} from "@/services/prefabCore";

export const PREFAB_DIAGNOSTIC_EVENT_SIGNAL = "prefab:diagnostic:event";
export const PREFAB_HEALTH_REPORT_SIGNAL = "prefab:health:report";

export type PrefabDiagnosticEvent = {
    type: "attach" | "skip" | "failed";
    entityId: string;
    moduleId: string;
    blueprintId?: string;
    code?: string;
    message?: string;
    atMs: number;
};

export type PrefabHealthReport = {
    generatedAtMs: number;
    entitiesSeen: number;
    eventsCaptured: number;
    attachedCount: number;
    skippedCount: number;
    failedCount: number;
    unresolvedDependencies: Array<{
        entityId: string;
        moduleId: string;
        details?: string;
    }>;
    skippedByReason: Record<string, number>;
    failedByReason: Record<string, number>;
};

export type PrefabDiagnosticsService = {
    recordAttachmentReport: (input: {
        blueprintId?: string;
        report: PrefabAttachmentReport;
    }) => void;
    getEvents: () => PrefabDiagnosticEvent[];
    getHealthReport: () => PrefabHealthReport;
    exportHealthReport: (options?: { pretty?: boolean }) => string;
    clear: () => void;
};

function incrementCount(map: Record<string, number>, key: string): void {
    map[key] = (map[key] ?? 0) + 1;
}

function toEvent(input: {
    type: PrefabDiagnosticEvent["type"];
    entityId: string;
    moduleId: string;
    blueprintId?: string;
    code?: string;
    message?: string;
    nowMs: number;
}): PrefabDiagnosticEvent {
    return {
        type: input.type,
        entityId: input.entityId,
        moduleId: input.moduleId,
        ...(input.blueprintId ? { blueprintId: input.blueprintId } : {}),
        ...(input.code ? { code: input.code } : {}),
        ...(input.message ? { message: input.message } : {}),
        atMs: input.nowMs,
    };
}

function toFailureMessage(failed: PrefabAttachFailedStatus): string {
    return failed.error || failed.reason;
}

export function collectUnresolvedDependencies(
    report: PrefabAttachmentReport,
): PrefabHealthReport["unresolvedDependencies"] {
    return report.skipped
        .filter((entry) => entry.reason === "missing-dependency")
        .map((entry) => ({
            entityId: report.entityId,
            moduleId: entry.moduleId,
            ...(entry.details ? { details: entry.details } : {}),
        }));
}

export function createPrefabDiagnosticsService(options?: {
    now?: () => number;
    emit?: <TPayload>(signal: string, payload: TPayload) => void;
}): PrefabDiagnosticsService {
    const now = options?.now ?? (() => Date.now());
    const emit =
        options?.emit ??
        (<TPayload>(signal: string, payload: TPayload) => {
            signalBus.emit(signal, payload);
        });

    const events: PrefabDiagnosticEvent[] = [];
    const entityIds = new Set<string>();

    const computeHealthReport = (): PrefabHealthReport => {
        const skippedByReason: Record<string, number> = {};
        const failedByReason: Record<string, number> = {};
        const unresolvedDependencies: PrefabHealthReport["unresolvedDependencies"] =
            [];

        let attachedCount = 0;
        let skippedCount = 0;
        let failedCount = 0;

        for (const event of events) {
            if (event.type === "attach") {
                attachedCount += 1;
                continue;
            }

            if (event.type === "skip") {
                skippedCount += 1;
                incrementCount(skippedByReason, event.code ?? "unknown");
                if (event.code === "missing-dependency") {
                    unresolvedDependencies.push({
                        entityId: event.entityId,
                        moduleId: event.moduleId,
                        ...(event.message ? { details: event.message } : {}),
                    });
                }
                continue;
            }

            failedCount += 1;
            incrementCount(failedByReason, event.code ?? "unknown");
        }

        return {
            generatedAtMs: Math.max(0, Math.floor(now())),
            entitiesSeen: entityIds.size,
            eventsCaptured: events.length,
            attachedCount,
            skippedCount,
            failedCount,
            unresolvedDependencies,
            skippedByReason,
            failedByReason,
        };
    };

    return {
        recordAttachmentReport: ({ blueprintId, report }) => {
            const timestamp = Math.max(0, Math.floor(now()));
            entityIds.add(report.entityId);

            for (const attached of report.attached) {
                const event = toEvent({
                    type: "attach",
                    entityId: report.entityId,
                    moduleId: attached.moduleId,
                    blueprintId,
                    nowMs: timestamp,
                });
                events.push(event);
                emit(PREFAB_DIAGNOSTIC_EVENT_SIGNAL, event);
            }

            for (const skipped of report.skipped) {
                const event = toEvent({
                    type: "skip",
                    entityId: report.entityId,
                    moduleId: skipped.moduleId,
                    blueprintId,
                    code: skipped.reason,
                    message: skipped.details,
                    nowMs: timestamp,
                });
                events.push(event);
                emit(PREFAB_DIAGNOSTIC_EVENT_SIGNAL, event);
            }

            for (const failed of report.failed) {
                const event = toEvent({
                    type: "failed",
                    entityId: report.entityId,
                    moduleId: failed.moduleId,
                    blueprintId,
                    code: failed.reason,
                    message: toFailureMessage(failed),
                    nowMs: timestamp,
                });
                events.push(event);
                emit(PREFAB_DIAGNOSTIC_EVENT_SIGNAL, event);
            }
        },
        getEvents: () => events.map((entry) => ({ ...entry })),
        getHealthReport: () => {
            const report = computeHealthReport();
            emit(PREFAB_HEALTH_REPORT_SIGNAL, report);
            return report;
        },
        exportHealthReport: (options) => {
            return JSON.stringify(
                {
                    version: "um-prefab-health-report-v1",
                    report: computeHealthReport(),
                },
                null,
                (options?.pretty ?? true) ? 2 : 0,
            );
        },
        clear: () => {
            events.length = 0;
            entityIds.clear();
        },
    };
}
