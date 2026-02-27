export type CanvasEffectLayer = "particles" | "transition";

export type CanvasEffectFrame = {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    deltaMs: number;
};

export interface CanvasEffectPass {
    id: string;
    layer: CanvasEffectLayer;
    isActive: () => boolean;
    update: (deltaMs: number) => void;
    draw: (frame: CanvasEffectFrame) => void;
    reset?: () => void;
}

export const CANVAS_EFFECT_LAYER_ORDER: CanvasEffectLayer[] = [
    "particles",
    "transition",
];
