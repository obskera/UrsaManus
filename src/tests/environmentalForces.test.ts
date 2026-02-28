import { describe, expect, it } from "vitest";
import {
    normalizeEnvironmentalForceZone,
    resolveEnvironmentalForceEffect,
} from "@/logic/simulation";

describe("environmentalForces simulation", () => {
    it("normalizes invalid bounds and numeric values", () => {
        const zone = normalizeEnvironmentalForceZone({
            id: "zone-a",
            bounds: {
                x: Number.NaN,
                y: Number.NaN,
                width: -10,
                height: Number.POSITIVE_INFINITY,
            },
            forcePxPerSec: {
                x: Number.NaN,
                y: 50,
            },
            dragScaleByType: {
                player: Number.NaN,
                enemy: 2,
            },
        });

        expect(zone.bounds).toEqual({
            x: 0,
            y: 0,
            width: 0,
            height: 0,
        });
        expect(zone.forcePxPerSec).toEqual({ x: 0, y: 50 });
        expect(zone.dragScaleByType.player).toBe(0);
        expect(zone.dragScaleByType.enemy).toBe(2);
    });

    it("resolves additive force and drag scale for matching zones", () => {
        const zoneA = normalizeEnvironmentalForceZone({
            id: "a",
            bounds: { x: 0, y: 0, width: 100, height: 100 },
            forcePxPerSec: { x: 100, y: -40 },
            dragScaleByType: { player: 1.5 },
        });
        const zoneB = normalizeEnvironmentalForceZone({
            id: "b",
            bounds: { x: 25, y: 0, width: 100, height: 100 },
            forcePxPerSec: { x: 20, y: 0 },
            dragScaleByType: { player: 1.2 },
        });

        const effect = resolveEnvironmentalForceEffect({
            zones: [zoneA, zoneB],
            entityType: "player",
            position: { x: 30, y: 50 },
            deltaMs: 50,
        });

        expect(effect.deltaVelocityX).toBeCloseTo(6);
        expect(effect.deltaVelocityY).toBeCloseTo(-2);
        expect(effect.dragScaleX).toBeCloseTo(1.8);
    });

    it("returns zero effect when out of zone or delta is invalid", () => {
        const zone = normalizeEnvironmentalForceZone({
            id: "zone-c",
            bounds: { x: 0, y: 0, width: 40, height: 40 },
            forcePxPerSec: { x: 80, y: 0 },
            dragScaleByType: { player: 3 },
        });

        const outside = resolveEnvironmentalForceEffect({
            zones: [zone],
            entityType: "player",
            position: { x: 100, y: 100 },
            deltaMs: 16,
        });
        const invalidDelta = resolveEnvironmentalForceEffect({
            zones: [zone],
            entityType: "player",
            position: { x: 10, y: 10 },
            deltaMs: Number.NaN,
        });

        expect(outside).toEqual({
            deltaVelocityX: 0,
            deltaVelocityY: 0,
            dragScaleX: 1,
        });
        expect(invalidDelta).toEqual({
            deltaVelocityX: 0,
            deltaVelocityY: 0,
            dragScaleX: 1,
        });
    });
});
