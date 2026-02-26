import type { Particle, ParticleSeed } from "./types";

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

function toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
}

function withJitter(base: number, jitter: number, randomValue: number): number {
    const amount = (randomValue * 2 - 1) * jitter;
    return base + amount;
}

export function createParticle(
    id: number,
    seed: ParticleSeed,
    random: () => number = Math.random,
): Particle {
    const spreadDeg = seed.direction.spreadDeg ?? 0;
    const speedJitter = seed.direction.speedJitter ?? 0;

    const angleDeg = withJitter(
        seed.direction.angleDeg,
        spreadDeg / 2,
        random(),
    );
    const speed = Math.max(
        0,
        withJitter(seed.direction.speed, speedJitter, random()),
    );
    const radians = toRadians(angleDeg);

    return {
        id,
        x: seed.x,
        y: seed.y,
        vx: Math.cos(radians) * speed,
        vy: Math.sin(radians) * speed,
        color: seed.color,
        size: seed.size,
        lifeMs: Math.max(1, seed.lifeMs),
        ageMs: 0,
        gravity: seed.gravity,
        drag: clamp(seed.drag, 0, 1),
        alpha: 1,
    };
}
