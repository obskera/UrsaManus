// src/logic/entity/getEntityById.ts
import type { Entity } from "./Entity";

export const getEntityById = (
    entitiesById: Record<string, Entity>,
    id: string,
): Entity | undefined => {
    return entitiesById[id];
};
