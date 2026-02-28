import { signalBus, type Unsubscribe } from "@/services/signalBus";

export type ProfilingSubsystemTiming = {
    subsystem: string;
    durationMs: number;
};

export type ProfilingSnapshotInput = {
    label?: string;
    frameMs: number;
    entityCount: number;
    activeEffects: number;
    subsystemTimings?: ProfilingSubsystemTiming[];
    metadata?: Record<string, unknown>;
    atMs?: number;
};

export type ProfilingSnapshot = {
    id: string;
    label: string;
    atMs: number;
    frameMs: number;
    entityCount: number;
    activeEffects: number;
    subsystemTimings: ProfilingSubsystemTiming[];
    metadata?: Record<string, unknown>;
};

export type ProfilingSnapshotDiffThresholds = {
    frameMsDelta?: number;
    entityCountDelta?: number;
    activeEffectsDelta?: number;
    subsystemMsDelta?: number;
};

export type ProfilingSnapshotRegression = {
    metric: string;
    delta: number;
    threshold: number;
};

export type ProfilingSnapshotComparison = {
    baseId: string;
    targetId: string;
    deltas: {
        frameMs: number;
        entityCount: number;
        activeEffects: number;
        subsystemMs: Record<string, number>;
    };
    regressions: ProfilingSnapshotRegression[];
    hasRegression: boolean;
};

export type ProfilingSnapshotListener = (
    snapshot: ProfilingSnapshot,
    comparison?: ProfilingSnapshotComparison,
) => void;

export type ProfilingSnapshotService = {
    captureSnapshot: (input: ProfilingSnapshotInput) => ProfilingSnapshot;
    compareSnapshots: (
        baseId: string,
        targetId: string,
        options?: { thresholds?: ProfilingSnapshotDiffThresholds },
    ) => ProfilingSnapshotComparison | null;
    compareLatestToPrevious: (options?: {
        thresholds?: ProfilingSnapshotDiffThresholds;
    }) => ProfilingSnapshotComparison | null;
    getSnapshot: (id: string) => ProfilingSnapshot | null;
    getLatestSnapshot: () => ProfilingSnapshot | null;
    getRecentSnapshots: (limit?: number) => ProfilingSnapshot[];
    subscribe: (listener: ProfilingSnapshotListener) => Unsubscribe;
    clearSnapshots: () => void;
};

export const PROFILING_SNAPSHOT_CAPTURED_SIGNAL = "profiling:snapshot:captured";
export const PROFILING_SNAPSHOT_COMPARED_SIGNAL = "profiling:snapshot:compared";

const DEFAULT_MAX_SNAPSHOTS = 120;

const DEFAULT_DIFF_THRESHOLDS: Required<ProfilingSnapshotDiffThresholds> = {
    frameMsDelta: 2,
    entityCountDelta: 20,
    activeEffectsDelta: 10,
    subsystemMsDelta: 2,
};

function normalizeNumber(value: number | undefined, fallback = 0): number {
    if (!Number.isFinite(value)) {
        return fallback;
    }

    return value ?? fallback;
}

function normalizeAtMs(now: () => number, atMs?: number): number {
    return Math.max(0, normalizeNumber(atMs, normalizeNumber(now(), 0)));
}

function normalizeSubsystemTimings(
    timings: ProfilingSubsystemTiming[] | undefined,
): ProfilingSubsystemTiming[] {
    if (!timings || timings.length === 0) {
        return [];
    }

    const normalized = timings
        .map((entry) => {
            const subsystem = entry.subsystem.trim();
            if (!subsystem) {
                return null;
            }

            return {
                subsystem,
                durationMs: Math.max(0, normalizeNumber(entry.durationMs, 0)),
            };
        })
        .filter((entry): entry is ProfilingSubsystemTiming => Boolean(entry));

    normalized.sort((left, right) =>
        left.subsystem.localeCompare(right.subsystem),
    );
    return normalized;
}

