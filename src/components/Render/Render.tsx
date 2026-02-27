import { useEffect, useMemo, useRef } from "react";
import type { CanvasEffectsStage } from "@/components/effects/canvas";
import {
    createParticleEmitterCanvasPass,
    createScreenTransitionCanvasPass,
} from "@/components/effects";
import {
    RenderRuntime,
    SpriteBatch,
    getTilePixelPosition,
    loadSpriteSheetImages,
} from "@/components/renderRuntime";
import "./Render.css";
export interface RenderableItem {
    spriteImageSheet: string;
    spriteSize: number;
    spriteSheetTileWidth: number;
    spriteSheetTileHeight: number;
    characterSpriteTiles: number[][];
    scaler: number;
    position: { x: number; y: number; z?: number };
    fps?: number;

    collider?: {
        type: "rectangle";
        size: { width: number; height: number };
        offset: { x: number; y: number };
        debugDraw?: boolean;
    };
}

export interface RenderProps {
    items: RenderableItem[];
    width?: number;
    height?: number;
    cameraX?: number;
    cameraY?: number;
    showDebugOutlines?: boolean;
    includeEffects?: boolean;
    enableTransitionEffects?: boolean;
    effectsStage?: CanvasEffectsStage;
}

export { getTilePixelPosition };

const DEBUG_OUTLINE_COLOR = "#60a5fa";
const RENDER_V2_EFFECTS =
    (import.meta.env.VITE_RENDER_V2_EFFECTS ?? "true") !== "false";
const RENDER_V2_TRANSITIONS =
    (import.meta.env.VITE_RENDER_V2_TRANSITIONS ?? "true") === "true";

const Render = ({
    items,
    width = 300,
    height = 300,
    cameraX = 0,
    cameraY = 0,
    showDebugOutlines = true,
    includeEffects = true,
    enableTransitionEffects = true,
    effectsStage,
}: RenderProps) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const runtime = useMemo(() => new RenderRuntime(), []);

    useEffect(() => {
        const canvas = canvasRef.current;
        // istanbul ignore next - ref may be null in unusual render environments
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        context.imageSmoothingEnabled = false;

        let cancelled = false;
        (async () => {
            try {
                const { imagesByUrl, failedUrls } =
                    await loadSpriteSheetImages(items);
                if (cancelled) return;

                for (let i = 0; i < failedUrls.length; i++) {
                    console.error(
                        new Error(
                            `Skipping sprite sheet due to load failure: ${failedUrls[i]}`,
                        ),
                    );
                }

                const animationStartMs = performance.now();
                const spriteBatch = new SpriteBatch(
                    items,
                    imagesByUrl,
                    animationStartMs,
                );

                runtime.clear();

                runtime.upsertPlugin({
                    id: "render-clear",
                    phase: "preUpdate",
                    priority: 0,
                    isActive: () => true,
                    update: () => {},
                    draw: () => {
                        context.clearRect(0, 0, width, height);
                    },
                });

                runtime.upsertPlugin({
                    id: "render-world",
                    phase: "drawWorld",
                    priority: 0,
                    isActive: () => true,
                    update: () => {},
                    draw: (frame) => {
                        spriteBatch.draw({
                            ctx: context,
                            nowMs: frame.nowMs,
                            width,
                            height,
                            cameraX,
                            cameraY,
                            showDebugOutlines,
                            debugOutlineColor: DEBUG_OUTLINE_COLOR,
                        });
                    },
                });

                const runtimeEffectsEnabled =
                    includeEffects && RENDER_V2_EFFECTS;

                if (runtimeEffectsEnabled) {
                    const particleController = createParticleEmitterCanvasPass({
                        width,
                        height,
                        passId: "runtime-particles",
                    });

                    runtime.upsertPlugin({
                        id: "render-runtime-particles",
                        phase: "drawEffectsScreen",
                        priority: 0,
                        isActive: () => particleController.pass.isActive(),
                        update: (frame) => {
                            particleController.pass.update(frame.deltaMs);
                        },
                        draw: (frame) => {
                            particleController.pass.draw({
                                ctx: context,
                                width,
                                height,
                                deltaMs: frame.deltaMs,
                            });
                        },
                        reset: () => {
                            particleController.pass.reset?.();
                        },
                        dispose: () => {
                            particleController.dispose();
                        },
                    });

                    if (enableTransitionEffects && RENDER_V2_TRANSITIONS) {
                        const transitionController =
                            createScreenTransitionCanvasPass({
                                width,
                                height,
                                passId: "runtime-transition",
                            });

                        runtime.upsertPlugin({
                            id: "render-runtime-transition",
                            phase: "drawEffectsScreen",
                            priority: 1,
                            isActive: () =>
                                transitionController.pass.isActive(),
                            update: (frame) => {
                                transitionController.pass.update(frame.deltaMs);
                            },
                            draw: (frame) => {
                                transitionController.pass.draw({
                                    ctx: context,
                                    width,
                                    height,
                                    deltaMs: frame.deltaMs,
                                });
                            },
                            reset: () => {
                                transitionController.pass.reset?.();
                            },
                            dispose: () => {
                                transitionController.dispose();
                            },
                        });
                    }
                } else if (effectsStage) {
                    runtime.upsertPlugin({
                        id: "render-effects",
                        phase: "drawEffectsScreen",
                        priority: 0,
                        isActive: () => true,
                        update: () => {},
                        draw: (frame) => {
                            context.save();
                            effectsStage.updateAndDraw({
                                ctx: context,
                                width,
                                height,
                                deltaMs: frame.deltaMs,
                            });
                            context.restore();
                        },
                    });
                }

                runtime.start((nowMs, deltaMs) => {
                    return {
                        nowMs,
                        deltaMs,
                        width,
                        height,
                        cameraX,
                        cameraY,
                        ctx: context,
                    };
                });
            } catch (err) {
                console.error(err);
            }
        })();

        return () => {
            cancelled = true;
            runtime.stop();
            runtime.clear();
        };
    }, [
        items,
        width,
        height,
        cameraX,
        cameraY,
        showDebugOutlines,
        includeEffects,
        enableTransitionEffects,
        effectsStage,
        runtime,
    ]);

    return (
        <div
            className={
                showDebugOutlines ? "render-frame is-debug" : "render-frame"
            }
        >
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                className="render-canvas"
            />
        </div>
    );
};

export default Render;
