import { signalBus } from "@/services/signalBus";
import type { CanvasEffectPass } from "../canvas";
import {
    APPLY_SCREEN_PSEUDO_SHADER_PRESET_SIGNAL,
    CLEAR_SCREEN_PSEUDO_SHADER_EFFECTS_SIGNAL,
    PUSH_SCREEN_PSEUDO_SHADER_EFFECT_SIGNAL,
    REMOVE_SCREEN_PSEUDO_SHADER_EFFECT_SIGNAL,
    SET_SCREEN_PSEUDO_SHADER_EFFECTS_SIGNAL,
    type ScreenPseudoShaderEffect,
    type ScreenPseudoShaderPresetName,
} from "./screenPseudoShaderSignal";
import { createScreenPseudoShaderPreset } from "./screenPseudoShaderPresets";

type CreateScreenPseudoShaderCanvasPassOptions = {
    width: number;
    height: number;
    passId?: string;
    initialEffects?: ScreenPseudoShaderEffect[];
};

export type ScreenPseudoShaderCanvasPassController = {
    pass: CanvasEffectPass;
    setBounds: (width: number, height: number) => void;
    setEffects: (effects: ScreenPseudoShaderEffect[]) => void;
    pushEffect: (effect: ScreenPseudoShaderEffect) => void;
    removeEffect: (effectId: string) => void;
    clearEffects: () => void;
    applyPreset: (preset: ScreenPseudoShaderPresetName) => void;
    getEffects: () => ScreenPseudoShaderEffect[];
    dispose: () => void;
};

type BufferPair = {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
};

function clamp(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) {
        return min;
    }

    return Math.min(max, Math.max(min, value));
}

function hasEnabledEffects(effects: ScreenPseudoShaderEffect[]): boolean {
    return effects.some((effect) => effect.enabled !== false);
}

function canCreateBufferCanvas(): boolean {
    return typeof document !== "undefined";
}

function ensureBuffer(
    existing: BufferPair | null,
    width: number,
    height: number,
): BufferPair | null {
    if (!canCreateBufferCanvas()) {
        return null;
    }

    if (
        existing &&
        existing.canvas.width === width &&
        existing.canvas.height === height
    ) {
        return existing;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        return null;
    }

    return { canvas, ctx };
}

function snapshotCanvas(
    ctx: CanvasRenderingContext2D,
    buffer: BufferPair,
): boolean {
    try {
        buffer.ctx.clearRect(0, 0, buffer.canvas.width, buffer.canvas.height);
        buffer.ctx.drawImage(
            ctx.canvas,
            0,
            0,
            buffer.canvas.width,
            buffer.canvas.height,
        );
        return true;
    } catch {
        return false;
    }
}

function drawScanlines(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    lineAlpha: number,
    lineSpacing: number,
): void {
    const alpha = clamp(lineAlpha, 0, 1);
    const spacing = Math.max(1, Math.round(lineSpacing));

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#000000";
    for (let y = 0; y < height; y += spacing) {
        ctx.fillRect(0, y, width, 1);
    }
    ctx.restore();
}

