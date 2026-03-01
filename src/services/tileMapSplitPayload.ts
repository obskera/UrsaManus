import type { TileMapPlacementPayload } from "@/services/tileMapPlacement";

export type TileMapSplitCore = {
    version: TileMapPlacementPayload["version"];
    map: TileMapPlacementPayload["map"];
    selectedLayerId: TileMapPlacementPayload["selectedLayerId"];
    collisionProfile: TileMapPlacementPayload["collisionProfile"];
};

export type TileMapSplitPayloadParts = {
    core: TileMapSplitCore;
    layers: TileMapPlacementPayload["layers"];
    overlays: TileMapPlacementPayload["overlays"];
};

export const splitTileMapPayload = (
    payload: TileMapPlacementPayload,
): TileMapSplitPayloadParts => {
    return {
        core: {
            version: payload.version,
            map: {
                width: payload.map.width,
                height: payload.map.height,
            },
            selectedLayerId: payload.selectedLayerId,
            collisionProfile: {
                solidLayerIds: [...payload.collisionProfile.solidLayerIds],
                solidLayerNameContains: [
                    ...payload.collisionProfile.solidLayerNameContains,
                ],
                solidTileIds: [...payload.collisionProfile.solidTileIds],
                fallbackToVisibleNonZero:
                    payload.collisionProfile.fallbackToVisibleNonZero,
            },
        },
        layers: payload.layers.map((layer) => ({
            id: layer.id,
            name: layer.name,
            visible: layer.visible,
            locked: layer.locked,
            tiles: [...layer.tiles],
        })),
        overlays: payload.overlays.map((overlay) => ({
            ...overlay,
        })),
    };
};

export const assembleTileMapPayload = (
    parts: TileMapSplitPayloadParts,
): TileMapPlacementPayload => {
    return {
        version: parts.core.version,
        map: {
            width: parts.core.map.width,
            height: parts.core.map.height,
        },
        selectedLayerId: parts.core.selectedLayerId,
        layers: parts.layers.map((layer) => ({
            id: layer.id,
            name: layer.name,
            visible: layer.visible,
            locked: layer.locked,
            tiles: [...layer.tiles],
        })),
        collisionProfile: {
            solidLayerIds: [...parts.core.collisionProfile.solidLayerIds],
            solidLayerNameContains: [
                ...parts.core.collisionProfile.solidLayerNameContains,
            ],
            solidTileIds: [...parts.core.collisionProfile.solidTileIds],
            fallbackToVisibleNonZero:
                parts.core.collisionProfile.fallbackToVisibleNonZero,
        },
        overlays: parts.overlays.map((overlay) => ({
            ...overlay,
        })),
    };
};
