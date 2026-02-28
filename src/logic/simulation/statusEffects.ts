import { signalBus } from "@/services/signalBus";

export type StatusEffectType = "slow" | "haste" | "burn" | "regen";

export type StatusEffectTickPolicy = "none" | "interval";

export type StatusEffectStackPolicy = "stack" | "refresh" | "replace";

export type StatusEffectInput = {
    type: StatusEffectType;
    durationMs: number;
    magnitude: number;
    source?: string;
    tickPolicy?: StatusEffectTickPolicy;
    tickIntervalMs?: number;
    stackPolicy?: StatusEffectStackPolicy;
    maxStacks?: number;
};

export type StatusEffectInstance = {
    id: string;
    entityId: string;
    type: StatusEffectType;
    source?: string;
    magnitude: number;
    appliedAtMs: number;
    durationMs: number;
    expiresAtMs: number;
    tickPolicy: StatusEffectTickPolicy;
    tickIntervalMs: number | null;
    nextTickAtMs: number | null;
};

export type StatusEffectTickEvent = {
    entityId: string;
    effectId: string;
    type: StatusEffectType;
    magnitude: number;
    atMs: number;
    source?: string;
};

export type StatusEffectExpiredEvent = {
    entityId: string;
    effectId: string;
    type: StatusEffectType;
    atMs: number;
    source?: string;
};

export const STATUS_EFFECT_TICK_SIGNAL = "simulation:status-effect:tick";
export const STATUS_EFFECT_EXPIRED_SIGNAL = "simulation:status-effect:expired";

const DEFAULT_STACK_POLICY_BY_TYPE: Record<
    StatusEffectType,
    StatusEffectStackPolicy
> = {
    slow: "stack",
    haste: "stack",
    burn: "refresh",
    regen: "refresh",
};

const DEFAULT_TICK_POLICY_BY_TYPE: Record<
    StatusEffectType,
    StatusEffectTickPolicy
> = {
    slow: "none",
    haste: "none",
    burn: "interval",
    regen: "interval",
};

const DEFAULT_TICK_INTERVAL_MS_BY_TYPE: Partial<
    Record<StatusEffectType, number>
> = {
    burn: 1000,
    regen: 1000,
};

type StatusEffectsByEntity = Map<string, StatusEffectInstance[]>;

function toFinite(value: number, fallback: number) {
    return Number.isFinite(value) ? value : fallback;
}

function clampMagnitude(value: number) {
    return Math.max(0, toFinite(value, 0));
}

function sanitizeDurationMs(durationMs: number) {
    return Math.max(0, Math.floor(toFinite(durationMs, 0)));
}

function sanitizeTickIntervalMs(type: StatusEffectType, intervalMs?: number) {
    const fallback = DEFAULT_TICK_INTERVAL_MS_BY_TYPE[type] ?? 1000;
    return Math.max(1, Math.floor(toFinite(intervalMs ?? fallback, fallback)));
}

