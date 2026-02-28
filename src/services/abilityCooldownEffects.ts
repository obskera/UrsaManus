import { signalBus } from "@/services/signalBus";

export type AbilityKind = "active" | "passive";

export type AbilityResourceKey = "mana" | "stamina" | "energy" | string;

export type AbilityCost = {
    resource: AbilityResourceKey;
    amount: number;
};

export type AbilityEffectType = "buff" | "debuff" | "status" | "custom";

export type AbilityEffect = {
    id: string;
    type: AbilityEffectType;
    durationMs?: number;
    tags?: string[];
    payload?: Record<string, unknown>;
};

export type AbilityCastBlockReason =
    | "unknown-ability"
    | "passive-ability"
    | "on-cooldown"
    | "group-on-cooldown"
    | "condition-failed"
    | "insufficient-resource";

export type AbilityCastContext = {
    actorId?: string;
    targetId?: string;
    input?: string;
    metadata?: Record<string, unknown>;
};

export type AbilitySnapshot = {
    nowMs: number;
    resources: Record<string, number>;
    abilities: AbilityStateSnapshot[];
    activeEffects: ActiveAbilityEffectSnapshot[];
};

export type AbilityCastCondition = (input: {
    abilityId: string;
    context?: AbilityCastContext;
    snapshot: AbilitySnapshot;
}) => boolean;

export type AbilityCostHook = (input: {
    abilityId: string;
    context?: AbilityCastContext;
    baseCosts: AbilityCost[];
    snapshot: AbilitySnapshot;
}) => AbilityCost[];

export type AbilityEffectHook = (input: {
    abilityId: string;
    context?: AbilityCastContext;
    snapshot: AbilitySnapshot;
}) => AbilityEffect[];

export type AbilityDefinition = {
    id: string;
    label: string;
    kind: AbilityKind;
    cooldownMs?: number;
    cooldownGroup?: string;
    costs?: AbilityCost[];
    castCondition?: AbilityCastCondition;
    resolveCosts?: AbilityCostHook;
    resolveEffects?: AbilityEffectHook;
};

export type AbilityStateSnapshot = {
    id: string;
    label: string;
    kind: AbilityKind;
    cooldownMs: number;
    cooldownRemainingMs: number;
    cooldownGroup: string | null;
    blockedReason: AbilityCastBlockReason | null;
};

export type ActiveAbilityEffectSnapshot = {
    runtimeId: string;
    abilityId: string;
    effectId: string;
    type: AbilityEffectType;
    startedAtMs: number;
    remainingMs: number | null;
    expiresAtMs: number | null;
    tags: string[];
    payload?: Record<string, unknown>;
};

export type AbilityCastBlocked = {
    ok: false;
    abilityId: string;
    code: AbilityCastBlockReason;
    message: string;
    nowMs: number;
    cooldownRemainingMs: number;
};

export type AbilityCastApplied = {
    ok: true;
    abilityId: string;
    nowMs: number;
    cooldownAppliedMs: number;
    cooldownGroup: string | null;
    spentCosts: AbilityCost[];
    appliedEffects: ActiveAbilityEffectSnapshot[];
};

export type AbilityCastResult = AbilityCastBlocked | AbilityCastApplied;

export type AbilityCooldownEffectsService = {
    registerAbility: (definition: AbilityDefinition) => boolean;
    unregisterAbility: (abilityId: string) => boolean;
    getAbility: (abilityId: string) => AbilityStateSnapshot | null;
    listAbilities: (options?: { kind?: AbilityKind }) => AbilityStateSnapshot[];
    setResource: (resource: AbilityResourceKey, amount: number) => boolean;
    getResource: (resource: AbilityResourceKey) => number;
    canCast: (
        abilityId: string,
        context?: AbilityCastContext,
    ) => AbilityCastBlocked | null;
    cast: (
        abilityId: string,
        context?: AbilityCastContext,
    ) => AbilityCastResult;
    tick: (deltaMs: number) => AbilitySnapshot;
    getSnapshot: () => AbilitySnapshot;
};

export const ABILITY_CAST_APPLIED_SIGNAL = "ability:cast:applied";
export const ABILITY_CAST_BLOCKED_SIGNAL = "ability:cast:blocked";
export const ABILITY_COOLDOWN_UPDATED_SIGNAL = "ability:cooldown:updated";
export const ABILITY_EFFECT_APPLIED_SIGNAL = "ability:effect:applied";
export const ABILITY_EFFECT_EXPIRED_SIGNAL = "ability:effect:expired";

