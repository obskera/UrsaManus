import { beforeEach, describe, expect, it } from "vitest";
import { resolveBgmRuntimeBootstrap } from "@/services/bgmRuntimeBootstrap";
import {
    TOOL_RECOVERY_SNAPSHOT_VERSION,
    buildToolRecoveryStorageKey,
} from "@/services/toolRecoverySnapshot";

describe("bgmRuntimeBootstrap", () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    it("resolves runtime payload from bgm recovery snapshot", () => {
        const payload = {
            version: "um-bgm-v1",
            name: "runtime-theme-a",
            bpm: 120,
            stepMs: 100,
            loop: {
                startStep: 0,
                endStep: 8,
            },
            palette: [
                { id: "sq1", file: "assets/audio/chiptune/sq1.wav", gain: 0.8 },
                { id: "noise", file: "assets/audio/chiptune/noise.wav" },
            ],
            sequence: [
                {
                    step: 0,
                    soundId: "sq1",
                    lengthSteps: 2,
                    effect: "vibrato",
                    bend: { cents: 60, curve: "ease-out" },
                },
                {
                    step: 4,
                    soundId: "noise",
                    lengthSteps: 1,
                    effect: "send",
                },
            ],
        };

        window.localStorage.setItem(
            buildToolRecoveryStorageKey("bgm"),
            JSON.stringify({
                version: TOOL_RECOVERY_SNAPSHOT_VERSION,
                toolKey: "bgm",
                savedAt: "2026-03-01T00:00:00.000Z",
                payloadRaw: JSON.stringify(payload),
            }),
        );

        const result = resolveBgmRuntimeBootstrap();

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.payload.name).toBe("runtime-theme-a");
            expect(result.payload.loop.windowMs).toBe(800);
            expect(result.payload.cues).toEqual([
                {
                    step: 0,
                    atMs: 0,
                    durationMs: 200,
                    soundId: "sq1",
                    effect: "vibrato",
                    shape: {
                        gainMultiplier: 0.92,
                        bendScale: 0.95,
                        retriggerCount: 1,
                        retriggerSpacingMs: 14,
                        restartIfPlaying: false,
                    },
                    bend: { cents: 60, curve: "ease-out" },
                },
                {
                    step: 4,
                    atMs: 400,
                    durationMs: 100,
                    soundId: "noise",
                    effect: "send",
                    shape: {
                        gainMultiplier: 0.9,
                        bendScale: 1,
                        retriggerCount: 1,
                        retriggerSpacingMs: 30,
                        restartIfPlaying: false,
                    },
                },
            ]);
        }
    });

    it("returns missing when no bgm recovery exists", () => {
        const result = resolveBgmRuntimeBootstrap();

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.missing).toBe(true);
        }
    });

    it("returns validation failure for unknown sound references", () => {
        const payload = {
            version: "um-bgm-v1",
            name: "broken",
            bpm: 120,
            stepMs: 100,
            loop: {
                startStep: 0,
                endStep: 8,
            },
            palette: [{ id: "sq1", file: "assets/audio/chiptune/sq1.wav" }],
            sequence: [
                {
                    step: 0,
                    soundId: "missing",
                    lengthSteps: 1,
                    effect: "none",
                },
            ],
        };

        window.localStorage.setItem(
            buildToolRecoveryStorageKey("bgm"),
            JSON.stringify({
                version: TOOL_RECOVERY_SNAPSHOT_VERSION,
                toolKey: "bgm",
                savedAt: "2026-03-01T00:00:00.000Z",
                payloadRaw: JSON.stringify(payload),
            }),
        );

        const result = resolveBgmRuntimeBootstrap();

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.message).toContain("unknown soundId");
        }
    });
});
