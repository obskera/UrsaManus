import { signalBus } from "@/services/signalBus";

export type GridMoveDirection = "up" | "down" | "left" | "right";

export type GridMoveDelta = {
    x: -1 | 0 | 1;
    y: -1 | 0 | 1;
};

export type GridMoveSnapPolicy = "always" | "on-block" | "never";

export type GridMoveAnchor = "top-left" | "center";

export type GridMovementConfig = {
    tileWidth: number;
    tileHeight: number;
    originX: number;
    originY: number;
    moveCadenceMs: number;
    snapPolicy: GridMoveSnapPolicy;
    gridWidth: number | null;
    gridHeight: number | null;
};

export type GridTilePosition = {
    tileX: number;
    tileY: number;
};

export type GridWorldPosition = {
    x: number;
    y: number;
};

export type GridMovementActorSnapshot = {
    actorId: string;
    tileX: number;
    tileY: number;
    worldX: number;
    worldY: number;
    lastMoveAtMs: number;
};

export type GridMovementBlockReason =
    | "unknown-actor"
    | "move-cadence"
    | "out-of-bounds"
    | "blocked";

export type GridMovementMoveBlocked = {
    ok: false;
    actorId: string;
    reason: GridMovementBlockReason;
    direction: GridMoveDirection;
    from: GridMovementActorSnapshot | null;
    to: GridTilePosition;
    nowMs: number;
    retryInMs: number;
};

export type GridMovementMoveApplied = {
    ok: true;
    actorId: string;
    direction: GridMoveDirection;
    from: GridMovementActorSnapshot;
    to: GridMovementActorSnapshot;
    nowMs: number;
};

export type GridMovementMoveResult =
    | GridMovementMoveBlocked
    | GridMovementMoveApplied;

export type GridMovementService = {
    setConfig: (patch: Partial<GridMovementConfig>) => GridMovementConfig;
    getConfig: () => GridMovementConfig;
    worldToTile: (x: number, y: number) => GridTilePosition;
    tileToWorld: (
        tileX: number,
        tileY: number,
        anchor?: GridMoveAnchor,
    ) => GridWorldPosition;
    registerActor: (
        actorId: string,
        position: GridWorldPosition,
    ) => GridMovementActorSnapshot;
    unregisterActor: (actorId: string) => boolean;
    getActor: (actorId: string) => GridMovementActorSnapshot | null;
    listActors: () => GridMovementActorSnapshot[];
    syncActorWorldPosition: (
        actorId: string,
        position: GridWorldPosition,
    ) => GridMovementActorSnapshot | null;
    canMove: (
        actorId: string,
        direction: GridMoveDirection,
    ) => GridMovementMoveBlocked | null;
    moveActor: (
        actorId: string,
        direction: GridMoveDirection,
    ) => GridMovementMoveResult;
    tick: (deltaMs: number) => number;
};

export const GRID_MOVEMENT_CONFIG_UPDATED_SIGNAL =
    "grid:movement:config:updated";
export const GRID_MOVEMENT_ACTOR_REGISTERED_SIGNAL =
    "grid:movement:actor:registered";
export const GRID_MOVEMENT_ACTOR_UPDATED_SIGNAL = "grid:movement:actor:updated";
export const GRID_MOVEMENT_ACTOR_REMOVED_SIGNAL = "grid:movement:actor:removed";
export const GRID_MOVEMENT_APPLIED_SIGNAL = "grid:movement:applied";
export const GRID_MOVEMENT_BLOCKED_SIGNAL = "grid:movement:blocked";

const DEFAULT_CONFIG: GridMovementConfig = {
    tileWidth: 16,
    tileHeight: 16,
    originX: 0,
    originY: 0,
    moveCadenceMs: 120,
    snapPolicy: "always",
    gridWidth: null,
    gridHeight: null,
};

const DIRECTION_DELTAS: Record<GridMoveDirection, GridMoveDelta> = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
};

