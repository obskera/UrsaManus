// src/logic/collision/layers.ts
export const CollisionLayer = {
    none: 0,
    player: 1 << 0,
    enemy: 1 << 1,
    object: 1 << 2,
    world: 1 << 3,
    pickup: 1 << 4,
} as const;

export const collides = (aMask: number, bLayer: number) =>
    (aMask & bLayer) !== 0;