const normalizeNow = (now: () => number): number => {
    const value = now();
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, value);
};

const normalizeDuration = (value: number | undefined): number => {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, Math.floor(value ?? 0));
};

const normalizeResourceAmount = (value: number): number => {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, value);
};

const cloneCosts = (costs: AbilityCost[]): AbilityCost[] => {
    return costs.map((cost) => ({
        resource: cost.resource,
        amount: normalizeResourceAmount(cost.amount),
    }));
};

type AbilityRuntime = {
    definition: AbilityDefinition;
    cooldownUntilMs: number;
};

type ActiveEffectRuntime = {
    runtimeId: string;
    abilityId: string;
    effectId: string;
    type: AbilityEffectType;
    startedAtMs: number;
    expiresAtMs: number | null;
    tags: string[];
    payload?: Record<string, unknown>;
};

export function createAbilityCooldownEffectsService(options?: {
    now?: () => number;
    emit?: <TPayload>(signal: string, payload: TPayload) => void;
}): AbilityCooldownEffectsService {
    const now = options?.now ?? (() => Date.now());
    const emit =
        options?.emit ??
        (<TPayload>(signal: string, payload: TPayload) => {
            signalBus.emit(signal, payload);
        });

    const abilitiesById = new Map<string, AbilityRuntime>();
    const groupCooldownUntilById = new Map<string, number>();
    const resourcesByKey = new Map<AbilityResourceKey, number>();
    const activeEffectsByRuntimeId = new Map<string, ActiveEffectRuntime>();

    let syntheticNowMs = normalizeNow(now);

    const getNowMs = (): number => {
        return syntheticNowMs;
    };

    const resolveAbilityCooldownRemaining = (
        runtime: AbilityRuntime,
    ): number => {
        const abilityRemaining = Math.max(
            0,
            runtime.cooldownUntilMs - getNowMs(),
        );
        const groupId = runtime.definition.cooldownGroup?.trim();
        if (!groupId) {
            return abilityRemaining;
        }

        const groupRemaining = Math.max(
            0,
            (groupCooldownUntilById.get(groupId) ?? 0) - getNowMs(),
        );
        return Math.max(abilityRemaining, groupRemaining);
    };

    const toAbilityStateSnapshot = (
        runtime: AbilityRuntime,
    ): AbilityStateSnapshot => {
        return {
            id: runtime.definition.id,
            label: runtime.definition.label,
            kind: runtime.definition.kind,
            cooldownMs: normalizeDuration(runtime.definition.cooldownMs),
            cooldownRemainingMs: resolveAbilityCooldownRemaining(runtime),
            cooldownGroup: runtime.definition.cooldownGroup?.trim() || null,
            blockedReason: null,
        };
    };

    const toActiveEffectSnapshot = (
        runtime: ActiveEffectRuntime,
    ): ActiveAbilityEffectSnapshot => {
        const expiresAtMs = runtime.expiresAtMs;
        return {
            runtimeId: runtime.runtimeId,
            abilityId: runtime.abilityId,
            effectId: runtime.effectId,
            type: runtime.type,
            startedAtMs: runtime.startedAtMs,
            remainingMs:
                expiresAtMs === null
                    ? null
                    : Math.max(0, expiresAtMs - getNowMs()),
            expiresAtMs,
            tags: [...runtime.tags],
            payload: runtime.payload ? { ...runtime.payload } : undefined,
        };
    };

    const getSnapshot = (): AbilitySnapshot => {
        const abilities = Array.from(abilitiesById.values())
            .sort((left, right) =>
                left.definition.id.localeCompare(right.definition.id),
            )
            .map((runtime) => toAbilityStateSnapshot(runtime));

        const resources = Array.from(resourcesByKey.entries())
            .sort((left, right) =>
                String(left[0]).localeCompare(String(right[0])),
            )
            .reduce<Record<string, number>>((acc, [resource, value]) => {
                acc[String(resource)] = value;
                return acc;
            }, {});

        const activeEffects = Array.from(activeEffectsByRuntimeId.values())
            .sort((left, right) =>
                left.runtimeId.localeCompare(right.runtimeId),
            )
            .map((runtime) => toActiveEffectSnapshot(runtime));

        return {
            nowMs: getNowMs(),
            resources,
            abilities,
            activeEffects,
        };
    };

    const buildBlocked = (
        abilityId: string,
        code: AbilityCastBlockReason,
        message: string,
        cooldownRemainingMs = 0,
    ): AbilityCastBlocked => {
        return {
            ok: false,
            abilityId,
            code,
            message,
            nowMs: getNowMs(),
            cooldownRemainingMs,
        };
    };

    const resolveCosts = (
        runtime: AbilityRuntime,
        context?: AbilityCastContext,
    ): AbilityCost[] => {
        const baseCosts = cloneCosts(runtime.definition.costs ?? []);
        if (!runtime.definition.resolveCosts) {
            return baseCosts;
        }

        const resolved = runtime.definition.resolveCosts({
            abilityId: runtime.definition.id,
            context,
            baseCosts,
            snapshot: getSnapshot(),
        });

        return cloneCosts(resolved ?? baseCosts);
    };

    const canCast = (
        abilityId: string,
        context?: AbilityCastContext,
    ): AbilityCastBlocked | null => {
        const id = abilityId.trim();
        const runtime = abilitiesById.get(id);

        if (!runtime) {
            return buildBlocked(
                id,
                "unknown-ability",
                "Ability is not registered.",
            );
        }

        if (runtime.definition.kind === "passive") {
            return buildBlocked(
                id,
                "passive-ability",
                "Passive abilities cannot be cast directly.",
            );
        }

        const cooldownRemainingMs = resolveAbilityCooldownRemaining(runtime);
        if (cooldownRemainingMs > 0) {
            const groupId = runtime.definition.cooldownGroup?.trim();
            const code: AbilityCastBlockReason =
                groupId &&
                (groupCooldownUntilById.get(groupId) ?? 0) > getNowMs()
                    ? "group-on-cooldown"
                    : "on-cooldown";
            return buildBlocked(
                id,
                code,
                "Ability is cooling down.",
                cooldownRemainingMs,
            );
        }

        if (runtime.definition.castCondition) {
            const allowed = runtime.definition.castCondition({
                abilityId: id,
                context,
                snapshot: getSnapshot(),
            });

            if (!allowed) {
                return buildBlocked(
                    id,
                    "condition-failed",
                    "Ability cast condition did not pass.",
                );
            }
        }

        const costs = resolveCosts(runtime, context);
        for (const cost of costs) {
            const available = resourcesByKey.get(cost.resource) ?? 0;
            if (available < cost.amount) {
                return buildBlocked(
                    id,
                    "insufficient-resource",
                    `Insufficient ${String(cost.resource)}.`,
                );
            }
        }

        return null;
    };

    const registerAbility: AbilityCooldownEffectsService["registerAbility"] = (
        definition,
    ) => {
        const id = definition.id.trim();
        if (!id) {
            return false;
        }

        const label = definition.label.trim();
        if (!label) {
            return false;
        }

        abilitiesById.set(id, {
            definition: {
                ...definition,
                id,
                label,
                cooldownMs: normalizeDuration(definition.cooldownMs),
                cooldownGroup: definition.cooldownGroup?.trim() || undefined,
            },
            cooldownUntilMs: 0,
        });

        emit(ABILITY_COOLDOWN_UPDATED_SIGNAL, {
            abilityId: id,
            cooldownRemainingMs: 0,
            nowMs: getNowMs(),
        });

        return true;
    };

    const unregisterAbility: AbilityCooldownEffectsService["unregisterAbility"] =
        (abilityId) => {
            const id = abilityId.trim();
            if (!id) {
                return false;
            }

            return abilitiesById.delete(id);
        };

    const getAbility = (abilityId: string): AbilityStateSnapshot | null => {
        const runtime = abilitiesById.get(abilityId.trim());
        if (!runtime) {
            return null;
        }

        return toAbilityStateSnapshot(runtime);
    };

    const listAbilities = (listOptions?: {
        kind?: AbilityKind;
    }): AbilityStateSnapshot[] => {
        return Array.from(abilitiesById.values())
            .filter((runtime) =>
                listOptions?.kind
                    ? runtime.definition.kind === listOptions.kind
                    : true,
            )
            .sort((left, right) =>
                left.definition.id.localeCompare(right.definition.id),
            )
            .map((runtime) => toAbilityStateSnapshot(runtime));
    };

    const setResource = (
        resource: AbilityResourceKey,
        amount: number,
    ): boolean => {
        const key = String(resource).trim();
        if (!key) {
            return false;
        }

        resourcesByKey.set(key, normalizeResourceAmount(amount));
        return true;
    };

    const getResource = (resource: AbilityResourceKey): number => {
        return resourcesByKey.get(String(resource).trim()) ?? 0;
    };

    const cast = (
        abilityId: string,
        context?: AbilityCastContext,
    ): AbilityCastResult => {
        const id = abilityId.trim();
        const blocked = canCast(id, context);
        if (blocked) {
            emit(ABILITY_CAST_BLOCKED_SIGNAL, blocked);
            return blocked;
        }

        const runtime = abilitiesById.get(id);
        if (!runtime) {
            const unknown = buildBlocked(
                id,
                "unknown-ability",
                "Ability is not registered.",
            );
            emit(ABILITY_CAST_BLOCKED_SIGNAL, unknown);
            return unknown;
        }

        const costs = resolveCosts(runtime, context);
        for (const cost of costs) {
            const current = resourcesByKey.get(cost.resource) ?? 0;
            resourcesByKey.set(
                cost.resource,
                Math.max(0, current - cost.amount),
            );
        }

        const cooldownMs = normalizeDuration(runtime.definition.cooldownMs);
        const nextCooldownUntil = getNowMs() + cooldownMs;
        runtime.cooldownUntilMs = Math.max(
            runtime.cooldownUntilMs,
            nextCooldownUntil,
        );

        const cooldownGroup = runtime.definition.cooldownGroup?.trim() || null;
        if (cooldownGroup) {
            const currentGroupUntil =
                groupCooldownUntilById.get(cooldownGroup) ?? 0;
            groupCooldownUntilById.set(
                cooldownGroup,
                Math.max(currentGroupUntil, nextCooldownUntil),
            );
        }

        const resolvedEffects = runtime.definition.resolveEffects
            ? runtime.definition.resolveEffects({
                  abilityId: id,
                  context,
                  snapshot: getSnapshot(),
              })
            : [];

        const appliedEffects: ActiveAbilityEffectSnapshot[] = [];
        for (const effect of resolvedEffects) {
            const effectId = effect.id.trim();
            if (!effectId) {
                continue;
            }

            const durationMs = normalizeDuration(effect.durationMs);
            const runtimeId = `${id}:${effectId}:${getNowMs()}:${activeEffectsByRuntimeId.size}`;
            const runtimeEffect: ActiveEffectRuntime = {
                runtimeId,
                abilityId: id,
                effectId,
                type: effect.type,
                startedAtMs: getNowMs(),
                expiresAtMs: durationMs > 0 ? getNowMs() + durationMs : null,
                tags: (effect.tags ?? [])
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                payload: effect.payload ? { ...effect.payload } : undefined,
            };

            activeEffectsByRuntimeId.set(runtimeId, runtimeEffect);
            const snapshot = toActiveEffectSnapshot(runtimeEffect);
            appliedEffects.push(snapshot);
            emit(ABILITY_EFFECT_APPLIED_SIGNAL, snapshot);
        }

        const castResult: AbilityCastApplied = {
            ok: true,
            abilityId: id,
            nowMs: getNowMs(),
            cooldownAppliedMs: cooldownMs,
            cooldownGroup,
            spentCosts: costs,
            appliedEffects,
        };

        emit(ABILITY_CAST_APPLIED_SIGNAL, castResult);
        emit(ABILITY_COOLDOWN_UPDATED_SIGNAL, {
            abilityId: id,
            cooldownRemainingMs: resolveAbilityCooldownRemaining(runtime),
            nowMs: getNowMs(),
            cooldownGroup,
        });

        return castResult;
    };

    const tick = (deltaMs: number): AbilitySnapshot => {
        const delta = normalizeDuration(deltaMs);
        syntheticNowMs += delta;

        for (const [runtimeId, runtime] of activeEffectsByRuntimeId.entries()) {
            if (runtime.expiresAtMs === null) {
                continue;
            }

            if (runtime.expiresAtMs <= getNowMs()) {
                activeEffectsByRuntimeId.delete(runtimeId);
                emit(ABILITY_EFFECT_EXPIRED_SIGNAL, {
                    runtimeId,
                    abilityId: runtime.abilityId,
                    effectId: runtime.effectId,
                    nowMs: getNowMs(),
                });
            }
        }

        for (const runtime of abilitiesById.values()) {
            emit(ABILITY_COOLDOWN_UPDATED_SIGNAL, {
                abilityId: runtime.definition.id,
                cooldownRemainingMs: resolveAbilityCooldownRemaining(runtime),
                nowMs: getNowMs(),
                cooldownGroup: runtime.definition.cooldownGroup?.trim() || null,
            });
        }

        return getSnapshot();
    };

    return {
        registerAbility,
        unregisterAbility,
        getAbility,
        listAbilities,
        setResource,
        getResource,
        canCast,
        cast,
        tick,
        getSnapshot,
    };
}

export const abilityCooldownEffects = createAbilityCooldownEffectsService();
