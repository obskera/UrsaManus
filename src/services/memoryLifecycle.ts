import { signalBus } from "@/services/signalBus";

export type MemoryResourceType =
    | "texture"
    | "audio-buffer"
    | "emitter"
    | "runtime-cache"
    | "custom";

export type MemoryAllocationInput = {
    type: MemoryResourceType;
    label?: string;
    sizeBytes?: number;
    metadata?: Record<string, unknown>;
};

export type MemoryAllocationRecord = {
    id: string;
    type: MemoryResourceType;
    label: string;
    sizeBytes: number;
    metadata?: Record<string, unknown>;
    allocatedAtMs: number;
    lastTouchedAtMs: number;
    disposedAtMs: number | null;
};

export type MemoryAllocationSnapshot = {
    activeCount: number;
    disposedCount: number;
    activeBytes: number;
    disposedBytes: number;
    byType: Record<
        MemoryResourceType,
        { activeCount: number; activeBytes: number }
    >;
};

export type MemoryLeakDiagnostic = {
    id: string;
    allocationId: string;
    type: MemoryResourceType;
    label: string;
    ageMs: number;
    sizeBytes: number;
    thresholdMs: number;
    atMs: number;
};

export type MemoryLeakScanResult = {
    inspected: number;
    leaks: MemoryLeakDiagnostic[];
};

export type MemoryLifecycleService = {
    allocate: (input: MemoryAllocationInput) => MemoryAllocationRecord;
    touch: (allocationId: string) => boolean;
    dispose: (allocationId: string) => boolean;
    disposeByType: (type: MemoryResourceType) => number;
    getAllocation: (allocationId: string) => MemoryAllocationRecord | null;
    listActiveAllocations: (options?: {
        type?: MemoryResourceType;
        maxAgeMs?: number;
    }) => MemoryAllocationRecord[];
    getSnapshot: () => MemoryAllocationSnapshot;
    scanForLeaks: (options?: {
        maxAgeMs?: number;
        minBytes?: number;
        types?: MemoryResourceType[];
    }) => MemoryLeakScanResult;
    getLeakDiagnostics: (limit?: number) => MemoryLeakDiagnostic[];
    clearDisposedHistory: () => void;
};

export const MEMORY_ALLOCATED_SIGNAL = "memory:lifecycle:allocated";
export const MEMORY_DISPOSED_SIGNAL = "memory:lifecycle:disposed";
export const MEMORY_LEAK_DETECTED_SIGNAL = "memory:lifecycle:leak-detected";
export const MEMORY_LEAK_SCAN_COMPLETED_SIGNAL =
    "memory:lifecycle:leak-scan-completed";

const DEFAULT_LEAK_THRESHOLD_MS = 60_000;
const DEFAULT_MAX_DIAGNOSTICS = 500;

function normalizeNow(now: () => number): number {
    const value = now();
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, value);
}

function normalizeSizeBytes(value: number | undefined): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, Math.floor(value ?? 0));
}

function createTypeBucketSnapshot() {
    return {
        texture: { activeCount: 0, activeBytes: 0 },
        "audio-buffer": { activeCount: 0, activeBytes: 0 },
        emitter: { activeCount: 0, activeBytes: 0 },
        "runtime-cache": { activeCount: 0, activeBytes: 0 },
        custom: { activeCount: 0, activeBytes: 0 },
    } satisfies MemoryAllocationSnapshot["byType"];
}

