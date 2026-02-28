import { signalBus, type Unsubscribe } from "@/services/signalBus";

export type ObservabilityEventCategory =
    | "crash"
    | "perf-regression"
    | "content-validation-failure";

export type ObservabilitySeverity = "error" | "warning" | "info";

export type ObservabilityEvent = {
    id: string;
    atMs: number;
    category: ObservabilityEventCategory;
    severity: ObservabilitySeverity;
    source: string;
    code: string;
    message: string;
    metadata?: Record<string, unknown>;
};

export type ObservabilityEventInput = {
    atMs?: number;
    category: ObservabilityEventCategory;
    severity?: ObservabilitySeverity;
    source?: string;
    code?: string;
    message: string;
    metadata?: Record<string, unknown>;
};

export type ObservabilityEventFilter = {
    category?: ObservabilityEventCategory;
    severity?: ObservabilitySeverity;
    source?: string;
    sinceMs?: number;
    limit?: number;
};

export type ObservabilitySnapshot = {
    total: number;
    events: ObservabilityEvent[];
};

export type ObservabilityBaselineReport = {
    atMs: number;
    totalEvents: number;
    countsByCategory: Record<ObservabilityEventCategory, number>;
    countsBySeverity: Record<ObservabilitySeverity, number>;
    latestByCategory: Partial<
        Record<ObservabilityEventCategory, ObservabilityEvent>
    >;
    windowMs: number | null;
};

export type ObservabilityBaselineService = {
    recordEvent: (input: ObservabilityEventInput) => ObservabilityEvent;
    recordCrash: (
        input: Omit<ObservabilityEventInput, "category">,
    ) => ObservabilityEvent;
    recordPerfRegression: (
        input: Omit<ObservabilityEventInput, "category">,
    ) => ObservabilityEvent;
    recordContentValidationFailure: (
        input: Omit<ObservabilityEventInput, "category">,
    ) => ObservabilityEvent;
    getSnapshot: (filter?: ObservabilityEventFilter) => ObservabilitySnapshot;
    getBaselineReport: (options?: {
        windowMs?: number;
    }) => ObservabilityBaselineReport;
    clearEvents: () => void;
    size: () => number;
    subscribe: (listener: (event: ObservabilityEvent) => void) => Unsubscribe;
};

export const OBSERVABILITY_EVENT_RECORDED_SIGNAL =
    "observability:baseline:event-recorded";
export const OBSERVABILITY_REPORT_SIGNAL = "observability:baseline:report";

const DEFAULT_MAX_EVENTS = 1000;

function normalizeNow(now: () => number): number {
    const value = now();
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, value);
}

function normalizeSource(source: string | undefined): string {
    const value = source?.trim();
    if (!value) {
        return "unknown";
    }

    return value;
}

function normalizeCode(code: string | undefined): string {
    const value = code?.trim();
    if (!value) {
        return "unspecified";
    }

    return value;
}

function normalizeMessage(message: string): string {
    const value = message.trim();
    if (!value) {
        return "observability event";
    }

    return value;
}

