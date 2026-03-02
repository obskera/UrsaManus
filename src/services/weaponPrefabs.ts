import {
    type ProjectileService,
    type ProjectileSnapshot,
    createProjectileService,
} from "@/services/projectiles";

export type WeaponPrefabId = "single-shot" | "burst" | "auto";

export type WeaponFireBlockReason = "on-cooldown" | "reloading" | "empty-ammo";

export type WeaponPrefabConfig = {
    id: WeaponPrefabId;
    label: string;
    projectileId: string;
    cooldownMs: number;
    clipSize: number;
    reserveAmmo: number;
    reloadMs: number;
    projectileSpeedPxPerSec: number;
    projectileLifetimeMs: number;
    spreadDeg?: number;
    burstCount?: number;
};

export type WeaponPrefabState = {
    config: WeaponPrefabConfig;
    ammoInClip: number;
    reserveAmmo: number;
    cooldownRemainingMs: number;
    reloadRemainingMs: number;
    triggerHeld: boolean;
};

export type WeaponFireInput = {
    x: number;
    y: number;
    directionX: number;
    directionY: number;
    ownerId?: string;
};

export type WeaponFireBlocked = {
    ok: false;
    reason: WeaponFireBlockReason;
    state: WeaponPrefabState;
};

export type WeaponFireApplied = {
    ok: true;
    state: WeaponPrefabState;
    spawnedProjectiles: ProjectileSnapshot[];
};

export type WeaponFireResult = WeaponFireApplied | WeaponFireBlocked;

export type WeaponPrefabRuntime = {
    getState: () => WeaponPrefabState;
    pullTrigger: (input: WeaponFireInput) => WeaponFireResult;
    releaseTrigger: () => void;
    reload: () => boolean;
    tick: (deltaMs: number, heldInput?: WeaponFireInput) => WeaponPrefabState;
};

export function createSingleShotWeaponPrefab(
    patch: Partial<WeaponPrefabConfig> = {},
): WeaponPrefabConfig {
    return {
        id: "single-shot",
        label: "Single Shot",
        projectileId: "projectile.single",
        cooldownMs: 260,
        clipSize: 12,
        reserveAmmo: 60,
        reloadMs: 900,
        projectileSpeedPxPerSec: 360,
        projectileLifetimeMs: 900,
        ...patch,
    };
}

export function createBurstWeaponPrefab(
    patch: Partial<WeaponPrefabConfig> = {},
): WeaponPrefabConfig {
    return {
        id: "burst",
        label: "Burst Rifle",
        projectileId: "projectile.burst",
        cooldownMs: 420,
        clipSize: 24,
        reserveAmmo: 96,
        reloadMs: 1200,
        projectileSpeedPxPerSec: 420,
        projectileLifetimeMs: 900,
        spreadDeg: 10,
        burstCount: 3,
        ...patch,
    };
}

export function createAutoWeaponPrefab(
    patch: Partial<WeaponPrefabConfig> = {},
): WeaponPrefabConfig {
    return {
        id: "auto",
        label: "Auto Carbine",
        projectileId: "projectile.auto",
        cooldownMs: 120,
        clipSize: 30,
        reserveAmmo: 150,
        reloadMs: 1100,
        projectileSpeedPxPerSec: 380,
        projectileLifetimeMs: 900,
        ...patch,
    };
}

function cloneConfig(config: WeaponPrefabConfig): WeaponPrefabConfig {
    return {
        ...config,
    };
}

function clampPositive(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, value);
}

