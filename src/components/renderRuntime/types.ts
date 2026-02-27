export type RenderPhase =
    | "preUpdate"
    | "simulate"
    | "drawWorld"
    | "drawEffectsWorld"
    | "drawEffectsScreen"
    | "drawDebug"
    | "postFrame";

export type RenderFrame = {
    nowMs: number;
    deltaMs: number;
    width: number;
    height: number;
    cameraX: number;
    cameraY: number;
    ctx: CanvasRenderingContext2D;
};

export interface RenderPlugin {
    id: string;
    phase: RenderPhase;
    priority: number;
    isActive: (frame: RenderFrame) => boolean;
    update: (frame: RenderFrame) => void;
    draw: (frame: RenderFrame) => void;
    reset?: () => void;
    dispose?: () => void;
}

export const RENDER_PHASE_ORDER: RenderPhase[] = [
    "preUpdate",
    "simulate",
    "drawWorld",
    "drawEffectsWorld",
    "drawEffectsScreen",
    "drawDebug",
    "postFrame",
];
