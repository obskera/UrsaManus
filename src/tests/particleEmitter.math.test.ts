import { describe, expect, it } from "vitest";
import { createParticle } from "@/components/effects/particleEmitter";
import { spawnParticles } from "@/components/effects/particleEmitter";
import { updateParticles } from "@/components/effects/particleEmitter";
import type { EmitParticlesPayload } from "@/components/effects/particleEmitter";

describe("particle emitter math", () => {
    it("creates particle velocity from direction and speed", () => {
        const particle = createParticle(
            1,
            {
                x: 10,
                y: 20,
                color: "#fff",
                size: 2,
                lifeMs: 500,
                direction: { angleDeg: 0, speed: 100 },
                gravity: 0,
                drag: 0,
            },
            () => 0.5,
        );

        expect(particle.vx).toBeCloseTo(100, 6);
        expect(particle.vy).toBeCloseTo(0, 6);
        expect(particle.lifeMs).toBe(500);
        expect(particle.color).toBe("#fff");
    });

    it("spawns point particles from exact location", () => {
        const payload: EmitParticlesPayload = {
            amount: 3,
            location: { x: 100, y: 50 },
            direction: { angleDeg: 90, speed: 10 },
            emissionShape: "point",
            lifeMs: 300,
            color: "red",
        };

        const { particles, nextId } = spawnParticles(payload, 10, () => 0.5);

        expect(particles).toHaveLength(3);
        expect(nextId).toBe(13);
        for (const particle of particles) {
            expect(particle.x).toBe(100);
            expect(particle.y).toBe(50);
        }
    });

    it("spawns circle particles within emission radius", () => {
        const payload: EmitParticlesPayload = {
            amount: 20,
            location: { x: 0, y: 0 },
            direction: { angleDeg: 45, speed: 10 },
            emissionShape: "circle",
            emissionRadius: 12,
            lifeMs: 300,
            color: "cyan",
        };

        const values = [0.1, 0.2, 0.4, 0.6, 0.8, 0.9];
        let idx = 0;
        const random = () => {
            const value = values[idx % values.length];
            idx += 1;
            return value;
        };

        const { particles } = spawnParticles(payload, 1, random);

        expect(particles).toHaveLength(20);
        for (const particle of particles) {
            const distance = Math.hypot(particle.x, particle.y);
            expect(distance).toBeLessThanOrEqual(12.000001);
        }
    });

    it("spawns line particles across emission length", () => {
        const payload: EmitParticlesPayload = {
            amount: 6,
            location: { x: 50, y: 10 },
            direction: { angleDeg: 0, speed: 0 },
            emissionShape: "line",
            emissionLength: 20,
            lifeMs: 300,
            color: "white",
        };

        const { particles } = spawnParticles(payload, 1, () => 0.5);

        expect(particles).toHaveLength(6);
        for (const particle of particles) {
            expect(particle.x).toBeGreaterThanOrEqual(40);
            expect(particle.x).toBeLessThanOrEqual(60);
            expect(particle.y).toBe(10);
        }
    });

    it("removes particles that move outside bounds", () => {
        const next = updateParticles(
            [
                {
                    id: 1,
                    x: -100,
                    y: 0,
                    vx: 0,
                    vy: 0,
                    color: "#fff",
                    size: 2,
                    lifeMs: 1000,
                    ageMs: 0,
                    gravity: 0,
                    drag: 0,
                    alpha: 1,
                },
                {
                    id: 2,
                    x: 10,
                    y: 10,
                    vx: 0,
                    vy: 0,
                    color: "#fff",
                    size: 2,
                    lifeMs: 1000,
                    ageMs: 0,
                    gravity: 0,
                    drag: 0,
                    alpha: 1,
                },
            ],
            16,
            { width: 50, height: 50 },
        );

        expect(next).toHaveLength(1);
        expect(next[0].id).toBe(2);
    });

    it("uses sizeRange for random particle sizes", () => {
        const payload: EmitParticlesPayload = {
            amount: 4,
            location: { x: 10, y: 10 },
            direction: { angleDeg: 0, speed: 0 },
            emissionShape: "point",
            lifeMs: 300,
            color: "#fff",
            sizeRange: { min: 2, max: 6 },
        };

        const values = [0, 0.25, 0.5, 1];
        let idx = 0;
        const random = () => {
            const value = values[idx % values.length];
            idx += 1;
            return value;
        };

        const { particles } = spawnParticles(payload, 1, random);

        expect(particles).toHaveLength(4);
        for (const particle of particles) {
            expect(particle.size).toBeGreaterThanOrEqual(2);
            expect(particle.size).toBeLessThanOrEqual(6);
        }
    });

    it("uses colorPalette when provided", () => {
        const payload: EmitParticlesPayload = {
            amount: 5,
            location: { x: 10, y: 10 },
            direction: { angleDeg: 0, speed: 0 },
            emissionShape: "point",
            lifeMs: 300,
            color: "#fff",
            colorPalette: ["#111", "#222", "#333"],
        };

        const values = [0.0, 0.34, 0.67, 0.99, 0.12, 0.45];
        let idx = 0;
        const random = () => {
            const value = values[idx % values.length];
            idx += 1;
            return value;
        };

        const { particles } = spawnParticles(payload, 1, random);

        expect(particles).toHaveLength(5);
        for (const particle of particles) {
            expect(payload.colorPalette).toContain(particle.color);
        }
    });
});
