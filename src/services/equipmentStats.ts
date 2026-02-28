import { signalBus } from "@/services/signalBus";

export type StatKey =
    | "maxHealth"
    | "attackPower"
    | "defense"
    | "moveSpeed"
    | "critChance";

export type StatBlock = Record<StatKey, number>;

export type StatModifier = {
    stat: StatKey;
    flat?: number;
    percent?: number;
};

export type EquipmentSlot =
    | "weapon"
    | "offhand"
    | "head"
    | "chest"
    | "legs"
    | "accessory";

export type EquipmentItem = {
    id: string;
    slot: EquipmentSlot;
    modifiers: StatModifier[];
    source?: string;
};

export type ActiveStatEffect = {
    id: string;
    modifiers: StatModifier[];
    source?: string;
};

export type StatProjectionCombat = {
    maxHealth: number;
    attackPower: number;
    defense: number;
    critChance: number;
    damageReduction: number;
};

export type StatProjectionMovement = {
    moveSpeed: number;
    maxSpeedScale: number;
};

export type ResolvedStats = {
    base: StatBlock;
    total: StatBlock;
    combat: StatProjectionCombat;
    movement: StatProjectionMovement;
};

export type EntityStatSnapshot = {
    entityId: string;
    base: StatBlock;
    equipped: EquipmentItem[];
    activeEffects: ActiveStatEffect[];
    resolved: ResolvedStats;
};

export type EquipmentStatsService = {
    registerEntity: (entityId: string, base?: Partial<StatBlock>) => boolean;
    unregisterEntity: (entityId: string) => boolean;
    setBaseStats: (entityId: string, base: Partial<StatBlock>) => boolean;
    equipItem: (entityId: string, item: EquipmentItem) => boolean;
    unequipItem: (entityId: string, slot: EquipmentSlot) => boolean;
    applyEffect: (entityId: string, effect: ActiveStatEffect) => boolean;
    removeEffect: (entityId: string, effectId: string) => boolean;
    getResolvedStats: (entityId: string) => ResolvedStats | null;
    getEntitySnapshot: (entityId: string) => EntityStatSnapshot | null;
    listEntitySnapshots: () => EntityStatSnapshot[];
};

export const EQUIPMENT_STATS_CHANGED_SIGNAL = "stats:equipment:changed";
export const EQUIPMENT_STATS_EQUIPPED_SIGNAL = "stats:equipment:equipped";
export const EQUIPMENT_STATS_EFFECT_APPLIED_SIGNAL =
    "stats:equipment:effect-applied";

const DEFAULT_BASE_STATS: StatBlock = {
    maxHealth: 100,
    attackPower: 10,
    defense: 10,
    moveSpeed: 100,
    critChance: 0.05,
};

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function toFinite(value: number | undefined, fallback = 0): number {
    if (!Number.isFinite(value)) {
        return fallback;
    }

    return value ?? fallback;
}

function sanitizeStat(stat: StatKey, value: number): number {
    if (stat === "critChance") {
        return clamp(value, 0, 1);
    }

    return Math.max(0, value);
}

function cloneStats(stats: StatBlock): StatBlock {
    return { ...stats };
}

function normalizeBase(base?: Partial<StatBlock>): StatBlock {
    return {
        maxHealth: sanitizeStat(
            "maxHealth",
            toFinite(base?.maxHealth, DEFAULT_BASE_STATS.maxHealth),
        ),
        attackPower: sanitizeStat(
            "attackPower",
            toFinite(base?.attackPower, DEFAULT_BASE_STATS.attackPower),
        ),
        defense: sanitizeStat(
            "defense",
            toFinite(base?.defense, DEFAULT_BASE_STATS.defense),
        ),
        moveSpeed: sanitizeStat(
            "moveSpeed",
            toFinite(base?.moveSpeed, DEFAULT_BASE_STATS.moveSpeed),
        ),
        critChance: sanitizeStat(
            "critChance",
            toFinite(base?.critChance, DEFAULT_BASE_STATS.critChance),
        ),
    };
}