type GridMovementActorRuntime = {
    actorId: string;
    tileX: number;
    tileY: number;
    worldX: number;
    worldY: number;
    lastMoveAtMs: number;
};

function normalizeNumber(value: number, fallback: number): number {
    if (!Number.isFinite(value)) {
        return fallback;
    }

    return value;
}

function normalizePositiveInteger(value: number, fallback: number): number {
    if (!Number.isFinite(value)) {
        return fallback;
    }

    const normalized = Math.floor(value);
    if (normalized <= 0) {
        return fallback;
    }

    return normalized;
}

function normalizeMaybeBound(value: number | null | undefined): number | null {
    if (value === null || value === undefined) {
        return null;
    }

    if (!Number.isFinite(value)) {
        return null;
    }

    const normalized = Math.floor(value);
    if (normalized <= 0) {
        return null;
    }

    return normalized;
}

function normalizeSnapPolicy(value: string | undefined): GridMoveSnapPolicy {
    if (value === "always" || value === "on-block" || value === "never") {
        return value;
    }

    return "always";
}

function clampToPositive(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, value);
}

function normalizeConfig(
    patch: Partial<GridMovementConfig> | undefined,
    base: GridMovementConfig,
): GridMovementConfig {
    return {
        tileWidth: normalizePositiveInteger(
            patch?.tileWidth ?? base.tileWidth,
            16,
        ),
        tileHeight: normalizePositiveInteger(
            patch?.tileHeight ?? base.tileHeight,
            16,
        ),
        originX: normalizeNumber(patch?.originX ?? base.originX, 0),
        originY: normalizeNumber(patch?.originY ?? base.originY, 0),
        moveCadenceMs: clampToPositive(
            normalizeNumber(patch?.moveCadenceMs ?? base.moveCadenceMs, 120),
        ),
        snapPolicy: normalizeSnapPolicy(patch?.snapPolicy ?? base.snapPolicy),
        gridWidth: normalizeMaybeBound(patch?.gridWidth ?? base.gridWidth),
        gridHeight: normalizeMaybeBound(patch?.gridHeight ?? base.gridHeight),
    };
}

function cloneActor(
    runtime: GridMovementActorRuntime,
): GridMovementActorSnapshot {
    return {
        actorId: runtime.actorId,
        tileX: runtime.tileX,
        tileY: runtime.tileY,
        worldX: runtime.worldX,
        worldY: runtime.worldY,
        lastMoveAtMs: runtime.lastMoveAtMs,
    };
}

