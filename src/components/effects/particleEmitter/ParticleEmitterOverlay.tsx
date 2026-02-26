import { useEffect, useRef } from "react";
import { useParticleEmitter } from "./useParticleEmitter";
import "./particleEmitter.css";

type ParticleEmitterOverlayProps = {
    width: number;
    height: number;
};

const ParticleEmitterOverlay = ({
    width,
    height,
}: ParticleEmitterOverlayProps) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const { particlesRef } = useParticleEmitter(width, height);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        context.imageSmoothingEnabled = false;

        let raf = 0;

        const draw = () => {
            context.clearRect(0, 0, width, height);

            for (const particle of particlesRef.current) {
                context.globalAlpha = particle.alpha;
                context.fillStyle = particle.color;
                context.fillRect(
                    Math.round(particle.x),
                    Math.round(particle.y),
                    Math.max(1, Math.round(particle.size)),
                    Math.max(1, Math.round(particle.size)),
                );
            }

            context.globalAlpha = 1;
            raf = requestAnimationFrame(draw);
        };

        raf = requestAnimationFrame(draw);

        return () => {
            if (raf) cancelAnimationFrame(raf);
        };
    }, [height, particlesRef, width]);

    return (
        <canvas
            ref={canvasRef}
            className="particle-emitter-overlay"
            width={width}
            height={height}
            aria-hidden
        />
    );
};

export default ParticleEmitterOverlay;
