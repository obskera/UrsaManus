import { signalBus } from "@/services/signalBus";
import { EMIT_PARTICLES_SIGNAL } from "./particleEmitterSignal";
import { spawnParticles, updateParticles } from "./particleEmitterMath";
import type { EmitParticlesPayload, Particle } from "./types";
import type { CanvasEffectPass } from "../canvas";

type CreateParticleEmitterCanvasPassOptions = {
    width: number;
    height: number;
    passId?: string;
};

export type ParticleEmitterCanvasPassController = {
    pass: CanvasEffectPass;
    setBounds: (width: number, height: number) => void;
    dispose: () => void;
};

export function createParticleEmitterCanvasPass({
    width,
    height,
    passId = "particles-main",
}: CreateParticleEmitterCanvasPassOptions): ParticleEmitterCanvasPassController {
    let particles: Particle[] = [];
    let nextId = 1;
    let bounds = { width, height };

    const unsubscribe = signalBus.on<EmitParticlesPayload>(
        EMIT_PARTICLES_SIGNAL,
        (payload) => {
            const spawned = spawnParticles(payload, nextId);
            nextId = spawned.nextId;
            particles = [...particles, ...spawned.particles];
        },
    );

    return {
        pass: {
            id: passId,
            layer: "particles",
            isActive: () => particles.length > 0,
            update: (deltaMs) => {
                if (particles.length === 0) {
                    return;
                }

                particles = updateParticles(particles, deltaMs, bounds);
            },
            draw: ({ ctx }) => {
                for (const particle of particles) {
                    ctx.globalAlpha = particle.alpha;
                    ctx.fillStyle = particle.color;
                    ctx.fillRect(
                        Math.round(particle.x),
                        Math.round(particle.y),
                        Math.max(1, Math.round(particle.size)),
                        Math.max(1, Math.round(particle.size)),
                    );
                }

                ctx.globalAlpha = 1;
            },
            reset: () => {
                particles = [];
                nextId = 1;
            },
        },
        setBounds: (nextWidth, nextHeight) => {
            bounds = { width: nextWidth, height: nextHeight };
        },
        dispose: () => {
            unsubscribe();
            particles = [];
        },
    };
}
