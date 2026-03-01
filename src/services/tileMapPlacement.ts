import { signalBus } from "@/services/signalBus";
import type { EntityType } from "@/logic/entity/Entity";
import type { SpawnEntityTag } from "@/logic/worldgen/dataBusSpawn";

export const TILE_MAP_PLACEMENT_PAYLOAD_VERSION = "um-tilemap-v1" as const;

export type TileMapBounds = {
    width: number;
    height: number;
};

export type TileMapLayerRecord = {
    id: string;
    name: string;
    visible: boolean;
    locked: boolean;
    tiles: number[];
};

export type TileMapCollisionProfile = {
    solidLayerIds: string[];
    solidLayerNameContains: string[];
    solidTileIds: number[];
    fallbackToVisibleNonZero: boolean;
};

export type TileMapOverlayEntityRecord = {
    id: string;
    name: string;
    type: EntityType;
    tag: SpawnEntityTag;
    x: number;
    y: number;
    roomIndex: number;
    tileId?: number;
};

export type TileMapOverlayEntityInput = {
    id?: string;
    name: string;
    type: EntityType;
    tag: SpawnEntityTag;
    x: number;
    y: number;
    roomIndex?: number;
    tileId?: number;
};

export type TileMapPlacementPayload = {
    version: typeof TILE_MAP_PLACEMENT_PAYLOAD_VERSION;
    map: TileMapBounds;
    selectedLayerId: string | null;
    layers: TileMapLayerRecord[];
    collisionProfile: TileMapCollisionProfile;
    overlays: TileMapOverlayEntityRecord[];
};

export type TileMapPlacementSnapshot = {
    map: TileMapBounds;
    selectedLayerId: string | null;
    layerCount: number;
    filledTileCount: number;
    layers: TileMapLayerRecord[];
    collisionProfile: TileMapCollisionProfile;
    overlays: TileMapOverlayEntityRecord[];
};

export type TileMapPlacementValidationResult = {
    ok: boolean;
    code:
        | "missing-layer"
        | "missing-layer-id"
        | "missing-overlay-name"
        | "missing-overlay-id"
        | "duplicate-overlay-id"
        | "layer-locked"
        | "duplicate-layer-id"
        | "invalid-map-size"
        | "out-of-bounds"
        | "invalid-tile-id"
        | "invalid-payload"
        | null;
    message: string | null;
};

export type TileMapPlacementService = {
    setMapBounds: (patch: Partial<TileMapBounds>) => void;
    addLayer: (input: {
        id: string;
        name?: string;
        visible?: boolean;
        locked?: boolean;
        select?: boolean;
    }) => TileMapPlacementValidationResult;
    removeLayer: (layerId: string) => boolean;
    setLayerVisibility: (layerId: string, visible: boolean) => boolean;
    setLayerLocked: (layerId: string, locked: boolean) => boolean;
    moveLayer: (layerId: string, direction: "up" | "down") => boolean;
    duplicateLayer: (
        layerId: string,
        nextLayerId?: string,
    ) => TileMapPlacementValidationResult;
    mergeLayerInto: (
        sourceLayerId: string,
        targetLayerId: string,
        options?: { removeSource?: boolean },
    ) => TileMapPlacementValidationResult;
    selectLayer: (layerId: string | null) => boolean;
    placeTile: (
        x: number,
        y: number,
        tileId: number,
        layerId?: string,
    ) => TileMapPlacementValidationResult;
    eraseTile: (
        x: number,
        y: number,
        layerId?: string,
    ) => TileMapPlacementValidationResult;
    clearLayer: (layerId?: string) => TileMapPlacementValidationResult;
    setCollisionProfile: (patch: Partial<TileMapCollisionProfile>) => void;
    addOverlayEntity: (
        input: TileMapOverlayEntityInput,
    ) => TileMapPlacementValidationResult;
    removeOverlayEntity: (entityId: string) => boolean;
    getTileAt: (x: number, y: number, layerId?: string) => number;
    exportPayload: (options?: { pretty?: boolean }) => string;
    importPayload: (raw: string) => TileMapPlacementValidationResult;
    getSnapshot: () => TileMapPlacementSnapshot;
};

