import { signalBus, type Unsubscribe } from "@/services/signalBus";

export type RuntimeTelemetrySeverity = "error" | "warning" | "info";

export type RuntimeTelemetryStatePhase =
    | "boot"
    | "menu"
    | "play"
    | "pause"
    | "cutscene"
    | "gameover"
    | "unknown";

export type RuntimeTelemetryEntityRef = {
    id: string;
    kind?: string;
    tags?: string[];
};

export type RuntimeTelemetryContext = {
    severity?: RuntimeTelemetrySeverity;
    subsystem?: string;
    statePhase?: RuntimeTelemetryStatePhase;
    entityRefs?: RuntimeTelemetryEntityRef[];
    source?: string;
    metadata?: Record<string, unknown>;
};

export type RuntimeTelemetryEvent = {
    id: string;
    atMs: number;
    severity: RuntimeTelemetrySeverity;
    subsystem: string;
    statePhase: RuntimeTelemetryStatePhase;
    message: string;
    name?: string;
    stack?: string;
    entityRefs: RuntimeTelemetryEntityRef[];
    source?: string;
    metadata?: Record<string, unknown>;
};

export type RuntimeTelemetrySnapshot = {
    total: number;
    events: RuntimeTelemetryEvent[];
};

export type RuntimeTelemetryFilter = {
    severity?: RuntimeTelemetrySeverity;
    subsystem?: string;
    statePhase?: RuntimeTelemetryStatePhase;
    sinceMs?: number;
    limit?: number;
};

export type RuntimeTelemetryListener = (event: RuntimeTelemetryEvent) => void;

export type RuntimeTelemetryLogSink = (
    line: string,
    event: RuntimeTelemetryEvent,
) => void;

export type RuntimeTelemetryService = {
    capture: (
        error: unknown,
        context?: RuntimeTelemetryContext,
    ) => RuntimeTelemetryEvent;
    record: (
        message: string,
        context?: RuntimeTelemetryContext,
    ) => RuntimeTelemetryEvent;
    subscribe: (listener: RuntimeTelemetryListener) => Unsubscribe;
    createLogHook: (options?: {
        sink?: RuntimeTelemetryLogSink;
        formatter?: (event: RuntimeTelemetryEvent) => string;
    }) => Unsubscribe;
    clear: () => void;
    size: () => number;
    getLatest: () => RuntimeTelemetryEvent | null;
    getSnapshot: (filter?: RuntimeTelemetryFilter) => RuntimeTelemetrySnapshot;
};

export type RuntimeTelemetryClearedEvent = {
    removedCount: number;
    atMs: number;
};

export const ERROR_TELEMETRY_CAPTURED_SIGNAL = "error:telemetry:captured";
export const ERROR_TELEMETRY_CLEARED_SIGNAL = "error:telemetry:cleared";

const DEFAULT_MAX_EVENTS = 200;

function normalizeNow(now: () => number): number {
    const value = now();
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, value);
}

function normalizeMaxEvents(value: number | undefined): number {
    if (!Number.isFinite(value)) {
        return DEFAULT_MAX_EVENTS;
    }

    return Math.max(1, Math.floor(value ?? DEFAULT_MAX_EVENTS));
}

function normalizeSubsystem(subsystem: string | undefined): string {
    const normalized = subsystem?.trim();
    return normalized && normalized.length > 0 ? normalized : "unknown";
}

function normalizeStatePhase(
    statePhase: RuntimeTelemetryStatePhase | undefined,
): RuntimeTelemetryStatePhase {
    return statePhase ?? "unknown";
}

function normalizeEntityRefs(
    entityRefs: RuntimeTelemetryEntityRef[] | undefined,
): RuntimeTelemetryEntityRef[] {
    if (!entityRefs || entityRefs.length === 0) {
        return [];
    }

    return entityRefs
        .map((entityRef) => {
            const id = entityRef.id.trim();
            if (!id) {
                return null;
            }

            const kind = entityRef.kind?.trim();
            const tags = entityRef.tags?.filter((tag) => tag.trim().length > 0);

            return {
                id,
                ...(kind ? { kind } : {}),
                ...(tags && tags.length > 0 ? { tags } : {}),
            };
        })
        .filter((entityRef): entityRef is RuntimeTelemetryEntityRef =>
            Boolean(entityRef),
        );
}

function resolveMessage(error: unknown): string {
    if (typeof error === "string") {
        const normalized = error.trim();
        return normalized.length > 0
            ? normalized
            : "Unknown runtime telemetry event.";
    }

    if (error instanceof Error) {
        if (error.message.trim().length > 0) {
            return error.message;
        }

        return error.name || "Unknown runtime telemetry error.";
    }

    return "Unknown runtime telemetry event.";
}

function resolveName(error: unknown): string | undefined {
    if (error instanceof Error) {
        const normalized = error.name.trim();
        return normalized.length > 0 ? normalized : undefined;
    }

    return undefined;
}

function resolveStack(error: unknown): string | undefined {
    if (error instanceof Error && typeof error.stack === "string") {
        const normalized = error.stack.trim();
        return normalized.length > 0 ? normalized : undefined;
    }

    return undefined;
}

