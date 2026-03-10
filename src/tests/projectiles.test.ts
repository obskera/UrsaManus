import { afterEach, describe, expect, it } from "vitest";
import { signalBus } from "@/services/signalBus";
import {
    PROJECTILE_DESPAWNED_SIGNAL,
    PROJECTILE_HIT_SIGNAL,
    PROJECTILE_SPAWNED_SIGNAL,
    createProjectileService,
} from "@/services/projectiles";

describe("projectile service", () => {
    afterEach(() => {
        signalBus.clear();
    });

    it("spawns projectiles with normalized velocity and advances deterministic travel", () => {
        const service = createProjectileService({ now: () => 0 });

        const projectile = service.spawn({
            projectileId: "arrow",
            x: 0,
            y: 0,
            directionX: 3,
            directionY: 4,
            speedPxPerSec: 100,
            lifetimeMs: 1000,
        });

        expect(projectile.velocityX).toBeCloseTo(60);
        expect(projectile.velocityY).toBeCloseTo(80);

        service.tick(500);
        const moved = service.getProjectile(projectile.runtimeId);
        expect(moved).not.toBeNull();
        expect(moved?.x).toBeCloseTo(30);
        expect(moved?.y).toBeCloseTo(40);
        expect(moved?.remainingLifetimeMs).toBe(500);
    });

    it("supports spread burst spawning for weapon-like volleys", () => {
        const service = createProjectileService({ now: () => 0 });

        const burst = service.spawnBurst({
            projectileId: "shotgun-pellet",
            x: 10,
            y: 10,
            count: 3,
            spreadDeg: 30,
            directionX: 1,
            directionY: 0,
            speedPxPerSec: 200,
        });

        expect(burst).toHaveLength(3);
        expect(burst[0].velocityY).toBeLessThan(0);
        expect(burst[1].velocityY).toBeCloseTo(0);
        expect(burst[2].velocityY).toBeGreaterThan(0);
    });

    it("despawns on hit resolver and emits hit + despawn lifecycle signals", () => {
        const service = createProjectileService({ now: () => 0 });
        const events: string[] = [];

        signalBus.on(PROJECTILE_SPAWNED_SIGNAL, () => {
            events.push("spawned");
        });
        signalBus.on(PROJECTILE_HIT_SIGNAL, () => {
            events.push("hit");
        });
        signalBus.on<{ reason: string }>(
            PROJECTILE_DESPAWNED_SIGNAL,
            (payload) => {
                events.push(`despawn:${payload.reason}`);
            },
        );

        const projectile = service.spawn({
            projectileId: "firebolt",
            x: 0,
            y: 0,
            directionX: 1,
            directionY: 0,
            speedPxPerSec: 180,
            lifetimeMs: 1000,
        });

        const summary = service.tick(16, () => ({
            hit: true,
            targetId: "enemy-1",
        }));

        expect(summary.hitCount).toBe(1);
        expect(service.getProjectile(projectile.runtimeId)).toBeNull();
        expect(events).toContain("spawned");
        expect(events).toContain("hit");
        expect(events).toContain("despawn:hit");
    });

    it("expires projectiles by lifetime and supports manual despawn", () => {
        const service = createProjectileService({ now: () => 0 });

        const first = service.spawn({
            projectileId: "spark",
            x: 0,
            y: 0,
            directionX: 1,
            directionY: 0,
            lifetimeMs: 30,
        });

        const second = service.spawn({
            projectileId: "orb",
            x: 0,
            y: 0,
            directionX: 0,
            directionY: 1,
            lifetimeMs: 1000,
        });

        const tickSummary = service.tick(40);
        expect(tickSummary.expiredCount).toBe(1);
        expect(service.getProjectile(first.runtimeId)).toBeNull();

        expect(service.despawn(second.runtimeId, "manual")).toBe(true);
        expect(service.getProjectile(second.runtimeId)).toBeNull();
        expect(service.despawn(second.runtimeId, "manual")).toBe(false);
    });
});
