import { dataBus, type GameState } from "@/services/DataBus";
import type { Entity } from "@/logic/entity/Entity";
import {
    SAVE_GAME_VERSION,
    migrateSaveGame,
    type SaveEntityV1,
    type SaveGame,
    type SaveGameV1,
} from "@/services/save/schema";

type SaveTarget = {
    setState: (updater: (prev: GameState) => GameState) => void;
};

const cloneSaveEntityToGameEntity = (saved: SaveEntityV1): Entity => {
    return {
        id: saved.id as Entity["id"],
        type: saved.type,
        name: saved.name,
        animations: saved.animations.map((animation) => ({
            spriteSheet: animation.spriteSheet,
            name: animation.name,
            frames: animation.frames.map((frame) => [...frame]),
        })),
        currentAnimation: saved.currentAnimation,
        updateState: () => {},
        spriteImageSheet: saved.spriteImageSheet,
        spriteSize: saved.spriteSize,
        spriteSheetTileWidth: saved.spriteSheetTileWidth,
        spriteSheetTileHeight: saved.spriteSheetTileHeight,
        characterSpriteTiles: saved.characterSpriteTiles.map((frame) => [
            ...frame,
        ]),
        scaler: saved.scaler,
        position: {
            x: saved.position.x,
            y: saved.position.y,
            z: saved.position.z ?? 0,
        },
        fps: saved.fps,
        collider: saved.collider
            ? {
                  type: "rectangle",
                  size: {
                      width: saved.collider.size.width,
                      height: saved.collider.size.height,
                  },
                  offset: {
                      x: saved.collider.offset.x,
                      y: saved.collider.offset.y,
                  },
                  collisionResponse: saved.collider.collisionResponse,
                  layer: saved.collider.layer,
                  collidesWith: saved.collider.collidesWith,
                  debugDraw: saved.collider.debugDraw,
              }
            : undefined,
        physicsBody: saved.physicsBody
            ? {
                  enabled: saved.physicsBody.enabled,
                  affectedByGravity: saved.physicsBody.affectedByGravity,
                  gravityScale: saved.physicsBody.gravityScale,
                  velocity: {
                      x: saved.physicsBody.velocity.x,
                      y: saved.physicsBody.velocity.y,
                  },
                  dragX: saved.physicsBody.dragX,
                  maxVelocityY: saved.physicsBody.maxVelocityY,
              }
            : undefined,
    };
};

const cloneGameEntityToSaveEntity = (
    entityId: string,
    entity: Entity,
): SaveEntityV1 => {
    return {
        id: entityId,
        type: entity.type,
        name: entity.name,
        spriteImageSheet: entity.spriteImageSheet,
        spriteSize: entity.spriteSize,
        spriteSheetTileWidth: entity.spriteSheetTileWidth,
        spriteSheetTileHeight: entity.spriteSheetTileHeight,
        characterSpriteTiles: entity.characterSpriteTiles.map((frame) => [
            ...frame,
        ]),
        scaler: entity.scaler,
        position: {
            x: entity.position.x,
            y: entity.position.y,
            z: entity.position.z,
        },
        fps: entity.fps,
        currentAnimation: entity.currentAnimation,
        animations: entity.animations.map((animation) => ({
            spriteSheet: animation.spriteSheet,
            name: animation.name,
            frames: animation.frames.map((frame) => [...frame]),
        })),
        collider: entity.collider
            ? {
                  type: "rectangle",
                  size: {
                      width: entity.collider.size.width,
                      height: entity.collider.size.height,
                  },
                  offset: {
                      x: entity.collider.offset.x,
                      y: entity.collider.offset.y,
                  },
                  collisionResponse: entity.collider.collisionResponse,
                  layer: entity.collider.layer,
                  collidesWith: entity.collider.collidesWith,
                  debugDraw: entity.collider.debugDraw,
              }
            : undefined,
        physicsBody: entity.physicsBody
            ? {
                  enabled: entity.physicsBody.enabled,
                  affectedByGravity: entity.physicsBody.affectedByGravity,
                  gravityScale: entity.physicsBody.gravityScale,
                  velocity: {
                      x: entity.physicsBody.velocity.x,
                      y: entity.physicsBody.velocity.y,
                  },
                  dragX: entity.physicsBody.dragX,
                  maxVelocityY: entity.physicsBody.maxVelocityY,
              }
            : undefined,
    };
};

const cloneGameStateToSaveState = (state: GameState): SaveGameV1["state"] => {
    const entitiesById: SaveGameV1["state"]["entitiesById"] = {};

    for (const [id, entity] of Object.entries(state.entitiesById)) {
        entitiesById[id] = cloneGameEntityToSaveEntity(id, entity);
    }

    return {
        entitiesById,
        playerId: state.playerId,
        worldSize: {
            width: state.worldSize.width,
            height: state.worldSize.height,
        },
        camera: {
            x: state.camera.x,
            y: state.camera.y,
            viewport: {
                width: state.camera.viewport.width,
                height: state.camera.viewport.height,
            },
            mode: state.camera.mode,
            clampToWorld: state.camera.clampToWorld,
            followTargetId: state.camera.followTargetId,
        },
        worldBoundsEnabled: state.worldBoundsEnabled,
        worldBoundsIds: [...state.worldBoundsIds],
    };
};

const cloneSaveStateToGameState = (save: SaveGame): GameState => {
    const entitiesById: GameState["entitiesById"] = {};

    for (const [id, entity] of Object.entries(save.state.entitiesById)) {
        entitiesById[id] = cloneSaveEntityToGameEntity(entity);
    }

    return {
        entitiesById,
        playerId: save.state.playerId,
        worldSize: {
            width: save.state.worldSize.width,
            height: save.state.worldSize.height,
        },
        camera: {
            x: save.state.camera.x,
            y: save.state.camera.y,
            viewport: {
                width: save.state.camera.viewport.width,
                height: save.state.camera.viewport.height,
            },
            mode: save.state.camera.mode,
            clampToWorld: save.state.camera.clampToWorld,
            followTargetId: save.state.camera.followTargetId,
        },
        worldBoundsEnabled: save.state.worldBoundsEnabled,
        worldBoundsIds: [...save.state.worldBoundsIds],
    };
};

export const serializeGameState = (state: GameState): SaveGameV1 => {
    return {
        version: SAVE_GAME_VERSION,
        savedAt: new Date().toISOString(),
        state: cloneGameStateToSaveState(state),
    };
};

export const serializeDataBusState = (): SaveGameV1 => {
    return serializeGameState(dataBus.getState());
};

export const rehydrateGameState = (
    saveInput: unknown,
    target: SaveTarget = dataBus,
): boolean => {
    const save = migrateSaveGame(saveInput);
    if (!save) {
        return false;
    }

    target.setState(() => cloneSaveStateToGameState(save));
    return true;
};
