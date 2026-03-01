import { createTileMapPlacementService } from "@/services/tileMapPlacement";
import type { TileMapCollisionProfile } from "@/services/tileMapPlacement";
import { loadToolRecoverySnapshot } from "@/services/toolRecoverySnapshot";
import type { Entity } from "@/logic/entity/Entity";
import type { GameState } from "@/services/DataBus";
import { createRectangleCollider, CollisionLayer } from "@/logic/collision";
import spriteSheetUrl from "@/assets/spriteSheet.png";
import type { EntityType } from "@/logic/entity/Entity";
import type { SpawnEntityTag } from "@/logic/worldgen/dataBusSpawn";

const TILEMAP_RECOVERY_TOOL_KEY = "tilemap";
const TILEMAP_RUNTIME_COLLIDER_PREFIX = "tilemap-obstacle:";
const TILEMAP_RUNTIME_OVERLAY_PREFIX = "tilemap-overlay:";

type TileMapRuntimeSolidTile = {
    x: number;
    y: number;
    tileId: number;
};

export type TileMapRuntimeOverlayEntity = {
    id: string;
    name: string;
    type: EntityType;
    tag: SpawnEntityTag;
    x: number;
    y: number;
    roomIndex: number;
    tileId?: number;
};

export type TileMapRuntimeCollisionProfile = Partial<TileMapCollisionProfile>;

export type TileMapRuntimeBootstrapPayload = {
    source: "tilemap-recovery";
    map: {
        width: number;
        height: number;
    };
    world: {
        width: number;
        height: number;
    };
    tileSize: number;
    layerCount: number;
    filledTileCount: number;
    solidTiles: TileMapRuntimeSolidTile[];
    overlays: TileMapRuntimeOverlayEntity[];
};

export type TileMapRuntimeBootstrapResult =
    | {
          ok: true;
          payload: TileMapRuntimeBootstrapPayload;
      }
    | {
          ok: false;
          message: string;
          missing?: boolean;
      };

export type TileMapRuntimeTarget = {
    setWorldSize: (width: number, height: number) => void;
    setWorldBoundsEnabled: (enabled: boolean) => void;
    setState?: (updater: (prev: GameState) => GameState) => void;
};

const toTileCoordinates = (
    index: number,
    width: number,
): { x: number; y: number } => {
    return {
        x: index % width,
        y: Math.floor(index / width),
    };
};

const DEFAULT_COLLISION_PROFILE: Required<TileMapRuntimeCollisionProfile> = {
    solidLayerIds: [],
    solidLayerNameContains: ["collision", "solid", "blocker"],
    solidTileIds: [],
    fallbackToVisibleNonZero: true,
};

const resolveCollisionProfile = (
    profile: TileMapRuntimeCollisionProfile | undefined,
): Required<TileMapRuntimeCollisionProfile> => {
    const normalizedLayerIds = (profile?.solidLayerIds ?? [])
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);

    const normalizedLayerNameContains = (
        profile?.solidLayerNameContains ??
        DEFAULT_COLLISION_PROFILE.solidLayerNameContains
    )
        .map((entry) => entry.trim().toLowerCase())
        .filter((entry) => entry.length > 0);

    const normalizedSolidTileIds = (profile?.solidTileIds ?? [])
        .map((value) => Math.floor(value))
        .filter((value) => Number.isFinite(value) && value > 0);

    return {
        solidLayerIds: normalizedLayerIds,
        solidLayerNameContains: normalizedLayerNameContains,
        solidTileIds: normalizedSolidTileIds,
        fallbackToVisibleNonZero:
            profile?.fallbackToVisibleNonZero ??
            DEFAULT_COLLISION_PROFILE.fallbackToVisibleNonZero,
    };
};

