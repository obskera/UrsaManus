import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";
import { dataBus, type GameState } from "@/services/DataBus";
import {
    QUICK_SAVE_STORAGE_KEY,
    clearQuickSave,
    createQuickSaveScheduler,
    quickLoad,
    quickSave,
} from "@/services/save";

function cloneGameState(state: GameState): GameState {
    const entitiesById: GameState["entitiesById"] = {};

    for (const [id, entity] of Object.entries(state.entitiesById)) {
        entitiesById[id] = {
            ...entity,
            position: { ...entity.position },
            animations: entity.animations.map((animation) => ({
                ...animation,
                frames: animation.frames.map((frame) => [...frame]),
            })),
            characterSpriteTiles: entity.characterSpriteTiles.map((frame) => [
                ...frame,
            ]),
            collider: entity.collider
                ? {
                      ...entity.collider,
                      size: { ...entity.collider.size },
                      offset: { ...entity.collider.offset },
                  }
                : undefined,
            physicsBody: entity.physicsBody
                ? {
                      ...entity.physicsBody,
                      velocity: { ...entity.physicsBody.velocity },
                  }
                : undefined,
        };
    }

    return {
        ...state,
        entitiesById,
        worldSize: { ...state.worldSize },
        camera: {
            ...state.camera,
            viewport: { ...state.camera.viewport },
        },
        worldBoundsIds: [...state.worldBoundsIds],
    };
}

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

describe("save bus", () => {
    let baseline: GameState;

    beforeEach(() => {
        baseline = cloneGameState(dataBus.getState());
        dataBus.setState(() => cloneGameState(baseline));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("writes quick save payload to storage", () => {
        const storage = new MemoryStorage();

        const ok = quickSave(storage);
        expect(ok).toBe(true);

        const raw = storage.getItem(QUICK_SAVE_STORAGE_KEY);
        expect(raw).not.toBeNull();

        const parsed = JSON.parse(raw ?? "{}") as { version?: number };
        expect(parsed.version).toBe(1);
    });

    it("rehydrates from quick save payload", () => {
        const storage = new MemoryStorage();
        const playerId = dataBus.getState().playerId;

        quickSave(storage);

        dataBus.setState((prev) => ({
            ...prev,
            entitiesById: {
                ...prev.entitiesById,
                [playerId]: {
                    ...prev.entitiesById[playerId],
                    position: {
                        ...prev.entitiesById[playerId].position,
                        x: 999,
                    },
                },
            },
        }));

        const loaded = quickLoad(storage);
        expect(loaded).toBe(true);
        expect(dataBus.getState().entitiesById[playerId].position.x).not.toBe(
            999,
        );
    });

    it("clears quick save payload", () => {
        const storage = new MemoryStorage();

        quickSave(storage);
        const cleared = clearQuickSave(storage);

        expect(cleared).toBe(true);
        expect(storage.getItem(QUICK_SAVE_STORAGE_KEY)).toBeNull();
    });

    it("throttles quick save calls", () => {
        vi.useFakeTimers();
        const save = vi.fn<() => boolean>(() => true);

        const scheduler = createQuickSaveScheduler({ waitMs: 100, save });

        scheduler.notifyChange();
        scheduler.notifyChange();
        scheduler.notifyChange();

        expect(save).not.toHaveBeenCalled();

        vi.advanceTimersByTime(100);
        expect(save).toHaveBeenCalledTimes(1);

        scheduler.notifyChange();
        vi.advanceTimersByTime(100);
        expect(save).toHaveBeenCalledTimes(2);
    });

    it("can cancel pending throttled save on dispose", () => {
        vi.useFakeTimers();
        const save = vi.fn<() => boolean>(() => true);

        const scheduler = createQuickSaveScheduler({ waitMs: 100, save });
        scheduler.notifyChange();
        scheduler.dispose();

        vi.advanceTimersByTime(150);
        expect(save).toHaveBeenCalledTimes(0);
    });

    it("returns false for invalid quick load payload", () => {
        const storage = new MemoryStorage();
        storage.setItem(QUICK_SAVE_STORAGE_KEY, "{not-json");

        const loaded = quickLoad(storage);
        expect(loaded).toBe(false);
    });

    it("returns false when quick load has no stored payload", () => {
        const storage = new MemoryStorage();

        const loaded = quickLoad(storage);
        expect(loaded).toBe(false);
    });

    it("returns false when storage throws", () => {
        const failingStorage = {
            getItem: vi.fn(() => {
                throw new Error("blocked");
            }),
            setItem: vi.fn(() => {
                throw new Error("blocked");
            }),
            removeItem: vi.fn(() => {
                throw new Error("blocked");
            }),
        };

        expect(quickSave(failingStorage)).toBe(false);
        expect(quickLoad(failingStorage)).toBe(false);
        expect(clearQuickSave(failingStorage)).toBe(false);
    });

    it("returns false when no storage is provided", () => {
        expect(quickSave(null)).toBe(false);
        expect(quickLoad(null)).toBe(false);
        expect(clearQuickSave(null)).toBe(false);
    });

    it("returns false when default storage access throws", () => {
        const localStorageGetter = vi
            .spyOn(window, "localStorage", "get")
            .mockImplementation(() => {
                throw new Error("blocked");
            });

        expect(quickSave()).toBe(false);
        expect(quickLoad()).toBe(false);
        expect(clearQuickSave()).toBe(false);

        localStorageGetter.mockRestore();
    });
});
