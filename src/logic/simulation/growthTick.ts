import { signalBus } from "@/services/signalBus";

export type GrowthStage = "seed" | "sprout" | "mature";

export type GrowthStageDurationConfig = {
    seedToSproutMs: number;
    sproutToMatureMs: number;
};

export type GrowthNodeProfile = {
    durations?: Partial<GrowthStageDurationConfig>;
    jitterRatio?: number;
};

export type CreateGrowthNodeInput = {
    id: string;
    stage?: GrowthStage;
    seed?: number;
    profile?: GrowthNodeProfile;
};

export type GrowthNode = {
    id: string;
    stage: GrowthStage;
    seed: number;
    profile: GrowthNodeProfile;
    stageStartedAtMs: number;
    nextStageAtMs: number | null;
};

export type GrowthStageTransitionEvent = {
    id: string;
    from: GrowthStage;
    to: GrowthStage;
    atMs: number;
    seed: number;
};

export const GROWTH_STAGE_TRANSITION_SIGNAL =
    "simulation:growth:stage-transition";

const DEFAULT_DURATIONS: GrowthStageDurationConfig = {
    seedToSproutMs: 4000,
    sproutToMatureMs: 6000,
};

const MAX_JITTER_RATIO = 0.95;

function clamp(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) {
        return min;
    }

    return Math.min(max, Math.max(min, value));
}

function hashStringToUnit(value: string): number {
    let hash = 2166136261;

    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }

    const normalized = (hash >>> 0) / 0xffffffff;
    return clamp(normalized, 0, 1);
}

function getDurations(profile?: GrowthNodeProfile): GrowthStageDurationConfig {
    return {
        seedToSproutMs: Math.max(
            0,
            profile?.durations?.seedToSproutMs ??
                DEFAULT_DURATIONS.seedToSproutMs,
        ),
        sproutToMatureMs: Math.max(
            0,
            profile?.durations?.sproutToMatureMs ??
                DEFAULT_DURATIONS.sproutToMatureMs,
        ),
    };
}

function getNextStage(stage: GrowthStage): GrowthStage | null {
    if (stage === "seed") {
        return "sprout";
    }

    if (stage === "sprout") {
        return "mature";
    }

    return null;
}

function getStageBaseDurationMs(
    stage: GrowthStage,
    durations: GrowthStageDurationConfig,
): number {
    if (stage === "seed") {
        return durations.seedToSproutMs;
    }

    if (stage === "sprout") {
        return durations.sproutToMatureMs;
    }

    return 0;
}

export function resolveGrowthStageDurationMs(options: {
    id: string;
    stage: GrowthStage;
    seed: number;
    profile?: GrowthNodeProfile;
}): number {
    const baseMs = getStageBaseDurationMs(
        options.stage,
        getDurations(options.profile),
    );

    if (baseMs <= 0) {
        return 0;
    }

    const jitterRatio = clamp(
        options.profile?.jitterRatio ?? 0,
        0,
        MAX_JITTER_RATIO,
    );
    if (jitterRatio <= 0) {
        return baseMs;
    }

    const unit = hashStringToUnit(
        `${options.id}:${options.stage}:${options.seed}`,
    );
    const minScale = 1 - jitterRatio;
    const maxScale = 1 + jitterRatio;
    const scale = minScale + (maxScale - minScale) * unit;

    return Math.max(0, Math.round(baseMs * scale));
}

function createNode(nowMs: number, input: CreateGrowthNodeInput): GrowthNode {
    const stage = input.stage ?? "seed";
    const seed = Number.isFinite(input.seed ?? 0)
        ? Math.floor(input.seed ?? 0)
        : 0;
    const profile = input.profile ?? {};
    const durationMs = resolveGrowthStageDurationMs({
        id: input.id,
        stage,
        seed,
        profile,
    });

    return {
        id: input.id,
        stage,
        seed,
        profile,
        stageStartedAtMs: nowMs,
        nextStageAtMs: getNextStage(stage) ? nowMs + durationMs : null,
    };
}

export function createGrowthTickSimulation(options?: {
    initialNowMs?: number;
    emit?: (signal: string, payload: GrowthStageTransitionEvent) => void;
}) {
    let nowMs = Math.max(0, Math.floor(options?.initialNowMs ?? 0));
    let paused = false;
    const nodesById = new Map<string, GrowthNode>();
    const emit =
        options?.emit ??
        ((signal: string, payload: GrowthStageTransitionEvent) => {
            signalBus.emit(signal, payload);
        });

    const transitionNodeStage = (node: GrowthNode, nextStage: GrowthStage) => {
        const from = node.stage;
        node.stage = nextStage;
        node.stageStartedAtMs = nowMs;

        const durationMs = resolveGrowthStageDurationMs({
            id: node.id,
            stage: node.stage,
            seed: node.seed,
            profile: node.profile,
        });

        node.nextStageAtMs = getNextStage(node.stage)
            ? nowMs + durationMs
            : null;

        emit(GROWTH_STAGE_TRANSITION_SIGNAL, {
            id: node.id,
            from,
            to: nextStage,
            atMs: nowMs,
            seed: node.seed,
        });
    };

    return {
        getNowMs: () => nowMs,
        isPaused: () => paused,
        pause: () => {
            paused = true;
        },
        resume: () => {
            paused = false;
        },
        clear: () => {
            nodesById.clear();
        },
        addNode: (input: CreateGrowthNodeInput): GrowthNode => {
            const node = createNode(nowMs, input);
            nodesById.set(input.id, node);
            return { ...node };
        },
        removeNode: (id: string) => {
            return nodesById.delete(id);
        },
        getNode: (id: string): GrowthNode | null => {
            const node = nodesById.get(id);
            return node ? { ...node } : null;
        },
        getNodes: (): GrowthNode[] => {
            return Array.from(nodesById.values()).map((node) => ({ ...node }));
        },
        tick: (deltaMs: number): boolean => {
            if (paused || deltaMs <= 0 || !Number.isFinite(deltaMs)) {
                return false;
            }

            nowMs += Math.floor(deltaMs);
            let changed = false;

            for (const node of nodesById.values()) {
                while (
                    node.nextStageAtMs !== null &&
                    nowMs >= node.nextStageAtMs
                ) {
                    const nextStage = getNextStage(node.stage);
                    if (!nextStage) {
                        node.nextStageAtMs = null;
                        break;
                    }

                    transitionNodeStage(node, nextStage);
                    changed = true;
                }
            }

            return changed;
        },
    };
}
