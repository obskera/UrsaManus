export { default as ParticleEmitterOverlay } from "./ParticleEmitterOverlay";
export { emitParticles, EMIT_PARTICLES_SIGNAL } from "./particleEmitterSignal";
export { createParticle } from "./particleFactory";
export { spawnParticles, updateParticles } from "./particleEmitterMath";
export type {
    Particle,
    ParticleDirection,
    EmissionShape,
    EmitParticlesPayload,
    ParticleSeed,
} from "./types";
