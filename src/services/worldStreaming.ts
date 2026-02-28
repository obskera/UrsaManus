import { signalBus } from "@/services/signalBus";

export type ChunkCoordinate = {
    x: number;
    y: number;
};

export type WorldStreamingWorldConfig = {
    width: number;
    height: number;
    chunkWidth: number;
    chunkHeight: number;
};

export type WorldStreamingLoadPolicy = {
    activeRadiusChunks: number;
    preloadRadiusChunks: number;
};

export type WorldStreamingEntityInput = {
    id: string;
    x: number;
    y: number;
    alwaysActive?: boolean;
};

export type WorldStreamingEntitySnapshot = {
    id: string;
    x: number;
    y: number;
    chunkX: number;
    chunkY: number;
    alwaysActive: boolean;
    active: boolean;
};

export type WorldStreamingUpdateResult = {
    focusChunk: ChunkCoordinate;
    loadedChunks: ChunkCoordinate[];
    unloadedChunks: ChunkCoordinate[];
    activatedEntityIds: string[];
    deactivatedEntityIds: string[];
};

export type WorldStreamingSnapshot = {
    world: WorldStreamingWorldConfig;
    policy: WorldStreamingLoadPolicy;
    focusChunk: ChunkCoordinate;
    loadedChunkCount: number;
    activeChunkCount: number;
    activeEntityCount: number;
    loadedChunks: ChunkCoordinate[];
    activeChunks: ChunkCoordinate[];
    entities: WorldStreamingEntitySnapshot[];
};

export type WorldStreamingService = {
    setWorld: (patch: Partial<WorldStreamingWorldConfig>) => void;
    setLoadPolicy: (patch: Partial<WorldStreamingLoadPolicy>) => void;
    registerEntity: (entity: WorldStreamingEntityInput) => boolean;
    unregisterEntity: (entityId: string) => boolean;
    updateEntityPosition: (entityId: string, x: number, y: number) => boolean;
    updateFocus: (x: number, y: number) => WorldStreamingUpdateResult;
    forceLoadChunk: (chunkX: number, chunkY: number) => boolean;
    forceUnloadChunk: (chunkX: number, chunkY: number) => boolean;
    isEntityActive: (entityId: string) => boolean;
    getSnapshot: () => WorldStreamingSnapshot;
};

export const WORLD_STREAM_CHUNK_LOADED_SIGNAL = "world:stream:chunk:loaded";
export const WORLD_STREAM_CHUNK_UNLOADED_SIGNAL = "world:stream:chunk:unloaded";
export const WORLD_STREAM_ENTITY_ACTIVATED_SIGNAL =
    "world:stream:entity:activated";
export const WORLD_STREAM_ENTITY_DEACTIVATED_SIGNAL =
    "world:stream:entity:deactivated";
export const WORLD_STREAM_UPDATED_SIGNAL = "world:stream:updated";

const DEFAULT_WORLD: WorldStreamingWorldConfig = {
    width: 1024,
    height: 1024,
    chunkWidth: 256,
    chunkHeight: 256,
};

const DEFAULT_POLICY: WorldStreamingLoadPolicy = {
    activeRadiusChunks: 0,
    preloadRadiusChunks: 1,
};

type WorldStreamingEntityRuntime = {
    id: string;
    x: number;
    y: number;
    chunkX: number;
    chunkY: number;
    alwaysActive: boolean;
};

function toFinite(value: number | undefined, fallback: number): number {
    if (!Number.isFinite(value)) {
        return fallback;
    }

    return value ?? fallback;
}

function toPositiveInt(value: number | undefined, fallback: number): number {
    if (!Number.isFinite(value)) {
        return fallback;
    }

    return Math.max(1, Math.floor(value ?? fallback));
}

function toNonNegativeInt(value: number | undefined, fallback: number): number {
    if (!Number.isFinite(value)) {
        return fallback;
    }

    return Math.max(0, Math.floor(value ?? fallback));
}