function normalizeModifiers(modifiers: StatModifier[]): StatModifier[] {
    return modifiers
        .map((modifier) => ({
            stat: modifier.stat,
            flat: toFinite(modifier.flat, 0),
            percent: toFinite(modifier.percent, 0),
        }))
        .filter(
            (modifier) =>
                Math.abs(modifier.flat ?? 0) > 0 ||
                Math.abs(modifier.percent ?? 0) > 0,
        );
}

function resolveStatTotals(
    base: StatBlock,
    equipped: EquipmentItem[],
    effects: ActiveStatEffect[],
): StatBlock {
    const allModifiers = [
        ...equipped.flatMap((item) => item.modifiers),
        ...effects.flatMap((effect) => effect.modifiers),
    ];

    const flat: StatBlock = {
        maxHealth: 0,
        attackPower: 0,
        defense: 0,
        moveSpeed: 0,
        critChance: 0,
    };
    const percent: StatBlock = {
        maxHealth: 0,
        attackPower: 0,
        defense: 0,
        moveSpeed: 0,
        critChance: 0,
    };

    for (const modifier of allModifiers) {
        flat[modifier.stat] += toFinite(modifier.flat, 0);
        percent[modifier.stat] += toFinite(modifier.percent, 0);
    }

    const total: StatBlock = {
        maxHealth: 0,
        attackPower: 0,
        defense: 0,
        moveSpeed: 0,
        critChance: 0,
    };

    const statKeys: StatKey[] = [
        "maxHealth",
        "attackPower",
        "defense",
        "moveSpeed",
        "critChance",
    ];

    for (const key of statKeys) {
        total[key] = sanitizeStat(
            key,
            (base[key] + flat[key]) * (1 + percent[key]),
        );
    }

    return total;
}

function resolveCombatProjection(total: StatBlock): StatProjectionCombat {
    const damageReduction = clamp(
        total.defense / (total.defense + 100),
        0,
        0.85,
    );

    return {
        maxHealth: total.maxHealth,
        attackPower: total.attackPower,
        defense: total.defense,
        critChance: total.critChance,
        damageReduction,
    };
}

function resolveMovementProjection(total: StatBlock): StatProjectionMovement {
    return {
        moveSpeed: total.moveSpeed,
        maxSpeedScale: clamp(total.moveSpeed / 100, 0.2, 4),
    };
}

type EntityStatsRuntime = {
    base: StatBlock;
    equippedBySlot: Partial<Record<EquipmentSlot, EquipmentItem>>;
    effectsById: Map<string, ActiveStatEffect>;
};