export function createStatusEffectsSimulation(options?: {
    initialNowMs?: number;
    emit?: (
        signal: string,
        payload: StatusEffectTickEvent | StatusEffectExpiredEvent,
    ) => void;
}) {
    let nowMs = Math.max(0, Math.floor(options?.initialNowMs ?? 0));
    let effectIdCounter = 0;
    const effectsByEntity: StatusEffectsByEntity = new Map();
    const emit =
        options?.emit ??
        ((
            signal: string,
            payload: StatusEffectTickEvent | StatusEffectExpiredEvent,
        ) => {
            signalBus.emit(signal, payload);
        });

    const cloneEffect = (
        effect: StatusEffectInstance,
    ): StatusEffectInstance => ({
        ...effect,
    });

    const ensureEntityEffects = (entityId: string) => {
        const existing = effectsByEntity.get(entityId);
        if (existing) {
            return existing;
        }

        const created: StatusEffectInstance[] = [];
        effectsByEntity.set(entityId, created);
        return created;
    };

    const removeExpiredEffectsForEntity = (entityId: string) => {
        const effects = effectsByEntity.get(entityId);
        if (!effects || effects.length === 0) {
            return;
        }

        const retained = effects.filter((effect) => {
            if (nowMs < effect.expiresAtMs) {
                return true;
            }

            emit(STATUS_EFFECT_EXPIRED_SIGNAL, {
                entityId,
                effectId: effect.id,
                type: effect.type,
                atMs: nowMs,
                source: effect.source,
            });

            return false;
        });

        if (retained.length === 0) {
            effectsByEntity.delete(entityId);
            return;
        }

        effectsByEntity.set(entityId, retained);
    };

    const getEffectsByType = (entityId: string, type: StatusEffectType) => {
        return (effectsByEntity.get(entityId) ?? []).filter(
            (effect) => effect.type === type,
        );
    };

    const applyEffect = (entityId: string, input: StatusEffectInput) => {
        const durationMs = sanitizeDurationMs(input.durationMs);
        if (durationMs <= 0) {
            return null;
        }

        const magnitude = clampMagnitude(input.magnitude);
        const tickPolicy =
            input.tickPolicy ?? DEFAULT_TICK_POLICY_BY_TYPE[input.type];
        const tickIntervalMs =
            tickPolicy === "interval"
                ? sanitizeTickIntervalMs(input.type, input.tickIntervalMs)
                : null;
        const stackPolicy =
            input.stackPolicy ?? DEFAULT_STACK_POLICY_BY_TYPE[input.type];
        const maxStacks = Math.max(
            1,
            Math.floor(toFinite(input.maxStacks ?? 99, 99)),
        );

        const entityEffects = ensureEntityEffects(entityId);
        const sameType = entityEffects.filter(
            (effect) => effect.type === input.type,
        );

        if (stackPolicy === "refresh" && sameType.length > 0) {
            const target = sameType[sameType.length - 1];
            target.magnitude = magnitude;
            target.source = input.source;
            target.durationMs = durationMs;
            target.appliedAtMs = nowMs;
            target.expiresAtMs = nowMs + durationMs;
            target.tickPolicy = tickPolicy;
            target.tickIntervalMs = tickIntervalMs;
            target.nextTickAtMs =
                tickPolicy === "interval" && tickIntervalMs !== null
                    ? nowMs + tickIntervalMs
                    : null;
            return cloneEffect(target);
        }

        if (stackPolicy === "replace" && sameType.length > 0) {
            for (let index = entityEffects.length - 1; index >= 0; index -= 1) {
                if (entityEffects[index].type === input.type) {
                    entityEffects.splice(index, 1);
                }
            }
        }

        while (getEffectsByType(entityId, input.type).length >= maxStacks) {
            const firstMatchIndex = entityEffects.findIndex(
                (effect) => effect.type === input.type,
            );
            if (firstMatchIndex === -1) {
                break;
            }
            entityEffects.splice(firstMatchIndex, 1);
        }

        const created: StatusEffectInstance = {
            id: `${entityId}:${input.type}:${nowMs}:${effectIdCounter++}`,
            entityId,
            type: input.type,
            source: input.source,
            magnitude,
            appliedAtMs: nowMs,
            durationMs,
            expiresAtMs: nowMs + durationMs,
            tickPolicy,
            tickIntervalMs,
            nextTickAtMs:
                tickPolicy === "interval" && tickIntervalMs !== null
                    ? nowMs + tickIntervalMs
                    : null,
        };

        entityEffects.push(created);
        effectsByEntity.set(entityId, entityEffects);
        return cloneEffect(created);
    };

    return {
        getNowMs: () => nowMs,
        applyEffect,
        applySlow: (
            entityId: string,
            options: Omit<StatusEffectInput, "type" | "tickPolicy">,
        ) => {
            return applyEffect(entityId, {
                ...options,
                type: "slow",
                tickPolicy: "none",
            });
        },
        applyHaste: (
            entityId: string,
            options: Omit<StatusEffectInput, "type" | "tickPolicy">,
        ) => {
            return applyEffect(entityId, {
                ...options,
                type: "haste",
                tickPolicy: "none",
            });
        },
        applyBurn: (
            entityId: string,
            options: Omit<StatusEffectInput, "type">,
        ) => {
            return applyEffect(entityId, {
                ...options,
                type: "burn",
            });
        },
        applyRegen: (
            entityId: string,
            options: Omit<StatusEffectInput, "type">,
        ) => {
            return applyEffect(entityId, {
                ...options,
                type: "regen",
            });
        },
        clearEntityEffects: (entityId: string) => {
            effectsByEntity.delete(entityId);
        },
        clearAll: () => {
            effectsByEntity.clear();
        },
        getEntityEffects: (entityId: string): StatusEffectInstance[] => {
            return (effectsByEntity.get(entityId) ?? []).map(cloneEffect);
        },
        getMovementSpeedScale: (entityId: string) => {
            const effects = effectsByEntity.get(entityId) ?? [];
            let slowTotal = 0;
            let hasteTotal = 0;

            for (const effect of effects) {
                if (effect.type === "slow") {
                    slowTotal += effect.magnitude;
                } else if (effect.type === "haste") {
                    hasteTotal += effect.magnitude;
                }
            }

            return Math.max(0, 1 + hasteTotal - slowTotal);
        },
        tick: (deltaMs: number) => {
            if (!Number.isFinite(deltaMs) || deltaMs <= 0) {
                return false;
            }

            nowMs += Math.floor(deltaMs);
            let changed = false;

            for (const [entityId, effects] of effectsByEntity.entries()) {
                for (const effect of effects) {
                    if (
                        effect.tickPolicy !== "interval" ||
                        effect.tickIntervalMs === null ||
                        effect.nextTickAtMs === null
                    ) {
                        continue;
                    }

                    while (
                        effect.nextTickAtMs <= nowMs &&
                        effect.nextTickAtMs <= effect.expiresAtMs
                    ) {
                        emit(STATUS_EFFECT_TICK_SIGNAL, {
                            entityId,
                            effectId: effect.id,
                            type: effect.type,
                            magnitude: effect.magnitude,
                            atMs: effect.nextTickAtMs,
                            source: effect.source,
                        });
                        effect.nextTickAtMs += effect.tickIntervalMs;
                        changed = true;
                    }
                }

                const beforeLength = effects.length;
                removeExpiredEffectsForEntity(entityId);
                const afterLength = effectsByEntity.get(entityId)?.length ?? 0;
                if (afterLength !== beforeLength) {
                    changed = true;
                }
            }

            return changed;
        },
    };
}
