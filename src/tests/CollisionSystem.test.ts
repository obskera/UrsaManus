import { describe, expect, it } from "vitest";
import { CollisionSystem } from "@/logic/collision/CollisionSystem";
import { createRectangleCollider, CollisionLayer } from "@/logic/collision";
import type { Entity } from "@/logic/entity/Entity";

function makeEntity(
    id: string,
    x: number,
    y: number,
    layer: number,
    collidesWith: number,
): Entity {
    return {
        id: id as Entity["id"],
        type: "object",
        name: id,
        animations: [],
        currentAnimation: "idle",
        updateState: () => {},
        spriteImageSheet: "/sheet.png",
        spriteSize: 16,
        spriteSheetTileWidth: 4,
        spriteSheetTileHeight: 4,
        characterSpriteTiles: [[0, 0]],
        scaler: 1,
        position: { x, y },
        collider: createRectangleCollider({
            size: { width: 16, height: 16 },
            offset: { x: 0, y: 0 },
            layer,
            collidesWith,
            collisionResponse: "block",
        }),
    };
}

describe("CollisionSystem", () => {
    it("emits enter, stay, and exit phases across updates", () => {
        const system = new CollisionSystem();
        const a = makeEntity(
            "a",
            0,
            0,
            CollisionLayer.player,
            CollisionLayer.object,
        );
        const b = makeEntity(
            "b",
            8,
            0,
            CollisionLayer.object,
            CollisionLayer.player,
        );

        const enter = system.update([a, b]);
        expect(enter).toHaveLength(1);
        expect(enter[0].phase).toBe("enter");

        const stay = system.update([a, b]);
        expect(stay).toHaveLength(1);
        expect(stay[0].phase).toBe("stay");

        b.position.x = 200;
        const exit = system.update([a, b]);
        expect(exit).toHaveLength(1);
        expect(exit[0].phase).toBe("exit");
    });

    it("ignores non-overlapping and non-collidable entity pairs", () => {
        const system = new CollisionSystem();

        const a = makeEntity(
            "a",
            0,
            0,
            CollisionLayer.player,
            CollisionLayer.none,
        );
        const b = makeEntity(
            "b",
            200,
            0,
            CollisionLayer.object,
            CollisionLayer.none,
        );

        expect(system.update([a, b])).toEqual([]);
    });

    it("ignores entities without colliders", () => {
        const system = new CollisionSystem();
        const a = makeEntity(
            "a",
            0,
            0,
            CollisionLayer.player,
            CollisionLayer.object,
        );
        const b = {
            ...makeEntity(
                "b",
                4,
                0,
                CollisionLayer.object,
                CollisionLayer.player,
            ),
            collider: undefined,
        };

        expect(system.update([a, b])).toEqual([]);
    });
});
