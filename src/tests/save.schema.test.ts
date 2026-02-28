import { describe, expect, it } from "vitest";
import { dataBus } from "@/services/DataBus";
import {
    migrateSaveGame,
    parseSaveGame,
    preflightSaveGameMigration,
    SAVE_GAME_VERSION,
    serializeGameState,
} from "@/services/save";

const cloneSave = () => {
    return JSON.parse(
        JSON.stringify(serializeGameState(dataBus.getState())),
    ) as ReturnType<typeof serializeGameState>;
};

describe("save schema validation", () => {
    it("accepts a valid v1 payload", () => {
        const save = cloneSave();
        expect(parseSaveGame(save)).not.toBeNull();
    });

    it("rejects non-record payloads", () => {
        expect(parseSaveGame(null)).toBeNull();
        expect(parseSaveGame("not-an-object")).toBeNull();
        expect(parseSaveGame(123)).toBeNull();
    });

    it("rejects unsupported save versions", () => {
        const save = cloneSave();
        save.version = (SAVE_GAME_VERSION + 1) as typeof save.version;
        expect(parseSaveGame(save)).toBeNull();
        expect(migrateSaveGame(save)).toBeNull();
    });

    it("migrates legacy v0 payloads into v1 shape", () => {
        const current = cloneSave();
        const legacy = {
            version: 0,
            savedAt: current.savedAt,
            state: {
                entitiesById: current.state.entitiesById,
                playerId: current.state.playerId,
                worldSize: current.state.worldSize,
                camera: {
                    x: current.state.camera.x,
                    y: current.state.camera.y,
                    viewport: current.state.camera.viewport,
                    mode: current.state.camera.mode,
                },
            },
        };

        expect(parseSaveGame(legacy)).toBeNull();

        const migrated = migrateSaveGame(legacy);
        expect(migrated).not.toBeNull();
        expect(migrated?.version).toBe(SAVE_GAME_VERSION);
        expect(migrated?.state.camera.clampToWorld).toBe(true);
        expect(migrated?.state.worldBoundsEnabled).toBe(false);
        expect(migrated?.state.worldBoundsIds).toEqual([]);
    });

    it("preflights migration paths and reports unsupported versions", () => {
        const current = cloneSave();
        const preflightCurrent = preflightSaveGameMigration(current);
        expect(preflightCurrent.ok).toBe(true);

        const preflightLegacy = preflightSaveGameMigration({
            version: 0,
            savedAt: current.savedAt,
            state: {
                entitiesById: current.state.entitiesById,
                playerId: current.state.playerId,
                worldSize: current.state.worldSize,
                camera: {
                    x: current.state.camera.x,
                    y: current.state.camera.y,
                    viewport: current.state.camera.viewport,
                    mode: current.state.camera.mode,
                },
            },
        });
        expect(preflightLegacy.ok).toBe(true);

        const preflightFuture = preflightSaveGameMigration({
            ...current,
            version: 99,
        });
        expect(preflightFuture.ok).toBe(false);
        if (preflightFuture.ok) {
            return;
        }

        expect(preflightFuture.code).toBe("unsupported-version");
    });

    it("rejects invalid entity type and invalid tile frame shape", () => {
        const save = cloneSave();
        const player = save.state.entitiesById[save.state.playerId];

        player.type = "npc" as typeof player.type;
        expect(parseSaveGame(save)).toBeNull();

        const second = cloneSave();
        second.state.entitiesById[second.state.playerId].characterSpriteTiles =
            [[0]] as unknown as number[][];
        expect(parseSaveGame(second)).toBeNull();
    });

    it("rejects invalid optional collider and physics fields", () => {
        const save = cloneSave();
        const player = save.state.entitiesById[save.state.playerId];

        player.collider = {
            type: "rectangle",
            size: { width: 1, height: 1 },
            offset: { x: 0, y: 0 },
            collisionResponse: "bounce" as "block",
            layer: 1,
            collidesWith: 1,
            debugDraw: true,
        };
        expect(parseSaveGame(save)).toBeNull();

        const second = cloneSave();
        second.state.entitiesById[second.state.playerId].physicsBody = {
            enabled: true,
            affectedByGravity: true,
            gravityScale: 1,
            velocity: { x: 0, y: 0 },
            dragX: 0.01,
            maxVelocityY: Number.NaN,
        };
        expect(parseSaveGame(second)).toBeNull();

        const third = cloneSave();
        third.state.entitiesById[third.state.playerId].collider = {
            type: "rectangle",
            size: { width: 8, height: 8 },
            offset: { x: 0, y: 0 },
            collisionResponse: "block",
            layer: 1,
            collidesWith: 1,
            debugDraw: "yes" as unknown as boolean,
        };
        expect(parseSaveGame(third)).toBeNull();

        const fourth = cloneSave();
        fourth.state.entitiesById[fourth.state.playerId].fps =
            Number.POSITIVE_INFINITY;
        expect(parseSaveGame(fourth)).toBeNull();
    });

    it("rejects invalid world/camera/player linkage", () => {
        const noPlayerEntity = cloneSave();
        noPlayerEntity.state.playerId = "missing-player";
        expect(parseSaveGame(noPlayerEntity)).toBeNull();

        const invalidCameraMode = cloneSave();
        invalidCameraMode.state.camera.mode = "free" as "manual";
        expect(parseSaveGame(invalidCameraMode)).toBeNull();

        const invalidFollowTarget = cloneSave();
        invalidFollowTarget.state.camera.followTargetId =
            77 as unknown as string;
        expect(parseSaveGame(invalidFollowTarget)).toBeNull();

        const invalidWorldBounds = cloneSave();
        invalidWorldBounds.state.worldBoundsIds = [
            "ok",
            2,
        ] as unknown as string[];
        expect(parseSaveGame(invalidWorldBounds)).toBeNull();
    });

    it("accepts nullable/optional fields when valid", () => {
        const save = cloneSave();
        const player = save.state.entitiesById[save.state.playerId];

        player.fps = undefined;
        player.collider = undefined;
        player.physicsBody = undefined;
        player.position.z = undefined;
        save.state.camera.followTargetId = null;

        expect(parseSaveGame(save)).not.toBeNull();
    });

    it("rejects invalid position and world/camera primitive fields", () => {
        const invalidPosition = cloneSave();
        invalidPosition.state.entitiesById[
            invalidPosition.state.playerId
        ].position = {
            x: 1,
            y: Number.NaN,
        };
        expect(parseSaveGame(invalidPosition)).toBeNull();

        const invalidWorldSize = cloneSave();
        invalidWorldSize.state.worldSize.width = Number.NaN;
        expect(parseSaveGame(invalidWorldSize)).toBeNull();

        const invalidCameraClamp = cloneSave();
        invalidCameraClamp.state.camera.clampToWorld =
            "yes" as unknown as boolean;
        expect(parseSaveGame(invalidCameraClamp)).toBeNull();
    });

    it("rejects malformed animation, camera viewport, and flags", () => {
        const invalidAnimationFrames = cloneSave();
        invalidAnimationFrames.state.entitiesById[
            invalidAnimationFrames.state.playerId
        ].animations = [
            {
                spriteSheet: "sheet.png",
                name: "idle",
                frames: [[1, 2, 3]] as unknown as number[][],
            },
        ];
        expect(parseSaveGame(invalidAnimationFrames)).toBeNull();

        const invalidViewport = cloneSave();
        invalidViewport.state.camera.viewport = {
            width: Number.NaN,
            height: 100,
        };
        expect(parseSaveGame(invalidViewport)).toBeNull();

        const invalidWorldBoundsEnabled = cloneSave();
        invalidWorldBoundsEnabled.state.worldBoundsEnabled =
            "enabled" as unknown as boolean;
        expect(parseSaveGame(invalidWorldBoundsEnabled)).toBeNull();
    });
});
