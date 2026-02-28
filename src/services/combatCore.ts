import { signalBus } from "@/services/signalBus";

export type CombatDamageType = "physical" | "magic" | "true";

export type CombatKnockback = {
    x: number;
    y: number;
};

export type Combatant = {
    id: string;
    hp: number;
    maxHp: number;
    isAlive: boolean;
    invulnerableUntilMs: number;
    resistances: Partial<Record<CombatDamageType, number>>;
    lastDamageAtMs: number | null;
    lastDamagedBy: string | null;
    lastDamageType: CombatDamageType | null;
    lastKnockback: CombatKnockback | null;
};

export type CombatHitInput = {
    targetId: string;
    amount: number;
    sourceId?: string;
    damageType?: CombatDamageType;
    ignoreInvulnerability?: boolean;
    invulnerabilityMs?: number;
    knockback?: CombatKnockback;
};

export type CombatHitApplied = {
    ok: true;
    targetId: string;
    sourceId: string | null;
    damageType: CombatDamageType;
    rawAmount: number;
    finalAmount: number;
    hpBefore: number;
    hpAfter: number;
    defeated: boolean;
    atMs: number;
};

export type CombatHitBlockedReason =
    | "missing-target"
    | "invalid-amount"
    | "target-defeated"
    | "target-invulnerable";

export type CombatHitBlocked = {
    ok: false;
    targetId: string;
    sourceId: string | null;
    code: CombatHitBlockedReason;
    message: string;
    atMs: number;
};

export type CombatHitResult = CombatHitApplied | CombatHitBlocked;

export type CombatCoreService = {
    registerCombatant: (input: {
        id: string;
        maxHp: number;
        hp?: number;
        resistances?: Partial<Record<CombatDamageType, number>>;
    }) => boolean;
    unregisterCombatant: (id: string) => boolean;
    getCombatant: (id: string) => Combatant | null;
    listCombatants: (options?: { aliveOnly?: boolean }) => Combatant[];
    applyHit: (input: CombatHitInput) => CombatHitResult;
    setInvulnerableUntil: (targetId: string, untilMs: number) => boolean;
    reviveCombatant: (targetId: string, hp?: number) => boolean;
};

export const COMBAT_HIT_APPLIED_SIGNAL = "combat:hit:applied";
export const COMBAT_HIT_BLOCKED_SIGNAL = "combat:hit:blocked";
export const COMBAT_ENTITY_DEFEATED_SIGNAL = "combat:entity:defeated";

function normalizeNow(now: () => number): number {
    const value = now();
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, value);
}

function normalizeResistance(value: number | undefined): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.min(0.95, Math.max(0, value ?? 0));
}

function cloneCombatant(combatant: Combatant): Combatant {
    return {
        ...combatant,
        resistances: { ...combatant.resistances },
        lastKnockback: combatant.lastKnockback
            ? { ...combatant.lastKnockback }
            : null,
    };
}

function buildBlocked(
    input: {
        targetId: string;
        sourceId?: string;
    },
    code: CombatHitBlockedReason,
    message: string,
    atMs: number,
): CombatHitBlocked {
    return {
        ok: false,
        targetId: input.targetId,
        sourceId: input.sourceId?.trim() || null,
        code,
        message,
        atMs,
    };
}

