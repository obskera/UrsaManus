import { signalBus } from "@/services/signalBus";
import {
    type ProjectileService,
    type ProjectileSnapshot,
    createProjectileService,
} from "@/services/projectiles";

export type SpellPrefabId = "projectile-spell" | "aoe-pulse" | "channel-beam";

export type SpellPrefabConfig = {
    id: SpellPrefabId;
    label: string;
    manaCost: number;
    cooldownMs: number;
    projectileId?: string;
    projectileSpeedPxPerSec?: number;
    projectileLifetimeMs?: number;
    rangePx?: number;
    pulseRadiusPx?: number;
    channelDurationMs?: number;
};

export type SpellCastInput = {
    casterId?: string;
    x: number;
    y: number;
    directionX: number;
    directionY: number;
};

export type SpellCastBlockedReason = "insufficient-mana" | "on-cooldown";

export type SpellCastBlocked = {
    ok: false;
    reason: SpellCastBlockedReason;
    spellId: SpellPrefabId;
    mana: number;
    cooldownRemainingMs: number;
};

export type SpellCastApplied = {
    ok: true;
    spellId: SpellPrefabId;
    mana: number;
    cooldownAppliedMs: number;
    projectile?: ProjectileSnapshot;
    pulse?: {
        radiusPx: number;
        rangePx: number;
    };
    beam?: {
        durationMs: number;
        rangePx: number;
    };
};

export type SpellCastResult = SpellCastBlocked | SpellCastApplied;

export type SpellPrefabService = {
    setMana: (value: number) => number;
    getMana: () => number;
    cast: (spellId: SpellPrefabId, input: SpellCastInput) => SpellCastResult;
    tick: (deltaMs: number) => number;
    getCooldownRemainingMs: (spellId: SpellPrefabId) => number;
    getSpellConfigs: () => SpellPrefabConfig[];
};

export const SPELL_CAST_SIGNAL = "spell:cast";
export const SPELL_CAST_BLOCKED_SIGNAL = "spell:cast:blocked";

function clampPositive(value: number, fallback = 0): number {
    if (!Number.isFinite(value)) {
        return fallback;
    }

    return Math.max(0, value);
}

function normalizeSpellConfig(config: SpellPrefabConfig): SpellPrefabConfig {
    return {
        ...config,
        manaCost: clampPositive(config.manaCost),
        cooldownMs: clampPositive(config.cooldownMs),
        projectileSpeedPxPerSec: clampPositive(
            config.projectileSpeedPxPerSec ?? 280,
        ),
        projectileLifetimeMs: clampPositive(config.projectileLifetimeMs ?? 900),
        rangePx: clampPositive(config.rangePx ?? 220),
        pulseRadiusPx: clampPositive(config.pulseRadiusPx ?? 96),
        channelDurationMs: clampPositive(config.channelDurationMs ?? 1200),
    };
}

export function createProjectileSpellPrefab(
    patch: Partial<SpellPrefabConfig> = {},
): SpellPrefabConfig {
    return normalizeSpellConfig({
        id: "projectile-spell",
        label: "Arc Bolt",
        manaCost: 12,
        cooldownMs: 220,
        projectileId: "spell.arc-bolt",
        projectileSpeedPxPerSec: 340,
        projectileLifetimeMs: 900,
        ...patch,
    });
}

export function createAoePulseSpellPrefab(
    patch: Partial<SpellPrefabConfig> = {},
): SpellPrefabConfig {
    return normalizeSpellConfig({
        id: "aoe-pulse",
        label: "Pulse Nova",
        manaCost: 24,
        cooldownMs: 1200,
        pulseRadiusPx: 120,
        rangePx: 120,
        ...patch,
    });
}

export function createChannelBeamSpellPrefab(
    patch: Partial<SpellPrefabConfig> = {},
): SpellPrefabConfig {
    return normalizeSpellConfig({
        id: "channel-beam",
        label: "Channel Beam",
        manaCost: 30,
        cooldownMs: 1800,
        channelDurationMs: 1500,
        rangePx: 260,
        ...patch,
    });
}

