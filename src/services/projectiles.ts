import { signalBus } from "@/services/signalBus";

export type ProjectileDespawnReason = "expired" | "hit" | "manual";

export type ProjectileSnapshot = {
    runtimeId: string;
    projectileId: string;
    ownerId: string | null;
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
    speedPxPerSec: number;
    radiusPx: number;
    remainingLifetimeMs: number;
    createdAtMs: number;
    tags: string[];
    metadata?: Record<string, unknown>;
};

export type ProjectileHitResult = {
    hit: true;
    targetId?: string;
    point?: { x: number; y: number };
    metadata?: Record<string, unknown>;
};

export type ProjectileNoHitResult = {
    hit: false;
};

export type ProjectileRuntime = ProjectileSnapshot;

export type ProjectileHitResolver = (
    projectile: ProjectileSnapshot,
) => ProjectileHitResult | ProjectileNoHitResult;

export type ProjectileSpawnInput = {
    projectileId: string;
    ownerId?: string | null;
    x: number;
    y: number;
    directionX: number;
    directionY: number;
    speedPxPerSec?: number;
    lifetimeMs?: number;
    radiusPx?: number;
    tags?: string[];
    metadata?: Record<string, unknown>;
};

export type ProjectileBurstSpawnInput = Omit<
    ProjectileSpawnInput,
    "directionX" | "directionY"
> & {
    spreadDeg: number;
    count: number;
    directionX?: number;
    directionY?: number;
};

export type ProjectileTickSummary = {
    nowMs: number;
    activeCount: number;
    movedCount: number;
    hitCount: number;
    expiredCount: number;
};

export type ProjectileService = {
    spawn: (input: ProjectileSpawnInput) => ProjectileSnapshot;
    spawnBurst: (input: ProjectileBurstSpawnInput) => ProjectileSnapshot[];
    tick: (
        deltaMs: number,
        resolver?: ProjectileHitResolver,
    ) => ProjectileTickSummary;
    despawn: (runtimeId: string, reason?: ProjectileDespawnReason) => boolean;
    getProjectile: (runtimeId: string) => ProjectileSnapshot | null;
    listProjectiles: () => ProjectileSnapshot[];
    getNowMs: () => number;
};

export const PROJECTILE_SPAWNED_SIGNAL = "projectile:spawned";
export const PROJECTILE_UPDATED_SIGNAL = "projectile:updated";
export const PROJECTILE_HIT_SIGNAL = "projectile:hit";
export const PROJECTILE_DESPAWNED_SIGNAL = "projectile:despawned";

const DEFAULT_SPEED = 220;
const DEFAULT_LIFETIME_MS = 1000;
const DEFAULT_RADIUS_PX = 4;

function normalizeFinite(value: number, fallback: number): number {
    if (!Number.isFinite(value)) {
        return fallback;
    }

    return value;
}

function normalizePositive(value: number, fallback: number): number {
    if (!Number.isFinite(value)) {
        return fallback;
    }

    return Math.max(0, value);
}

function cloneSnapshot(runtime: ProjectileRuntime): ProjectileSnapshot {
    return {
        runtimeId: runtime.runtimeId,
        projectileId: runtime.projectileId,
        ownerId: runtime.ownerId,
        x: runtime.x,
        y: runtime.y,
        velocityX: runtime.velocityX,
        velocityY: runtime.velocityY,
        speedPxPerSec: runtime.speedPxPerSec,
        radiusPx: runtime.radiusPx,
        remainingLifetimeMs: runtime.remainingLifetimeMs,
        createdAtMs: runtime.createdAtMs,
        tags: [...runtime.tags],
        metadata: runtime.metadata,
    };
}

function resolveUnitDirection(
    directionX: number,
    directionY: number,
): { x: number; y: number } {
    const x = normalizeFinite(directionX, 1);
    const y = normalizeFinite(directionY, 0);
    const length = Math.sqrt(x * x + y * y);
    if (length <= 0.0001) {
        return { x: 1, y: 0 };
    }

    return {
        x: x / length,
        y: y / length,
    };
}

