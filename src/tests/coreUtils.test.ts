import { describe, expect, it } from "vitest";
import { getEntityById } from "@/logic/entity/getEntityById";
import {
    generateId,
    getAnimationByName,
    type Entity,
} from "@/logic/entity/Entity";
import { makeCollisionPairKey } from "@/logic/collision/makeCollisionPairKey";
import { getWorldBox } from "@/logic/collision/worldBox";
import { createRectangleCollider, CollisionLayer } from "@/logic/collision";

describe("core utility helpers", () => {
    it("returns entities by id", () => {
        const id = generateId();
        const entity = {
            id,
            type: "player",
            name: "hero",
            animations: [],
            currentAnimation: "idle",
            updateState: () => {},
            spriteImageSheet: "/sheet.png",
            spriteSize: 16,
            spriteSheetTileWidth: 8,
            spriteSheetTileHeight: 8,
            characterSpriteTiles: [[0, 0]],
            scaler: 1,
            position: { x: 0, y: 0 },
        } as Entity;

        const entitiesById = { [id]: entity };

        expect(getEntityById(entitiesById, id)).toBe(entity);
        expect(getEntityById(entitiesById, "missing")).toBeUndefined();
    });

    it("builds stable collision pair keys regardless of order", () => {
        expect(makeCollisionPairKey("a", "b")).toBe("a|b");
        expect(makeCollisionPairKey("b", "a")).toBe("a|b");
    });

    it("computes world box from position and collider", () => {
        const collider = createRectangleCollider({
            size: { width: 12, height: 20 },
            offset: { x: 2, y: 3 },
            layer: CollisionLayer.object,
            collidesWith: CollisionLayer.player,
            collisionResponse: "block",
        });

        expect(getWorldBox({ x: 10, y: 25 }, collider)).toEqual({
            x: 12,
            y: 28,
            width: 12,
            height: 20,
        });
    });

    it("creates unique ids and resolves named animations", () => {
        const first = generateId();
        const second = generateId();

        expect(first).not.toBe(second);

        const entity = {
            id: first,
            type: "player",
            name: "hero",
            animations: [
                { name: "idle", spriteSheet: "/sheet.png", frames: [[0, 0]] },
                { name: "run", spriteSheet: "/sheet.png", frames: [[1, 0]] },
            ],
            currentAnimation: "idle",
            updateState: () => {},
            spriteImageSheet: "/sheet.png",
            spriteSize: 16,
            spriteSheetTileWidth: 8,
            spriteSheetTileHeight: 8,
            characterSpriteTiles: [[0, 0]],
            scaler: 1,
            position: { x: 0, y: 0 },
        } as Entity;

        expect(getAnimationByName(entity, "run")?.name).toBe("run");
        expect(getAnimationByName(entity, "missing")).toBeUndefined();
    });
});
