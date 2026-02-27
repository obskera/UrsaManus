import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { CanvasEffectsStage } from "@/components/effects/canvas";
import {
    createParticleEmitterCanvasPass,
    createScreenTransitionCanvasPass,
    type ParticleEmitterCanvasPassController,
    type ScreenTransitionCanvasPassController,
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

type RenderFrameState = {
    items: RenderableItem[];
    width: number;
    height: number;
    cameraX: number;
    cameraY: number;
    showDebugOutlines: boolean;
    includeEffects: boolean;
    enableTransitionEffects: boolean;
    effectsStage?: CanvasEffectsStage;
};

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
    const spriteBatchRef = useRef<SpriteBatch | null>(null);
    const loadTokenRef = useRef(0);
    const frameStateRef = useRef<RenderFrameState>({
        items,
        width,
        height,
        cameraX,
        cameraY,
        showDebugOutlines,
        includeEffects,
        enableTransitionEffects,
        effectsStage,
    });
    const particleControllerRef =
        useRef<ParticleEmitterCanvasPassController | null>(null);
    const transitionControllerRef =
        useRef<ScreenTransitionCanvasPassController | null>(null);

    useLayoutEffect(() => {
        frameStateRef.current = {
            items,
            width,
            height,
            cameraX,
            cameraY,
            showDebugOutlines,
            includeEffects,
            enableTransitionEffects,
            effectsStage,
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
    ]);

    useEffect(() => {
        particleControllerRef.current?.setBounds(width, height);
        transitionControllerRef.current?.setBounds(width, height);
    }, [width, height]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        context.imageSmoothingEnabled = false;

        const particleController = createParticleEmitterCanvasPass({
            width: frameStateRef.current.width,
            height: frameStateRef.current.height,
            passId: "runtime-particles",
        });
        const transitionController = createScreenTransitionCanvasPass({
            width: frameStateRef.current.width,
            height: frameStateRef.current.height,
            passId: "runtime-transition",
        });

        particleControllerRef.current = particleController;
        transitionControllerRef.current = transitionController;

        runtime.clear();

        runtime.upsertPlugin({
            id: "render-clear",
            phase: "preUpdate",
            priority: 0,
            isActive: () => true,
            update: () => {},
            draw: () => {
                const frameState = frameStateRef.current;
                context.clearRect(0, 0, frameState.width, frameState.height);
            },
        });

        runtime.upsertPlugin({
            id: "render-world",
            phase: "drawWorld",
            priority: 0,
            isActive: () => true,
            update: () => {},
            draw: (frame) => {
                const frameState = frameStateRef.current;
                const spriteBatch = spriteBatchRef.current;
                if (!spriteBatch) {
                    return;
                }

                spriteBatch.draw({
                    ctx: context,
                    nowMs: frame.nowMs,
                    width: frameState.width,
                    height: frameState.height,
                    cameraX: frameState.cameraX,
                    cameraY: frameState.cameraY,
                    showDebugOutlines: frameState.showDebugOutlines,
                    debugOutlineColor: DEBUG_OUTLINE_COLOR,
                });
            },
        });

        runtime.upsertPlugin({
            id: "render-runtime-particles",
            phase: "drawEffectsScreen",
            priority: 0,
            isActive: () => {
                const frameState = frameStateRef.current;
                return (
                    frameState.includeEffects &&
                    RENDER_V2_EFFECTS &&
                    particleController.pass.isActive()
                );
            },
            update: (frame) => {
                particleController.pass.update(frame.deltaMs);
            },
            draw: (frame) => {
                const frameState = frameStateRef.current;
                particleController.pass.draw({
                    ctx: context,
                    width: frameState.width,
                    height: frameState.height,
                    deltaMs: frame.deltaMs,
                });
            },
            reset: () => {
                particleController.pass.reset?.();
            },
            dispose: () => {
                particleController.dispose();
                if (particleControllerRef.current === particleController) {
                    particleControllerRef.current = null;
                }
            },
        });

        runtime.upsertPlugin({
            id: "render-runtime-transition",
            phase: "drawEffectsScreen",
            priority: 1,
            isActive: () => {
                const frameState = frameStateRef.current;
                return (
                    frameState.includeEffects &&
                    RENDER_V2_EFFECTS &&
                    frameState.enableTransitionEffects &&
                    RENDER_V2_TRANSITIONS &&
                    transitionController.pass.isActive()
                );
            },
            update: (frame) => {
                transitionController.pass.update(frame.deltaMs);
            },
            draw: (frame) => {
                const frameState = frameStateRef.current;
                transitionController.pass.draw({
                    ctx: context,
                    width: frameState.width,
                    height: frameState.height,
                    deltaMs: frame.deltaMs,
                });
            },
            reset: () => {
                transitionController.pass.reset?.();
            },
            dispose: () => {
                transitionController.dispose();
                if (transitionControllerRef.current === transitionController) {
                    transitionControllerRef.current = null;
                }
            },
        });

        runtime.upsertPlugin({
            id: "render-effects-legacy",
            phase: "drawEffectsScreen",
            priority: 2,
            isActive: () => {
                const frameState = frameStateRef.current;
                return (
                    (!frameState.includeEffects || !RENDER_V2_EFFECTS) &&
                    Boolean(frameState.effectsStage)
                );
            },
            update: () => {},
            draw: (frame) => {
                const frameState = frameStateRef.current;
                if (!frameState.effectsStage) {
                    return;
                }

                context.save();
                frameState.effectsStage.updateAndDraw({
                    ctx: context,
                    width: frameState.width,
                    height: frameState.height,
                    deltaMs: frame.deltaMs,
                });
                context.restore();
            },
        });

        runtime.start((nowMs, deltaMs) => {
            const frameState = frameStateRef.current;
            return {
                nowMs,
                deltaMs,
                width: frameState.width,
                height: frameState.height,
                cameraX: frameState.cameraX,
                cameraY: frameState.cameraY,
                ctx: context,
            };
        });

        return () => {
            runtime.stop();
            runtime.clear();
            spriteBatchRef.current = null;
            loadTokenRef.current += 1;
        };
    }, [runtime]);

    useEffect(() => {
        const loadToken = loadTokenRef.current + 1;
        loadTokenRef.current = loadToken;

        let cancelled = false;

        (async () => {
            try {
                const { imagesByUrl, failedUrls } =
                    await loadSpriteSheetImages(items);
                if (cancelled || loadTokenRef.current !== loadToken) {
                    return;
                }

                for (let i = 0; i < failedUrls.length; i++) {
                    console.error(
                        new Error(
                            `Skipping sprite sheet due to load failure: ${failedUrls[i]}`,
                        ),
                    );
                }

                spriteBatchRef.current = new SpriteBatch(
                    items,
                    imagesByUrl,
                    performance.now(),
                );
            } catch (err) {
                if (!cancelled && loadTokenRef.current === loadToken) {
                    console.error(err);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [items]);

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
