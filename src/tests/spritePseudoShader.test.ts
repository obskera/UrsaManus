import { describe, expect, it, vi } from "vitest";
import {
    applySpritePseudoShaderEffects,
    computeFlashAlpha,
    isSpritePseudoShaderEffectActive,
} from "@/components/effects";

describe("spritePseudoShader", () => {
    it("computes deterministic flash alpha and clamps settings", () => {
        const alphaA = computeFlashAlpha({
            nowMs: 0,
            strength: 2,
            pulseHz: 120,
            phaseMs: 0,
        });
        const alphaB = computeFlashAlpha({
            nowMs: 0,
            strength: 1,
            pulseHz: 60,
            phaseMs: 0,
        });

        expect(alphaA).toBeGreaterThanOrEqual(0);
        expect(alphaA).toBeLessThanOrEqual(1);
        expect(alphaA).toBe(alphaB);
    });

    it("detects inactive effects when disabled or effectively zero", () => {
        expect(
            isSpritePseudoShaderEffectActive(
                {
                    kind: "tint",
                    color: "#fff",
                    alpha: 0,
                },
                0,
            ),
        ).toBe(false);

        expect(
            isSpritePseudoShaderEffectActive(
                {
                    kind: "outline",
                    color: "#000",
                    width: 0,
                },
                0,
            ),
        ).toBe(false);

        expect(
            isSpritePseudoShaderEffectActive(
                {
                    kind: "desaturate",
                    amount: 0,
                },
                0,
            ),
        ).toBe(false);

        expect(
            isSpritePseudoShaderEffectActive(
                {
                    kind: "flash",
                    enabled: false,
                },
                0,
            ),
        ).toBe(false);
    });

    it("applies tint/flash/outline/desaturate passes in sequence", () => {
        const ctx = {
            save: vi.fn(),
            restore: vi.fn(),
            fillRect: vi.fn(),
            strokeRect: vi.fn(),
            drawImage: vi.fn(),
            globalAlpha: 1,
            globalCompositeOperation: "source-over",
            fillStyle: "#000000",
            strokeStyle: "#000000",
            lineWidth: 1,
            filter: "none",
        } as unknown as CanvasRenderingContext2D;

        applySpritePseudoShaderEffects({
            ctx,
            nowMs: 0,
            effects: [
                { kind: "tint", color: "#00ff00", alpha: 0.5 },
                {
                    kind: "flash",
                    color: "#ffffff",
                    strength: 0.8,
                    pulseHz: 1,
                    phaseMs: 250,
                },
                { kind: "outline", color: "#000000", width: 2, alpha: 1 },
                { kind: "desaturate", amount: 0.4 },
            ],
            destination: {
                x: 10,
                y: 12,
                width: 16,
                height: 20,
            },
            drawImageArgs: {
                image: {} as CanvasImageSource,
                sx: 0,
                sy: 0,
                sw: 16,
                sh: 16,
                dx: 10,
                dy: 12,
                dw: 16,
                dh: 20,
            },
        });

        expect(ctx.fillRect).toHaveBeenCalledTimes(2);
        expect(ctx.strokeRect).toHaveBeenCalledTimes(1);
        expect(ctx.drawImage).toHaveBeenCalledTimes(1);
        expect(ctx.save).toHaveBeenCalledTimes(4);
        expect(ctx.restore).toHaveBeenCalledTimes(4);
    });
});