export function createWeaponPrefabRuntime(options: {
    prefab: WeaponPrefabConfig;
    projectileService?: ProjectileService;
}): WeaponPrefabRuntime {
    const projectileService =
        options.projectileService ?? createProjectileService();
    const config = cloneConfig(options.prefab);

    let ammoInClip = Math.max(0, Math.floor(config.clipSize));
    let reserveAmmo = Math.max(0, Math.floor(config.reserveAmmo));
    let cooldownRemainingMs = 0;
    let reloadRemainingMs = 0;
    let triggerHeld = false;

    const getState = (): WeaponPrefabState => {
        return {
            config: cloneConfig(config),
            ammoInClip,
            reserveAmmo,
            cooldownRemainingMs,
            reloadRemainingMs,
            triggerHeld,
        };
    };

    const consumeAmmo = (amount: number) => {
        ammoInClip = Math.max(0, ammoInClip - amount);
    };

    const spawnForInput = (input: WeaponFireInput): ProjectileSnapshot[] => {
        if (config.id === "burst") {
            return projectileService.spawnBurst({
                projectileId: config.projectileId,
                ownerId: input.ownerId,
                x: input.x,
                y: input.y,
                directionX: input.directionX,
                directionY: input.directionY,
                speedPxPerSec: config.projectileSpeedPxPerSec,
                lifetimeMs: config.projectileLifetimeMs,
                count: Math.max(1, config.burstCount ?? 3),
                spreadDeg: clampPositive(config.spreadDeg ?? 8),
                tags: ["weapon", config.id],
            });
        }

        return [
            projectileService.spawn({
                projectileId: config.projectileId,
                ownerId: input.ownerId,
                x: input.x,
                y: input.y,
                directionX: input.directionX,
                directionY: input.directionY,
                speedPxPerSec: config.projectileSpeedPxPerSec,
                lifetimeMs: config.projectileLifetimeMs,
                tags: ["weapon", config.id],
            }),
        ];
    };

    const pullTrigger: WeaponPrefabRuntime["pullTrigger"] = (input) => {
        triggerHeld = true;

        if (reloadRemainingMs > 0) {
            return {
                ok: false,
                reason: "reloading",
                state: getState(),
            };
        }

        if (cooldownRemainingMs > 0) {
            return {
                ok: false,
                reason: "on-cooldown",
                state: getState(),
            };
        }

        if (ammoInClip <= 0) {
            return {
                ok: false,
                reason: "empty-ammo",
                state: getState(),
            };
        }

        const spawned = spawnForInput(input);
        consumeAmmo(
            config.id === "burst" ? Math.max(1, config.burstCount ?? 3) : 1,
        );
        cooldownRemainingMs = clampPositive(config.cooldownMs);

        return {
            ok: true,
            state: getState(),
            spawnedProjectiles: spawned,
        };
    };

    const releaseTrigger: WeaponPrefabRuntime["releaseTrigger"] = () => {
        triggerHeld = false;
    };

    const reload: WeaponPrefabRuntime["reload"] = () => {
        if (reloadRemainingMs > 0) {
            return false;
        }

        if (ammoInClip >= config.clipSize) {
            return false;
        }

        if (reserveAmmo <= 0) {
            return false;
        }

        reloadRemainingMs = clampPositive(config.reloadMs);
        return true;
    };

    const completeReloadIfReady = () => {
        if (reloadRemainingMs > 0) {
            return;
        }

        if (ammoInClip >= config.clipSize || reserveAmmo <= 0) {
            return;
        }

        const needed = config.clipSize - ammoInClip;
        const loaded = Math.min(needed, reserveAmmo);
        ammoInClip += loaded;
        reserveAmmo -= loaded;
    };

    const tick: WeaponPrefabRuntime["tick"] = (deltaMs, heldInput) => {
        const delta = clampPositive(deltaMs);
        cooldownRemainingMs = Math.max(0, cooldownRemainingMs - delta);
        reloadRemainingMs = Math.max(0, reloadRemainingMs - delta);

        completeReloadIfReady();

        if (
            config.id === "auto" &&
            triggerHeld &&
            heldInput &&
            cooldownRemainingMs <= 0 &&
            reloadRemainingMs <= 0 &&
            ammoInClip > 0
        ) {
            pullTrigger(heldInput);
        }

        return getState();
    };

    return {
        getState,
        pullTrigger,
        releaseTrigger,
        reload,
        tick,
    };
}
