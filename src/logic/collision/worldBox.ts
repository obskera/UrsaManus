// src/logic/collision/worldBox.ts
import type { RectangleCollider } from "./types";

export type WorldBox = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export const getWorldBox = (
    entityPosition: { x: number; y: number },
    collider: RectangleCollider,
): WorldBox => {
    return {
        x: entityPosition.x + collider.offset.x,
        y: entityPosition.y + collider.offset.y,
        width: collider.size.width,
        height: collider.size.height,
    };
};
