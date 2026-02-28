import { describe, expect, it, vi } from "vitest";
import {
    SAVE_RECOVERY_FAILED_SIGNAL,
    SAVE_RECOVERY_RESTORE_APPLIED_SIGNAL,
    SAVE_RECOVERY_STARTUP_CHECKED_SIGNAL,
    createSaveRecoveryService,
} from "@/services/save/recovery";
import type { SaveGame } from "@/services/save/schema";

function createStorage(seed?: Record<string, string>) {
    const map = new Map<string, string>(Object.entries(seed ?? {}));

    return {
        getItem: vi.fn((key: string) => map.get(key) ?? null),
        removeItem: vi.fn((key: string) => {
            map.delete(key);
        }),
        setItem: (key: string, value: string) => {
            map.set(key, value);
        },
        has: (key: string) => map.has(key),
    };
}

describe("save recovery service", () => {
    it("reports clean startup when no persisted save exists", () => {
        const storage = createStorage();
        const emits: string[] = [];

        const service = createSaveRecoveryService({
            storage,
            storageKey: "ursa:test-save",
            emit: (signal) => {
                emits.push(signal);
            },
        });

        const result = service.inspectStartup();

        expect(result.status).toBe("clean");
        expect(result.snapshot).toBeNull();
        expect(result.diagnostics[0]?.code).toBe("missing-save");
        expect(emits).toEqual([SAVE_RECOVERY_STARTUP_CHECKED_SIGNAL]);
    });

    it("flags corrupted startup payloads and emits failure diagnostics", () => {
        const storage = createStorage({ "ursa:test-save": "{bad-json" });
        const emittedSignals: string[] = [];

        const service = createSaveRecoveryService({
            storage,
            storageKey: "ursa:test-save",
            emit: (signal) => {
                emittedSignals.push(signal);
            },
        });

        const result = service.inspectStartup();

        expect(result.status).toBe("corrupted");
        expect(result.diagnostics[0]?.code).toBe("invalid-json");
        expect(emittedSignals).toEqual([
            SAVE_RECOVERY_STARTUP_CHECKED_SIGNAL,
            SAVE_RECOVERY_FAILED_SIGNAL,
        ]);
    });

    it("supports restorable startup checks and restore application", () => {
        const payload = {
            version: 1,
            savedAt: "2026-02-28T12:00:00.000Z",
            state: {
                entitiesById: {
                    player: {
                        id: "player",
                        type: "player",
                        name: "Hero",
                        spriteImageSheet: "/spriteSheet.png",
                        spriteSize: 16,
                        spriteSheetTileWidth: 8,
                        spriteSheetTileHeight: 8,
                        characterSpriteTiles: [[0, 0]],
                        scaler: 1,
                        position: { x: 0, y: 0, z: 0 },
                        currentAnimation: "idle",
                        animations: [
                            {
                                spriteSheet: "hero",
                                name: "idle",
                                frames: [[0, 0]],
                            },
                        ],
                    },
                },
                playerId: "player",
                worldSize: { width: 100, height: 100 },
                camera: {
                    x: 0,
                    y: 0,
                    viewport: { width: 100, height: 100 },
                    mode: "follow-player",
                    clampToWorld: true,
                    followTargetId: "player",
                },
                worldBoundsEnabled: false,
                worldBoundsIds: [],
            },
        };

        const storage = createStorage({
            "ursa:test-save": JSON.stringify(payload),
        });

        const migrate = vi.fn((value: unknown) => value as SaveGame);
        const rehydrate = vi.fn(() => true);
        const signals: string[] = [];

        const service = createSaveRecoveryService({
            storage,
            storageKey: "ursa:test-save",
            migrate,
            rehydrate,
            emit: (signal) => {
                signals.push(signal);
            },
        });

        const startup = service.inspectStartup();
        const restore = service.restorePersisted();

        expect(startup.status).toBe("recoverable");
        expect(startup.snapshot?.savedAt).toBe(payload.savedAt);
        expect(restore).toEqual({ ok: true, action: "restore" });
        expect(migrate).toHaveBeenCalled();
        expect(rehydrate).toHaveBeenCalledTimes(1);
        expect(signals).toContain(SAVE_RECOVERY_RESTORE_APPLIED_SIGNAL);
    });

    it("returns rehydrate failure diagnostics and supports reset flow", () => {
        const storage = createStorage({
            "ursa:test-save": JSON.stringify({ version: 1, savedAt: "now" }),
        });

        const service = createSaveRecoveryService({
            storage,
            storageKey: "ursa:test-save",
            migrate: vi.fn((value: unknown) => value as never),
            rehydrate: vi.fn(() => false),
        });

        const restore = service.restorePersisted();
        expect(restore.ok).toBe(false);
        if (!restore.ok) {
            expect(restore.code).toBe("rehydrate-failed");
        }

        const reset = service.resetPersisted();
        expect(reset).toEqual({ ok: true, action: "reset" });
        expect(storage.has("ursa:test-save")).toBe(false);
    });

    it("reports storage unavailable startup status", () => {
        const service = createSaveRecoveryService({
            storage: null,
            storageKey: "ursa:test-save",
            now: () => 5,
        });

        const startup = service.inspectStartup();

        expect(startup.status).toBe("storage-unavailable");
        expect(startup.diagnostics[0]).toMatchObject({
            code: "storage-unavailable",
            atMs: 5,
        });
    });
});
