import { afterEach, describe, expect, it, vi } from "vitest";
import { signalBus } from "@/services/signalBus";
import {
    createScreenTransitionCanvasPass,
    playScreenTransition,
} from "@/components/effects";

function createMockCtx(fillRect = vi.fn()) {
    return {
        globalAlpha: 1,
        fillStyle: "",
        fillRect,
    } as unknown as CanvasRenderingContext2D;
}

describe("screen transition canvas pass", () => {
    afterEach(() => {
        signalBus.clear();
    });

    it("fires onCovered then onComplete exactly once", () => {
        const onCovered = vi.fn();
        const onComplete = vi.fn();
        const order: string[] = [];
        onCovered.mockImplementation(() => order.push("covered"));
        onComplete.mockImplementation(() => order.push("complete"));

        const controller = createScreenTransitionCanvasPass({
            width: 40,
            height: 40,
        });

        playScreenTransition({
            color: "#000",
            from: "top-left",
            durationMs: 50,
            stepMs: 0,
            boxSize: 10,
            onCovered,
            onComplete,
        });

        expect(controller.pass.isActive()).toBe(true);

        controller.pass.update(50);
        controller.pass.update(50);
        controller.pass.update(999);

        expect(onCovered).toHaveBeenCalledTimes(1);
        expect(onComplete).toHaveBeenCalledTimes(1);
        expect(order).toEqual(["covered", "complete"]);
        expect(controller.pass.isActive()).toBe(false);

        controller.dispose();
    });

    it("draws a stable baseline frame for a venetian transition", () => {
        const fillRect = vi.fn();
        const ctx = createMockCtx(fillRect);
        const controller = createScreenTransitionCanvasPass({
            width: 32,
            height: 16,
        });

        playScreenTransition({
            color: "#111",
            from: "top-left",
            variant: "venetian-blinds",
            venetianOrientation: "horizontal",
            durationMs: 100,
            stepMs: 10,
            boxSize: 8,
        });

        controller.pass.update(50);
        controller.pass.draw({
            ctx,
            width: 32,
            height: 16,
            deltaMs: 50,
        });

        expect(fillRect).toHaveBeenCalledTimes(8);
        expect(fillRect).toHaveBeenNthCalledWith(1, 0, 0, 8, 8);
        expect(fillRect).toHaveBeenNthCalledWith(8, 24, 8, 8, 8);

        controller.dispose();
    });

    it("supports reset and bounds updates", () => {
        const fillRect = vi.fn();
        const ctx = createMockCtx(fillRect);
        const controller = createScreenTransitionCanvasPass({
            width: 32,
            height: 32,
        });

        playScreenTransition({
            color: "#000",
            from: "bottom-right",
            variant: "mosaic-dissolve",
            mosaicSeed: 7,
            durationMs: 120,
            boxSize: 8,
        });

        controller.setBounds(80, 80);
        controller.pass.update(16);
        controller.pass.draw({
            ctx,
            width: 80,
            height: 80,
            deltaMs: 16,
        });

        expect(fillRect).toHaveBeenCalled();
        expect(controller.pass.isActive()).toBe(true);

        controller.pass.reset?.();
        expect(controller.pass.isActive()).toBe(false);

        controller.dispose();
    });

    it("no-ops draw when no active transition exists", () => {
        const fillRect = vi.fn();
        const ctx = createMockCtx(fillRect);
        const controller = createScreenTransitionCanvasPass({
            width: 48,
            height: 24,
        });

        controller.pass.draw({
            ctx,
            width: 48,
            height: 24,
            deltaMs: 16,
        });

        expect(fillRect).not.toHaveBeenCalled();
        controller.dispose();
    });

    it("renders directional push and iris variants from different origins", () => {
        const fillRect = vi.fn();
        const ctx = createMockCtx(fillRect);
        const controller = createScreenTransitionCanvasPass({
            width: 60,
            height: 40,
        });

        playScreenTransition({
            color: "#222",
            from: "top-right",
            variant: "directional-push",
            pushFrom: "right",
            durationMs: 120,
            stepMs: 6,
            boxSize: 10,
        });

        controller.pass.update(60);
        controller.pass.draw({
            ctx,
            width: 60,
            height: 40,
            deltaMs: 60,
        });

        playScreenTransition({
            color: "#000",
            from: "bottom-left",
            variant: "iris",
            irisOrigin: "bottom-right",
            durationMs: 120,
            stepMs: 8,
            boxSize: 10,
        });

        controller.pass.update(60);
        controller.pass.draw({
            ctx,
            width: 60,
            height: 40,
            deltaMs: 60,
        });

        expect(fillRect).toHaveBeenCalled();
        controller.dispose();
    });

    it("renders venetian vertical wave from opposite corner", () => {
        const fillRect = vi.fn();
        const ctx = createMockCtx(fillRect);
        const controller = createScreenTransitionCanvasPass({
            width: 40,
            height: 40,
        });

        playScreenTransition({
            color: "#333",
            from: "bottom-right",
            variant: "venetian-blinds",
            venetianOrientation: "vertical",
            durationMs: 140,
            stepMs: 12,
            boxSize: 10,
        });

        controller.pass.update(70);
        controller.pass.draw({
            ctx,
            width: 40,
            height: 40,
            deltaMs: 70,
        });

        expect(fillRect).toHaveBeenCalled();
        controller.dispose();
    });

    it("covers diagonal corner and reveal-phase draw branches", () => {
        const fillRect = vi.fn();
        const ctx = createMockCtx(fillRect);
        const controller = createScreenTransitionCanvasPass({
            width: 30,
            height: 30,
        });

        playScreenTransition({
            color: "#444",
            from: "top-right",
            variant: "diagonal",
            durationMs: 100,
            stepMs: 10,
            boxSize: 10,
        });
        controller.pass.update(50);
        controller.pass.draw({
            ctx,
            width: 30,
            height: 30,
            deltaMs: 50,
        });

        controller.pass.update(50);
        controller.pass.update(40);
        controller.pass.draw({
            ctx,
            width: 30,
            height: 30,
            deltaMs: 40,
        });

        playScreenTransition({
            color: "#444",
            from: "bottom-left",
            variant: "diagonal",
            durationMs: 80,
            stepMs: 8,
            boxSize: 10,
        });
        controller.pass.update(30);
        controller.pass.draw({
            ctx,
            width: 30,
            height: 30,
            deltaMs: 30,
        });

        expect(fillRect).toHaveBeenCalled();
        controller.dispose();
    });

    it("covers directional push top/bottom branches", () => {
        const fillRect = vi.fn();
        const ctx = createMockCtx(fillRect);
        const controller = createScreenTransitionCanvasPass({
            width: 48,
            height: 24,
        });

        playScreenTransition({
            color: "#111",
            from: "top-left",
            variant: "directional-push",
            pushFrom: "top",
            durationMs: 120,
            boxSize: 8,
        });
        controller.pass.update(45);
        controller.pass.draw({
            ctx,
            width: 48,
            height: 24,
            deltaMs: 45,
        });

        playScreenTransition({
            color: "#111",
            from: "bottom-right",
            variant: "directional-push",
            pushFrom: "bottom",
            durationMs: 120,
            boxSize: 8,
        });
        controller.pass.update(45);
        controller.pass.draw({
            ctx,
            width: 48,
            height: 24,
            deltaMs: 45,
        });

        expect(fillRect).toHaveBeenCalled();
        controller.dispose();
    });

    it("covers remaining corner/orientation and reveal-threshold branches", () => {
        const fillRect = vi.fn();
        const ctx = createMockCtx(fillRect);
        const controller = createScreenTransitionCanvasPass({
            width: 40,
            height: 40,
        });

        playScreenTransition({
            color: "#111",
            from: "top-right",
            variant: "venetian-blinds",
            venetianOrientation: "horizontal",
            durationMs: 120,
            stepMs: 10,
            boxSize: 10,
        });
        controller.pass.update(50);
        controller.pass.draw({ ctx, width: 40, height: 40, deltaMs: 50 });

        playScreenTransition({
            color: "#111",
            from: "top-left",
            variant: "venetian-blinds",
            venetianOrientation: "vertical",
            durationMs: 120,
            stepMs: 10,
            boxSize: 10,
        });
        controller.pass.update(50);
        controller.pass.draw({ ctx, width: 40, height: 40, deltaMs: 50 });

        playScreenTransition({
            color: "#111",
            from: "top-left",
            variant: "diagonal",
            durationMs: 120,
            stepMs: 8,
            boxSize: 10,
        });
        controller.pass.update(50);
        controller.pass.draw({ ctx, width: 40, height: 40, deltaMs: 50 });

        playScreenTransition({
            color: "#111",
            from: "bottom-right",
            variant: "diagonal",
            durationMs: 120,
            stepMs: 8,
            boxSize: 10,
        });
        controller.pass.update(50);
        controller.pass.draw({ ctx, width: 40, height: 40, deltaMs: 50 });

        playScreenTransition({
            color: "#111",
            from: "top-left",
            variant: "directional-push",
            pushFrom: "left",
            durationMs: 100,
            boxSize: 10,
        });
        controller.pass.update(100);
        controller.pass.update(40);
        controller.pass.draw({ ctx, width: 40, height: 40, deltaMs: 40 });

        playScreenTransition({
            color: "#111",
            from: "bottom-left",
            variant: "iris",
            irisOrigin: "top-right",
            durationMs: 100,
            boxSize: 10,
        });
        controller.pass.update(100);
        controller.pass.update(35);
        controller.pass.draw({ ctx, width: 40, height: 40, deltaMs: 35 });

        playScreenTransition({
            color: "#111",
            from: "bottom-left",
            variant: "iris",
            irisOrigin: "bottom-left",
            durationMs: 100,
            boxSize: 10,
        });
        controller.pass.update(45);
        controller.pass.draw({ ctx, width: 40, height: 40, deltaMs: 45 });

        playScreenTransition({
            color: "#111",
            from: "top-left",
            variant: "mosaic-dissolve",
            mosaicSeed: 3,
            durationMs: 100,
            boxSize: 10,
        });
        controller.pass.update(100);
        controller.pass.update(30);
        controller.pass.draw({ ctx, width: 40, height: 40, deltaMs: 30 });

        expect(fillRect).toHaveBeenCalled();
        controller.dispose();
    });

    it("covers horizontal venetian bottom-corner wave path", () => {
        const fillRect = vi.fn();
        const ctx = createMockCtx(fillRect);
        const controller = createScreenTransitionCanvasPass({
            width: 30,
            height: 30,
        });

        playScreenTransition({
            color: "#111",
            from: "bottom-left",
            variant: "venetian-blinds",
            venetianOrientation: "horizontal",
            durationMs: 100,
            stepMs: 10,
            boxSize: 10,
        });

        controller.pass.update(45);
        controller.pass.draw({
            ctx,
            width: 30,
            height: 30,
            deltaMs: 45,
        });

        expect(fillRect).toHaveBeenCalled();
        controller.dispose();
    });
});
