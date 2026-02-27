// src/logic/collision/worldBoundsFactory.ts
import { generateId, type Entity } from "@/logic/entity/Entity";
import { createRectangleCollider, CollisionLayer } from "@/logic/collision";
import spriteSheetUrl from "@/assets/spriteSheet.png";

type WorldBounds = {
    left: Entity;
    right: Entity;
    top: Entity;
    bottom: Entity;
};

export const createWorldBounds = (
    worldWidth: number,
    worldHeight: number,
    thickness: number = 32,
): WorldBounds => {
    const left: Entity = {
        id: generateId(),
        type: "object",
        name: "worldBoundLeft",
        animations: [],
        currentAnimation: "idle",
        updateState: () => {},
        spriteImageSheet: spriteSheetUrl,
        spriteSize: 16,
        spriteSheetTileWidth: 49,
        spriteSheetTileHeight: 22,
        characterSpriteTiles: [[0, 0]],
        scaler: 1,
        position: { x: -thickness, y: 0 },
        fps: 1,
        collider: createRectangleCollider({
            size: { width: thickness, height: worldHeight },
            offset: { x: 0, y: 0 },
            collisionResponse: "block",
            layer: CollisionLayer.world,
            collidesWith:
                CollisionLayer.player |
                CollisionLayer.enemy |
                CollisionLayer.object,
            debugDraw: true,
        }),
    };

    const right: Entity = {
        id: generateId(),
        type: "object",
        name: "worldBoundRight",
        animations: [],
        currentAnimation: "idle",
        updateState: () => {},
        spriteImageSheet: spriteSheetUrl,
        spriteSize: 16,
        spriteSheetTileWidth: 49,
        spriteSheetTileHeight: 22,
        characterSpriteTiles: [[0, 0]],
        scaler: 1,
        position: { x: worldWidth, y: 0 },
        fps: 1,
        collider: createRectangleCollider({
            size: { width: thickness, height: worldHeight },
            offset: { x: 0, y: 0 },
            collisionResponse: "block",
            layer: CollisionLayer.world,
            collidesWith:
                CollisionLayer.player |
                CollisionLayer.enemy |
                CollisionLayer.object,
            debugDraw: true,
        }),
    };

    const top: Entity = {
        id: generateId(),
        type: "object",
        name: "worldBoundTop",
        animations: [],
        currentAnimation: "idle",
        updateState: () => {},
        spriteImageSheet: spriteSheetUrl,
        spriteSize: 16,
        spriteSheetTileWidth: 49,
        spriteSheetTileHeight: 22,
        characterSpriteTiles: [[0, 0]],
        scaler: 1,
        position: { x: 0, y: -thickness },
        fps: 1,
        collider: createRectangleCollider({
            size: { width: worldWidth, height: thickness },
            offset: { x: 0, y: 0 },
            collisionResponse: "block",
            layer: CollisionLayer.world,
            collidesWith:
                CollisionLayer.player |
                CollisionLayer.enemy |
                CollisionLayer.object,
            debugDraw: true,
        }),
    };

    const bottom: Entity = {
        id: generateId(),
        type: "object",
        name: "worldBoundBottom",
        animations: [],
        currentAnimation: "idle",
        updateState: () => {},
        spriteImageSheet: spriteSheetUrl,
        spriteSize: 16,
        spriteSheetTileWidth: 49,
        spriteSheetTileHeight: 22,
        characterSpriteTiles: [[0, 0]],
        scaler: 1,
        position: { x: 0, y: worldHeight },
        fps: 1,
        collider: createRectangleCollider({
            size: { width: worldWidth, height: thickness },
            offset: { x: 0, y: 0 },
            collisionResponse: "block",
            layer: CollisionLayer.world,
            collidesWith:
                CollisionLayer.player |
                CollisionLayer.enemy |
                CollisionLayer.object,
            debugDraw: true,
        }),
    };

    return { left, right, top, bottom };
};