function toTimingMap(snapshot: ProfilingSnapshot): Record<string, number> {
    const map: Record<string, number> = {};
    for (const timing of snapshot.subsystemTimings) {
        map[timing.subsystem] = timing.durationMs;
    }

    return map;
}

function resolveThresholds(
    thresholds: ProfilingSnapshotDiffThresholds | undefined,
): Required<ProfilingSnapshotDiffThresholds> {
    return {
        frameMsDelta: Math.max(
            0,
            normalizeNumber(
                thresholds?.frameMsDelta,
                DEFAULT_DIFF_THRESHOLDS.frameMsDelta,
            ),
        ),
        entityCountDelta: Math.max(
            0,
            normalizeNumber(
                thresholds?.entityCountDelta,
                DEFAULT_DIFF_THRESHOLDS.entityCountDelta,
            ),
        ),
        activeEffectsDelta: Math.max(
            0,
            normalizeNumber(
                thresholds?.activeEffectsDelta,
                DEFAULT_DIFF_THRESHOLDS.activeEffectsDelta,
            ),
        ),
        subsystemMsDelta: Math.max(
            0,
            normalizeNumber(
                thresholds?.subsystemMsDelta,
                DEFAULT_DIFF_THRESHOLDS.subsystemMsDelta,
            ),
        ),
    };
}

