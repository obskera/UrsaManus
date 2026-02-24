// src/logic/collision/types.ts
export type Vec2 = { x: number; y: number };

export type CollisionResponse = "block" | "overlap";

export type ColliderLayer = number;
export type ColliderMask = number;

export type RectangleCollider = {
    type: "rectangle";

    size: {
        width: number;
        height: number;
    };

    offset: Vec2;

    collisionResponse: CollisionResponse;

    layer: ColliderLayer;
    collidesWith: ColliderMask;

    debugDraw?: boolean;
};
