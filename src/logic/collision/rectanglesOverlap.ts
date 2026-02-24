// src/logic/collision/rectanglesOverlap.ts
import type { CollisionBounds } from "./collisionBounds";

export const rectanglesOverlap = (
    a: CollisionBounds,
    b: CollisionBounds,
): boolean => {
    const aRight = a.x + a.width;
    const aBottom = a.y + a.height;

    const bRight = b.x + b.width;
    const bBottom = b.y + b.height;

    const separated =
        aRight <= b.x || a.x >= bRight || aBottom <= b.y || a.y >= bBottom;

    return !separated;
};
