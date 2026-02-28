import {
    markerRegistry,
    type MarkerCategory,
    type ResolvedMarker,
} from "@/services/markerRegistry";
import { signalBus } from "@/services/signalBus";

export type MapChannel = "map" | "minimap";

export type MapMarkerLayer =
    | "objective"
    | "npc"
    | "checkpoint"
    | "poi"
    | "custom";

export type MapWorldModel = {
    width: number;
    height: number;
    tileSize: number;
    originX: number;
    originY: number;
};

export type MapPlayerPosition = {
    x: number;
    y: number;
};

export type MapZoomPolicy = {
    min: number;
    max: number;
    step: number;
    default: number;
    minimapRadiusPx: number;
};

export type MapMarkerView = {
    id: string;
    label: string;
    category: MarkerCategory;
    layer: MapMarkerLayer;
    x: number;
    y: number;
    priority: number;
};

export type MapSnapshot = {
    world: MapWorldModel;
    discoveredTileCount: number;
    playerPosition: MapPlayerPosition | null;
    zoomByChannel: Record<MapChannel, number>;
    layerVisibility: Record<MapChannel, Record<MapMarkerLayer, boolean>>;
};

export type MapMiniMapService = {
    setWorld: (world: Partial<MapWorldModel>) => void;
    setPlayerPosition: (x: number, y: number) => void;
    discoverTile: (tileX: number, tileY: number) => boolean;
    discoverAtWorldPosition: (x: number, y: number) => boolean;
    discoverAroundWorldPosition: (
        x: number,
        y: number,
        radiusTiles: number,
    ) => number;
    isDiscoveredTile: (tileX: number, tileY: number) => boolean;
    setLayerVisibility: (
        channel: MapChannel,
        layer: MapMarkerLayer,
        visible: boolean,
    ) => void;
    setZoom: (channel: MapChannel, zoom: number) => number;
    setZoomPolicy: (channel: MapChannel, patch: Partial<MapZoomPolicy>) => void;
    resolveMarkers: <TContext = unknown>(options?: {
        channel?: MapChannel;
        context?: TContext;
    }) => MapMarkerView[];
    getSnapshot: () => MapSnapshot;
};

export const MAP_DISCOVERY_UPDATED_SIGNAL = "map:discovery:updated";
export const MAP_PLAYER_UPDATED_SIGNAL = "map:player:updated";
export const MAP_VIEW_CHANGED_SIGNAL = "map:view:changed";

const DEFAULT_WORLD: MapWorldModel = {
    width: 500,
    height: 500,
    tileSize: 16,
    originX: 0,
    originY: 0,
};

const DEFAULT_ZOOM_POLICY: MapZoomPolicy = {
    min: 0.5,
    max: 3,
    step: 0.1,
    default: 1,
    minimapRadiusPx: 180,
};

const DEFAULT_LAYER_VISIBILITY: Record<MapMarkerLayer, boolean> = {
    objective: true,
    npc: true,
    checkpoint: true,
    poi: true,
    custom: true,
};

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function normalizePositive(value: number, fallback: number): number {
    if (!Number.isFinite(value) || value <= 0) {
        return fallback;
    }

    return value;
}

function tileKey(tileX: number, tileY: number): string {
    return `${tileX}:${tileY}`;
}

function isLayer(value: unknown): value is MapMarkerLayer {
    return (
        value === "objective" ||
        value === "npc" ||
        value === "checkpoint" ||
        value === "poi" ||
        value === "custom"
    );
}

function inferLayer(marker: ResolvedMarker): MapMarkerLayer {
    const metadataLayer = marker.metadata?.mapLayer;
    if (isLayer(metadataLayer)) {
        return metadataLayer;
    }

    if (marker.category === "objective") {
        return "objective";
    }

    if (marker.category === "navigation") {
        return "checkpoint";
    }

    if (marker.category === "interaction") {
        return "npc";
    }

    if (marker.category === "poi") {
        return "poi";
    }

    return "custom";
}

function toTile(world: MapWorldModel, x: number, y: number) {
    return {
        tileX: Math.floor((x - world.originX) / world.tileSize),
        tileY: Math.floor((y - world.originY) / world.tileSize),
    };
}

