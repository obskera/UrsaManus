import { describe, expect, it, vi } from "vitest";
import {
    SAVE_SLOT_FAILED_SIGNAL,
    SAVE_SLOT_ROLLBACK_CREATED_SIGNAL,
    SAVE_SLOT_ROLLBACK_RESTORED_SIGNAL,
    SAVE_SLOT_SAVED_SIGNAL,
    createSaveSlotService,
} from "@/services/save/slots";
import type { SaveGame } from "@/services/save";

class MemoryStorage implements Pick<
    Storage,
    "getItem" | "setItem" | "removeItem"
> {
    private values = new Map<string, string>();

    getItem(key: string): string | null {
        return this.values.has(key) ? (this.values.get(key) ?? null) : null;
    }

    setItem(key: string, value: string): void {
        this.values.set(key, value);
    }

    removeItem(key: string): void {
        this.values.delete(key);
    }
}

function createSave(
    savedAt: string,
    version: SaveGame["version"] = 1,
): SaveGame {
    return {
        version,
        savedAt,
        state: {
            entitiesById: {
                player: {
                    id: "player",
                    type: "player",
                    name: "hero",
                    spriteImageSheet: "sheet",
                    spriteSize: 16,
                    spriteSheetTileWidth: 8,
                    spriteSheetTileHeight: 8,
                    characterSpriteTiles: [[0, 0]],
                    scaler: 1,
                    position: { x: 1, y: 1, z: 0 },
                    currentAnimation: "idle",
                    animations: [
                        {
                            spriteSheet: "sheet",
                            name: "idle",
                            frames: [[0, 0]],
                        },
                    ],
                },
            },
            playerId: "player",
            worldSize: { width: 10, height: 10 },
            camera: {
                x: 0,
                y: 0,
                viewport: { width: 10, height: 10 },
                mode: "follow-player",
                clampToWorld: true,
                followTargetId: "player",
            },
            worldBoundsEnabled: false,
            worldBoundsIds: [],
        },
    };
}

describe("save slot manager", () => {
    it("stores multi-slot metadata and lists sorted slots", () => {
        const storage = new MemoryStorage();
        const emitted: string[] = [];

        const saves = [
            createSave("2026-02-28T12:00:00.000Z"),
            createSave("2026-02-28T12:01:00.000Z"),
        ];

        let saveIndex = 0;
        const service = createSaveSlotService({
            storage,
            serialize: () => {
                const save = saves[saveIndex];
                saveIndex += 1;
                return save;
            },
            emit: (signal) => {
                emitted.push(signal);
            },
        });

        const alpha = service.saveSlot("alpha", { playtime: 10 });
        const beta = service.saveSlot("beta", { playtime: 20 });

        expect(alpha.ok).toBe(true);
        expect(beta.ok).toBe(true);

        const slots = service.listSlots();
        expect(slots.map((slot) => slot.slot)).toEqual(["beta", "alpha"]);
        expect(service.getSlot("beta")?.playtime).toBe(20);
        expect(
            emitted.filter((signal) => signal === SAVE_SLOT_SAVED_SIGNAL),
        ).toHaveLength(2);
    });

    it("creates rollback snapshots on overwrite and restores snapshots", () => {
        const storage = new MemoryStorage();
        const emitted: string[] = [];

        const saves = [
            createSave("2026-02-28T12:00:00.000Z"),
            createSave("2026-02-28T12:01:00.000Z"),
        ];

        let saveIndex = 0;
        const rehydrate = vi.fn(() => true);

        const service = createSaveSlotService({
            storage,
            serialize: () => {
                const save = saves[saveIndex];
                saveIndex += 1;
                return save;
            },
            migrate: (input) => input as SaveGame,
            rehydrate,
            emit: (signal) => {
                emitted.push(signal);
            },
            rollbackIdFactory: (slot) => `rb-${slot}`,
        });

        service.saveSlot("slot1", { playtime: 60 });
        service.saveSlot("slot1", { playtime: 90 });

        const rollbacks = service.listRollbackSnapshots("slot1");
        expect(rollbacks).toHaveLength(1);
        expect(rollbacks[0]?.id).toBe("rb-slot1");
        expect(rollbacks[0]?.playtime).toBe(60);

        const restored = service.restoreRollbackSnapshot("slot1", "rb-slot1");
        expect(restored.ok).toBe(true);
        expect(rehydrate).toHaveBeenCalledTimes(1);
        expect(emitted).toContain(SAVE_SLOT_ROLLBACK_CREATED_SIGNAL);
        expect(emitted).toContain(SAVE_SLOT_ROLLBACK_RESTORED_SIGNAL);
    });

    it("supports loading/deleting slots and reports failures", () => {
        const storage = new MemoryStorage();
        const failedCodes: string[] = [];

        const service = createSaveSlotService({
            storage,
            serialize: () => createSave("2026-02-28T12:00:00.000Z"),
            migrate: (input) => input as SaveGame,
            rehydrate: () => false,
            emit: (signal, payload) => {
                if (signal === SAVE_SLOT_FAILED_SIGNAL) {
                    failedCodes.push((payload as { code: string }).code);
                }
            },
        });

        expect(service.saveSlot("bad slot").ok).toBe(false);
        service.saveSlot("slot2", { playtime: 1 });

        const loaded = service.loadSlot("slot2");
        expect(loaded.ok).toBe(false);
        if (!loaded.ok) {
            expect(loaded.code).toBe("rehydrate-failed");
        }

        const deleted = service.deleteSlot("slot2");
        expect(deleted).toEqual({ ok: true, value: true });

        const missing = service.restoreRollbackSnapshot("slot2", "none");
        expect(missing.ok).toBe(false);

        expect(failedCodes).toContain("invalid-slot");
        expect(failedCodes).toContain("rehydrate-failed");
        expect(failedCodes).toContain("missing-rollback");
    });

    it("returns storage-unavailable when no storage is present", () => {
        const service = createSaveSlotService({
            storage: null,
            serialize: () => createSave("2026-02-28T12:00:00.000Z"),
        });

        const saved = service.saveSlot("slot1");
        expect(saved.ok).toBe(false);
        if (!saved.ok) {
            expect(saved.code).toBe("storage-unavailable");
        }

        expect(service.listSlots()).toEqual([]);
    });
});