export const TILE_MAP_PLACEMENT_CHANGED_SIGNAL = "tilemap:placement:changed";
export const TILE_MAP_PLACEMENT_SELECTED_LAYER_SIGNAL =
    "tilemap:placement:selected-layer";
export const TILE_MAP_PLACEMENT_INVALID_SIGNAL = "tilemap:placement:invalid";
export const TILE_MAP_PLACEMENT_IMPORTED_SIGNAL = "tilemap:placement:imported";

const DEFAULT_TILEMAP_COLLISION_PROFILE: TileMapCollisionProfile = {
    solidLayerIds: [],
    solidLayerNameContains: ["collision", "solid", "blocker"],
    solidTileIds: [],
    fallbackToVisibleNonZero: true,
};

function createFailure(
    code: TileMapPlacementValidationResult["code"],
    message: string,
): TileMapPlacementValidationResult {
    return {
        ok: false,
        code,
        message,
    };
}

function createSuccess(): TileMapPlacementValidationResult {
    return {
        ok: true,
        code: null,
        message: null,
    };
}

function normalizePositiveInt(
    value: number | undefined,
    fallback: number,
): number {
    if (!Number.isFinite(value)) {
        return fallback;
    }

    return Math.max(1, Math.floor(value ?? fallback));
}

function toLinearIndex(x: number, y: number, width: number): number {
    return y * width + x;
}

function cloneLayer(layer: TileMapLayerRecord): TileMapLayerRecord {
    return {
        id: layer.id,
        name: layer.name,
        visible: layer.visible,
        locked: layer.locked,
        tiles: [...layer.tiles],
    };
}

function cloneOverlay(
    overlay: TileMapOverlayEntityRecord,
): TileMapOverlayEntityRecord {
    return {
        ...overlay,
    };
}

function normalizeOverlayType(value: unknown): EntityType {
    return value === "player" || value === "enemy" || value === "object"
        ? value
        : "object";
}

function normalizeOverlayTag(value: unknown): SpawnEntityTag {
    return value === "player-start" ||
        value === "objective" ||
        value === "enemy" ||
        value === "item"
        ? value
        : "item";
}

function normalizeStringList(values: unknown): string[] {
    if (!Array.isArray(values)) {
        return [];
    }

    return values
        .map((entry) => String(entry ?? "").trim())
        .filter((entry) => entry.length > 0);
}

function normalizeTileIdList(values: unknown): number[] {
    if (!Array.isArray(values)) {
        return [];
    }

    return values
        .map((entry) => Number(entry))
        .filter((entry) => Number.isInteger(entry) && entry > 0)
        .map((entry) => Math.floor(entry));
}

function normalizeCollisionProfile(
    value: unknown,
    fallback: TileMapCollisionProfile = DEFAULT_TILEMAP_COLLISION_PROFILE,
): TileMapCollisionProfile {
    if (!value || typeof value !== "object") {
        return {
            solidLayerIds: [...fallback.solidLayerIds],
            solidLayerNameContains: [...fallback.solidLayerNameContains],
            solidTileIds: [...fallback.solidTileIds],
            fallbackToVisibleNonZero: fallback.fallbackToVisibleNonZero,
        };
    }

    const input = value as Partial<TileMapCollisionProfile>;

    return {
        solidLayerIds: normalizeStringList(input.solidLayerIds) ?? [
            ...fallback.solidLayerIds,
        ],
        solidLayerNameContains: normalizeStringList(
            input.solidLayerNameContains,
        ).map((entry) => entry.toLowerCase()) ?? [
            ...fallback.solidLayerNameContains,
        ],
        solidTileIds: normalizeTileIdList(input.solidTileIds) ?? [
            ...fallback.solidTileIds,
        ],
        fallbackToVisibleNonZero:
            typeof input.fallbackToVisibleNonZero === "boolean"
                ? input.fallbackToVisibleNonZero
                : fallback.fallbackToVisibleNonZero,
    };
}

function filledTileCount(layers: TileMapLayerRecord[]): number {
    let count = 0;
    for (const layer of layers) {
        for (const tileId of layer.tiles) {
            if (tileId > 0) {
                count += 1;
            }
        }
    }

    return count;
}

