import { createParticle } from "./particleFactory";
import type { EmitParticlesPayload, Particle, ParticleSeed } from "./types";

type SpawnResult = {
    particles: Particle[];
    nextId: number;
};

function randomInRange(min: number, max: number, random: () => number): number {
    return min + (max - min) * random();
}

function getSpawnLocation(
    payload: EmitParticlesPayload,
    random: () => number,
): { x: number; y: number } {
    const { x, y } = payload.location;

    if (payload.emissionShape === "point") {
        return { x, y };
    }

    if (payload.emissionShape === "circle") {
        const radius = Math.max(0, payload.emissionRadius ?? 0);
        const angle = randomInRange(0, Math.PI * 2, random);
        const distance = Math.sqrt(random()) * radius;
        return {
            x: x + Math.cos(angle) * distance,
            y: y + Math.sin(angle) * distance,
        };
    }

    const halfLength = Math.max(0, (payload.emissionLength ?? 0) / 2);
    return {
        x: x + randomInRange(-halfLength, halfLength, random),
        y,
    };
}

function buildSeed(
    payload: EmitParticlesPayload,
    spawnLocation: { x: number; y: number },
    random: () => number,
): ParticleSeed {
    const sizeBase = payload.size ?? 2;
    const sizeJitter = payload.sizeJitter ?? 0;

    return {
        x: spawnLocation.x,
        y: spawnLocation.y,
        color: payload.color,
        size: Math.max(1, sizeBase + (random() * 2 - 1) * sizeJitter),
        lifeMs: payload.lifeMs,
        direction: payload.direction,
        gravity: payload.gravity ?? 0,
        drag: payload.drag ?? 0,
    };
}

export function spawnParticles(
    payload: EmitParticlesPayload,
    startId: number,
    random: () => number = Math.random,
): SpawnResult {
    const particles: Particle[] = [];

    const amount = Math.max(0, Math.floor(payload.amount));

    for (let i = 0; i < amount; i++) {
        const location = getSpawnLocation(payload, random);
        const seed = buildSeed(payload, location, random);
        const particle = createParticle(startId + i, seed, random);
        particles.push(particle);
    }

    return {
        particles,
        nextId: startId + amount,
    };
}

export function updateParticles(
    particles: Particle[],
    deltaMs: number,
    bounds: { width: number; height: number },
): Particle[] {
    const deltaSeconds = deltaMs / 1000;
    const dragFactor = Math.max(0, 1 - deltaSeconds);
    const margin = 64;

    const next: Particle[] = [];

    for (const particle of particles) {
        const ageMs = particle.ageMs + deltaMs;
        if (ageMs >= particle.lifeMs) continue;

        const vx =
            particle.vx * Math.max(0, 1 - particle.drag * (1 - dragFactor));
        const vy = particle.vy + particle.gravity * deltaSeconds;
        const x = particle.x + vx * deltaSeconds;
        const y = particle.y + vy * deltaSeconds;

        if (
            x < -margin ||
            y < -margin ||
            x > bounds.width + margin ||
            y > bounds.height + margin
        ) {
            continue;
        }

        next.push({
            ...particle,
            x,
            y,
            vx,
            vy,
            ageMs,
            alpha: 1 - ageMs / particle.lifeMs,
        });
    }

    return next;
}