export function createEquipmentStatsService(options?: {
    emit?: <TPayload>(signal: string, payload: TPayload) => void;
}): EquipmentStatsService {
    const emit =
        options?.emit ??
        (<TPayload>(signal: string, payload: TPayload) => {
            signalBus.emit(signal, payload);
        });

    const byEntity = new Map<string, EntityStatsRuntime>();

    const resolveSnapshot = (entityId: string): EntityStatSnapshot | null => {
        const runtime = byEntity.get(entityId);
        if (!runtime) {
            return null;
        }

        const equipped = Object.values(runtime.equippedBySlot)
            .filter((item): item is EquipmentItem => Boolean(item))
            .sort((a, b) => a.slot.localeCompare(b.slot));
        const activeEffects = Array.from(runtime.effectsById.values()).sort(
            (a, b) => a.id.localeCompare(b.id),
        );

        const total = resolveStatTotals(runtime.base, equipped, activeEffects);
        const resolved: ResolvedStats = {
            base: cloneStats(runtime.base),
            total,
            combat: resolveCombatProjection(total),
            movement: resolveMovementProjection(total),
        };

        return {
            entityId,
            base: cloneStats(runtime.base),
            equipped: equipped.map((item) => ({
                ...item,
                modifiers: item.modifiers.map((modifier) => ({ ...modifier })),
            })),
            activeEffects: activeEffects.map((effect) => ({
                ...effect,
                modifiers: effect.modifiers.map((modifier) => ({
                    ...modifier,
                })),
            })),
            resolved,
        };
    };

    const emitChanged = (entityId: string) => {
        const snapshot = resolveSnapshot(entityId);
        if (!snapshot) {
            return;
        }

        emit(EQUIPMENT_STATS_CHANGED_SIGNAL, {
            entityId,
            total: snapshot.resolved.total,
            combat: snapshot.resolved.combat,
            movement: snapshot.resolved.movement,
        });
    };

    const registerEntity = (entityId: string, base?: Partial<StatBlock>) => {
        const id = entityId.trim();
        if (!id) {
            return false;
        }

        byEntity.set(id, {
            base: normalizeBase(base),
            equippedBySlot: {},
            effectsById: new Map<string, ActiveStatEffect>(),
        });
        emitChanged(id);
        return true;
    };

    const unregisterEntity = (entityId: string) => {
        const id = entityId.trim();
        if (!id) {
            return false;
        }

        return byEntity.delete(id);
    };

    const setBaseStats = (entityId: string, base: Partial<StatBlock>) => {
        const runtime = byEntity.get(entityId.trim());
        if (!runtime) {
            return false;
        }

        runtime.base = normalizeBase({
            ...runtime.base,
            ...base,
        });
        emitChanged(entityId.trim());
        return true;
    };

    const equipItem = (entityId: string, item: EquipmentItem) => {
        const runtime = byEntity.get(entityId.trim());
        if (!runtime) {
            return false;
        }

        const normalizedId = item.id.trim();
        if (!normalizedId) {
            return false;
        }

        runtime.equippedBySlot[item.slot] = {
            ...item,
            id: normalizedId,
            modifiers: normalizeModifiers(item.modifiers),
        };

        emit(EQUIPMENT_STATS_EQUIPPED_SIGNAL, {
            entityId: entityId.trim(),
            slot: item.slot,
            itemId: normalizedId,
        });
        emitChanged(entityId.trim());
        return true;
    };

    const unequipItem = (entityId: string, slot: EquipmentSlot) => {
        const runtime = byEntity.get(entityId.trim());
        if (!runtime) {
            return false;
        }

        if (!runtime.equippedBySlot[slot]) {
            return false;
        }

        delete runtime.equippedBySlot[slot];
        emitChanged(entityId.trim());
        return true;
    };

    const applyEffect = (entityId: string, effect: ActiveStatEffect) => {
        const runtime = byEntity.get(entityId.trim());
        if (!runtime) {
            return false;
        }

        const effectId = effect.id.trim();
        if (!effectId) {
            return false;
        }

        runtime.effectsById.set(effectId, {
            ...effect,
            id: effectId,
            modifiers: normalizeModifiers(effect.modifiers),
        });

        emit(EQUIPMENT_STATS_EFFECT_APPLIED_SIGNAL, {
            entityId: entityId.trim(),
            effectId,
        });
        emitChanged(entityId.trim());
        return true;
    };

    const removeEffect = (entityId: string, effectId: string) => {
        const runtime = byEntity.get(entityId.trim());
        if (!runtime) {
            return false;
        }

        const didDelete = runtime.effectsById.delete(effectId.trim());
        if (didDelete) {
            emitChanged(entityId.trim());
        }

        return didDelete;
    };

    const getResolvedStats = (entityId: string): ResolvedStats | null => {
        const snapshot = resolveSnapshot(entityId.trim());
        return snapshot ? snapshot.resolved : null;
    };

    const getEntitySnapshot = (entityId: string): EntityStatSnapshot | null => {
        return resolveSnapshot(entityId.trim());
    };

    const listEntitySnapshots = (): EntityStatSnapshot[] => {
        return Array.from(byEntity.keys())
            .sort((a, b) => a.localeCompare(b))
            .map((entityId) => resolveSnapshot(entityId))
            .filter((snapshot): snapshot is EntityStatSnapshot =>
                Boolean(snapshot),
            );
    };

    return {
        registerEntity,
        unregisterEntity,
        setBaseStats,
        equipItem,
        unequipItem,
        applyEffect,
        removeEffect,
        getResolvedStats,
        getEntitySnapshot,
        listEntitySnapshots,
    };
}

export const equipmentStats = createEquipmentStatsService();
