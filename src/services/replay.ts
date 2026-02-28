export const REPLAY_PAYLOAD_VERSION = "ursa-replay-v1" as const;

export type ReplayPayloadVersion = typeof REPLAY_PAYLOAD_VERSION;

export type ReplaySeedSnapshot = Record<string, unknown>;

export type ReplayRecordKind = "input" | "event";

export type ReplayRecord = {
    atMs: number;
    kind: ReplayRecordKind;
    channel: string;
    payload?: unknown;
};

export type DeterministicReplayPayload = {
    version: ReplayPayloadVersion;
    startedAtMs: number;
    durationMs: number;
    seedSnapshot: ReplaySeedSnapshot;
    records: ReplayRecord[];
    metadata?: Record<string, unknown>;
};

export type CreateReplayRecorderOptions = {
    now?: () => number;
};

type ReplayRecorderSession = {
    startNowMs: number;
    seedSnapshot: ReplaySeedSnapshot;
    metadata?: Record<string, unknown>;
    records: ReplayRecord[];
};

function isRecordLike(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === "object" && !Array.isArray(value);
}

function sanitizeElapsedMs(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, Math.round(value));
}

function normalizeNow(now: () => number): number {
    const value = now();
    if (!Number.isFinite(value)) {
        return 0;
    }

    return value;
}

function sortRecords(records: ReplayRecord[]): ReplayRecord[] {
    return [...records].sort((a, b) => {
        if (a.atMs === b.atMs) {
            if (a.kind === b.kind) {
                return a.channel.localeCompare(b.channel);
            }

            return a.kind === "input" ? -1 : 1;
        }

        return a.atMs - b.atMs;
    });
}

export class DeterministicReplayRecorder {
    private readonly now: () => number;
    private session: ReplayRecorderSession | null = null;

    constructor(options: CreateReplayRecorderOptions = {}) {
        this.now = options.now ?? (() => Date.now());
    }

    start(options?: {
        seedSnapshot?: ReplaySeedSnapshot;
        metadata?: Record<string, unknown>;
    }): void {
        const startNowMs = normalizeNow(this.now);
        this.session = {
            startNowMs,
            seedSnapshot: { ...(options?.seedSnapshot ?? {}) },
            metadata: options?.metadata ? { ...options.metadata } : undefined,
            records: [],
        };
    }

    isRecording(): boolean {
        return this.session !== null;
    }

    clear(): void {
        this.session = null;
    }

    recordInput(channel: string, payload?: unknown): boolean {
        return this.record("input", channel, payload);
    }

    recordEvent(channel: string, payload?: unknown): boolean {
        return this.record("event", channel, payload);
    }

    stop(): DeterministicReplayPayload | null {
        const session = this.session;
        if (!session) {
            return null;
        }

        const nowMs = normalizeNow(this.now);
        const durationMs = sanitizeElapsedMs(nowMs - session.startNowMs);
        this.session = null;

        return {
            version: REPLAY_PAYLOAD_VERSION,
            startedAtMs: session.startNowMs,
            durationMs,
            seedSnapshot: { ...session.seedSnapshot },
            records: sortRecords(session.records),
            metadata: session.metadata ? { ...session.metadata } : undefined,
        };
    }

    getSnapshot(): DeterministicReplayPayload | null {
        const session = this.session;
        if (!session) {
            return null;
        }

        const nowMs = normalizeNow(this.now);
        const durationMs = sanitizeElapsedMs(nowMs - session.startNowMs);

        return {
            version: REPLAY_PAYLOAD_VERSION,
            startedAtMs: session.startNowMs,
            durationMs,
            seedSnapshot: { ...session.seedSnapshot },
            records: sortRecords(session.records),
            metadata: session.metadata ? { ...session.metadata } : undefined,
        };
    }

    private record(kind: ReplayRecordKind, channel: string, payload?: unknown) {
        const session = this.session;
        if (!session) {
            return false;
        }

        const normalizedChannel = channel.trim();
        if (!normalizedChannel) {
            return false;
        }

        const nowMs = normalizeNow(this.now);
        session.records.push({
            atMs: sanitizeElapsedMs(nowMs - session.startNowMs),
            kind,
            channel: normalizedChannel,
            payload,
        });

        return true;
    }
}

export function createDeterministicReplayRecorder(
    options: CreateReplayRecorderOptions = {},
) {
    return new DeterministicReplayRecorder(options);
}

export function exportReplayPayload(
    payload: DeterministicReplayPayload,
    options?: { pretty?: boolean },
): string {
    return JSON.stringify(payload, null, options?.pretty ? 2 : 0);
}

export function parseReplayPayload(
    raw: string,
): DeterministicReplayPayload | null {
    let parsed: unknown;

    try {
        parsed = JSON.parse(raw);
    } catch {
        return null;
    }

    return validateReplayPayload(parsed);
}

export function validateReplayPayload(
    value: unknown,
): DeterministicReplayPayload | null {
    if (!isRecordLike(value)) {
        return null;
    }

    if (value.version !== REPLAY_PAYLOAD_VERSION) {
        return null;
    }

    if (typeof value.startedAtMs !== "number") {
        return null;
    }

    if (typeof value.durationMs !== "number") {
        return null;
    }

    if (!isRecordLike(value.seedSnapshot)) {
        return null;
    }

    if (!Array.isArray(value.records)) {
        return null;
    }

    const records: ReplayRecord[] = [];

    for (const item of value.records) {
        if (!isRecordLike(item)) {
            return null;
        }

        if (typeof item.atMs !== "number") {
            return null;
        }

        if (item.kind !== "input" && item.kind !== "event") {
            return null;
        }

        if (
            typeof item.channel !== "string" ||
            item.channel.trim().length <= 0
        ) {
            return null;
        }

        records.push({
            atMs: sanitizeElapsedMs(item.atMs),
            kind: item.kind,
            channel: item.channel,
            payload: item.payload,
        });
    }

    const metadata = isRecordLike(value.metadata)
        ? { ...value.metadata }
        : undefined;

    return {
        version: REPLAY_PAYLOAD_VERSION,
        startedAtMs: sanitizeElapsedMs(value.startedAtMs),
        durationMs: sanitizeElapsedMs(value.durationMs),
        seedSnapshot: { ...value.seedSnapshot },
        records: sortRecords(records),
        metadata,
    };
}

export type ReplayCursor = {
    readUntil: (elapsedMs: number) => ReplayRecord[];
    peekRemaining: () => ReplayRecord[];
    reset: () => void;
};

export function createReplayCursor(
    payload: DeterministicReplayPayload,
): ReplayCursor {
    const records = sortRecords(payload.records);
    let cursor = 0;

    return {
        readUntil: (elapsedMs: number) => {
            const targetMs = sanitizeElapsedMs(elapsedMs);
            const out: ReplayRecord[] = [];

            while (cursor < records.length) {
                const next = records[cursor];
                if (next.atMs > targetMs) {
                    break;
                }

                out.push(next);
                cursor += 1;
            }

            return out;
        },
        peekRemaining: () => records.slice(cursor),
        reset: () => {
            cursor = 0;
        },
    };
}
