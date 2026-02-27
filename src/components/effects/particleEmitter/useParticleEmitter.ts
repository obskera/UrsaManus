import { useEffect, useRef } from "react";
import { signalBus } from "@/services/signalBus";
import { EMIT_PARTICLES_SIGNAL } from "./particleEmitterSignal";
import { spawnParticles, updateParticles } from "./particleEmitterMath";
import type { EmitParticlesPayload, Particle } from "./types";

export function useParticleEmitter(width: number, height: number) {
    const particlesRef = useRef<Particle[]>([]);
    const idRef = useRef(1);

    useEffect(() => {
        const unsubscribe = signalBus.on<EmitParticlesPayload>(
            EMIT_PARTICLES_SIGNAL,
            (payload) => {
                const { particles, nextId } = spawnParticles(
                    payload,
                    idRef.current,
                );
                idRef.current = nextId;
                particlesRef.current = [...particlesRef.current, ...particles];
            },
        );

        return unsubscribe;
    }, []);

    useEffect(() => {
        let raf = 0;
        let lastTick = performance.now();

        const tick = (now: number) => {
            const deltaMs = Math.min(50, now - lastTick);
            lastTick = now;

            if (particlesRef.current.length > 0) {
                particlesRef.current = updateParticles(
                    particlesRef.current,
                    deltaMs,
                    {
                        width,
                        height,
                    },
                );
            }

            raf = requestAnimationFrame(tick);
        };

        raf = requestAnimationFrame(tick);

        return () => {
            if (raf) cancelAnimationFrame(raf);
        };
    }, [height, width]);

    return { particlesRef };
}
