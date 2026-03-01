import { beforeEach, describe, expect, it } from "vitest";
import {
    TOOL_RECOVERY_SNAPSHOT_VERSION,
    buildToolRecoveryStorageKey,
    clearToolRecoverySnapshot,
    loadToolRecoverySnapshot,
    persistToolRecoverySnapshot,
} from "@/services/toolRecoverySnapshot";

describe("toolRecoverySnapshot", () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    it("persists and loads snapshot envelope", () => {
        const save = persistToolRecoverySnapshot(
            "bgm",
            '{"version":"um-bgm-v1"}',
        );

        expect(save.ok).toBe(true);

        const loaded = loadToolRecoverySnapshot("bgm");
        expect(loaded.ok).toBe(true);

        if (loaded.ok) {
            expect(loaded.envelope.version).toBe(
                TOOL_RECOVERY_SNAPSHOT_VERSION,
            );
            expect(loaded.envelope.toolKey).toBe("bgm");
            expect(loaded.envelope.payloadRaw).toBe('{"version":"um-bgm-v1"}');
        }
    });

    it("marks corrupt snapshot for removal", () => {
        window.localStorage.setItem(
            buildToolRecoveryStorageKey("bgm"),
            "not-json",
        );

        const loaded = loadToolRecoverySnapshot("bgm");

        expect(loaded.ok).toBe(false);
        if (!loaded.ok) {
            expect(loaded.removeCorrupt).toBe(true);
        }
    });

    it("clears snapshot key", () => {
        persistToolRecoverySnapshot("tilemap", "{}");

        clearToolRecoverySnapshot("tilemap");

        expect(
            window.localStorage.getItem(buildToolRecoveryStorageKey("tilemap")),
        ).toBeNull();
    });

    it("builds canonical storage keys", () => {
        expect(buildToolRecoveryStorageKey("bgm")).toBe(
            "um:tools:bgm:autosave:v1",
        );
        expect(buildToolRecoveryStorageKey("tilemap")).toBe(
            "um:tools:tilemap:autosave:v1",
        );
    });
});
