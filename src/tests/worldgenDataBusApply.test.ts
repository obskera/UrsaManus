import { describe, expect, it } from "vitest";
import { dataBus, type GameState } from "@/services/DataBus";
import {
    applyWorldgenEntitiesToState,
    createApplyWorldgenEntitiesUpdater,
    createDataBusSpawnPayloads,
    createWorldgenEntities,
    createWorldgenScenario,
} from "@/logic/worldgen";

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

function createWorldgenEntitiesFixture() {
    const scenario = createWorldgenScenario({
        map: {
            width: 32,
            height: 20,
            seed: "apply-helper",
            roomCount: 7,
        },
    });

    const payloads = createDataBusSpawnPayloads({
        anchors: scenario.worldAnchors,
        idPrefix: "apply",
        namePrefix: "apply",
    });

    return createWorldgenEntities({ payloads });
}

describe("worldgen DataBus apply helper", () => {
    it("merges generated entities into existing state by default", () => {
        const baseline = cloneGameState(dataBus.getState());
        const worldgen = createWorldgenEntitiesFixture();

        const next = applyWorldgenEntitiesToState(baseline, worldgen);

        expect(Object.keys(next.entitiesById).length).toBeGreaterThan(
            Object.keys(baseline.entitiesById).length,
        );
        expect(next.entitiesById["apply:player_start:0"]).toBeDefined();
        expect(next.entitiesById[baseline.playerId]).toBeDefined();
    });

    it("replaces entity set and syncs player/camera when mode is replace", () => {
        const baseline = cloneGameState(dataBus.getState());
        baseline.worldBoundsEnabled = true;
        baseline.worldBoundsIds = ["old-bound"];

        const worldgen = createWorldgenEntitiesFixture();

        const next = applyWorldgenEntitiesToState(baseline, worldgen, {
            mode: "replace",
        });

        expect(Object.keys(next.entitiesById)).toEqual(
            Object.keys(worldgen.entitiesById),
        );
        expect(next.playerId).toBe(worldgen.playerId);
        expect(next.camera.followTargetId).toBe(worldgen.playerId);
        expect(next.worldBoundsEnabled).toBe(false);
        expect(next.worldBoundsIds).toEqual([]);
    });

    it("provides reusable updater factory for setState wiring", () => {
        const baseline = cloneGameState(dataBus.getState());
        const worldgen = createWorldgenEntitiesFixture();

        const updater = createApplyWorldgenEntitiesUpdater(worldgen, {
            mode: "merge",
        });

        const next = updater(baseline);
        expect(next.entitiesById["apply:objective:0"]).toBeDefined();
    });
});