export function createSpellPrefabService(options?: {
    projectileService?: ProjectileService;
    now?: () => number;
    mana?: number;
    emit?: <TPayload>(signal: string, payload: TPayload) => void;
    spellConfigs?: SpellPrefabConfig[];
}): SpellPrefabService {
    const projectileService =
        options?.projectileService ?? createProjectileService();
    const now = options?.now ?? (() => Date.now());
    const emit =
        options?.emit ??
        (<TPayload>(signal: string, payload: TPayload) => {
            signalBus.emit(signal, payload);
        });

    const configs = options?.spellConfigs?.map((config) =>
        normalizeSpellConfig(config),
    ) ?? [
        createProjectileSpellPrefab(),
        createAoePulseSpellPrefab(),
        createChannelBeamSpellPrefab(),
    ];

    const configsById = new Map(configs.map((config) => [config.id, config]));

    let syntheticNowMs = clampPositive(now());
    let mana = clampPositive(options?.mana ?? 100);
    const cooldownUntilBySpell = new Map<SpellPrefabId, number>();

    const resolveNow = (): number => {
        const candidate = clampPositive(now());
        if (candidate > syntheticNowMs) {
            syntheticNowMs = candidate;
        }

        return syntheticNowMs;
    };

    const getCooldownRemainingMs: SpellPrefabService["getCooldownRemainingMs"] =
        (spellId) => {
            return Math.max(
                0,
                (cooldownUntilBySpell.get(spellId) ?? 0) - resolveNow(),
            );
        };

    const setMana: SpellPrefabService["setMana"] = (value) => {
        mana = clampPositive(value);
        return mana;
    };

    const getMana = (): number => {
        return mana;
    };

    const cast: SpellPrefabService["cast"] = (spellId, input) => {
        const config = configsById.get(spellId);
        if (!config) {
            const blocked: SpellCastBlocked = {
                ok: false,
                reason: "on-cooldown",
                spellId,
                mana,
                cooldownRemainingMs: 0,
            };
            emit(SPELL_CAST_BLOCKED_SIGNAL, blocked);
            return blocked;
        }

        const cooldownRemainingMs = getCooldownRemainingMs(spellId);
        if (cooldownRemainingMs > 0) {
            const blocked: SpellCastBlocked = {
                ok: false,
                reason: "on-cooldown",
                spellId,
                mana,
                cooldownRemainingMs,
            };
            emit(SPELL_CAST_BLOCKED_SIGNAL, blocked);
            return blocked;
        }

        if (mana < config.manaCost) {
            const blocked: SpellCastBlocked = {
                ok: false,
                reason: "insufficient-mana",
                spellId,
                mana,
                cooldownRemainingMs: 0,
            };
            emit(SPELL_CAST_BLOCKED_SIGNAL, blocked);
            return blocked;
        }

        mana -= config.manaCost;
        cooldownUntilBySpell.set(spellId, resolveNow() + config.cooldownMs);

        if (spellId === "projectile-spell") {
            const projectile = projectileService.spawn({
                projectileId: config.projectileId ?? "spell.projectile",
                ownerId: input.casterId,
                x: input.x,
                y: input.y,
                directionX: input.directionX,
                directionY: input.directionY,
                speedPxPerSec: config.projectileSpeedPxPerSec,
                lifetimeMs: config.projectileLifetimeMs,
                tags: ["spell", spellId],
            });

            const applied: SpellCastApplied = {
                ok: true,
                spellId,
                mana,
                cooldownAppliedMs: config.cooldownMs,
                projectile,
            };
            emit(SPELL_CAST_SIGNAL, applied);
            return applied;
        }

        if (spellId === "aoe-pulse") {
            const applied: SpellCastApplied = {
                ok: true,
                spellId,
                mana,
                cooldownAppliedMs: config.cooldownMs,
                pulse: {
                    radiusPx: config.pulseRadiusPx ?? 0,
                    rangePx: config.rangePx ?? 0,
                },
            };
            emit(SPELL_CAST_SIGNAL, applied);
            return applied;
        }

        const applied: SpellCastApplied = {
            ok: true,
            spellId,
            mana,
            cooldownAppliedMs: config.cooldownMs,
            beam: {
                durationMs: config.channelDurationMs ?? 0,
                rangePx: config.rangePx ?? 0,
            },
        };
        emit(SPELL_CAST_SIGNAL, applied);
        return applied;
    };

    const tick: SpellPrefabService["tick"] = (deltaMs) => {
        syntheticNowMs += clampPositive(deltaMs);
        return syntheticNowMs;
    };

    const getSpellConfigs: SpellPrefabService["getSpellConfigs"] = () => {
        return configs.map((config) => ({ ...config }));
    };

    return {
        setMana,
        getMana,
        cast,
        tick,
        getCooldownRemainingMs,
        getSpellConfigs,
    };
}