function inWorld(world: MapWorldModel, tileX: number, tileY: number) {
    const maxTileX = Math.max(1, Math.ceil(world.width / world.tileSize));
    const maxTileY = Math.max(1, Math.ceil(world.height / world.tileSize));

    return tileX >= 0 && tileY >= 0 && tileX < maxTileX && tileY < maxTileY;
}

export function createMapMiniMapService(options?: {
    emit?: <TPayload>(signal: string, payload: TPayload) => void;
    markerResolver?: <TContext = unknown>(input: {
        channel: MapChannel;
        context?: TContext;
    }) => ResolvedMarker<TContext>[];
}): MapMiniMapService {
    const emit =
        options?.emit ??
        (<TPayload>(signal: string, payload: TPayload) => {
            signalBus.emit(signal, payload);
        });

    const markerResolver =
        options?.markerResolver ??
        (<TContext>({
            channel,
            context,
        }: {
            channel: MapChannel;
            context?: TContext;
        }) => {
            return markerRegistry.resolveMarkers({ channel, context });
        });

    let world: MapWorldModel = { ...DEFAULT_WORLD };
    let playerPosition: MapPlayerPosition | null = null;

    const zoomPolicies: Record<MapChannel, MapZoomPolicy> = {
        map: { ...DEFAULT_ZOOM_POLICY },
        minimap: { ...DEFAULT_ZOOM_POLICY },
    };

    const zoomByChannel: Record<MapChannel, number> = {
        map: DEFAULT_ZOOM_POLICY.default,
        minimap: DEFAULT_ZOOM_POLICY.default,
    };

    const layerVisibility: Record<
        MapChannel,
        Record<MapMarkerLayer, boolean>
    > = {
        map: { ...DEFAULT_LAYER_VISIBILITY },
        minimap: { ...DEFAULT_LAYER_VISIBILITY },
    };

    const discoveredTiles = new Set<string>();

    const emitViewChanged = () => {
        emit(MAP_VIEW_CHANGED_SIGNAL, {
            zoomByChannel: { ...zoomByChannel },
            layerVisibility: {
                map: { ...layerVisibility.map },
                minimap: { ...layerVisibility.minimap },
            },
        });
    };

    const discoverTile = (tileX: number, tileY: number): boolean => {
        if (!inWorld(world, tileX, tileY)) {
            return false;
        }

        const key = tileKey(tileX, tileY);
        if (discoveredTiles.has(key)) {
            return false;
        }

        discoveredTiles.add(key);
        emit(MAP_DISCOVERY_UPDATED_SIGNAL, {
            tileX,
            tileY,
            discoveredTileCount: discoveredTiles.size,
        });
        return true;
    };

    const setWorld = (patch: Partial<MapWorldModel>) => {
        world = {
            width: normalizePositive(patch.width ?? world.width, world.width),
            height: normalizePositive(
                patch.height ?? world.height,
                world.height,
            ),
            tileSize: normalizePositive(
                patch.tileSize ?? world.tileSize,
                world.tileSize,
            ),
            originX: Number.isFinite(patch.originX)
                ? (patch.originX ?? world.originX)
                : world.originX,
            originY: Number.isFinite(patch.originY)
                ? (patch.originY ?? world.originY)
                : world.originY,
        };

        emitViewChanged();
    };

    const setPlayerPosition = (x: number, y: number) => {
        const nextX = Number.isFinite(x) ? x : 0;
        const nextY = Number.isFinite(y) ? y : 0;
        playerPosition = { x: nextX, y: nextY };
        emit(MAP_PLAYER_UPDATED_SIGNAL, { x: nextX, y: nextY });
    };

    const discoverAtWorldPosition = (x: number, y: number) => {
        const { tileX, tileY } = toTile(world, x, y);
        return discoverTile(tileX, tileY);
    };

    const discoverAroundWorldPosition = (
        x: number,
        y: number,
        radiusTiles: number,
    ) => {
        const { tileX, tileY } = toTile(world, x, y);
        const radius = Math.max(
            0,
            Math.floor(Number.isFinite(radiusTiles) ? radiusTiles : 0),
        );

        let added = 0;
        for (let dy = -radius; dy <= radius; dy += 1) {
            for (let dx = -radius; dx <= radius; dx += 1) {
                if (Math.hypot(dx, dy) > radius) {
                    continue;
                }

                if (discoverTile(tileX + dx, tileY + dy)) {
                    added += 1;
                }
            }
        }

        return added;
    };

    const isDiscoveredTile = (tileX: number, tileY: number) => {
        return discoveredTiles.has(tileKey(tileX, tileY));
    };

    const setLayerVisibility = (
        channel: MapChannel,
        layer: MapMarkerLayer,
        visible: boolean,
    ) => {
        layerVisibility[channel][layer] = visible;
        emitViewChanged();
    };

    const setZoomPolicy = (
        channel: MapChannel,
        patch: Partial<MapZoomPolicy>,
    ) => {
        const current = zoomPolicies[channel];
        const next: MapZoomPolicy = {
            min: normalizePositive(patch.min ?? current.min, current.min),
            max: normalizePositive(patch.max ?? current.max, current.max),
            step: normalizePositive(patch.step ?? current.step, current.step),
            default: normalizePositive(
                patch.default ?? current.default,
                current.default,
            ),
            minimapRadiusPx: normalizePositive(
                patch.minimapRadiusPx ?? current.minimapRadiusPx,
                current.minimapRadiusPx,
            ),
        };

        next.max = Math.max(next.max, next.min);
        next.default = clamp(next.default, next.min, next.max);

        zoomPolicies[channel] = next;
        zoomByChannel[channel] = clamp(
            zoomByChannel[channel],
            next.min,
            next.max,
        );
        emitViewChanged();
    };

    const setZoom = (channel: MapChannel, zoom: number) => {
        const policy = zoomPolicies[channel];
        const normalized = clamp(
            Number.isFinite(zoom) ? zoom : policy.default,
            policy.min,
            policy.max,
        );
        zoomByChannel[channel] = normalized;
        emitViewChanged();
        return normalized;
    };

    const resolveMarkers = <TContext = unknown>(resolveOptions?: {
        channel?: MapChannel;
        context?: TContext;
    }): MapMarkerView[] => {
        const channel = resolveOptions?.channel ?? "map";
        const markers = markerResolver({
            channel,
            context: resolveOptions?.context,
        });

        const player = playerPosition;
        const minimapRadius =
            zoomPolicies.minimap.minimapRadiusPx /
            Math.max(0.0001, zoomByChannel.minimap);

        return markers
            .filter((marker) => Boolean(marker.position))
            .map((marker) => {
                const layer = inferLayer(marker as ResolvedMarker);
                return {
                    marker,
                    layer,
                };
            })
            .filter(({ layer }) => layerVisibility[channel][layer])
            .filter(({ marker }) => {
                if (channel !== "minimap") {
                    return true;
                }

                if (!player || !marker.position) {
                    return true;
                }

                return (
                    Math.hypot(
                        marker.position.x - player.x,
                        marker.position.y - player.y,
                    ) <= minimapRadius
                );
            })
            .map(({ marker, layer }) => ({
                id: marker.id,
                label: marker.label,
                category: marker.category,
                layer,
                x: marker.position?.x ?? 0,
                y: marker.position?.y ?? 0,
                priority: marker.priority,
            }))
            .sort((left, right) => {
                if (left.priority === right.priority) {
                    return left.id.localeCompare(right.id);
                }

                return right.priority - left.priority;
            });
    };

    const getSnapshot = (): MapSnapshot => {
        return {
            world: { ...world },
            discoveredTileCount: discoveredTiles.size,
            playerPosition: playerPosition ? { ...playerPosition } : null,
            zoomByChannel: { ...zoomByChannel },
            layerVisibility: {
                map: { ...layerVisibility.map },
                minimap: { ...layerVisibility.minimap },
            },
        };
    };

    return {
        setWorld,
        setPlayerPosition,
        discoverTile,
        discoverAtWorldPosition,
        discoverAroundWorldPosition,
        isDiscoveredTile,
        setLayerVisibility,
        setZoom,
        setZoomPolicy,
        resolveMarkers,
        getSnapshot,
    };
}

export const mapMiniMap = createMapMiniMapService();