export function createCombatCoreService(options?: {
    now?: () => number;
    emit?: <TPayload>(signal: string, payload: TPayload) => void;
}): CombatCoreService {
    const now = options?.now ?? (() => Date.now());
    const emit =
        options?.emit ??
        (<TPayload>(signal: string, payload: TPayload) => {
            signalBus.emit(signal, payload);
        });

    const combatantsById = new Map<string, Combatant>();

    const getCombatant = (id: string): Combatant | null => {
        const normalized = id.trim();
        if (!normalized) {
            return null;
        }

        const combatant = combatantsById.get(normalized);
        return combatant ? cloneCombatant(combatant) : null;
    };

    const listCombatants = (listOptions?: {
        aliveOnly?: boolean;
    }): Combatant[] => {
        return Array.from(combatantsById.values())
            .filter((combatant) =>
                listOptions?.aliveOnly ? combatant.isAlive : true,
            )
            .sort((left, right) => left.id.localeCompare(right.id))
            .map((combatant) => cloneCombatant(combatant));
    };

    const registerCombatant: CombatCoreService["registerCombatant"] = (
        input,
    ) => {
        const id = input.id.trim();
        if (!id) {
            return false;
        }

        if (!Number.isFinite(input.maxHp) || input.maxHp <= 0) {
            return false;
        }

        const maxHp = Math.max(1, Math.floor(input.maxHp));
        const hp = Number.isFinite(input.hp)
            ? Math.max(0, Math.min(maxHp, Math.floor(input.hp ?? maxHp)))
            : maxHp;

        combatantsById.set(id, {
            id,
            hp,
            maxHp,
            isAlive: hp > 0,
            invulnerableUntilMs: 0,
            resistances: {
                physical: normalizeResistance(input.resistances?.physical),
                magic: normalizeResistance(input.resistances?.magic),
                true: normalizeResistance(input.resistances?.true),
            },
            lastDamageAtMs: null,
            lastDamagedBy: null,
            lastDamageType: null,
            lastKnockback: null,
        });

        return true;
    };

    const unregisterCombatant = (id: string): boolean => {
        const normalized = id.trim();
        if (!normalized) {
            return false;
        }

        return combatantsById.delete(normalized);
    };

    const setInvulnerableUntil = (
        targetId: string,
        untilMs: number,
    ): boolean => {
        const combatant = combatantsById.get(targetId.trim());
        if (!combatant) {
            return false;
        }

        combatant.invulnerableUntilMs = Math.max(0, Math.floor(untilMs));
        return true;
    };

    const reviveCombatant = (targetId: string, hp?: number): boolean => {
        const combatant = combatantsById.get(targetId.trim());
        if (!combatant) {
            return false;
        }

        const normalizedHp = Number.isFinite(hp)
            ? Math.max(
                  1,
                  Math.min(combatant.maxHp, Math.floor(hp ?? combatant.maxHp)),
              )
            : combatant.maxHp;

        combatant.hp = normalizedHp;
        combatant.isAlive = true;
        combatant.invulnerableUntilMs = 0;
        return true;
    };

    const applyHit: CombatCoreService["applyHit"] = (input) => {
        const atMs = normalizeNow(now);
        const targetId = input.targetId.trim();
        const sourceId = input.sourceId?.trim() || null;

        const combatant = combatantsById.get(targetId);
        if (!combatant) {
            const blocked = buildBlocked(
                { targetId, sourceId: sourceId ?? undefined },
                "missing-target",
                `Target "${targetId}" is not registered.`,
                atMs,
            );
            emit(COMBAT_HIT_BLOCKED_SIGNAL, blocked);
            return blocked;
        }

        if (!combatant.isAlive || combatant.hp <= 0) {
            const blocked = buildBlocked(
                { targetId, sourceId: sourceId ?? undefined },
                "target-defeated",
                `Target "${targetId}" is already defeated.`,
                atMs,
            );
            emit(COMBAT_HIT_BLOCKED_SIGNAL, blocked);
            return blocked;
        }

        if (!Number.isFinite(input.amount) || input.amount <= 0) {
            const blocked = buildBlocked(
                { targetId, sourceId: sourceId ?? undefined },
                "invalid-amount",
                "Damage amount must be greater than zero.",
                atMs,
            );
            emit(COMBAT_HIT_BLOCKED_SIGNAL, blocked);
            return blocked;
        }

        if (
            !input.ignoreInvulnerability &&
            atMs < combatant.invulnerableUntilMs
        ) {
            const blocked = buildBlocked(
                { targetId, sourceId: sourceId ?? undefined },
                "target-invulnerable",
                `Target "${targetId}" is currently invulnerable.`,
                atMs,
            );
            emit(COMBAT_HIT_BLOCKED_SIGNAL, blocked);
            return blocked;
        }

        const damageType = input.damageType ?? "physical";
        const resistance = combatant.resistances[damageType] ?? 0;
        const rawAmount = Math.max(1, Math.floor(input.amount));
        const finalAmount = Math.max(
            1,
            Math.floor(rawAmount * (1 - normalizeResistance(resistance))),
        );

        const hpBefore = combatant.hp;
        const hpAfter = Math.max(0, hpBefore - finalAmount);
        const defeated = hpAfter <= 0;

        combatant.hp = hpAfter;
        combatant.isAlive = !defeated;
        combatant.lastDamageAtMs = atMs;
        combatant.lastDamagedBy = sourceId;
        combatant.lastDamageType = damageType;
        combatant.lastKnockback = input.knockback
            ? {
                  x: Number.isFinite(input.knockback.x) ? input.knockback.x : 0,
                  y: Number.isFinite(input.knockback.y) ? input.knockback.y : 0,
              }
            : null;

        const invulnerabilityMs = Number.isFinite(input.invulnerabilityMs)
            ? Math.max(0, Math.floor(input.invulnerabilityMs ?? 0))
            : 120;
        combatant.invulnerableUntilMs = Math.max(
            combatant.invulnerableUntilMs,
            atMs + invulnerabilityMs,
        );

        const applied: CombatHitApplied = {
            ok: true,
            targetId,
            sourceId,
            damageType,
            rawAmount,
            finalAmount,
            hpBefore,
            hpAfter,
            defeated,
            atMs,
        };

        emit(COMBAT_HIT_APPLIED_SIGNAL, applied);

        if (defeated) {
            emit(COMBAT_ENTITY_DEFEATED_SIGNAL, {
                targetId,
                sourceId,
                atMs,
                damageType,
            });
        }

        return applied;
    };

    return {
        registerCombatant,
        unregisterCombatant,
        getCombatant,
        listCombatants,
        applyHit,
        setInvulnerableUntil,
        reviveCombatant,
    };
}

export const combatCore = createCombatCoreService();
