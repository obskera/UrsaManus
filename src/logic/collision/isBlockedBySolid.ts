// src/logic/collision/isBlockedBySolid.ts
import type { Entity } from "@/logic/entity/Entity";
import { getCollisionBounds } from "./getCollisionBounds";
import { rectanglesOverlap } from "./rectanglesOverlap";
import { canCollide } from "./canCollide";

export const isBlockedBySolid = (
    mover: Entity,
    entities: Entity[],
): boolean => {
    if (!mover.collider) return false;

    const moverBounds = getCollisionBounds(
        { x: mover.position.x, y: mover.position.y },
        mover.collider,
        mover.scaler,
    );

    for (const other of entities) {
        if (other.id === mover.id) continue;
        if (!other.collider) continue;

        if (!canCollide(mover.collider, other.collider)) continue;

        const otherBounds = getCollisionBounds(
            { x: other.position.x, y: other.position.y },
            other.collider,
            other.scaler,
        );

        if (!rectanglesOverlap(moverBounds, otherBounds)) continue;

        const otherIsSolid = other.collider.collisionResponse === "block";
        const moverIsSolid = mover.collider.collisionResponse === "block";

        if (otherIsSolid || moverIsSolid) return true;
    }

    return false;
};
