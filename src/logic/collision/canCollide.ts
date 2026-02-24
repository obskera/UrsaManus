// src/logic/collision/canCollide.ts
import { collides } from "./layers";
import type { RectangleCollider } from "./types";

export const canCollide = (a: RectangleCollider, b: RectangleCollider) => {
    return (
        collides(a.collidesWith, b.layer) && collides(b.collidesWith, a.layer)
    );
};
