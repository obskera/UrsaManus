import { describe, expect, it } from "vitest";
import { createProjectileService } from "@/services/projectiles";
import {
    createAutoWeaponPrefab,
    createBurstWeaponPrefab,
    createSingleShotWeaponPrefab,
    createWeaponPrefabRuntime,
} from "@/services/weaponPrefabs";

describe("weapon prefab runtime", () => {
    it("fires single-shot prefab with cooldown and ammo usage", () => {
        const projectiles = createProjectileService({ now: () => 0 });
        const runtime = createWeaponPrefabRuntime({
            prefab: createSingleShotWeaponPrefab({
                clipSize: 2,
                reserveAmmo: 4,
            }),
            projectileService: projectiles,
        });

        const first = runtime.pullTrigger({
            x: 0,
            y: 0,
            directionX: 1,
            directionY: 0,
            ownerId: "player",
        });
        expect(first.ok).toBe(true);
        if (first.ok) {
            expect(first.spawnedProjectiles).toHaveLength(1);
            expect(first.state.ammoInClip).toBe(1);
        }

        const blocked = runtime.pullTrigger({
            x: 0,
            y: 0,
            directionX: 1,
            directionY: 0,
            ownerId: "player",
        });
        expect(blocked.ok).toBe(false);
        if (!blocked.ok) {
            expect(blocked.reason).toBe("on-cooldown");
        }

        runtime.tick(1000);
        const second = runtime.pullTrigger({
            x: 0,
            y: 0,
            directionX: 1,
            directionY: 0,
        });
        expect(second.ok).toBe(true);
    });

    it("fires burst prefab with spread and multi-projectile spawn", () => {
        const projectiles = createProjectileService({ now: () => 0 });
        const runtime = createWeaponPrefabRuntime({
            prefab: createBurstWeaponPrefab({
                burstCount: 3,
                clipSize: 9,
                reserveAmmo: 0,
                spreadDeg: 18,
                cooldownMs: 0,
            }),
            projectileService: projectiles,
        });

        const fired = runtime.pullTrigger({
            x: 8,
            y: 12,
            directionX: 1,
            directionY: 0,
        });

        expect(fired.ok).toBe(true);
        if (fired.ok) {
            expect(fired.spawnedProjectiles).toHaveLength(3);
            expect(fired.state.ammoInClip).toBe(6);
        }
    });

    it("supports reload flow and blocks fire while reloading", () => {
        const projectiles = createProjectileService({ now: () => 0 });
        const runtime = createWeaponPrefabRuntime({
            prefab: createSingleShotWeaponPrefab({
                clipSize: 2,
                reserveAmmo: 5,
                reloadMs: 300,
                cooldownMs: 0,
            }),
            projectileService: projectiles,
        });

        runtime.pullTrigger({ x: 0, y: 0, directionX: 1, directionY: 0 });
        runtime.pullTrigger({ x: 0, y: 0, directionX: 1, directionY: 0 });

        const emptyFire = runtime.pullTrigger({
            x: 0,
            y: 0,
            directionX: 1,
            directionY: 0,
        });
        expect(emptyFire.ok).toBe(false);
        if (!emptyFire.ok) {
            expect(emptyFire.reason).toBe("empty-ammo");
        }

        expect(runtime.reload()).toBe(true);

        const blockedByReload = runtime.pullTrigger({
            x: 0,
            y: 0,
            directionX: 1,
            directionY: 0,
        });
        expect(blockedByReload.ok).toBe(false);
        if (!blockedByReload.ok) {
            expect(blockedByReload.reason).toBe("reloading");
        }

        runtime.tick(300);
        const state = runtime.getState();
        expect(state.ammoInClip).toBe(2);
        expect(state.reserveAmmo).toBe(3);
    });

    it("auto prefab fires repeatedly while trigger is held across ticks", () => {
        const projectiles = createProjectileService({ now: () => 0 });
        const runtime = createWeaponPrefabRuntime({
            prefab: createAutoWeaponPrefab({
                clipSize: 5,
                reserveAmmo: 0,
                cooldownMs: 100,
            }),
            projectileService: projectiles,
        });

        runtime.pullTrigger({ x: 0, y: 0, directionX: 1, directionY: 0 });
        runtime.tick(100, { x: 0, y: 0, directionX: 1, directionY: 0 });
        runtime.tick(100, { x: 0, y: 0, directionX: 1, directionY: 0 });
        runtime.releaseTrigger();

        const state = runtime.getState();
        expect(state.ammoInClip).toBe(2);
        expect(projectiles.listProjectiles()).toHaveLength(3);
    });
});