export function createScreenPseudoShaderCanvasPass({
    width,
    height,
    passId = "screen-pseudo-shader-main",
    initialEffects = [],
}: CreateScreenPseudoShaderCanvasPassOptions): ScreenPseudoShaderCanvasPassController {
    let bounds = { width, height };
    let elapsedMs = 0;
    let effects = initialEffects.map((effect) => ({ ...effect }));
    let buffer: BufferPair | null = null;

    const setEffects = (nextEffects: ScreenPseudoShaderEffect[]) => {
        effects = nextEffects.map((effect) => ({ ...effect }));
    };

    const pushEffect = (effect: ScreenPseudoShaderEffect) => {
        effects = [...effects, { ...effect }];
    };

    const removeEffect = (effectId: string) => {
        effects = effects.filter((effect) => effect.id !== effectId);
    };

    const clearEffects = () => {
        effects = [];
    };

    const applyPreset = (preset: ScreenPseudoShaderPresetName) => {
        effects = createScreenPseudoShaderPreset(preset);
    };

    const unsubscribers = [
        signalBus.on<ScreenPseudoShaderEffect[]>(
            SET_SCREEN_PSEUDO_SHADER_EFFECTS_SIGNAL,
            (nextEffects) => {
                setEffects(nextEffects);
            },
        ),
        signalBus.on<ScreenPseudoShaderEffect>(
            PUSH_SCREEN_PSEUDO_SHADER_EFFECT_SIGNAL,
            (effect) => {
                pushEffect(effect);
            },
        ),
        signalBus.on<string>(
            REMOVE_SCREEN_PSEUDO_SHADER_EFFECT_SIGNAL,
            (effectId) => {
                removeEffect(effectId);
            },
        ),
        signalBus.on(CLEAR_SCREEN_PSEUDO_SHADER_EFFECTS_SIGNAL, () => {
            clearEffects();
        }),
        signalBus.on<ScreenPseudoShaderPresetName>(
            APPLY_SCREEN_PSEUDO_SHADER_PRESET_SIGNAL,
            (preset) => {
                applyPreset(preset);
            },
        ),
    ];

    return {
        pass: {
            id: passId,
            layer: "transition",
            isActive: () => hasEnabledEffects(effects),
            update: (deltaMs) => {
                elapsedMs += Math.max(0, deltaMs);
            },
            draw: ({ ctx, width: frameWidth, height: frameHeight }) => {
                for (const effect of effects) {
                    if (effect.enabled === false) {
                        continue;
                    }

                    if (effect.kind === "tint") {
                        ctx.save();
                        ctx.globalAlpha = clamp(effect.alpha ?? 0.2, 0, 1);
                        ctx.fillStyle = effect.color;
                        ctx.fillRect(0, 0, frameWidth, frameHeight);
                        ctx.restore();
                        continue;
                    }

                    if (effect.kind === "monochrome") {
                        ctx.save();
                        ctx.globalAlpha = clamp(effect.amount ?? 1, 0, 1);
                        ctx.filter = "grayscale(1)";
                        ctx.drawImage(
                            ctx.canvas,
                            0,
                            0,
                            frameWidth,
                            frameHeight,
                        );
                        ctx.restore();
                        continue;
                    }

                    if (effect.kind === "scanline") {
                        drawScanlines(
                            ctx,
                            frameWidth,
                            frameHeight,
                            effect.lineAlpha ?? 0.12,
                            effect.lineSpacing ?? 2,
                        );
                        continue;
                    }

                    if (effect.kind === "wavy") {
                        buffer = ensureBuffer(buffer, frameWidth, frameHeight);
                        if (!buffer || !snapshotCanvas(ctx, buffer)) {
                            continue;
                        }

                        const amplitudePx = clamp(
                            effect.amplitudePx ?? 2,
                            0,
                            24,
                        );
                        const frequency = clamp(effect.frequency ?? 2, 0.1, 20);
                        const speedHz = clamp(effect.speedHz ?? 0.7, 0.05, 20);
                        const verticalStep = Math.max(
                            1,
                            Math.round(effect.verticalStep ?? 2),
                        );
                        const timeRad =
                            (elapsedMs / 1000) * Math.PI * 2 * speedHz;

                        for (let y = 0; y < frameHeight; y += verticalStep) {
                            const normalizedY = y / Math.max(frameHeight, 1);
                            const offset =
                                Math.sin(
                                    normalizedY * Math.PI * 2 * frequency +
                                        timeRad,
                                ) * amplitudePx;

                            ctx.drawImage(
                                buffer.canvas,
                                0,
                                y,
                                frameWidth,
                                verticalStep,
                                offset,
                                y,
                                frameWidth,
                                verticalStep,
                            );
                        }
                        continue;
                    }

                    if (effect.kind === "vhs") {
                        buffer = ensureBuffer(buffer, frameWidth, frameHeight);
                        if (!buffer || !snapshotCanvas(ctx, buffer)) {
                            continue;
                        }

                        const speedHz = clamp(effect.speedHz ?? 1.1, 0.05, 20);
                        const jitterPx = clamp(effect.jitterPx ?? 2, 0, 16);
                        const noiseAlpha = clamp(
                            effect.noiseAlpha ?? 0.12,
                            0,
                            1,
                        );
                        const scanlineAlpha = clamp(
                            effect.scanlineAlpha ?? 0.1,
                            0,
                            1,
                        );
                        const jitter =
                            Math.sin(
                                (elapsedMs / 1000) * Math.PI * 2 * speedHz,
                            ) * jitterPx;

                        ctx.drawImage(
                            buffer.canvas,
                            0,
                            0,
                            frameWidth,
                            frameHeight,
                            jitter,
                            0,
                            frameWidth,
                            frameHeight,
                        );

                        drawScanlines(
                            ctx,
                            frameWidth,
                            frameHeight,
                            scanlineAlpha,
                            2,
                        );

                        ctx.save();
                        ctx.globalAlpha = noiseAlpha;
                        ctx.fillStyle = "#ffffff";
                        for (let y = 0; y < frameHeight; y += 6) {
                            const stripe =
                                (Math.sin((elapsedMs + y * 37) * 0.013) + 1) /
                                2;
                            if (stripe > 0.72) {
                                ctx.fillRect(0, y, frameWidth, 1);
                            }
                        }
                        ctx.restore();
                    }
                }
            },
            reset: () => {
                elapsedMs = 0;
            },
        },
        setBounds: (nextWidth, nextHeight) => {
            bounds = { width: nextWidth, height: nextHeight };
            buffer = ensureBuffer(buffer, bounds.width, bounds.height);
        },
        setEffects,
        pushEffect,
        removeEffect,
        clearEffects,
        applyPreset,
        getEffects: () => effects.map((effect) => ({ ...effect })),
        dispose: () => {
            for (const unsubscribe of unsubscribers) {
                unsubscribe();
            }
            effects = [];
            buffer = null;
        },
    };
}
