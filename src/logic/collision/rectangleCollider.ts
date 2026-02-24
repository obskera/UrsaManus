// src/logic/collision/rectangleCollider.ts
import type { RectangleCollider, Vec2, CollisionResponse } from "./types";

type CreateRectangleColliderArgs = {
    size: { width: number; height: number };
    offset?: Vec2;
    collisionResponse?: CollisionResponse;
    layer: number;
    collidesWith: number;
    debugDraw?: boolean;
};

export const createRectangleCollider = (
    args: CreateRectangleColliderArgs,
): RectangleCollider => {
    return {
        type: "rectangle",
        size: args.size,
        offset: args.offset ?? { x: 0, y: 0 },
        collisionResponse: args.collisionResponse ?? "overlap",
        layer: args.layer,
        collidesWith: args.collidesWith,
        debugDraw: args.debugDraw,
    };
};