function chunkKey(chunkX: number, chunkY: number): string {
    return `${chunkX},${chunkY}`;
}

function parseChunkKey(key: string): ChunkCoordinate {
    const [xText, yText] = key.split(",");
    return {
        x: Number.parseInt(xText, 10),
        y: Number.parseInt(yText, 10),
    };
}

function sortChunkKeys(keys: Iterable<string>): string[] {
    return Array.from(keys).sort((left, right) => {
        const leftChunk = parseChunkKey(left);
        const rightChunk = parseChunkKey(right);

        if (leftChunk.y !== rightChunk.y) {
            return leftChunk.y - rightChunk.y;
        }

        return leftChunk.x - rightChunk.x;
    });
}

export function createWorldStreamingService(options?: {
    emit?: <TPayload>(signal: string, payload: TPayload) => void;
}): WorldStreamingService {
    const emit =
        options?.emit ??
        (<TPayload>(signal: string, payload: TPayload) => {
            signalBus.emit(signal, payload);
        });

    let world: WorldStreamingWorldConfig = { ...DEFAULT_WORLD };
    let policy: WorldStreamingLoadPolicy = { ...DEFAULT_POLICY };
    let focusChunk: ChunkCoordinate = { x: 0, y: 0 };

    const forcedLoadedChunks = new Set<string>();
    const loadedChunks = new Set<string>();
    const activeChunks = new Set<string>();
    const activeEntityIds = new Set<string>();
    const entitiesById = new Map<string, WorldStreamingEntityRuntime>();

    const getChunkGridSize = () => {
        return {
            columns: Math.max(1, Math.ceil(world.width / world.chunkWidth)),
            rows: Math.max(1, Math.ceil(world.height / world.chunkHeight)),
        };
    };

    const clampChunkCoordinate = (chunk: ChunkCoordinate): ChunkCoordinate => {
        const { columns, rows } = getChunkGridSize();
        return {
            x: Math.max(0, Math.min(columns - 1, chunk.x)),
            y: Math.max(0, Math.min(rows - 1, chunk.y)),
        };
    };

    const toChunkCoordinate = (x: number, y: number): ChunkCoordinate => {
        const normalizedX = toFinite(x, 0);
        const normalizedY = toFinite(y, 0);

        const rawChunk = {
            x: Math.floor(normalizedX / world.chunkWidth),
            y: Math.floor(normalizedY / world.chunkHeight),
        };

        return clampChunkCoordinate(rawChunk);
    };

    const computeRadiusChunks = (center: ChunkCoordinate, radius: number) => {
        const clampedCenter = clampChunkCoordinate(center);
        const radiusValue = Math.max(0, radius);
        const chunks = new Set<string>();

        const { columns, rows } = getChunkGridSize();

        const minX = Math.max(0, clampedCenter.x - radiusValue);
        const maxX = Math.min(columns - 1, clampedCenter.x + radiusValue);
        const minY = Math.max(0, clampedCenter.y - radiusValue);
        const maxY = Math.min(rows - 1, clampedCenter.y + radiusValue);

        for (let chunkY = minY; chunkY <= maxY; chunkY += 1) {
            for (let chunkX = minX; chunkX <= maxX; chunkX += 1) {
                chunks.add(chunkKey(chunkX, chunkY));
            }
        }

        return chunks;
    };

    const recompute = (): WorldStreamingUpdateResult => {
        const nextActiveChunks = computeRadiusChunks(
            focusChunk,
            policy.activeRadiusChunks,
        );
        const nextLoadedChunks = computeRadiusChunks(
            focusChunk,
            Math.max(policy.activeRadiusChunks, policy.preloadRadiusChunks),
        );

        for (const forced of forcedLoadedChunks) {
            nextLoadedChunks.add(forced);
        }

        const justLoaded = sortChunkKeys(nextLoadedChunks).filter(
            (key) => !loadedChunks.has(key),
        );
        const justUnloaded = sortChunkKeys(loadedChunks).filter(
            (key) => !nextLoadedChunks.has(key),
        );

        loadedChunks.clear();
        for (const key of nextLoadedChunks) {
            loadedChunks.add(key);
        }

        activeChunks.clear();
        for (const key of nextActiveChunks) {
            activeChunks.add(key);
        }

        for (const key of justLoaded) {
            const chunk = parseChunkKey(key);
            emit(WORLD_STREAM_CHUNK_LOADED_SIGNAL, {
                chunkX: chunk.x,
                chunkY: chunk.y,
            });
        }

        for (const key of justUnloaded) {
            const chunk = parseChunkKey(key);
            emit(WORLD_STREAM_CHUNK_UNLOADED_SIGNAL, {
                chunkX: chunk.x,
                chunkY: chunk.y,
            });
        }

        const nextActiveEntities = new Set<string>();
        for (const entity of entitiesById.values()) {
            if (entity.alwaysActive) {
                nextActiveEntities.add(entity.id);
                continue;
            }

            if (activeChunks.has(chunkKey(entity.chunkX, entity.chunkY))) {
                nextActiveEntities.add(entity.id);
            }
        }

        const activatedEntityIds = Array.from(nextActiveEntities)
            .filter((id) => !activeEntityIds.has(id))
            .sort((left, right) => left.localeCompare(right));
        const deactivatedEntityIds = Array.from(activeEntityIds)
            .filter((id) => !nextActiveEntities.has(id))
            .sort((left, right) => left.localeCompare(right));

        activeEntityIds.clear();
        for (const id of nextActiveEntities) {
            activeEntityIds.add(id);
        }

        for (const entityId of activatedEntityIds) {
            emit(WORLD_STREAM_ENTITY_ACTIVATED_SIGNAL, { entityId });
        }

        for (const entityId of deactivatedEntityIds) {
            emit(WORLD_STREAM_ENTITY_DEACTIVATED_SIGNAL, { entityId });
        }

        const updateResult: WorldStreamingUpdateResult = {
            focusChunk: { ...focusChunk },
            loadedChunks: justLoaded.map((key) => parseChunkKey(key)),
            unloadedChunks: justUnloaded.map((key) => parseChunkKey(key)),
            activatedEntityIds,
            deactivatedEntityIds,
        };

        emit(WORLD_STREAM_UPDATED_SIGNAL, {
            focusChunk: updateResult.focusChunk,
            loadedChunkCount: loadedChunks.size,
            activeChunkCount: activeChunks.size,
            activeEntityCount: activeEntityIds.size,
        });

        return updateResult;
    };

    const setWorld = (patch: Partial<WorldStreamingWorldConfig>) => {
        world = {
            width: toPositiveInt(patch.width, world.width),
            height: toPositiveInt(patch.height, world.height),
            chunkWidth: toPositiveInt(patch.chunkWidth, world.chunkWidth),
            chunkHeight: toPositiveInt(patch.chunkHeight, world.chunkHeight),
        };

        focusChunk = clampChunkCoordinate(focusChunk);

        for (const entity of entitiesById.values()) {
            const chunk = toChunkCoordinate(entity.x, entity.y);
            entity.chunkX = chunk.x;
            entity.chunkY = chunk.y;
        }

        for (const key of Array.from(forcedLoadedChunks)) {
            const chunk = clampChunkCoordinate(parseChunkKey(key));
            const normalizedKey = chunkKey(chunk.x, chunk.y);
            if (normalizedKey !== key) {
                forcedLoadedChunks.delete(key);
                forcedLoadedChunks.add(normalizedKey);
            }
        }

        recompute();
    };

    const setLoadPolicy = (patch: Partial<WorldStreamingLoadPolicy>) => {
        policy = {
            activeRadiusChunks: toNonNegativeInt(
                patch.activeRadiusChunks,
                policy.activeRadiusChunks,
            ),
            preloadRadiusChunks: toNonNegativeInt(
                patch.preloadRadiusChunks,
                policy.preloadRadiusChunks,
            ),
        };

        if (policy.preloadRadiusChunks < policy.activeRadiusChunks) {
            policy.preloadRadiusChunks = policy.activeRadiusChunks;
        }

        recompute();
    };

    const registerEntity = (entity: WorldStreamingEntityInput): boolean => {
        const id = entity.id.trim();
        if (!id) {
            return false;
        }

        const chunk = toChunkCoordinate(entity.x, entity.y);
        entitiesById.set(id, {
            id,
            x: toFinite(entity.x, 0),
            y: toFinite(entity.y, 0),
            chunkX: chunk.x,
            chunkY: chunk.y,
            alwaysActive: entity.alwaysActive ?? false,
        });

        recompute();
        return true;
    };

    const unregisterEntity = (entityId: string): boolean => {
        const id = entityId.trim();
        if (!id) {
            return false;
        }

        const didDelete = entitiesById.delete(id);
        if (didDelete) {
            recompute();
        }

        return didDelete;
    };

    const updateEntityPosition = (
        entityId: string,
        x: number,
        y: number,
    ): boolean => {
        const runtime = entitiesById.get(entityId.trim());
        if (!runtime) {
            return false;
        }

        runtime.x = toFinite(x, runtime.x);
        runtime.y = toFinite(y, runtime.y);

        const chunk = toChunkCoordinate(runtime.x, runtime.y);
        runtime.chunkX = chunk.x;
        runtime.chunkY = chunk.y;

        recompute();
        return true;
    };

    const updateFocus = (x: number, y: number): WorldStreamingUpdateResult => {
        focusChunk = toChunkCoordinate(x, y);
        return recompute();
    };

    const forceLoadChunk = (chunkX: number, chunkY: number): boolean => {
        const chunk = clampChunkCoordinate({
            x: toNonNegativeInt(chunkX, 0),
            y: toNonNegativeInt(chunkY, 0),
        });

        const key = chunkKey(chunk.x, chunk.y);
        const hadKey = forcedLoadedChunks.has(key);
        forcedLoadedChunks.add(key);

        if (!hadKey) {
            recompute();
        }

        return true;
    };

    const forceUnloadChunk = (chunkX: number, chunkY: number): boolean => {
        const chunk = clampChunkCoordinate({
            x: toNonNegativeInt(chunkX, 0),
            y: toNonNegativeInt(chunkY, 0),
        });
        const key = chunkKey(chunk.x, chunk.y);

        const didDelete = forcedLoadedChunks.delete(key);
        if (didDelete) {
            recompute();
        }

        return didDelete;
    };

    const isEntityActive = (entityId: string): boolean => {
        return activeEntityIds.has(entityId.trim());
    };

    const getSnapshot = (): WorldStreamingSnapshot => {
        const loadedChunkKeys = sortChunkKeys(loadedChunks);
        const activeChunkKeys = sortChunkKeys(activeChunks);

        const entities = Array.from(entitiesById.values())
            .sort((left, right) => left.id.localeCompare(right.id))
            .map((entity) => ({
                id: entity.id,
                x: entity.x,
                y: entity.y,
                chunkX: entity.chunkX,
                chunkY: entity.chunkY,
                alwaysActive: entity.alwaysActive,
                active: activeEntityIds.has(entity.id),
            }));

        return {
            world: { ...world },
            policy: { ...policy },
            focusChunk: { ...focusChunk },
            loadedChunkCount: loadedChunkKeys.length,
            activeChunkCount: activeChunkKeys.length,
            activeEntityCount: activeEntityIds.size,
            loadedChunks: loadedChunkKeys.map((key) => parseChunkKey(key)),
            activeChunks: activeChunkKeys.map((key) => parseChunkKey(key)),
            entities,
        };
    };

    recompute();

    return {
        setWorld,
        setLoadPolicy,
        registerEntity,
        unregisterEntity,
        updateEntityPosition,
        updateFocus,
        forceLoadChunk,
        forceUnloadChunk,
        isEntityActive,
        getSnapshot,
    };
}

export const worldStreaming = createWorldStreamingService();
