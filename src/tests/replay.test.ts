import { describe, expect, it } from "vitest";
import {
    REPLAY_PAYLOAD_VERSION,
    createDeterministicReplayRecorder,
    createReplayCursor,
    exportReplayPayload,
    parseReplayPayload,
    validateReplayPayload,
} from "@/services/replay";

describe("deterministic replay service", () => {
    it("captures seed snapshot and deterministic input/event timeline", () => {
        let nowMs = 1_000;
        const recorder = createDeterministicReplayRecorder({
            now: () => nowMs,
        });

        recorder.start({
            seedSnapshot: {
                worldgenSeed: 42,
                spawnSeed: 1337,
            },
            metadata: { scene: "arena" },
        });

        nowMs = 1_008;
        expect(recorder.recordInput("move:right", { value: 1 })).toBe(true);

        nowMs = 1_014;
        expect(recorder.recordEvent("spawn:wave", { wave: 2 })).toBe(true);

        nowMs = 1_021;
        expect(recorder.recordInput("move:right", { value: 0 })).toBe(true);

        nowMs = 1_028;
        const payload = recorder.stop();

        expect(payload).toEqual(
            expect.objectContaining({
                version: REPLAY_PAYLOAD_VERSION,
                startedAtMs: 1000,
                durationMs: 28,
                seedSnapshot: {
                    worldgenSeed: 42,
                    spawnSeed: 1337,
                },
                metadata: { scene: "arena" },
            }),
        );

        expect(payload?.records).toEqual([
            {
                atMs: 8,
                kind: "input",
                channel: "move:right",
                payload: { value: 1 },
            },
            {
                atMs: 14,
                kind: "event",
                channel: "spawn:wave",
                payload: { wave: 2 },
            },
            {
                atMs: 21,
                kind: "input",
                channel: "move:right",
                payload: { value: 0 },
            },
        ]);
    });

    it("supports snapshot while recording and record guards", () => {
        let nowMs = 500;
        const recorder = createDeterministicReplayRecorder({
            now: () => nowMs,
        });

        expect(recorder.recordInput("move:left", { value: 1 })).toBe(false);
        expect(recorder.recordEvent("spawn", {})).toBe(false);

        recorder.start({ seedSnapshot: { worldgenSeed: 9 } });

        expect(recorder.recordInput("   ", { value: 1 })).toBe(false);

        nowMs = 510;
        expect(recorder.recordInput("move:left", { value: 1 })).toBe(true);

        nowMs = 530;
        const snapshot = recorder.getSnapshot();
        expect(snapshot?.durationMs).toBe(30);
        expect(snapshot?.records).toHaveLength(1);
        expect(recorder.isRecording()).toBe(true);

        recorder.clear();
        expect(recorder.isRecording()).toBe(false);
        expect(recorder.stop()).toBeNull();
    });

    it("exports and parses replay payload json", () => {
        const payload = {
            version: REPLAY_PAYLOAD_VERSION,
            startedAtMs: 0,
            durationMs: 16,
            seedSnapshot: { worldgenSeed: 55 },
            records: [
                {
                    atMs: 4,
                    kind: "input" as const,
                    channel: "jump",
                },
            ],
        };

        const raw = exportReplayPayload(payload, { pretty: true });
        const parsed = parseReplayPayload(raw);

        expect(parsed).toEqual(payload);
        expect(parseReplayPayload("{bad json")).toBeNull();
    });

    it("rejects invalid payload shapes and versions", () => {
        expect(validateReplayPayload(null)).toBeNull();

        expect(
            validateReplayPayload({
                version: "invalid-version",
                startedAtMs: 0,
                durationMs: 0,
                seedSnapshot: {},
                records: [],
            }),
        ).toBeNull();

        expect(
            validateReplayPayload({
                version: REPLAY_PAYLOAD_VERSION,
                startedAtMs: 0,
                durationMs: 0,
                seedSnapshot: {},
                records: [{ atMs: "x", kind: "input", channel: "jump" }],
            }),
        ).toBeNull();

        expect(
            validateReplayPayload({
                version: REPLAY_PAYLOAD_VERSION,
                startedAtMs: 0,
                durationMs: 0,
                seedSnapshot: {},
                records: [{ atMs: 1, kind: "unknown", channel: "jump" }],
            }),
        ).toBeNull();
    });

    it("replays records deterministically with cursor", () => {
        const payload = {
            version: REPLAY_PAYLOAD_VERSION,
            startedAtMs: 10,
            durationMs: 40,
            seedSnapshot: { worldgenSeed: 8 },
            records: [
                { atMs: 20, kind: "event" as const, channel: "spawn:2" },
                { atMs: 4, kind: "input" as const, channel: "move:right" },
                { atMs: 20, kind: "input" as const, channel: "attack" },
            ],
        };

        const cursor = createReplayCursor(payload);

        expect(cursor.readUntil(3)).toEqual([]);
        expect(cursor.readUntil(4)).toEqual([
            { atMs: 4, kind: "input", channel: "move:right" },
        ]);

        expect(cursor.readUntil(20)).toEqual([
            { atMs: 20, kind: "input", channel: "attack" },
            { atMs: 20, kind: "event", channel: "spawn:2" },
        ]);

        expect(cursor.peekRemaining()).toEqual([]);
        cursor.reset();
        expect(cursor.peekRemaining()).toHaveLength(3);
    });
});