export function createGridMovementService(options?: {
    config?: Partial<GridMovementConfig>;
    now?: () => number;
    canOccupyTile?: (input: {
        actorId: string;
        from: GridTilePosition;
        to: GridTilePosition;
        direction: GridMoveDirection;
    }) => boolean;
    emit?: <TPayload>(signal: string, payload: TPayload) => void;
}): GridMovementService {
    const now = options?.now ?? (() => Date.now());
    const emit =
        options?.emit ??
        (<TPayload>(signal: string, payload: TPayload) => {
            signalBus.emit(signal, payload);
        });

    const canOccupyTile =
        options?.canOccupyTile ??
        (() => {
            return true;
        });

    const actorsById = new Map<string, GridMovementActorRuntime>();
    let config = normalizeConfig(options?.config, DEFAULT_CONFIG);
    let syntheticNowMs = clampToPositive(now());

    const getNowMs = (): number => {
        const candidate = now();
        if (Number.isFinite(candidate)) {
            syntheticNowMs = Math.max(syntheticNowMs, candidate);
        }

        return syntheticNowMs;
    };

    const worldToTile = (x: number, y: number): GridTilePosition => {
        const tileX = Math.floor((x - config.originX) / config.tileWidth);
        const tileY = Math.floor((y - config.originY) / config.tileHeight);

        return {
            tileX,
            tileY,
        };
    };

    const tileToWorld = (
        tileX: number,
        tileY: number,
        anchor: GridMoveAnchor = "center",
    ): GridWorldPosition => {
        const normalizedTileX = Math.floor(tileX);
        const normalizedTileY = Math.floor(tileY);

        if (anchor === "top-left") {
            return {
                x: config.originX + normalizedTileX * config.tileWidth,
                y: config.originY + normalizedTileY * config.tileHeight,
            };
        }

        return {
            x:
                config.originX +
                normalizedTileX * config.tileWidth +
                config.tileWidth / 2,
            y:
                config.originY +
                normalizedTileY * config.tileHeight +
                config.tileHeight / 2,
        };
    };

    const isWithinBounds = (tileX: number, tileY: number): boolean => {
        if (tileX < 0 || tileY < 0) {
            return false;
        }

        if (config.gridWidth !== null && tileX >= config.gridWidth) {
            return false;
        }

        if (config.gridHeight !== null && tileY >= config.gridHeight) {
            return false;
        }

        return true;
    };

    const snapRuntimeToTileCenter = (
        runtime: GridMovementActorRuntime,
    ): void => {
        const world = tileToWorld(runtime.tileX, runtime.tileY, "center");
        runtime.worldX = world.x;
        runtime.worldY = world.y;
    };

    const setConfig: GridMovementService["setConfig"] = (patch) => {
        config = normalizeConfig(patch, config);

        for (const runtime of actorsById.values()) {
            if (config.snapPolicy === "always") {
                snapRuntimeToTileCenter(runtime);
            }
        }

        emit(GRID_MOVEMENT_CONFIG_UPDATED_SIGNAL, { config });
        return { ...config };
    };

    const getConfig = (): GridMovementConfig => {
        return { ...config };
    };

    const registerActor: GridMovementService["registerActor"] = (
        actorId,
        position,
    ) => {
        const tile = worldToTile(position.x, position.y);
        const runtime: GridMovementActorRuntime = {
            actorId,
            tileX: tile.tileX,
            tileY: tile.tileY,
            worldX: position.x,
            worldY: position.y,
            lastMoveAtMs: Number.NEGATIVE_INFINITY,
        };

        if (config.snapPolicy === "always") {
            snapRuntimeToTileCenter(runtime);
        }

        actorsById.set(actorId, runtime);

        const snapshot = cloneActor(runtime);
        emit(GRID_MOVEMENT_ACTOR_REGISTERED_SIGNAL, snapshot);

        return snapshot;
    };

    const unregisterActor: GridMovementService["unregisterActor"] = (
        actorId,
    ) => {
        const runtime = actorsById.get(actorId);
        if (!runtime) {
            return false;
        }

        actorsById.delete(actorId);
        emit(GRID_MOVEMENT_ACTOR_REMOVED_SIGNAL, cloneActor(runtime));
        return true;
    };

    const getActor: GridMovementService["getActor"] = (actorId) => {
        const runtime = actorsById.get(actorId);
        if (!runtime) {
            return null;
        }

        return cloneActor(runtime);
    };

    const listActors = (): GridMovementActorSnapshot[] => {
        return Array.from(actorsById.values())
            .map((runtime) => cloneActor(runtime))
            .sort((a, b) => a.actorId.localeCompare(b.actorId));
    };

    const syncActorWorldPosition: GridMovementService["syncActorWorldPosition"] =
        (actorId, position) => {
            const runtime = actorsById.get(actorId);
            if (!runtime) {
                return null;
            }

            const tile = worldToTile(position.x, position.y);
            runtime.tileX = tile.tileX;
            runtime.tileY = tile.tileY;
            runtime.worldX = position.x;
            runtime.worldY = position.y;

            if (config.snapPolicy === "always") {
                snapRuntimeToTileCenter(runtime);
            }

            const snapshot = cloneActor(runtime);
            emit(GRID_MOVEMENT_ACTOR_UPDATED_SIGNAL, snapshot);
            return snapshot;
        };

    const canMove: GridMovementService["canMove"] = (actorId, direction) => {
        const runtime = actorsById.get(actorId);
        const nowMs = getNowMs();
        const delta = DIRECTION_DELTAS[direction];

        if (!runtime) {
            return {
                ok: false,
                actorId,
                reason: "unknown-actor",
                direction,
                from: null,
                to: { tileX: delta.x, tileY: delta.y },
                nowMs,
                retryInMs: 0,
            };
        }

        const targetTile = {
            tileX: runtime.tileX + delta.x,
            tileY: runtime.tileY + delta.y,
        };

        const remainingCadenceMs = Math.max(
            0,
            runtime.lastMoveAtMs + config.moveCadenceMs - nowMs,
        );
        if (remainingCadenceMs > 0) {
            return {
                ok: false,
                actorId,
                reason: "move-cadence",
                direction,
                from: cloneActor(runtime),
                to: targetTile,
                nowMs,
                retryInMs: Math.ceil(remainingCadenceMs),
            };
        }

        if (!isWithinBounds(targetTile.tileX, targetTile.tileY)) {
            return {
                ok: false,
                actorId,
                reason: "out-of-bounds",
                direction,
                from: cloneActor(runtime),
                to: targetTile,
                nowMs,
                retryInMs: 0,
            };
        }

        const isAllowed = canOccupyTile({
            actorId,
            from: { tileX: runtime.tileX, tileY: runtime.tileY },
            to: targetTile,
            direction,
        });

        if (!isAllowed) {
            return {
                ok: false,
                actorId,
                reason: "blocked",
                direction,
                from: cloneActor(runtime),
                to: targetTile,
                nowMs,
                retryInMs: 0,
            };
        }

        return null;
    };

    const moveActor: GridMovementService["moveActor"] = (
        actorId,
        direction,
    ) => {
        const runtime = actorsById.get(actorId);
        const nowMs = getNowMs();
        const delta = DIRECTION_DELTAS[direction];

        const blocked = canMove(actorId, direction);
        if (blocked) {
            if (
                runtime &&
                blocked.reason !== "move-cadence" &&
                config.snapPolicy === "on-block"
            ) {
                snapRuntimeToTileCenter(runtime);
            }

            emit(GRID_MOVEMENT_BLOCKED_SIGNAL, blocked);
            return blocked;
        }

        if (!runtime) {
            const unknownActor: GridMovementMoveBlocked = {
                ok: false,
                actorId,
                reason: "unknown-actor",
                direction,
                from: null,
                to: { tileX: delta.x, tileY: delta.y },
                nowMs,
                retryInMs: 0,
            };
            emit(GRID_MOVEMENT_BLOCKED_SIGNAL, unknownActor);
            return unknownActor;
        }

        const from = cloneActor(runtime);
        runtime.tileX += delta.x;
        runtime.tileY += delta.y;
        const world = tileToWorld(runtime.tileX, runtime.tileY, "center");
        runtime.worldX = world.x;
        runtime.worldY = world.y;
        runtime.lastMoveAtMs = nowMs;

        const applied: GridMovementMoveApplied = {
            ok: true,
            actorId,
            direction,
            from,
            to: cloneActor(runtime),
            nowMs,
        };

        emit(GRID_MOVEMENT_APPLIED_SIGNAL, applied);
        return applied;
    };

    const tick: GridMovementService["tick"] = (deltaMs) => {
        if (!Number.isFinite(deltaMs)) {
            return syntheticNowMs;
        }

        syntheticNowMs = Math.max(0, syntheticNowMs + Math.max(0, deltaMs));
        return syntheticNowMs;
    };

    return {
        setConfig,
        getConfig,
        worldToTile,
        tileToWorld,
        registerActor,
        unregisterActor,
        getActor,
        listActors,
        syncActorWorldPosition,
        canMove,
        moveActor,
        tick,
    };
}

export const gridMovement = createGridMovementService();
