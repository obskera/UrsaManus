import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    emitBurningFlameParticles: vi.fn(),
    emitDebrisParticles: vi.fn(),
    emitMagicShimmerParticles: vi.fn(),
    emitSmokeParticles: vi.fn(),
    emitSparkParticles: vi.fn(),
    startTorchFlameEmitter: vi.fn(),
    stopTorchFlameEmitter: vi.fn(),
    playScreenTransition: vi.fn(),
}));

vi.mock("@/components/effects/particleEmitter", () => ({
    emitBurningFlameParticles: mocks.emitBurningFlameParticles,
    emitDebrisParticles: mocks.emitDebrisParticles,
    emitMagicShimmerParticles: mocks.emitMagicShimmerParticles,
    emitSmokeParticles: mocks.emitSmokeParticles,
    emitSparkParticles: mocks.emitSparkParticles,
    startTorchFlameEmitter: mocks.startTorchFlameEmitter,
    stopTorchFlameEmitter: mocks.stopTorchFlameEmitter,
}));

vi.mock("@/components/effects/screenTransition", () => ({
    playScreenTransition: mocks.playScreenTransition,
}));

import { setupDevEffectHotkeys } from "@/components/effects/dev/devEffectHotkeys";

describe("setupDevEffectHotkeys", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("does nothing when disabled", () => {
        const cleanup = setupDevEffectHotkeys({
            enabled: false,
            width: 400,
            height: 300,
            getContainer: () => null,
        });

        window.dispatchEvent(new KeyboardEvent("keydown", { key: "t" }));
        expect(mocks.playScreenTransition).not.toHaveBeenCalled();

        cleanup();
    });

    it("cycles transition previews on T", () => {
        const cleanup = setupDevEffectHotkeys({
            enabled: true,
            width: 400,
            height: 300,
            getContainer: () => null,
        });

        window.dispatchEvent(new KeyboardEvent("keydown", { key: "t" }));

        expect(mocks.playScreenTransition).toHaveBeenCalledWith(
            expect.objectContaining({
                color: "black",
                from: "top-left",
                variant: "diagonal",
            }),
        );

        cleanup();
    });

    it("cycles particle presets on P", () => {
        const cleanup = setupDevEffectHotkeys({
            enabled: true,
            width: 400,
            height: 300,
            getContainer: () => null,
        });

        window.dispatchEvent(new KeyboardEvent("keydown", { key: "p" }));
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "p" }));
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "p" }));
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "p" }));
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "p" }));

        expect(mocks.emitSmokeParticles).toHaveBeenCalledTimes(1);
        expect(mocks.emitSparkParticles).toHaveBeenCalledTimes(1);
        expect(mocks.emitMagicShimmerParticles).toHaveBeenCalledTimes(1);
        expect(mocks.emitDebrisParticles).toHaveBeenCalledTimes(1);
        expect(mocks.emitBurningFlameParticles).toHaveBeenCalledTimes(1);

        cleanup();
    });

    it("uses mouse position for F torch when in bounds and center fallback when out of bounds", () => {
        const container = document.createElement("div");
        container.getBoundingClientRect = vi.fn(() => ({
            x: 100,
            y: 100,
            left: 100,
            top: 100,
            right: 500,
            bottom: 400,
            width: 400,
            height: 300,
            toJSON: () => ({}),
        })) as unknown as typeof container.getBoundingClientRect;

        const cleanup = setupDevEffectHotkeys({
            enabled: true,
            width: 400,
            height: 300,
            getContainer: () => container,
        });

        window.dispatchEvent(
            new MouseEvent("mousemove", { clientX: 150, clientY: 190 }),
        );
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "f" }));

        expect(mocks.startTorchFlameEmitter).toHaveBeenCalledWith(
            "dev-torch",
            { x: 50, y: 90 },
            expect.any(Object),
        );

        window.dispatchEvent(
            new MouseEvent("mousemove", { clientX: 50, clientY: 50 }),
        );
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "f" }));

        expect(mocks.startTorchFlameEmitter).toHaveBeenCalledWith(
            "dev-torch",
            { x: 200, y: 150 },
            expect.any(Object),
        );

        cleanup();
    });

    it("stops torch on Shift+F and on cleanup", () => {
        const cleanup = setupDevEffectHotkeys({
            enabled: true,
            width: 400,
            height: 300,
            getContainer: () => null,
        });

        window.dispatchEvent(
            new KeyboardEvent("keydown", { key: "f", shiftKey: true }),
        );

        expect(mocks.stopTorchFlameEmitter).toHaveBeenCalledWith("dev-torch");

        cleanup();

        expect(mocks.stopTorchFlameEmitter).toHaveBeenCalledWith("dev-torch");
    });
});
