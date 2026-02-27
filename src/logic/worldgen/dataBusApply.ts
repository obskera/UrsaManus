import type { Entity } from "@/logic/entity/Entity";
import type { GameState } from "@/services/DataBus";
import type { WorldgenEntitiesResult } from "./entities";

export type WorldgenApplyMode = "merge" | "replace";

export type ApplyWorldgenEntitiesOptions = {
    mode?: WorldgenApplyMode;
    playerId?: string;
    syncCameraFollowTarget?: boolean;
    resetWorldBoundsOnReplace?: boolean;
};

export type DataBusLike = {
    setState: (updater: (prev: GameState) => GameState) => void;
};

function resolvePlayerId(
    mode: WorldgenApplyMode,
    mergedEntitiesById: Record<string, Entity>,
    state: GameState,
    worldgen: WorldgenEntitiesResult,
    options: ApplyWorldgenEntitiesOptions,
) {
    if (options.playerId) {
        return options.playerId;
    }

    if (worldgen.playerId && mergedEntitiesById[worldgen.playerId]) {
        return worldgen.playerId;
    }

    if (mode === "merge" && mergedEntitiesById[state.playerId]) {
        return state.playerId;
    }

    const firstEntityId = Object.keys(mergedEntitiesById)[0];
    return firstEntityId ?? state.playerId;
}

export function applyWorldgenEntitiesToState(
    state: GameState,
    worldgen: WorldgenEntitiesResult,
    {
        mode = "merge",
        syncCameraFollowTarget = true,
        resetWorldBoundsOnReplace = true,
        ...rest
    }: ApplyWorldgenEntitiesOptions = {},
): GameState {
    const entitiesById =
        mode === "replace"
            ? { ...worldgen.entitiesById }
            : {
                  ...state.entitiesById,
                  ...worldgen.entitiesById,
              };

    const playerId = resolvePlayerId(mode, entitiesById, state, worldgen, rest);

    const nextState: GameState = {
        ...state,
        entitiesById,
        playerId,
    };

    if (mode === "replace" && resetWorldBoundsOnReplace) {
        nextState.worldBoundsEnabled = false;
        nextState.worldBoundsIds = [];
    }

    if (syncCameraFollowTarget && nextState.camera.mode === "follow-player") {
        nextState.camera = {
            ...nextState.camera,
            followTargetId: playerId,
        };
    }

    return nextState;
}

export function createApplyWorldgenEntitiesUpdater(
    worldgen: WorldgenEntitiesResult,
    options: ApplyWorldgenEntitiesOptions = {},
) {
    return (prev: GameState) =>
        applyWorldgenEntitiesToState(prev, worldgen, options);
}

export function applyWorldgenEntitiesToDataBus(
    target: DataBusLike,
    worldgen: WorldgenEntitiesResult,
    options: ApplyWorldgenEntitiesOptions = {},
) {
    target.setState(createApplyWorldgenEntitiesUpdater(worldgen, options));
}