function rotateUnitVector(
    x: number,
    y: number,
    angleDeg: number,
): { x: number; y: number } {
    const radians = (angleDeg * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    return {
        x: x * cos - y * sin,
        y: x * sin + y * cos,
    };
}

export function createProjectileService(options?: {
    now?: () => number;
    emit?: <TPayload>(signal: string, payload: TPayload) => void;
}): ProjectileService {
    const now = options?.now ?? (() => Date.now());
    const emit =
        options?.emit ??
        (<TPayload>(signal: string, payload: TPayload) => {
            signalBus.emit(signal, payload);
        });

    let syntheticNowMs = Math.max(0, normalizeFinite(now(), 0));
    let nextRuntimeId = 1;
    const projectilesById = new Map<string, ProjectileRuntime>();

    const getNowMs = (): number => {
        const candidate = normalizeFinite(now(), syntheticNowMs);
        if (candidate > syntheticNowMs) {
            syntheticNowMs = candidate;
        }

        return syntheticNowMs;
    };

    const spawn: ProjectileService["spawn"] = (input) => {
        const direction = resolveUnitDirection(
            input.directionX,
            input.directionY,
        );
        const speedPxPerSec = normalizePositive(
            input.speedPxPerSec ?? DEFAULT_SPEED,
            DEFAULT_SPEED,
        );
        const lifetimeMs = normalizePositive(
            input.lifetimeMs ?? DEFAULT_LIFETIME_MS,
            DEFAULT_LIFETIME_MS,
        );
        const runtimeId = `proj-${nextRuntimeId}`;
        nextRuntimeId += 1;

        const runtime: ProjectileRuntime = {
            runtimeId,
            projectileId: input.projectileId,
            ownerId: input.ownerId ?? null,
            x: normalizeFinite(input.x, 0),
            y: normalizeFinite(input.y, 0),
            velocityX: direction.x * speedPxPerSec,
            velocityY: direction.y * speedPxPerSec,
            speedPxPerSec,
            radiusPx: normalizePositive(
                input.radiusPx ?? DEFAULT_RADIUS_PX,
                DEFAULT_RADIUS_PX,
            ),
            remainingLifetimeMs: lifetimeMs,
            createdAtMs: getNowMs(),
            tags: input.tags ? [...input.tags] : [],
            metadata: input.metadata,
        };

        projectilesById.set(runtimeId, runtime);

        const snapshot = cloneSnapshot(runtime);
        emit(PROJECTILE_SPAWNED_SIGNAL, snapshot);
        return snapshot;
    };

    const spawnBurst: ProjectileService["spawnBurst"] = (input) => {
        const count = Math.max(1, Math.floor(input.count));
        const spreadDeg = normalizeFinite(input.spreadDeg, 0);
        const baseDirection = resolveUnitDirection(
            input.directionX ?? 1,
            input.directionY ?? 0,
        );

        if (count === 1 || spreadDeg <= 0) {
            return [
                spawn({
                    ...input,
                    directionX: baseDirection.x,
                    directionY: baseDirection.y,
                }),
            ];
        }

        const startAngle = -(spreadDeg / 2);
        const step = count > 1 ? spreadDeg / (count - 1) : 0;

        const snapshots: ProjectileSnapshot[] = [];
        for (let index = 0; index < count; index += 1) {
            const angle = startAngle + index * step;
            const rotated = rotateUnitVector(
                baseDirection.x,
                baseDirection.y,
                angle,
            );
            snapshots.push(
                spawn({
                    ...input,
                    directionX: rotated.x,
                    directionY: rotated.y,
                }),
            );
        }

        return snapshots;
    };

    const despawn: ProjectileService["despawn"] = (
        runtimeId,
        reason = "manual",
    ) => {
        const runtime = projectilesById.get(runtimeId);
        if (!runtime) {
            return false;
        }

        projectilesById.delete(runtimeId);
        emit(PROJECTILE_DESPAWNED_SIGNAL, {
            reason,
            projectile: cloneSnapshot(runtime),
        });
        return true;
    };

    const tick: ProjectileService["tick"] = (deltaMs, resolver) => {
        const clampedDeltaMs = normalizePositive(deltaMs, 0);
        syntheticNowMs = getNowMs() + clampedDeltaMs;

        let movedCount = 0;
        let hitCount = 0;
        let expiredCount = 0;

        const runtimeIds = Array.from(projectilesById.keys());
        for (const runtimeId of runtimeIds) {
            const runtime = projectilesById.get(runtimeId);
            if (!runtime) {
                continue;
            }

            const deltaSec = clampedDeltaMs / 1000;
            runtime.x += runtime.velocityX * deltaSec;
            runtime.y += runtime.velocityY * deltaSec;
            runtime.remainingLifetimeMs = Math.max(
                0,
                runtime.remainingLifetimeMs - clampedDeltaMs,
            );

            movedCount += 1;
            emit(PROJECTILE_UPDATED_SIGNAL, cloneSnapshot(runtime));

            if (resolver) {
                const resolved = resolver(cloneSnapshot(runtime));
                if (resolved.hit) {
                    hitCount += 1;
                    emit(PROJECTILE_HIT_SIGNAL, {
                        projectile: cloneSnapshot(runtime),
                        hit: resolved,
                    });
                    despawn(runtime.runtimeId, "hit");
                    continue;
                }
            }

            if (runtime.remainingLifetimeMs <= 0) {
                expiredCount += 1;
                despawn(runtime.runtimeId, "expired");
            }
        }

        return {
            nowMs: syntheticNowMs,
            activeCount: projectilesById.size,
            movedCount,
            hitCount,
            expiredCount,
        };
    };

    const getProjectile: ProjectileService["getProjectile"] = (runtimeId) => {
        const runtime = projectilesById.get(runtimeId);
        if (!runtime) {
            return null;
        }

        return cloneSnapshot(runtime);
    };

    const listProjectiles: ProjectileService["listProjectiles"] = () => {
        return Array.from(projectilesById.values())
            .map((runtime) => cloneSnapshot(runtime))
            .sort((a, b) => a.runtimeId.localeCompare(b.runtimeId));
    };

    return {
        spawn,
        spawnBurst,
        tick,
        despawn,
        getProjectile,
        listProjectiles,
        getNowMs,
    };
}

export const projectileService = createProjectileService();