export function createTileMapPlacementService(options?: {
    emit?: <TPayload>(signal: string, payload: TPayload) => void;
}): TileMapPlacementService {
    const emit =
        options?.emit ??
        (<TPayload>(signal: string, payload: TPayload) => {
            signalBus.emit(signal, payload);
        });

    let map: TileMapBounds = {
        width: 32,
        height: 18,
    };
    const layersById = new Map<string, TileMapLayerRecord>();
    const layerOrder: string[] = [];
    const overlaysById = new Map<string, TileMapOverlayEntityRecord>();
    let selectedLayerId: string | null = null;
    let collisionProfile: TileMapCollisionProfile = {
        ...DEFAULT_TILEMAP_COLLISION_PROFILE,
        solidLayerIds: [...DEFAULT_TILEMAP_COLLISION_PROFILE.solidLayerIds],
        solidLayerNameContains: [
            ...DEFAULT_TILEMAP_COLLISION_PROFILE.solidLayerNameContains,
        ],
        solidTileIds: [...DEFAULT_TILEMAP_COLLISION_PROFILE.solidTileIds],
    };

    const emitChanged = () => {
        emit(TILE_MAP_PLACEMENT_CHANGED_SIGNAL, {
            map,
            selectedLayerId,
            layerCount: layerOrder.length,
        });
    };

    const withinBounds = (x: number, y: number): boolean => {
        return x >= 0 && y >= 0 && x < map.width && y < map.height;
    };

    const ensureDefaultLayer = () => {
        if (layerOrder.length > 0) {
            return;
        }

        const baseLayer: TileMapLayerRecord = {
            id: "base",
            name: "Base",
            visible: true,
            locked: false,
            tiles: new Array(map.width * map.height).fill(0),
        };

        layersById.set(baseLayer.id, baseLayer);
        layerOrder.push(baseLayer.id);
        selectedLayerId = baseLayer.id;
    };

    const activeLayer = (
        requestedLayerId?: string,
    ): TileMapLayerRecord | null => {
        const layerId = requestedLayerId ?? selectedLayerId;
        if (!layerId) {
            return null;
        }

        return layersById.get(layerId) ?? null;
    };

    ensureDefaultLayer();

    const setMapBounds = (patch: Partial<TileMapBounds>) => {
        const nextMap: TileMapBounds = {
            width: normalizePositiveInt(patch.width, map.width),
            height: normalizePositiveInt(patch.height, map.height),
        };

        if (nextMap.width === map.width && nextMap.height === map.height) {
            return;
        }

        for (const layerId of layerOrder) {
            const layer = layersById.get(layerId);
            if (!layer) {
                continue;
            }

            const resized = new Array(nextMap.width * nextMap.height).fill(0);
            const copyWidth = Math.min(map.width, nextMap.width);
            const copyHeight = Math.min(map.height, nextMap.height);

            for (let y = 0; y < copyHeight; y += 1) {
                for (let x = 0; x < copyWidth; x += 1) {
                    const oldIndex = toLinearIndex(x, y, map.width);
                    const newIndex = toLinearIndex(x, y, nextMap.width);
                    resized[newIndex] = layer.tiles[oldIndex] ?? 0;
                }
            }

            layer.tiles = resized;
        }

        map = nextMap;
        emitChanged();
    };

    const addLayer = (input: {
        id: string;
        name?: string;
        visible?: boolean;
        locked?: boolean;
        select?: boolean;
    }): TileMapPlacementValidationResult => {
        const id = input.id.trim();
        if (!id) {
            const failure = createFailure(
                "missing-layer-id",
                "Layer id is required.",
            );
            emit(TILE_MAP_PLACEMENT_INVALID_SIGNAL, failure);
            return failure;
        }

        if (layersById.has(id)) {
            const failure = createFailure(
                "duplicate-layer-id",
                "Layer id already exists.",
            );
            emit(TILE_MAP_PLACEMENT_INVALID_SIGNAL, failure);
            return failure;
        }

        const layer: TileMapLayerRecord = {
            id,
            name: input.name?.trim() || id,
            visible: input.visible ?? true,
            locked: input.locked ?? false,
            tiles: new Array(map.width * map.height).fill(0),
        };

        layersById.set(id, layer);
        layerOrder.push(id);

        if (input.select || selectedLayerId === null) {
            selectedLayerId = id;
            emit(TILE_MAP_PLACEMENT_SELECTED_LAYER_SIGNAL, { layerId: id });
        }

        emitChanged();
        return createSuccess();
    };

    const removeLayer = (layerId: string): boolean => {
        if (!layersById.has(layerId)) {
            return false;
        }

        if (layerOrder.length <= 1) {
            return false;
        }

        layersById.delete(layerId);
        const index = layerOrder.indexOf(layerId);
        if (index >= 0) {
            layerOrder.splice(index, 1);
        }

        if (selectedLayerId === layerId) {
            selectedLayerId = layerOrder[0] ?? null;
            emit(TILE_MAP_PLACEMENT_SELECTED_LAYER_SIGNAL, {
                layerId: selectedLayerId,
            });
        }

        emitChanged();
        return true;
    };

    const setLayerVisibility = (layerId: string, visible: boolean): boolean => {
        const layer = layersById.get(layerId);
        if (!layer) {
            return false;
        }

        layer.visible = visible;
        emitChanged();
        return true;
    };

    const setLayerLocked = (layerId: string, locked: boolean): boolean => {
        const layer = layersById.get(layerId);
        if (!layer) {
            return false;
        }

        layer.locked = locked;
        emitChanged();
        return true;
    };

    const moveLayer = (layerId: string, direction: "up" | "down"): boolean => {
        const index = layerOrder.indexOf(layerId);
        if (index < 0) {
            return false;
        }

        const nextIndex = direction === "up" ? index - 1 : index + 1;
        if (nextIndex < 0 || nextIndex >= layerOrder.length) {
            return false;
        }

        const current = layerOrder[index];
        layerOrder[index] = layerOrder[nextIndex];
        layerOrder[nextIndex] = current;
        emitChanged();
        return true;
    };

    const duplicateLayer = (
        layerId: string,
        nextLayerId?: string,
    ): TileMapPlacementValidationResult => {
        const source = layersById.get(layerId);
        if (!source) {
            const failure = createFailure(
                "missing-layer",
                "Source layer could not be found.",
            );
            emit(TILE_MAP_PLACEMENT_INVALID_SIGNAL, failure);
            return failure;
        }

        let id = (nextLayerId ?? `${source.id}-copy`).trim();
        if (!id) {
            const failure = createFailure(
                "missing-layer-id",
                "Layer id is required.",
            );
            emit(TILE_MAP_PLACEMENT_INVALID_SIGNAL, failure);
            return failure;
        }

        if (layersById.has(id)) {
            let index = 1;
            const base = id;
            while (layersById.has(`${base}-${index}`)) {
                index += 1;
            }

            id = `${base}-${index}`;
        }

        const duplicated: TileMapLayerRecord = {
            id,
            name: `${source.name} Copy`,
            visible: source.visible,
            locked: source.locked,
            tiles: [...source.tiles],
        };

        layersById.set(id, duplicated);
        const sourceIndex = layerOrder.indexOf(source.id);
        layerOrder.splice(sourceIndex + 1, 0, id);
        selectedLayerId = id;
        emit(TILE_MAP_PLACEMENT_SELECTED_LAYER_SIGNAL, { layerId: id });
        emitChanged();
        return createSuccess();
    };

    const mergeLayerInto = (
        sourceLayerId: string,
        targetLayerId: string,
        options?: { removeSource?: boolean },
    ): TileMapPlacementValidationResult => {
        const source = layersById.get(sourceLayerId);
        const target = layersById.get(targetLayerId);
        if (!source || !target) {
            const failure = createFailure(
                "missing-layer",
                "Merge layers could not be found.",
            );
            emit(TILE_MAP_PLACEMENT_INVALID_SIGNAL, failure);
            return failure;
        }

        if (source.id === target.id) {
            const failure = createFailure(
                "invalid-payload",
                "Source and target layers must differ for merge.",
            );
            emit(TILE_MAP_PLACEMENT_INVALID_SIGNAL, failure);
            return failure;
        }

        if (target.locked) {
            const failure = createFailure(
                "layer-locked",
                "Target layer is locked.",
            );
            emit(TILE_MAP_PLACEMENT_INVALID_SIGNAL, failure);
            return failure;
        }

        for (let index = 0; index < source.tiles.length; index += 1) {
            const tileId = source.tiles[index] ?? 0;
            if (tileId > 0) {
                target.tiles[index] = tileId;
            }
        }

        if (options?.removeSource) {
            removeLayer(source.id);
        }

        emitChanged();
        return createSuccess();
    };

    const selectLayer = (layerId: string | null): boolean => {
        if (layerId === null) {
            selectedLayerId = null;
            emit(TILE_MAP_PLACEMENT_SELECTED_LAYER_SIGNAL, { layerId: null });
            emitChanged();
            return true;
        }

        if (!layersById.has(layerId)) {
            return false;
        }

        selectedLayerId = layerId;
        emit(TILE_MAP_PLACEMENT_SELECTED_LAYER_SIGNAL, { layerId });
        emitChanged();
        return true;
    };

    const validateEdit = (
        x: number,
        y: number,
        tileId: number,
        layerId?: string,
    ): { layer: TileMapLayerRecord } | TileMapPlacementValidationResult => {
        if (!withinBounds(x, y)) {
            const failure = createFailure(
                "out-of-bounds",
                "Tile coordinate is outside map bounds.",
            );
            emit(TILE_MAP_PLACEMENT_INVALID_SIGNAL, failure);
            return failure;
        }

        if (!Number.isInteger(tileId) || tileId < 0) {
            const failure = createFailure(
                "invalid-tile-id",
                "Tile id must be a non-negative integer.",
            );
            emit(TILE_MAP_PLACEMENT_INVALID_SIGNAL, failure);
            return failure;
        }

        const layer = activeLayer(layerId);
        if (!layer) {
            const failure = createFailure(
                "missing-layer",
                "No active layer is available for tile edit.",
            );
            emit(TILE_MAP_PLACEMENT_INVALID_SIGNAL, failure);
            return failure;
        }

        if (layer.locked) {
            const failure = createFailure("layer-locked", "Layer is locked.");
            emit(TILE_MAP_PLACEMENT_INVALID_SIGNAL, failure);
            return failure;
        }

        return { layer };
    };

    const placeTile = (
        x: number,
        y: number,
        tileId: number,
        layerId?: string,
    ): TileMapPlacementValidationResult => {
        const validated = validateEdit(x, y, tileId, layerId);
        if ("ok" in validated) {
            return validated;
        }

        const index = toLinearIndex(x, y, map.width);
        validated.layer.tiles[index] = tileId;
        emitChanged();
        return createSuccess();
    };

    const eraseTile = (
        x: number,
        y: number,
        layerId?: string,
    ): TileMapPlacementValidationResult => {
        return placeTile(x, y, 0, layerId);
    };

    const clearLayer = (layerId?: string): TileMapPlacementValidationResult => {
        const layer = activeLayer(layerId);
        if (!layer) {
            const failure = createFailure(
                "missing-layer",
                "No active layer is available to clear.",
            );
            emit(TILE_MAP_PLACEMENT_INVALID_SIGNAL, failure);
            return failure;
        }

        layer.tiles.fill(0);
        emitChanged();
        return createSuccess();
    };

    const addOverlayEntity = (
        input: TileMapOverlayEntityInput,
    ): TileMapPlacementValidationResult => {
        const id = input.id?.trim() || `overlay:${overlaysById.size}`;
        if (!id) {
            const failure = createFailure(
                "missing-overlay-id",
                "Overlay id is required.",
            );
            emit(TILE_MAP_PLACEMENT_INVALID_SIGNAL, failure);
            return failure;
        }

        if (overlaysById.has(id)) {
            const failure = createFailure(
                "duplicate-overlay-id",
                "Overlay id already exists.",
            );
            emit(TILE_MAP_PLACEMENT_INVALID_SIGNAL, failure);
            return failure;
        }

        const name = input.name.trim();
        if (!name) {
            const failure = createFailure(
                "missing-overlay-name",
                "Overlay name is required.",
            );
            emit(TILE_MAP_PLACEMENT_INVALID_SIGNAL, failure);
            return failure;
        }

        const x = Math.floor(input.x);
        const y = Math.floor(input.y);
        if (!withinBounds(x, y)) {
            const failure = createFailure(
                "out-of-bounds",
                "Overlay coordinate is outside map bounds.",
            );
            emit(TILE_MAP_PLACEMENT_INVALID_SIGNAL, failure);
            return failure;
        }

        overlaysById.set(id, {
            id,
            name,
            type: normalizeOverlayType(input.type),
            tag: normalizeOverlayTag(input.tag),
            x,
            y,
            roomIndex: Math.max(0, Math.floor(input.roomIndex ?? 0)),
            ...(Number.isFinite(input.tileId)
                ? { tileId: Math.max(0, Math.floor(input.tileId ?? 0)) }
                : {}),
        });

        emitChanged();
        return createSuccess();
    };

    const removeOverlayEntity = (entityId: string): boolean => {
        const removed = overlaysById.delete(entityId.trim());
        if (removed) {
            emitChanged();
        }

        return removed;
    };

    const setCollisionProfile = (patch: Partial<TileMapCollisionProfile>) => {
        collisionProfile = normalizeCollisionProfile(
            {
                ...collisionProfile,
                ...patch,
            },
            collisionProfile,
        );
        emitChanged();
    };

    const getTileAt = (x: number, y: number, layerId?: string): number => {
        const layer = activeLayer(layerId);
        if (!layer || !withinBounds(x, y)) {
            return 0;
        }

        const index = toLinearIndex(x, y, map.width);
        return layer.tiles[index] ?? 0;
    };

    const getSnapshot = (): TileMapPlacementSnapshot => {
        const layers = layerOrder
            .map((id) => layersById.get(id))
            .filter((layer): layer is TileMapLayerRecord => Boolean(layer))
            .map((layer) => cloneLayer(layer));
        const overlays = Array.from(overlaysById.values())
            .sort((left, right) => left.id.localeCompare(right.id))
            .map((overlay) => cloneOverlay(overlay));

        return {
            map: {
                width: map.width,
                height: map.height,
            },
            selectedLayerId,
            layerCount: layers.length,
            filledTileCount: filledTileCount(layers),
            layers,
            collisionProfile: {
                solidLayerIds: [...collisionProfile.solidLayerIds],
                solidLayerNameContains: [
                    ...collisionProfile.solidLayerNameContains,
                ],
                solidTileIds: [...collisionProfile.solidTileIds],
                fallbackToVisibleNonZero:
                    collisionProfile.fallbackToVisibleNonZero,
            },
            overlays,
        };
    };

    const exportPayload = (options?: { pretty?: boolean }): string => {
        const payload: TileMapPlacementPayload = {
            version: TILE_MAP_PLACEMENT_PAYLOAD_VERSION,
            map: {
                width: map.width,
                height: map.height,
            },
            selectedLayerId,
            layers: getSnapshot().layers,
            collisionProfile: {
                solidLayerIds: [...collisionProfile.solidLayerIds],
                solidLayerNameContains: [
                    ...collisionProfile.solidLayerNameContains,
                ],
                solidTileIds: [...collisionProfile.solidTileIds],
                fallbackToVisibleNonZero:
                    collisionProfile.fallbackToVisibleNonZero,
            },
            overlays: getSnapshot().overlays,
        };

        return JSON.stringify(payload, null, options?.pretty ? 2 : undefined);
    };

    const importPayload = (raw: string): TileMapPlacementValidationResult => {
        let parsed: unknown;
        try {
            parsed = JSON.parse(raw);
        } catch {
            const failure = createFailure(
                "invalid-payload",
                "Unable to parse tile map payload JSON.",
            );
            emit(TILE_MAP_PLACEMENT_INVALID_SIGNAL, failure);
            return failure;
        }

        if (!parsed || typeof parsed !== "object") {
            const failure = createFailure(
                "invalid-payload",
                "Tile map payload must be an object.",
            );
            emit(TILE_MAP_PLACEMENT_INVALID_SIGNAL, failure);
            return failure;
        }

        const payload = parsed as Partial<TileMapPlacementPayload>;
        const width = Number(payload.map?.width);
        const height = Number(payload.map?.height);
        if (!Number.isFinite(width) || !Number.isFinite(height)) {
            const failure = createFailure(
                "invalid-map-size",
                "Tile map payload must define finite map width/height.",
            );
            emit(TILE_MAP_PLACEMENT_INVALID_SIGNAL, failure);
            return failure;
        }

        const nextMap: TileMapBounds = {
            width: normalizePositiveInt(width, 1),
            height: normalizePositiveInt(height, 1),
        };

        const layers = Array.isArray(payload.layers) ? payload.layers : null;
        if (!layers || layers.length === 0) {
            const failure = createFailure(
                "invalid-payload",
                "Tile map payload must define at least one layer.",
            );
            emit(TILE_MAP_PLACEMENT_INVALID_SIGNAL, failure);
            return failure;
        }

        const nextLayersById = new Map<string, TileMapLayerRecord>();
        const nextLayerOrder: string[] = [];
        const nextOverlaysById = new Map<string, TileMapOverlayEntityRecord>();
        const expectedTilesLength = nextMap.width * nextMap.height;

        for (const layerInput of layers) {
            if (!layerInput || typeof layerInput !== "object") {
                const failure = createFailure(
                    "invalid-payload",
                    "Tile map layer entries must be objects.",
                );
                emit(TILE_MAP_PLACEMENT_INVALID_SIGNAL, failure);
                return failure;
            }

            const layerId = String(
                (layerInput as { id?: unknown }).id ?? "",
            ).trim();
            if (!layerId) {
                const failure = createFailure(
                    "missing-layer-id",
                    "Tile map layer id is required.",
                );
                emit(TILE_MAP_PLACEMENT_INVALID_SIGNAL, failure);
                return failure;
            }

            if (nextLayersById.has(layerId)) {
                const failure = createFailure(
                    "duplicate-layer-id",
                    "Tile map layer ids must be unique.",
                );
                emit(TILE_MAP_PLACEMENT_INVALID_SIGNAL, failure);
                return failure;
            }

            const rawTiles = (layerInput as { tiles?: unknown }).tiles;
            if (
                !Array.isArray(rawTiles) ||
                rawTiles.length !== expectedTilesLength
            ) {
                const failure = createFailure(
                    "invalid-payload",
                    `Layer ${layerId} has invalid tile array length.`,
                );
                emit(TILE_MAP_PLACEMENT_INVALID_SIGNAL, failure);
                return failure;
            }

            const tiles = rawTiles.map((value) => {
                const numeric = Number(value);
                if (!Number.isInteger(numeric) || numeric < 0) {
                    return -1;
                }

                return numeric;
            });

            if (tiles.some((value) => value < 0)) {
                const failure = createFailure(
                    "invalid-tile-id",
                    `Layer ${layerId} contains invalid tile ids.`,
                );
                emit(TILE_MAP_PLACEMENT_INVALID_SIGNAL, failure);
                return failure;
            }

            const layer: TileMapLayerRecord = {
                id: layerId,
                name:
                    String(
                        (layerInput as { name?: unknown }).name ?? "",
                    ).trim() || layerId,
                visible:
                    typeof (layerInput as { visible?: unknown }).visible ===
                    "boolean"
                        ? Boolean((layerInput as { visible?: unknown }).visible)
                        : true,
                locked:
                    typeof (layerInput as { locked?: unknown }).locked ===
                    "boolean"
                        ? Boolean((layerInput as { locked?: unknown }).locked)
                        : false,
                tiles,
            };

            nextLayersById.set(layerId, layer);
            nextLayerOrder.push(layerId);
        }

        map = nextMap;
        layersById.clear();
        for (const layerId of nextLayerOrder) {
            const layer = nextLayersById.get(layerId);
            if (layer) {
                layersById.set(layerId, layer);
            }
        }

        layerOrder.splice(0, layerOrder.length, ...nextLayerOrder);

        const requestedSelectedLayerId =
            typeof payload.selectedLayerId === "string"
                ? payload.selectedLayerId
                : null;
        selectedLayerId =
            requestedSelectedLayerId && layersById.has(requestedSelectedLayerId)
                ? requestedSelectedLayerId
                : (nextLayerOrder[0] ?? null);

        const overlays = Array.isArray(
            (payload as { overlays?: unknown }).overlays,
        )
            ? ((payload as { overlays?: unknown[] }).overlays ?? [])
            : [];
        for (const overlayInput of overlays) {
            if (!overlayInput || typeof overlayInput !== "object") {
                const failure = createFailure(
                    "invalid-payload",
                    "Tile map overlays must be objects.",
                );
                emit(TILE_MAP_PLACEMENT_INVALID_SIGNAL, failure);
                return failure;
            }

            const id = String(
                (overlayInput as { id?: unknown }).id ?? "",
            ).trim();
            const name = String(
                (overlayInput as { name?: unknown }).name ?? "",
            ).trim();
            if (!id || !name || nextOverlaysById.has(id)) {
                const failure = createFailure(
                    "invalid-payload",
                    "Tile map overlays contain invalid ids or names.",
                );
                emit(TILE_MAP_PLACEMENT_INVALID_SIGNAL, failure);
                return failure;
            }

            const x = Number((overlayInput as { x?: unknown }).x);
            const y = Number((overlayInput as { y?: unknown }).y);
            if (!Number.isFinite(x) || !Number.isFinite(y)) {
                const failure = createFailure(
                    "invalid-payload",
                    "Tile map overlays must define numeric x/y coordinates.",
                );
                emit(TILE_MAP_PLACEMENT_INVALID_SIGNAL, failure);
                return failure;
            }

            const normalizedX = Math.floor(x);
            const normalizedY = Math.floor(y);
            if (
                normalizedX < 0 ||
                normalizedY < 0 ||
                normalizedX >= nextMap.width ||
                normalizedY >= nextMap.height
            ) {
                const failure = createFailure(
                    "invalid-payload",
                    "Tile map overlay coordinates are outside map bounds.",
                );
                emit(TILE_MAP_PLACEMENT_INVALID_SIGNAL, failure);
                return failure;
            }

            nextOverlaysById.set(id, {
                id,
                name,
                type: normalizeOverlayType(
                    (overlayInput as { type?: unknown }).type,
                ),
                tag: normalizeOverlayTag(
                    (overlayInput as { tag?: unknown }).tag,
                ),
                x: normalizedX,
                y: normalizedY,
                roomIndex: Math.max(
                    0,
                    Math.floor(
                        Number(
                            (overlayInput as { roomIndex?: unknown }).roomIndex,
                        ) || 0,
                    ),
                ),
                ...(Number.isFinite(
                    Number((overlayInput as { tileId?: unknown }).tileId),
                )
                    ? {
                          tileId: Math.max(
                              0,
                              Math.floor(
                                  Number(
                                      (overlayInput as { tileId?: unknown })
                                          .tileId,
                                  ),
                              ),
                          ),
                      }
                    : {}),
            });
        }

        overlaysById.clear();
        for (const [id, overlay] of nextOverlaysById.entries()) {
            overlaysById.set(id, overlay);
        }

        collisionProfile = normalizeCollisionProfile(
            (payload as { collisionProfile?: unknown }).collisionProfile,
            DEFAULT_TILEMAP_COLLISION_PROFILE,
        );

        emit(TILE_MAP_PLACEMENT_IMPORTED_SIGNAL, {
            map,
            selectedLayerId,
            layerCount: layerOrder.length,
        });
        emitChanged();
        return createSuccess();
    };

    return {
        setMapBounds,
        addLayer,
        removeLayer,
        setLayerVisibility,
        setLayerLocked,
        moveLayer,
        duplicateLayer,
        mergeLayerInto,
        selectLayer,
        placeTile,
        eraseTile,
        clearLayer,
        setCollisionProfile,
        addOverlayEntity,
        removeOverlayEntity,
        getTileAt,
        exportPayload,
        importPayload,
        getSnapshot,
    };
}

export const tileMapPlacement = createTileMapPlacementService();
