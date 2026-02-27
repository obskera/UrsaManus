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
});