export function createProfilingSnapshotService(options?: {
    now?: () => number;
    maxSnapshots?: number;
    emit?: <TPayload>(signal: string, payload: TPayload) => void;
    idFactory?: (atMs: number, sequence: number) => string;
}): ProfilingSnapshotService {
    const now = options?.now ?? (() => Date.now());
    const maxSnapshots = Math.max(
        1,
        Math.floor(
            normalizeNumber(options?.maxSnapshots, DEFAULT_MAX_SNAPSHOTS),
        ),
    );
    const emit =
        options?.emit ??
        (<TPayload>(signal: string, payload: TPayload) => {
            signalBus.emit(signal, payload);
        });

    const listeners = new Set<ProfilingSnapshotListener>();
    const snapshots: ProfilingSnapshot[] = [];
    let sequence = 0;

    const getSnapshot: ProfilingSnapshotService["getSnapshot"] = (id) => {
        const normalizedId = id.trim();
        if (!normalizedId) {
            return null;
        }

        return (
            snapshots.find((snapshot) => snapshot.id === normalizedId) ?? null
        );
    };

    const getLatestSnapshot: ProfilingSnapshotService["getLatestSnapshot"] =
        () => {
            return snapshots[snapshots.length - 1] ?? null;
        };

    const getRecentSnapshots: ProfilingSnapshotService["getRecentSnapshots"] = (
        limit,
    ) => {
        const normalizedLimit = Number.isFinite(limit)
            ? Math.max(0, Math.floor(limit ?? snapshots.length))
            : snapshots.length;

        if (normalizedLimit === 0) {
            return [];
        }

        return snapshots.slice(Math.max(0, snapshots.length - normalizedLimit));
    };

    const compareSnapshots: ProfilingSnapshotService["compareSnapshots"] = (
        baseId,
        targetId,
        compareOptions,
    ) => {
        const base = getSnapshot(baseId);
        const target = getSnapshot(targetId);

        if (!base || !target) {
            return null;
        }

        const thresholds = resolveThresholds(compareOptions?.thresholds);
        const baseMap = toTimingMap(base);
        const targetMap = toTimingMap(target);

        const subsystemKeys = new Set<string>([
            ...Object.keys(baseMap),
            ...Object.keys(targetMap),
        ]);

        const subsystemMs: Record<string, number> = {};
        const regressions: ProfilingSnapshotRegression[] = [];

        for (const subsystem of Array.from(subsystemKeys).sort()) {
            const delta =
                (targetMap[subsystem] ?? 0) - (baseMap[subsystem] ?? 0);
            subsystemMs[subsystem] = delta;

            if (delta > thresholds.subsystemMsDelta) {
                regressions.push({
                    metric: `${subsystem}Ms`,
                    delta,
                    threshold: thresholds.subsystemMsDelta,
                });
            }
        }

        const frameDelta = target.frameMs - base.frameMs;
        const entityDelta = target.entityCount - base.entityCount;
        const effectDelta = target.activeEffects - base.activeEffects;

        if (frameDelta > thresholds.frameMsDelta) {
            regressions.push({
                metric: "frameMs",
                delta: frameDelta,
                threshold: thresholds.frameMsDelta,
            });
        }

        if (entityDelta > thresholds.entityCountDelta) {
            regressions.push({
                metric: "entityCount",
                delta: entityDelta,
                threshold: thresholds.entityCountDelta,
            });
        }

        if (effectDelta > thresholds.activeEffectsDelta) {
            regressions.push({
                metric: "activeEffects",
                delta: effectDelta,
                threshold: thresholds.activeEffectsDelta,
            });
        }

        const comparison: ProfilingSnapshotComparison = {
            baseId: base.id,
            targetId: target.id,
            deltas: {
                frameMs: frameDelta,
                entityCount: entityDelta,
                activeEffects: effectDelta,
                subsystemMs,
            },
            regressions,
            hasRegression: regressions.length > 0,
        };

        emit<ProfilingSnapshotComparison>(
            PROFILING_SNAPSHOT_COMPARED_SIGNAL,
            comparison,
        );

        const targetSnapshot = target;
        for (const listener of listeners) {
            try {
                listener(targetSnapshot, comparison);
            } catch {
                continue;
            }
        }

        return comparison;
    };

    const compareLatestToPrevious: ProfilingSnapshotService["compareLatestToPrevious"] =
        (compareOptions) => {
            if (snapshots.length < 2) {
                return null;
            }

            const base = snapshots[snapshots.length - 2];
            const target = snapshots[snapshots.length - 1];

            if (!base || !target) {
                return null;
            }

            return compareSnapshots(base.id, target.id, compareOptions);
        };

    const captureSnapshot: ProfilingSnapshotService["captureSnapshot"] = (
        input,
    ) => {
        sequence += 1;
        const atMs = normalizeAtMs(now, input.atMs);
        const id =
            options?.idFactory?.(atMs, sequence) ??
            `profile-snapshot-${atMs}-${sequence}`;

        const snapshot: ProfilingSnapshot = {
            id,
            label: input.label?.trim() || `snapshot-${sequence}`,
            atMs,
            frameMs: Math.max(0, normalizeNumber(input.frameMs, 0)),
            entityCount: Math.max(
                0,
                Math.floor(normalizeNumber(input.entityCount, 0)),
            ),
            activeEffects: Math.max(
                0,
                Math.floor(normalizeNumber(input.activeEffects, 0)),
            ),
            subsystemTimings: normalizeSubsystemTimings(input.subsystemTimings),
            ...(input.metadata ? { metadata: input.metadata } : {}),
        };

        snapshots.push(snapshot);
        if (snapshots.length > maxSnapshots) {
            snapshots.splice(0, snapshots.length - maxSnapshots);
        }

        emit<ProfilingSnapshot>(PROFILING_SNAPSHOT_CAPTURED_SIGNAL, snapshot);

        for (const listener of listeners) {
            try {
                listener(snapshot);
            } catch {
                continue;
            }
        }

        return snapshot;
    };

    const subscribe: ProfilingSnapshotService["subscribe"] = (listener) => {
        listeners.add(listener);

        return () => {
            listeners.delete(listener);
        };
    };

    const clearSnapshots: ProfilingSnapshotService["clearSnapshots"] = () => {
        snapshots.length = 0;
    };

    return {
        captureSnapshot,
        compareSnapshots,
        compareLatestToPrevious,
        getSnapshot,
        getLatestSnapshot,
        getRecentSnapshots,
        subscribe,
        clearSnapshots,
    };
}

export const profilingSnapshots = createProfilingSnapshotService();