export function createMemoryLifecycleService(options?: {
    now?: () => number;
    emit?: <TPayload>(signal: string, payload: TPayload) => void;
    defaultLeakThresholdMs?: number;
    maxDiagnostics?: number;
    idFactory?: (atMs: number, sequence: number) => string;
}): MemoryLifecycleService {
    const now = options?.now ?? (() => Date.now());
    const emit =
        options?.emit ??
        (<TPayload>(signal: string, payload: TPayload) => {
            signalBus.emit(signal, payload);
        });
    const defaultLeakThresholdMs = Math.max(
        0,
        Math.floor(
            options?.defaultLeakThresholdMs ?? DEFAULT_LEAK_THRESHOLD_MS,
        ),
    );
    const maxDiagnostics = Math.max(
        1,
        Math.floor(options?.maxDiagnostics ?? DEFAULT_MAX_DIAGNOSTICS),
    );

    const allocationsById = new Map<string, MemoryAllocationRecord>();
    const activeIds = new Set<string>();
    const disposedIds = new Set<string>();
    const leakDiagnostics: MemoryLeakDiagnostic[] = [];

    let sequence = 0;
    let diagnosticSequence = 0;

    const allocate: MemoryLifecycleService["allocate"] = (input) => {
        const atMs = normalizeNow(now);
        sequence += 1;
        const id =
            options?.idFactory?.(atMs, sequence) ??
            `mem-${input.type}-${atMs}-${sequence}`;

        const record: MemoryAllocationRecord = {
            id,
            type: input.type,
            label: input.label?.trim() || `${input.type}-${sequence}`,
            sizeBytes: normalizeSizeBytes(input.sizeBytes),
            ...(input.metadata ? { metadata: input.metadata } : {}),
            allocatedAtMs: atMs,
            lastTouchedAtMs: atMs,
            disposedAtMs: null,
        };

        allocationsById.set(id, record);
        activeIds.add(id);
        disposedIds.delete(id);

        emit<MemoryAllocationRecord>(MEMORY_ALLOCATED_SIGNAL, record);
        return record;
    };

    const touch: MemoryLifecycleService["touch"] = (allocationId) => {
        const id = allocationId.trim();
        if (!id) {
            return false;
        }

        const record = allocationsById.get(id);
        if (!record || record.disposedAtMs !== null) {
            return false;
        }

        record.lastTouchedAtMs = normalizeNow(now);
        return true;
    };

    const dispose: MemoryLifecycleService["dispose"] = (allocationId) => {
        const id = allocationId.trim();
        if (!id) {
            return false;
        }

        const record = allocationsById.get(id);
        if (!record || record.disposedAtMs !== null) {
            return false;
        }

        record.disposedAtMs = normalizeNow(now);
        activeIds.delete(id);
        disposedIds.add(id);

        emit<MemoryAllocationRecord>(MEMORY_DISPOSED_SIGNAL, record);
        return true;
    };

    const disposeByType: MemoryLifecycleService["disposeByType"] = (type) => {
        let disposed = 0;

        for (const id of Array.from(activeIds)) {
            const record = allocationsById.get(id);
            if (!record || record.type !== type) {
                continue;
            }

            if (dispose(id)) {
                disposed += 1;
            }
        }

        return disposed;
    };

    const getAllocation: MemoryLifecycleService["getAllocation"] = (
        allocationId,
    ) => {
        const id = allocationId.trim();
        if (!id) {
            return null;
        }

        return allocationsById.get(id) ?? null;
    };

    const listActiveAllocations: MemoryLifecycleService["listActiveAllocations"] =
        (listOptions) => {
            const atMs = normalizeNow(now);

            return Array.from(activeIds)
                .map((id) => allocationsById.get(id))
                .filter((record): record is MemoryAllocationRecord =>
                    Boolean(record),
                )
                .filter((record) => {
                    if (listOptions?.type && record.type !== listOptions.type) {
                        return false;
                    }

                    if (
                        Number.isFinite(listOptions?.maxAgeMs) &&
                        listOptions?.maxAgeMs !== undefined
                    ) {
                        const age = Math.max(0, atMs - record.allocatedAtMs);
                        if (age > Math.max(0, listOptions.maxAgeMs)) {
                            return false;
                        }
                    }

                    return true;
                })
                .sort((left, right) => {
                    if (left.allocatedAtMs === right.allocatedAtMs) {
                        return left.id.localeCompare(right.id);
                    }

                    return left.allocatedAtMs - right.allocatedAtMs;
                });
        };

    const getSnapshot: MemoryLifecycleService["getSnapshot"] = () => {
        let activeBytes = 0;
        let disposedBytes = 0;
        const byType = createTypeBucketSnapshot();

        for (const record of allocationsById.values()) {
            if (record.disposedAtMs === null) {
                activeBytes += record.sizeBytes;
                byType[record.type].activeCount += 1;
                byType[record.type].activeBytes += record.sizeBytes;
            } else {
                disposedBytes += record.sizeBytes;
            }
        }

        return {
            activeCount: activeIds.size,
            disposedCount: disposedIds.size,
            activeBytes,
            disposedBytes,
            byType,
        };
    };

    const scanForLeaks: MemoryLifecycleService["scanForLeaks"] = (
        scanOptions,
    ) => {
        const atMs = normalizeNow(now);
        const thresholdMs = Math.max(
            0,
            Math.floor(scanOptions?.maxAgeMs ?? defaultLeakThresholdMs),
        );
        const minBytes = Math.max(0, Math.floor(scanOptions?.minBytes ?? 0));
        const typeFilter = scanOptions?.types
            ? new Set<MemoryResourceType>(scanOptions.types)
            : null;

        const active = listActiveAllocations();
        const leaks: MemoryLeakDiagnostic[] = [];

        for (const record of active) {
            if (typeFilter && !typeFilter.has(record.type)) {
                continue;
            }

            if (record.sizeBytes < minBytes) {
                continue;
            }

            const ageMs = Math.max(0, atMs - record.allocatedAtMs);
            if (ageMs <= thresholdMs) {
                continue;
            }

            diagnosticSequence += 1;
            const diagnostic: MemoryLeakDiagnostic = {
                id: `leak-${atMs}-${diagnosticSequence}`,
                allocationId: record.id,
                type: record.type,
                label: record.label,
                ageMs,
                sizeBytes: record.sizeBytes,
                thresholdMs,
                atMs,
            };

            leaks.push(diagnostic);
            leakDiagnostics.push(diagnostic);
            if (leakDiagnostics.length > maxDiagnostics) {
                leakDiagnostics.splice(
                    0,
                    leakDiagnostics.length - maxDiagnostics,
                );
            }

            emit<MemoryLeakDiagnostic>(MEMORY_LEAK_DETECTED_SIGNAL, diagnostic);
        }

        const result: MemoryLeakScanResult = {
            inspected: active.length,
            leaks,
        };

        emit<MemoryLeakScanResult>(MEMORY_LEAK_SCAN_COMPLETED_SIGNAL, result);
        return result;
    };

    const getLeakDiagnostics: MemoryLifecycleService["getLeakDiagnostics"] = (
        limit,
    ) => {
        const normalizedLimit = Number.isFinite(limit)
            ? Math.max(0, Math.floor(limit ?? leakDiagnostics.length))
            : leakDiagnostics.length;

        if (normalizedLimit === 0) {
            return [];
        }

        return leakDiagnostics.slice(
            Math.max(0, leakDiagnostics.length - normalizedLimit),
        );
    };

    const clearDisposedHistory: MemoryLifecycleService["clearDisposedHistory"] =
        () => {
            for (const id of Array.from(disposedIds)) {
                allocationsById.delete(id);
            }

            disposedIds.clear();
        };

    return {
        allocate,
        touch,
        dispose,
        disposeByType,
        getAllocation,
        listActiveAllocations,
        getSnapshot,
        scanForLeaks,
        getLeakDiagnostics,
        clearDisposedHistory,
    };
}

export const memoryLifecycle = createMemoryLifecycleService();
