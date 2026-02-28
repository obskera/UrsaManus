import { beforeEach, describe, expect, it } from "vitest";
import { dataBus, type GameState } from "@/services/DataBus";
import spriteSheetUrl from "@/assets/spriteSheet.png";
import {
    SAVE_GAME_VERSION,
    parseSaveGame,
    rehydrateGameState,
    serializeDataBusState,
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

describe("save state foundation", () => {
    let baseline: GameState;

    beforeEach(() => {
        baseline = cloneGameState(dataBus.getState());
        dataBus.setState(() => cloneGameState(baseline));
    });

    it("serializes game state into v1 JSON-safe snapshot", () => {
        const current = dataBus.getState();
        const save = serializeGameState(current);

        expect(save.version).toBe(SAVE_GAME_VERSION);
        expect(Number.isNaN(Date.parse(save.savedAt))).toBe(false);
        expect(save.state.playerId).toBe(current.playerId);

        const savedPlayer = save.state.entitiesById[current.playerId];
        expect(savedPlayer).toBeDefined();
        expect(
            (savedPlayer as unknown as { updateState?: unknown }).updateState,
        ).toBeUndefined();

        const beforeX = current.entitiesById[current.playerId].position.x;
        savedPlayer.position.x += 999;
        expect(current.entitiesById[current.playerId].position.x).toBe(beforeX);
    });

    it("rehydrates a valid save payload into DataBus state", () => {
        const save = serializeGameState(dataBus.getState());

        save.state.worldSize.width = 640;
        save.state.worldSize.height = 480;
        save.state.camera.mode = "manual";
        save.state.camera.x = 123;
        save.state.camera.y = 77;

        const player = save.state.entitiesById[save.state.playerId];
        player.position.x = 222;
        player.position.y = 111;

        const didRehydrate = rehydrateGameState(save);
        expect(didRehydrate).toBe(true);

        const next = dataBus.getState();
        expect(next.worldSize).toEqual({ width: 640, height: 480 });
        expect(next.camera.mode).toBe("manual");
        expect(next.camera.x).toBe(123);
        expect(next.camera.y).toBe(77);
        expect(next.entitiesById[next.playerId].position.x).toBe(222);
        expect(next.entitiesById[next.playerId].position.y).toBe(111);
        expect(typeof next.entitiesById[next.playerId].updateState).toBe(
            "function",
        );
    });

    it("rejects invalid payloads and leaves state unchanged", () => {
        const before = cloneGameState(dataBus.getState());

        const didRehydrate = rehydrateGameState({ version: 999, state: {} });
        expect(didRehydrate).toBe(false);

        const after = dataBus.getState();
        expect(after.playerId).toBe(before.playerId);
        expect(after.worldSize).toEqual(before.worldSize);
        expect(after.camera).toEqual(before.camera);
        expect(Object.keys(after.entitiesById)).toEqual(
            Object.keys(before.entitiesById),
        );
    });

    it("parses supported save payloads and rejects malformed payloads", () => {
        const valid = serializeGameState(dataBus.getState());
        expect(parseSaveGame(valid)).not.toBeNull();

        const malformed = {
            version: SAVE_GAME_VERSION,
            savedAt: "now",
            state: {
                entitiesById: {},
            },
        };

        expect(parseSaveGame(malformed)).toBeNull();
    });

    it("rehydrates optional entity fields when absent", () => {
        const save = serializeGameState(dataBus.getState());
        const player = save.state.entitiesById[save.state.playerId];

        player.collider = undefined;
        player.physicsBody = undefined;
        player.fps = undefined;
        player.position = {
            x: player.position.x,
            y: player.position.y,
        };

        const didRehydrate = rehydrateGameState(save);
        expect(didRehydrate).toBe(true);

        const nextPlayer = dataBus.getState().entitiesById[save.state.playerId];
        expect(nextPlayer.collider).toBeUndefined();
        expect(nextPlayer.physicsBody).toBeUndefined();
        expect(nextPlayer.fps).toBeUndefined();
        expect(nextPlayer.position.z).toBe(0);
    });

    it("serializes optional entity fields as undefined when absent", () => {
        const playerId = dataBus.getState().playerId;

        dataBus.setState((prev) => ({
            ...prev,
            entitiesById: {
                ...prev.entitiesById,
                [playerId]: {
                    ...prev.entitiesById[playerId],
                    collider: undefined,
                    physicsBody: undefined,
                    fps: undefined,
                },
            },
        }));

        const serialized = serializeGameState(dataBus.getState());
        const savedPlayer = serialized.state.entitiesById[playerId];

        expect(savedPlayer.collider).toBeUndefined();
        expect(savedPlayer.physicsBody).toBeUndefined();
        expect(savedPlayer.fps).toBeUndefined();
    });

    it("serializes DataBus state and rehydrates nested animation/physics data", () => {
        const playerId = dataBus.getState().playerId;

        dataBus.setState((prev) => ({
            ...prev,
            entitiesById: {
                ...prev.entitiesById,
                [playerId]: {
                    ...prev.entitiesById[playerId],
                    animations: [
                        {
                            spriteSheet: "hero",
                            name: "run",
                            frames: [
                                [1, 2],
                                [3, 4],
                            ],
                        },
                    ],
                    currentAnimation: "run",
                    physicsBody: {
                        enabled: true,
                        affectedByGravity: true,
                        gravityScale: 1,
                        velocity: { x: 2, y: -3 },
                        dragX: 0.8,
                        maxVelocityY: 24,
                    },
                },
            },
        }));

        const serialized = serializeDataBusState();
        expect(serialized.version).toBe(SAVE_GAME_VERSION);

        const savedPlayer = serialized.state.entitiesById[playerId];
        expect(savedPlayer.animations[0].frames).toEqual([
            [1, 2],
            [3, 4],
        ]);
        expect(savedPlayer.physicsBody?.velocity).toEqual({ x: 2, y: -3 });

        savedPlayer.animations[0].frames[0][0] = 99;
        const livePlayer = dataBus.getState().entitiesById[playerId];
        expect(livePlayer.animations[0].frames[0][0]).toBe(1);

        const didRehydrate = rehydrateGameState(serialized);
        expect(didRehydrate).toBe(true);

        const rehydratedPlayer = dataBus.getState().entitiesById[playerId];
        expect(rehydratedPlayer.animations[0].frames).toEqual([
            [99, 2],
            [3, 4],
        ]);
        expect(rehydratedPlayer.physicsBody?.velocity).toEqual({ x: 2, y: -3 });
    });

    it("sanitizes invalid characterSpriteTiles on rehydrate", () => {
        const save = serializeGameState(dataBus.getState());
        const player = save.state.entitiesById[save.state.playerId];

        player.characterSpriteTiles = [
            [999, 999],
            [500, 500],
        ];

        const didRehydrate = rehydrateGameState(save);
        expect(didRehydrate).toBe(true);

        const rehydratedPlayer =
            dataBus.getState().entitiesById[save.state.playerId];
        expect(rehydratedPlayer.characterSpriteTiles).toEqual([[0, 0]]);
    });

    it("normalizes legacy hashed sprite sheet paths on rehydrate", () => {
        const save = serializeGameState(dataBus.getState());
        const player = save.state.entitiesById[save.state.playerId];

        player.spriteImageSheet = "/assets/spriteSheet-legacyHash123.png";

        const didRehydrate = rehydrateGameState(save);
        expect(didRehydrate).toBe(true);

        const rehydratedPlayer =
            dataBus.getState().entitiesById[save.state.playerId];
        expect(rehydratedPlayer.spriteImageSheet).toBe(spriteSheetUrl);
    });

    it("rehydrates legacy v0 save payloads through migration", () => {
        const save = serializeGameState(dataBus.getState());
        const legacy = {
            version: 0,
            savedAt: save.savedAt,
            state: {
                entitiesById: save.state.entitiesById,
                playerId: save.state.playerId,
                worldSize: save.state.worldSize,
                camera: {
                    x: save.state.camera.x,
                    y: save.state.camera.y,
                    viewport: save.state.camera.viewport,
                    mode: "follow-player" as const,
                },
            },
        };

        const didRehydrate = rehydrateGameState(legacy);
        expect(didRehydrate).toBe(true);

        const next = dataBus.getState();
        expect(next.camera.clampToWorld).toBe(true);
        expect(next.camera.followTargetId).toBe(next.playerId);
        expect(next.worldBoundsEnabled).toBe(false);
        expect(next.worldBoundsIds).toEqual([]);
    });
});
