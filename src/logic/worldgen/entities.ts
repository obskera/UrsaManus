import type { Entity, EntityType, Position, UUID } from "@/logic/entity/Entity";
import spriteSheetUrl from "@/assets/spriteSheet.png";
import type { DataBusSpawnEntityPayload, SpawnEntityTag } from "./dataBusSpawn";

export type WorldgenEntityVisualPreset = {
    spriteImageSheet?: string;
    spriteSize?: number;
    spriteSheetTileWidth?: number;
    spriteSheetTileHeight?: number;
    characterSpriteTiles?: number[][];
    scaler?: number;
    fps?: number;
};

export type CreateWorldgenEntitiesOptions = {
    payloads: DataBusSpawnEntityPayload[];
    defaultVisual?: WorldgenEntityVisualPreset;
    byTagVisual?: Partial<Record<SpawnEntityTag, WorldgenEntityVisualPreset>>;
    byTypeVisual?: Partial<Record<EntityType, WorldgenEntityVisualPreset>>;
};

export type WorldgenEntitiesResult = {
    entities: Entity[];
    entitiesById: Record<string, Entity>;
    playerId: string | null;
};

const BASE_VISUAL: Required<WorldgenEntityVisualPreset> = {
    spriteImageSheet: spriteSheetUrl,
    spriteSize: 16,
    spriteSheetTileWidth: 49,
    spriteSheetTileHeight: 22,
    characterSpriteTiles: [[4, 19]],
    scaler: 3,
    fps: 10,
};

const TAG_VISUAL_DEFAULTS: Record<SpawnEntityTag, WorldgenEntityVisualPreset> =
    {
        "player-start": {
            characterSpriteTiles: [[7, 19]],
            scaler: 5,
        },
        objective: {
            characterSpriteTiles: [[4, 19]],
            scaler: 3,
        },
        enemy: {
            characterSpriteTiles: [[3, 19]],
            scaler: 4,
        },
        item: {
            characterSpriteTiles: [[2, 19]],
            scaler: 2,
        },
    };

function resolveVisual(
    payload: DataBusSpawnEntityPayload,
    options: Omit<CreateWorldgenEntitiesOptions, "payloads">,
) {
    const byType = options.byTypeVisual?.[payload.type] ?? {};
    const byTag = options.byTagVisual?.[payload.tag] ?? {};
    const defaultsByTag = TAG_VISUAL_DEFAULTS[payload.tag];

    return {
        ...BASE_VISUAL,
        ...options.defaultVisual,
        ...defaultsByTag,
        ...byType,
        ...byTag,
    } as Required<WorldgenEntityVisualPreset>;
}

function clonePosition(position: Position): Position {
    return {
        x: position.x,
        y: position.y,
        z: position.z,
    };
}

function createEntityFromPayload(
    payload: DataBusSpawnEntityPayload,
    options: Omit<CreateWorldgenEntitiesOptions, "payloads">,
): Entity {
    const visual = resolveVisual(payload, options);

    return {
        id: payload.id as UUID,
        type: payload.type,
        name: payload.name,
        animations: [],
        currentAnimation: "idle",
        updateState: () => {},
        spriteImageSheet: visual.spriteImageSheet,
        spriteSize: visual.spriteSize,
        spriteSheetTileWidth: visual.spriteSheetTileWidth,
        spriteSheetTileHeight: visual.spriteSheetTileHeight,
        characterSpriteTiles: visual.characterSpriteTiles,
        scaler: visual.scaler,
        position: clonePosition(payload.position),
        fps: visual.fps,
    };
}

export function createWorldgenEntities({
    payloads,
    defaultVisual,
    byTagVisual,
    byTypeVisual,
}: CreateWorldgenEntitiesOptions): WorldgenEntitiesResult {
    const options = {
        defaultVisual,
        byTagVisual,
        byTypeVisual,
    };

    const entities = payloads.map((payload) =>
        createEntityFromPayload(payload, options),
    );

    const entitiesById: Record<string, Entity> = {};
    for (const entity of entities) {
        entitiesById[entity.id] = entity;
    }

    const playerSpawnPayload = payloads.find(
        (payload) => payload.tag === "player-start",
    );

    return {
        entities,
        entitiesById,
        playerId: playerSpawnPayload?.id ?? null,
    };
}
