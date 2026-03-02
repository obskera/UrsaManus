import { afterEach, describe, expect, it } from "vitest";
import { signalBus } from "@/services/signalBus";
import { createProjectileService } from "@/services/projectiles";
import {
    SPELL_CAST_BLOCKED_SIGNAL,
    SPELL_CAST_SIGNAL,
    createSpellPrefabService,
} from "@/services/spellPrefabs";

describe("spell prefab service", () => {
    afterEach(() => {
        signalBus.clear();
    });

    it("casts projectile spell and spawns projectile payload", () => {
        const projectiles = createProjectileService({ now: () => 0 });
        const spells = createSpellPrefabService({
            projectileService: projectiles,
            mana: 100,
            now: () => 0,
        });

        const result = spells.cast("projectile-spell", {
            casterId: "mage-1",
            x: 10,
            y: 20,
            directionX: 1,
            directionY: 0,
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.projectile).toBeDefined();
            expect(result.mana).toBeLessThan(100);
        }
        expect(projectiles.listProjectiles()).toHaveLength(1);
    });

    it("casts aoe pulse and channel beam prefabs with effect payloads", () => {
        const spells = createSpellPrefabService({ mana: 200, now: () => 0 });

        const pulse = spells.cast("aoe-pulse", {
            x: 0,
            y: 0,
            directionX: 1,
            directionY: 0,
        });
        expect(pulse.ok).toBe(true);
        if (pulse.ok) {
            expect(pulse.pulse?.radiusPx).toBeGreaterThan(0);
        }

        spells.tick(1500);
        const beam = spells.cast("channel-beam", {
            x: 0,
            y: 0,
            directionX: 1,
            directionY: 0,
        });
        expect(beam.ok).toBe(true);
        if (beam.ok) {
            expect(beam.beam?.durationMs).toBeGreaterThan(0);
        }
    });

    it("blocks casting when on cooldown or without mana", () => {
        const spells = createSpellPrefabService({ mana: 10, now: () => 0 });

        const noMana = spells.cast("projectile-spell", {
            x: 0,
            y: 0,
            directionX: 1,
            directionY: 0,
        });
        expect(noMana.ok).toBe(false);
        if (!noMana.ok) {
            expect(noMana.reason).toBe("insufficient-mana");
        }

        spells.setMana(100);
        const first = spells.cast("projectile-spell", {
            x: 0,
            y: 0,
            directionX: 1,
            directionY: 0,
        });
        expect(first.ok).toBe(true);

        const cooldownBlocked = spells.cast("projectile-spell", {
            x: 0,
            y: 0,
            directionX: 1,
            directionY: 0,
        });
        expect(cooldownBlocked.ok).toBe(false);
        if (!cooldownBlocked.ok) {
            expect(cooldownBlocked.reason).toBe("on-cooldown");
        }
    });

    it("emits lifecycle signals for cast and blocked outcomes", () => {
        const events: string[] = [];
        signalBus.on(SPELL_CAST_SIGNAL, () => {
            events.push("cast");
        });
        signalBus.on(SPELL_CAST_BLOCKED_SIGNAL, () => {
            events.push("blocked");
        });

        const spells = createSpellPrefabService({ mana: 100, now: () => 0 });
        spells.cast("projectile-spell", {
            x: 0,
            y: 0,
            directionX: 1,
            directionY: 0,
        });
        spells.cast("projectile-spell", {
            x: 0,
            y: 0,
            directionX: 1,
            directionY: 0,
        });

        expect(events).toContain("cast");
        expect(events).toContain("blocked");
    });
});
