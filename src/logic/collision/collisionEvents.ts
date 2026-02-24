// src/logic/collision/collisionEvents.ts
import type { Entity } from "@/logic/entity/Entity";
import type { CollisionBounds } from "./collisionBounds";

export type CollisionPhase = "enter" | "stay" | "exit";

export type CollisionEvent = {
    phase: CollisionPhase;

    aId: string;
    bId: string;

    a?: Entity;
    b?: Entity;

    aBounds: CollisionBounds;
    bBounds: CollisionBounds;
};
