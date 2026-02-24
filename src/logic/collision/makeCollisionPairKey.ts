// src/logic/collision/makeCollisionPairKey.ts
export const makeCollisionPairKey = (aId: string, bId: string) => {
    return aId < bId ? `${aId}|${bId}` : `${bId}|${aId}`;
};