const mergeCollisionProfiles = (
    base: Required<TileMapRuntimeCollisionProfile>,
    override: TileMapRuntimeCollisionProfile | undefined,
): TileMapRuntimeCollisionProfile => {
    if (!override) {
        return base;
    }

    return {
        solidLayerIds:
            override.solidLayerIds !== undefined
                ? override.solidLayerIds
                : base.solidLayerIds,
        solidLayerNameContains:
            override.solidLayerNameContains !== undefined
                ? override.solidLayerNameContains
                : base.solidLayerNameContains,
        solidTileIds:
            override.solidTileIds !== undefined
                ? override.solidTileIds
                : base.solidTileIds,
        fallbackToVisibleNonZero:
            override.fallbackToVisibleNonZero !== undefined
                ? override.fallbackToVisibleNonZero
                : base.fallbackToVisibleNonZero,
    };
};

const isSolidLayer = (
    layer: { id: string; name: string },
    profile: Required<TileMapRuntimeCollisionProfile>,
): boolean => {
    if (profile.solidLayerIds.includes(layer.id)) {
        return true;
    }

    const normalizedName = layer.name.trim().toLowerCase();
    if (normalizedName.length === 0) {
        return false;
    }

    return profile.solidLayerNameContains.some((needle) => {
        return normalizedName.includes(needle);
    });
};

const isSolidTileId = (
    tileId: number,
    profile: Required<TileMapRuntimeCollisionProfile>,
): boolean => {
    if (tileId <= 0) {
        return false;
    }

    if (profile.solidTileIds.length === 0) {
        return true;
    }

    return profile.solidTileIds.includes(tileId);
};

const collectSolidTiles = (
    snapshot: {
        map: { width: number; height: number };
        layers: Array<{
            id: string;
            name: string;
            visible: boolean;
            tiles: number[];
        }>;
    },
    collisionProfile: Required<TileMapRuntimeCollisionProfile>,
): TileMapRuntimeSolidTile[] => {
    const solidByCoordinate = new Map<string, TileMapRuntimeSolidTile>();

    for (const layer of snapshot.layers) {
        const layerIsSolid = isSolidLayer(layer, collisionProfile);
        const shouldFallback =
            collisionProfile.fallbackToVisibleNonZero && layer.visible;

        if (!layerIsSolid && !shouldFallback) {
            continue;
        }

        for (let index = 0; index < layer.tiles.length; index += 1) {
            const tileId = layer.tiles[index];
            if (!Number.isFinite(tileId) || tileId <= 0) {
                continue;
            }

            if (!isSolidTileId(Math.floor(tileId), collisionProfile)) {
                continue;
            }

            const coordinate = toTileCoordinates(index, snapshot.map.width);
            const key = `${coordinate.x}:${coordinate.y}`;
            solidByCoordinate.set(key, {
                x: coordinate.x,
                y: coordinate.y,
                tileId: Math.floor(tileId),
            });
        }
    }

    return Array.from(solidByCoordinate.values()).sort((left, right) => {
        if (left.y !== right.y) {
            return left.y - right.y;
        }

        return left.x - right.x;
    });
};

const createCollisionEntity = (
    tile: TileMapRuntimeSolidTile,
    tileSize: number,
): Entity => {
    return {
        id: `${TILEMAP_RUNTIME_COLLIDER_PREFIX}${tile.x}:${tile.y}` as Entity["id"],
        type: "object",
        name: `tilemap-obstacle-${tile.x}-${tile.y}`,
        animations: [],
        currentAnimation: "idle",
        updateState: () => {},
        spriteImageSheet: spriteSheetUrl,
        spriteSize: tileSize,
        spriteSheetTileWidth: 1,
        spriteSheetTileHeight: 1,
        characterSpriteTiles: [],
        scaler: 1,
        position: {
            x: tile.x * tileSize,
            y: tile.y * tileSize,
        },
        collider: createRectangleCollider({
            size: {
                width: tileSize,
                height: tileSize,
            },
            offset: { x: 0, y: 0 },
            collisionResponse: "block",
            layer: CollisionLayer.object,
            collidesWith: CollisionLayer.player | CollisionLayer.enemy,
            debugDraw: false,
        }),
    };
};

