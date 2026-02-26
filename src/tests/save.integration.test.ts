import { beforeEach, describe, expect, it } from "vitest";
import { dataBus, type GameState } from "@/services/DataBus";
import {
    QUICK_SAVE_STORAGE_KEY,
    importSaveFile,
    quickLoad,
    quickSave,
    serializeGameState,
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

describe("save integration", () => {
    let baseline: GameState;

    beforeEach(() => {
        baseline = cloneGameState(dataBus.getState());
        dataBus.setState(() => cloneGameState(baseline));
        window.localStorage.removeItem(QUICK_SAVE_STORAGE_KEY);
    });

    it("restores quick save snapshot via startup quick load", () => {
        const playerId = dataBus.getState().playerId;

        dataBus.setState((prev) => ({
            ...prev,
            entitiesById: {
                ...prev.entitiesById,
                [playerId]: {
                    ...prev.entitiesById[playerId],
                    position: {
                        ...prev.entitiesById[playerId].position,
                        x: 145,
                        y: 66,
                    },
                },
            },
        }));

        expect(quickSave()).toBe(true);

        dataBus.setState((prev) => ({
            ...prev,
            entitiesById: {
                ...prev.entitiesById,
                [playerId]: {
                    ...prev.entitiesById[playerId],
                    position: {
                        ...prev.entitiesById[playerId].position,
                        x: 999,
                        y: 999,
                    },
                },
            },
        }));

        expect(quickLoad()).toBe(true);

        const player = dataBus.getState().entitiesById[playerId];
        expect(player.position.x).toBe(145);
        expect(player.position.y).toBe(66);
    });

    it("round-trips save file import using serialized save payload", async () => {
        const playerId = dataBus.getState().playerId;

        const save = serializeGameState(dataBus.getState());
        save.state.entitiesById[playerId].position.x = 301;
        save.state.entitiesById[playerId].position.y = 202;

        const file = new File([JSON.stringify(save)], "roundtrip.json", {
            type: "application/json",
        });

        dataBus.setState((prev) => ({
            ...prev,
            entitiesById: {
                ...prev.entitiesById,
                [playerId]: {
                    ...prev.entitiesById[playerId],
                    position: {
                        ...prev.entitiesById[playerId].position,
                        x: 12,
                        y: 14,
                    },
                },
            },
        }));

        const result = await importSaveFile(file);
        expect(result.ok).toBe(true);

        const player = dataBus.getState().entitiesById[playerId];
        expect(player.position.x).toBe(301);
        expect(player.position.y).toBe(202);
    });
});
