import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signalBus } from "@/services/SignalBus";
import ParticleEmitterOverlay from "@/components/effects/particleEmitter/ParticleEmitterOverlay";
import { emitParticles } from "@/components/effects/particleEmitter";

type TestGlobals = {
    requestAnimationFrame: typeof requestAnimationFrame;
    cancelAnimationFrame: typeof cancelAnimationFrame;
};

type MockCtx = {
    imageSmoothingEnabled: boolean;
    clearRect: ReturnType<typeof vi.fn>;
    fillRect: ReturnType<typeof vi.fn>;
    globalAlpha: number;
    fillStyle: string;
};

const testGlobals = globalThis as unknown as TestGlobals;

describe("ParticleEmitterOverlay", () => {
    const origGetContext = HTMLCanvasElement.prototype.getContext;
    const origRaf = testGlobals.requestAnimationFrame;
    const origCancel = testGlobals.cancelAnimationFrame;

    beforeEach(() => {
        signalBus.clear();

        const ctx: MockCtx = {
            imageSmoothingEnabled: false,
            clearRect: vi.fn(),
            fillRect: vi.fn(),
            globalAlpha: 1,
            fillStyle: "",
        };

        HTMLCanvasElement.prototype.getContext = function () {
            return ctx as unknown as CanvasRenderingContext2D;
        } as unknown as typeof HTMLCanvasElement.prototype.getContext;

        const rafMap = new Map<number, number>();
        let nextId = 1;
        let now = 0;

        testGlobals.requestAnimationFrame = (cb: FrameRequestCallback) => {
            const id = nextId++;
            const timeoutId = setTimeout(() => {
                now += 16;
                cb(now);
            }, 0) as unknown as number;
            rafMap.set(id, timeoutId);
            return id;
        };

        testGlobals.cancelAnimationFrame = (id: number) => {
            const timeoutId = rafMap.get(id);
            if (timeoutId) clearTimeout(timeoutId);
            rafMap.delete(id);
        };
    });

    afterEach(() => {
        signalBus.clear();
        HTMLCanvasElement.prototype.getContext = origGetContext;
        testGlobals.requestAnimationFrame = origRaf;
        testGlobals.cancelAnimationFrame = origCancel;
        vi.restoreAllMocks();
    });

    it("renders a canvas overlay", () => {
        const { container } = render(
            <ParticleEmitterOverlay width={80} height={60} />,
        );
        const canvas = container.querySelector(
            "canvas.particle-emitter-overlay",
        );
        expect(canvas).toBeTruthy();
    });

    it("draws particles after emit signal", async () => {
        render(<ParticleEmitterOverlay width={80} height={60} />);

        emitParticles({
            amount: 8,
            location: { x: 20, y: 20 },
            direction: { angleDeg: 0, speed: 0 },
            emissionShape: "point",
            lifeMs: 500,
            color: "#fff",
            size: 2,
        });

        await waitFor(() => {
            const context = HTMLCanvasElement.prototype.getContext.call(
                document.createElement("canvas"),
                "2d",
            ) as unknown as MockCtx;
            expect(context.clearRect).toHaveBeenCalled();
            expect(context.fillRect).toHaveBeenCalled();
        });
    });

    it("exits draw setup when 2d context is unavailable", () => {
        HTMLCanvasElement.prototype.getContext = function () {
            return null;
        } as unknown as typeof HTMLCanvasElement.prototype.getContext;

        const { container } = render(
            <ParticleEmitterOverlay width={80} height={60} />,
        );

        expect(
            container.querySelector("canvas.particle-emitter-overlay"),
        ).toBeTruthy();
    });
});