function createDefaultFormatter(event: RuntimeTelemetryEvent): string {
    const entityLabel =
        event.entityRefs.length > 0
            ? ` entities=${event.entityRefs.map((entityRef) => entityRef.id).join(",")}`
            : "";

    return `[telemetry][${event.severity}][${event.subsystem}][${event.statePhase}] ${event.message}${entityLabel}`;
}

export function createErrorTelemetry(options?: {
    maxEvents?: number;
    now?: () => number;
    emit?: <TPayload>(signal: string, payload: TPayload) => void;
    idFactory?: (atMs: number, sequence: number) => string;
}): RuntimeTelemetryService {
    const now = options?.now ?? (() => Date.now());
    const maxEvents = normalizeMaxEvents(options?.maxEvents);
    const emit =
        options?.emit ??
        (<TPayload>(signal: string, payload: TPayload) => {
            signalBus.emit(signal, payload);
        });

    const events: RuntimeTelemetryEvent[] = [];
    const listeners = new Set<RuntimeTelemetryListener>();
    let sequence = 0;

    const pushEvent = (event: RuntimeTelemetryEvent) => {
        events.push(event);

        if (events.length > maxEvents) {
            events.splice(0, events.length - maxEvents);
        }

        emit<RuntimeTelemetryEvent>(ERROR_TELEMETRY_CAPTURED_SIGNAL, event);

        for (const listener of listeners) {
            try {
                listener(event);
            } catch {
                continue;
            }
        }
    };

    const capture: RuntimeTelemetryService["capture"] = (error, context) => {
        const atMs = normalizeNow(now);
        sequence += 1;

        const id =
            options?.idFactory?.(atMs, sequence) ??
            `telemetry-${atMs}-${sequence}`;

        const event: RuntimeTelemetryEvent = {
            id,
            atMs,
            severity: context?.severity ?? "error",
            subsystem: normalizeSubsystem(context?.subsystem),
            statePhase: normalizeStatePhase(context?.statePhase),
            message: resolveMessage(error),
            entityRefs: normalizeEntityRefs(context?.entityRefs),
            ...(resolveName(error) ? { name: resolveName(error) } : {}),
            ...(resolveStack(error) ? { stack: resolveStack(error) } : {}),
            ...(context?.source ? { source: context.source } : {}),
            ...(context?.metadata ? { metadata: context.metadata } : {}),
        };

        pushEvent(event);
        return event;
    };

    const record: RuntimeTelemetryService["record"] = (message, context) => {
        return capture(message, context);
    };

    const subscribe: RuntimeTelemetryService["subscribe"] = (listener) => {
        listeners.add(listener);

        return () => {
            listeners.delete(listener);
        };
    };

    const createLogHook: RuntimeTelemetryService["createLogHook"] = (
        hookOptions,
    ) => {
        const formatter = hookOptions?.formatter ?? createDefaultFormatter;
        const sink =
            hookOptions?.sink ??
            ((line: string, event: RuntimeTelemetryEvent) => {
                if (event.severity === "error") {
                    console.error(line);
                    return;
                }

                if (event.severity === "warning") {
                    console.warn(line);
                    return;
                }

                console.log(line);
            });

        return subscribe((event) => {
            sink(formatter(event), event);
        });
    };

    const clear: RuntimeTelemetryService["clear"] = () => {
        if (events.length === 0) {
            return;
        }

        const removedCount = events.length;
        events.length = 0;

        emit<RuntimeTelemetryClearedEvent>(ERROR_TELEMETRY_CLEARED_SIGNAL, {
            removedCount,
            atMs: normalizeNow(now),
        });
    };

    const size: RuntimeTelemetryService["size"] = () => {
        return events.length;
    };

    const getLatest: RuntimeTelemetryService["getLatest"] = () => {
        if (events.length === 0) {
            return null;
        }

        return events[events.length - 1] ?? null;
    };

    const getSnapshot: RuntimeTelemetryService["getSnapshot"] = (filter) => {
        const filtered = events.filter((event) => {
            if (filter?.severity && event.severity !== filter.severity) {
                return false;
            }

            if (filter?.subsystem && event.subsystem !== filter.subsystem) {
                return false;
            }

            if (filter?.statePhase && event.statePhase !== filter.statePhase) {
                return false;
            }

            if (
                typeof filter?.sinceMs === "number" &&
                Number.isFinite(filter.sinceMs) &&
                event.atMs < filter.sinceMs
            ) {
                return false;
            }

            return true;
        });

        const limited =
            typeof filter?.limit === "number" && Number.isFinite(filter.limit)
                ? filtered.slice(
                      Math.max(
                          0,
                          filtered.length -
                              Math.max(0, Math.floor(filter.limit)),
                      ),
                  )
                : filtered;

        return {
            total: limited.length,
            events: [...limited],
        };
    };

    return {
        capture,
        record,
        subscribe,
        createLogHook,
        clear,
        size,
        getLatest,
        getSnapshot,
    };
}

export const errorTelemetry = createErrorTelemetry();