const createOverlayEntity = (
    overlay: TileMapRuntimeOverlayEntity,
    tileSize: number,
): Entity => {
    const spriteTile = Number.isFinite(overlay.tileId)
        ? Math.max(0, Math.floor(overlay.tileId ?? 0))
        : 0;
    const spriteTileX = spriteTile % 49;
    const spriteTileY = Math.floor(spriteTile / 49);

    return {
        id: `${TILEMAP_RUNTIME_OVERLAY_PREFIX}${overlay.id}` as Entity["id"],
        type: overlay.type,
        name: overlay.name,
        animations: [],
        currentAnimation: "idle",
        updateState: () => {},
        spriteImageSheet: spriteSheetUrl,
        spriteSize: tileSize,
        spriteSheetTileWidth: 49,
        spriteSheetTileHeight: 22,
        characterSpriteTiles: [[spriteTileX, spriteTileY]],
        scaler: 1,
        position: {
            x: overlay.x * tileSize,
            y: overlay.y * tileSize,
        },
    };
};

export const resolveTileMapRuntimeBootstrap = (options?: {
    tileSize?: number;
    collisionProfile?: TileMapRuntimeCollisionProfile;
}): TileMapRuntimeBootstrapResult => {
    const loaded = loadToolRecoverySnapshot(TILEMAP_RECOVERY_TOOL_KEY);
    if (!loaded.ok) {
        return {
            ok: false,
            message: loaded.message,
            missing: loaded.missing,
        };
    }

    const service = createTileMapPlacementService();
    const imported = service.importPayload(loaded.envelope.payloadRaw);
    if (!imported.ok) {
        return {
            ok: false,
            message:
                imported.message ??
                "Tilemap runtime bootstrap failed: invalid payload.",
        };
    }

    const snapshot = service.getSnapshot();
    const tileSize = Math.max(1, Math.floor(options?.tileSize ?? 16));
    const authoredProfile = resolveCollisionProfile(snapshot.collisionProfile);
    const collisionProfile = resolveCollisionProfile(
        mergeCollisionProfiles(authoredProfile, options?.collisionProfile),
    );
    const solidTiles = collectSolidTiles(snapshot, collisionProfile);
    const overlays = snapshot.overlays.map((overlay) => ({
        id: overlay.id,
        name: overlay.name,
        type: overlay.type,
        tag: overlay.tag,
        x: overlay.x,
        y: overlay.y,
        roomIndex: overlay.roomIndex,
        ...(Number.isFinite(overlay.tileId)
            ? { tileId: Math.floor(overlay.tileId ?? 0) }
            : {}),
    }));

    return {
        ok: true,
        payload: {
            source: "tilemap-recovery",
            map: {
                width: snapshot.map.width,
                height: snapshot.map.height,
            },
            world: {
                width: snapshot.map.width * tileSize,
                height: snapshot.map.height * tileSize,
            },
            tileSize,
            layerCount: snapshot.layerCount,
            filledTileCount: snapshot.filledTileCount,
            solidTiles,
            overlays,
        },
    };
};

export const applyTileMapRuntimeBootstrap = (
    target: TileMapRuntimeTarget,
    payload: TileMapRuntimeBootstrapPayload,
): void => {
    target.setWorldSize(payload.world.width, payload.world.height);
    target.setWorldBoundsEnabled(true);

    if (!target.setState) {
        return;
    }

    target.setState((prev) => {
        const nextEntitiesById = { ...prev.entitiesById };

        for (const entityId of Object.keys(nextEntitiesById)) {
            if (entityId.startsWith(TILEMAP_RUNTIME_COLLIDER_PREFIX)) {
                delete nextEntitiesById[entityId];
            }

            if (entityId.startsWith(TILEMAP_RUNTIME_OVERLAY_PREFIX)) {
                delete nextEntitiesById[entityId];
            }
        }

        for (const tile of payload.solidTiles) {
            const entity = createCollisionEntity(tile, payload.tileSize);
            nextEntitiesById[entity.id] = entity;
        }

        for (const overlay of payload.overlays) {
            const entity = createOverlayEntity(overlay, payload.tileSize);
            nextEntitiesById[entity.id] = entity;
        }

        return {
            ...prev,
            entitiesById: nextEntitiesById,
        };
    });
};