export function createObservabilityBaselineService(options?: {
    now?: () => number;
    maxEvents?: number;
    emit?: <TPayload>(signal: string, payload: TPayload) => void;
    idFactory?: (atMs: number, sequence: number) => string;
}): ObservabilityBaselineService {
    const now = options?.now ?? (() => Date.now());
    const maxEvents = Math.max(
        1,
        Math.floor(options?.maxEvents ?? DEFAULT_MAX_EVENTS),
    );
    const emit =
        options?.emit ??
        (<TPayload>(signal: string, payload: TPayload) => {
            signalBus.emit(signal, payload);
        });

    const events: ObservabilityEvent[] = [];
    const listeners = new Set<(event: ObservabilityEvent) => void>();
    let sequence = 0;

    const recordEvent: ObservabilityBaselineService["recordEvent"] = (
        input,
    ) => {
        const atMs = normalizeNow(() => input.atMs ?? now());
        sequence += 1;
        const id =
            options?.idFactory?.(atMs, sequence) ??
            `obs-${input.category}-${atMs}-${sequence}`;

        const event: ObservabilityEvent = {
            id,
            atMs,
            category: input.category,
            severity: input.severity ?? "error",
            source: normalizeSource(input.source),
            code: normalizeCode(input.code),
            message: normalizeMessage(input.message),
            ...(input.metadata ? { metadata: input.metadata } : {}),
        };

        events.push(event);
        if (events.length > maxEvents) {
            events.splice(0, events.length - maxEvents);
        }

        emit<ObservabilityEvent>(OBSERVABILITY_EVENT_RECORDED_SIGNAL, event);

        for (const listener of listeners) {
            try {
                listener(event);
            } catch {
                continue;
            }
        }

        return event;
    };

    const recordCrash: ObservabilityBaselineService["recordCrash"] = (
        input,
    ) => {
        return recordEvent({
            ...input,
            category: "crash",
            severity: input.severity ?? "error",
        });
    };

    const recordPerfRegression: ObservabilityBaselineService["recordPerfRegression"] =
        (input) => {
            return recordEvent({
                ...input,
                category: "perf-regression",
                severity: input.severity ?? "warning",
            });
        };

    const recordContentValidationFailure: ObservabilityBaselineService["recordContentValidationFailure"] =
        (input) => {
            return recordEvent({
                ...input,
                category: "content-validation-failure",
                severity: input.severity ?? "error",
            });
        };

    const getSnapshot: ObservabilityBaselineService["getSnapshot"] = (
        filter,
    ) => {
        const filtered = events.filter((event) => {
            if (filter?.category && event.category !== filter.category) {
                return false;
            }

            if (filter?.severity && event.severity !== filter.severity) {
                return false;
            }

            if (filter?.source && event.source !== filter.source) {
                return false;
            }

            if (
                Number.isFinite(filter?.sinceMs) &&
                filter?.sinceMs !== undefined &&
                event.atMs < filter.sinceMs
            ) {
                return false;
            }

            return true;
        });

        const limit = Number.isFinite(filter?.limit)
            ? Math.max(0, Math.floor(filter?.limit ?? filtered.length))
            : filtered.length;

        const limited =
            limit === 0
                ? []
                : filtered.slice(Math.max(0, filtered.length - limit));

        return {
            total: limited.length,
            events: [...limited],
        };
    };

    const getBaselineReport: ObservabilityBaselineService["getBaselineReport"] =
        (reportOptions) => {
            const atMs = normalizeNow(now);
            const windowMs = Number.isFinite(reportOptions?.windowMs)
                ? Math.max(0, Math.floor(reportOptions?.windowMs ?? 0))
                : null;

            const baseline =
                windowMs === null
                    ? events
                    : events.filter((event) => event.atMs >= atMs - windowMs);

            const countsByCategory: Record<ObservabilityEventCategory, number> =
                {
                    crash: 0,
                    "perf-regression": 0,
                    "content-validation-failure": 0,
                };

            const countsBySeverity: Record<ObservabilitySeverity, number> = {
                error: 0,
                warning: 0,
                info: 0,
            };

            const latestByCategory: Partial<
                Record<ObservabilityEventCategory, ObservabilityEvent>
            > = {};

            for (const event of baseline) {
                countsByCategory[event.category] += 1;
                countsBySeverity[event.severity] += 1;

                const existing = latestByCategory[event.category];
                if (!existing || event.atMs >= existing.atMs) {
                    latestByCategory[event.category] = event;
                }
            }

            const report: ObservabilityBaselineReport = {
                atMs,
                totalEvents: baseline.length,
                countsByCategory,
                countsBySeverity,
                latestByCategory,
                windowMs,
            };

            emit<ObservabilityBaselineReport>(
                OBSERVABILITY_REPORT_SIGNAL,
                report,
            );
            return report;
        };

    const clearEvents: ObservabilityBaselineService["clearEvents"] = () => {
        events.length = 0;
    };

    const size: ObservabilityBaselineService["size"] = () => {
        return events.length;
    };

    const subscribe: ObservabilityBaselineService["subscribe"] = (listener) => {
        listeners.add(listener);

        return () => {
            listeners.delete(listener);
        };
    };

    return {
        recordEvent,
        recordCrash,
        recordPerfRegression,
        recordContentValidationFailure,
        getSnapshot,
        getBaselineReport,
        clearEvents,
        size,
        subscribe,
    };
}

export const observabilityBaseline = createObservabilityBaselineService();
