// src/logic/collision/getCollisionBounds.ts
import type { RectangleCollider } from "./types";
import type { CollisionBounds } from "./collisionBounds";

export const getCollisionBounds = (
    position: { x: number; y: number },
    collider: RectangleCollider,
    scaler: number,
): CollisionBounds => {
    return {
        x: position.x + collider.offset.x * scaler,
        y: position.y + collider.offset.y * scaler,
        width: collider.size.width * scaler,
        height: collider.size.height * scaler,
    };
};
