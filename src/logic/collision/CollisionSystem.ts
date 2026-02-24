// src/logic/collision/CollisionSystem.ts
import type { Entity } from "@/logic/entity/Entity";
import type { RectangleCollider } from "./types";
import type { CollisionBounds } from "./collisionBounds";
import type { CollisionEvent, CollisionPhase } from "./collisionEvents";
import { getCollisionBounds } from "./getCollisionBounds";
import { rectanglesOverlap } from "./rectanglesOverlap";
import { canCollide } from "./canCollide";
import { makeCollisionPairKey } from "./makeCollisionPairKey";

type Collidable = {
    entity: Entity;
    collider: RectangleCollider;
    bounds: CollisionBounds;
};

type PairSnapshot = {
    aId: string;
    bId: string;
    aBounds: CollisionBounds;
    bBounds: CollisionBounds;
    a?: Entity;
    b?: Entity;
};

export class CollisionSystem {
    private activePairs = new Set<string>();
    private activePairData = new Map<string, PairSnapshot>();

    update(entities: Entity[]): CollisionEvent[] {
        const events: CollisionEvent[] = [];
        const collidables: Collidable[] = [];

        for (const e of entities) {
            const c = e.collider;
            if (!c) continue;
            if (c.type !== "rectangle") continue;

            const bounds = getCollisionBounds(
                { x: e.position.x, y: e.position.y },
                c,
                e.scaler,
            );
            collidables.push({ entity: e, collider: c, bounds });
        }

        const nextPairs = new Set<string>();
        const nextPairData = new Map<string, PairSnapshot>();

        for (let i = 0; i < collidables.length; i++) {
            for (let j = i + 1; j < collidables.length; j++) {
                const a = collidables[i];
                const b = collidables[j];

                if (!canCollide(a.collider, b.collider)) continue;
                if (!rectanglesOverlap(a.bounds, b.bounds)) continue;

                const key = makeCollisionPairKey(a.entity.id, b.entity.id);
                nextPairs.add(key);

                const phase: CollisionPhase = this.activePairs.has(key)
                    ? "stay"
                    : "enter";

                events.push({
                    phase,
                    aId: a.entity.id,
                    bId: b.entity.id,
                    a: a.entity,
                    b: b.entity,
                    aBounds: a.bounds,
                    bBounds: b.bounds,
                });

                nextPairData.set(key, {
                    aId: a.entity.id,
                    bId: b.entity.id,
                    a: a.entity,
                    b: b.entity,
                    aBounds: a.bounds,
                    bBounds: b.bounds,
                });
            }
        }

        for (const key of this.activePairs) {
            if (nextPairs.has(key)) continue;

            const last = this.activePairData.get(key);
            if (!last) continue;

            events.push({
                phase: "exit",
                aId: last.aId,
                bId: last.bId,
                a: last.a,
                b: last.b,
                aBounds: last.aBounds,
                bBounds: last.bBounds,
            });
        }

        this.activePairs = nextPairs;
        this.activePairData = nextPairData;

        return events;
    }
}
