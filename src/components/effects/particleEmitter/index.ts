export {
    emitBurningFlameParticles,
    emitDebrisParticles,
    emitMagicShimmerParticles,
    emitParticles,
    emitSmokeParticles,
    emitSparkParticles,
    startTorchFlameEmitter,
    stopAllTorchFlameEmitters,
    stopTorchFlameEmitter,
    EMIT_PARTICLES_SIGNAL,
    type BurningFlameOptions,
    type TorchFlameEmitterOptions,
} from "./particleEmitterSignal";
export { createParticle } from "./particleFactory";
export { spawnParticles, updateParticles } from "./particleEmitterMath";
export {
    createParticleEmitterCanvasPass,
    type ParticleEmitterCanvasPassController,
} from "./createParticleEmitterCanvasPass";
export type {
    Particle,
    ParticleDirection,
    EmissionShape,
    EmitParticlesPayload,
    ParticlePresetOptions,
    ParticleSeed,
} from "./types";
