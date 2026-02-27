import { describe, expect, it, vi } from "vitest";
import { CanvasEffectsStage } from "@/components/effects/canvas";
import type {
    CanvasEffectFrame,
    CanvasEffectPass,
} from "@/components/effects/canvas";

function createFrame(): CanvasEffectFrame {
    return {
        ctx: {} as CanvasRenderingContext2D,
        width: 320,
        height: 180,
        deltaMs: 16,
    };
}

describe("CanvasEffectsStage", () => {
    it("updates and draws only active passes in deterministic layer order", () => {
        const stage = new CanvasEffectsStage();
        const events: string[] = [];

        const particlePass: CanvasEffectPass = {
            id: "particles-main",
            layer: "particles",
            isActive: () => true,
            update: () => {
                events.push("particles:update");
            },
            draw: () => {
                events.push("particles:draw");
            },
        };

        const transitionPass: CanvasEffectPass = {
            id: "transition-main",
            layer: "transition",
            isActive: () => true,
            update: () => {
                events.push("transition:update");
            },
            draw: () => {
                events.push("transition:draw");
            },
        };

        stage.upsertPass(transitionPass);
        stage.upsertPass(particlePass);

        stage.updateAndDraw(createFrame());

        expect(events).toEqual([
            "particles:update",
            "particles:draw",
            "transition:update",
            "transition:draw",
        ]);
    });

    it("skips inactive passes and reports active status", () => {
        const stage = new CanvasEffectsStage();
        const update = vi.fn();
        const draw = vi.fn();

        stage.upsertPass({
            id: "inactive-pass",
            layer: "particles",
            isActive: () => false,
            update,
            draw,
        });

        expect(stage.hasActivePasses()).toBe(false);

        stage.updateAndDraw(createFrame());

        expect(update).not.toHaveBeenCalled();
        expect(draw).not.toHaveBeenCalled();
    });

    it("resets and removes passes", () => {
        const stage = new CanvasEffectsStage();
        const reset = vi.fn();

        stage.upsertPass({
            id: "resettable",
            layer: "particles",
            isActive: () => true,
            update: vi.fn(),
            draw: vi.fn(),
            reset,
        });

        stage.resetAll();
        expect(reset).toHaveBeenCalledTimes(1);

        stage.removePass("resettable");
        expect(stage.hasActivePasses()).toBe(false);
    });
});
