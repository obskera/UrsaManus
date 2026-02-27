import { afterEach, describe, expect, it, vi } from "vitest";
import { signalBus } from "@/services/signalBus";
import {
    createParticleEmitterCanvasPass,
    emitParticles,
} from "@/components/effects";

function createMockCtx(fillRect = vi.fn()) {
    return {
        globalAlpha: 1,
        fillStyle: "",
        fillRect,
    } as unknown as CanvasRenderingContext2D;
}

describe("particle emitter canvas pass", () => {
    afterEach(() => {
        signalBus.clear();
    });

    it("spawns from signals and draws through the pass", () => {
        const controller = createParticleEmitterCanvasPass({
            width: 120,
            height: 80,
        });
        const fillRect = vi.fn();
        const ctx = createMockCtx(fillRect);

        emitParticles({
            amount: 4,
            location: { x: 20, y: 20 },
            direction: { angleDeg: 0, speed: 0 },
            emissionShape: "point",
            lifeMs: 200,
            color: "#fff",
            size: 2,
        });

        expect(controller.pass.isActive()).toBe(true);

        controller.pass.update(16);
        controller.pass.draw({
            ctx,
            width: 120,
            height: 80,
            deltaMs: 16,
        });

        expect(fillRect).toHaveBeenCalled();
        expect(controller.pass.isActive()).toBe(true);
        controller.dispose();
    });

    it("expires particles and resets state", () => {
        const controller = createParticleEmitterCanvasPass({
            width: 120,
            height: 80,
        });

        emitParticles({
            amount: 3,
            location: { x: 30, y: 30 },
            direction: { angleDeg: 0, speed: 0 },
            emissionShape: "point",
            lifeMs: 20,
            color: "#0ff",
            size: 2,
        });

        expect(controller.pass.isActive()).toBe(true);

        controller.pass.update(40);
        expect(controller.pass.isActive()).toBe(false);

        emitParticles({
            amount: 2,
            location: { x: 10, y: 10 },
            direction: { angleDeg: 0, speed: 0 },
            emissionShape: "point",
            lifeMs: 100,
            color: "#f0f",
            size: 2,
        });

        expect(controller.pass.isActive()).toBe(true);

        controller.pass.reset?.();
        expect(controller.pass.isActive()).toBe(false);

        controller.dispose();
    });

    it("draws a deterministic baseline frame for a simple particle", () => {
        const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.5);

        const controller = createParticleEmitterCanvasPass({
            width: 120,
            height: 80,
        });
        const fillRect = vi.fn();
        const ctx = createMockCtx(fillRect);

        emitParticles({
            amount: 1,
            location: { x: 24, y: 16 },
            direction: { angleDeg: 0, speed: 0, spreadDeg: 0, speedJitter: 0 },
            emissionShape: "point",
            lifeMs: 200,
            color: "#abc",
            size: 2,
            sizeJitter: 0,
            gravity: 0,
            drag: 0,
        });

        controller.pass.update(0);
        controller.pass.draw({
            ctx,
            width: 120,
            height: 80,
            deltaMs: 0,
        });

        expect(fillRect).toHaveBeenCalledTimes(1);
        expect(fillRect).toHaveBeenCalledWith(24, 16, 2, 2);

        controller.dispose();
        randomSpy.mockRestore();
    });
});
