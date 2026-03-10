import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { CanvasEffectsStage } from "@/components/effects/canvas";
import {
    createParticleEmitterCanvasPass,
    createScreenPseudoShaderCanvasPass,
    createScreenTransitionCanvasPass,
    type SpritePseudoShaderEffect,
    type ParticleEmitterCanvasPassController,
    type ScreenPseudoShaderCanvasPassController,
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
    spriteEffects?: SpritePseudoShaderEffect[];

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
    backgroundTile?: {
        spriteImageSheet: string;
        tileSize: number;
        sourceTileSize?: number;
        drawTileSize?: number;
        spriteSheetTileWidth: number;
        spriteSheetTileHeight: number;
        tile?: readonly [number, number];
        patternTiles?: readonly (readonly [number, number])[];
        patternColumns?: number;
        patternStrategy?: "repeat" | "hash" | "edge-3x3";
        worldWidth: number;
        worldHeight: number;
    };
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
    backgroundTile?: {
        spriteImageSheet: string;
        tileSize: number;
        sourceTileSize?: number;
        drawTileSize?: number;
        spriteSheetTileWidth: number;
        spriteSheetTileHeight: number;
        tile?: readonly [number, number];
        patternTiles?: readonly (readonly [number, number])[];
        patternColumns?: number;
        patternStrategy?: "repeat" | "hash" | "edge-3x3";
        worldWidth: number;
        worldHeight: number;
    };
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
    backgroundTile,
    showDebugOutlines = true,
    includeEffects = true,
    enableTransitionEffects = true,
    effectsStage,
}: RenderProps) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const runtime = useMemo(() => new RenderRuntime(), []);
    const spriteBatchRef = useRef<SpriteBatch | null>(null);
    const backgroundTileImageRef = useRef<HTMLImageElement | null>(null);
    const loadTokenRef = useRef(0);
    const frameStateRef = useRef<RenderFrameState>({
        items,
        width,
        height,
        cameraX,
        cameraY,
        backgroundTile,
        showDebugOutlines,
        includeEffects,
        enableTransitionEffects,
        effectsStage,
    });
    const particleControllerRef =
        useRef<ParticleEmitterCanvasPassController | null>(null);
    const transitionControllerRef =
        useRef<ScreenTransitionCanvasPassController | null>(null);
    const screenPseudoShaderControllerRef =
        useRef<ScreenPseudoShaderCanvasPassController | null>(null);

    useLayoutEffect(() => {
        frameStateRef.current = {
            items,
            width,
            height,
            cameraX,
            cameraY,
            backgroundTile,
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
        backgroundTile,
        showDebugOutlines,
        includeEffects,
        enableTransitionEffects,
        effectsStage,
    ]);

    useEffect(() => {
        particleControllerRef.current?.setBounds(width, height);
        transitionControllerRef.current?.setBounds(width, height);
        screenPseudoShaderControllerRef.current?.setBounds(width, height);
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
        const screenPseudoShaderController = createScreenPseudoShaderCanvasPass(
            {
                width: frameStateRef.current.width,
                height: frameStateRef.current.height,
                passId: "runtime-screen-pseudo-shader",
            },
        );

        particleControllerRef.current = particleController;
        transitionControllerRef.current = transitionController;
        screenPseudoShaderControllerRef.current = screenPseudoShaderController;

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
                const tileBackground = frameState.backgroundTile;
                const backgroundImage = backgroundTileImageRef.current;

                if (tileBackground && backgroundImage) {
                    const sourceTileSize =
                        tileBackground.sourceTileSize ??
                        tileBackground.tileSize;
                    const drawTileSize =
                        tileBackground.drawTileSize ?? tileBackground.tileSize;
                    const worldWidth = Math.max(0, tileBackground.worldWidth);
                    const worldHeight = Math.max(0, tileBackground.worldHeight);
                    const worldTileColumns = Math.max(
                        1,
                        Math.ceil(worldWidth / drawTileSize),
                    );
                    const worldTileRows = Math.max(
                        1,
                        Math.ceil(worldHeight / drawTileSize),
                    );
                    const startTileX = Math.floor(
                        frameState.cameraX / drawTileSize,
                    );
                    const startTileY = Math.floor(
                        frameState.cameraY / drawTileSize,
                    );
                    const endTileX = Math.ceil(
                        (frameState.cameraX + frameState.width) / drawTileSize,
                    );
                    const endTileY = Math.ceil(
                        (frameState.cameraY + frameState.height) / drawTileSize,
                    );
                    const patternTiles = tileBackground.patternTiles ?? [];
                    const patternStrategy =
                        tileBackground.patternStrategy ?? "repeat";
                    const patternColumns = Math.max(
                        1,
                        tileBackground.patternColumns ?? patternTiles.length,
                    );
                    const patternRows = Math.max(
                        1,
                        Math.ceil(patternTiles.length / patternColumns),
                    );
                    const mod = (value: number, divisor: number) =>
                        ((value % divisor) + divisor) % divisor;

                    for (let ty = startTileY; ty <= endTileY; ty++) {
                        const worldY = ty * drawTileSize;
                        if (worldY >= worldHeight) {
                            continue;
                        }

                        for (let tx = startTileX; tx <= endTileX; tx++) {
                            const worldX = tx * drawTileSize;
                            if (worldX >= worldWidth) {
                                continue;
                            }

                            const remainingWidth = worldWidth - worldX;
                            const remainingHeight = worldHeight - worldY;
                            if (remainingWidth <= 0 || remainingHeight <= 0) {
                                continue;
                            }

                            const drawWidth = drawTileSize;
                            const drawHeight = drawTileSize;
                            const maxTileX = Math.max(
                                0,
                                worldWidth - drawTileSize,
                            );
                            const maxTileY = Math.max(
                                0,
                                worldHeight - drawTileSize,
                            );
                            const renderWorldX = Math.min(worldX, maxTileX);
                            const renderWorldY = Math.min(worldY, maxTileY);

                            const tileCoord =
                                patternTiles.length > 0
                                    ? (() => {
                                          if (
                                              patternStrategy === "edge-3x3" &&
                                              patternTiles.length >= 9
                                          ) {
                                              const isLeft = tx <= 0;
                                              const isRight =
                                                  tx >= worldTileColumns - 1;
                                              const isTop = ty <= 0;
                                              const isBottom =
                                                  ty >= worldTileRows - 1;

                                              if (isTop && isLeft) {
                                                  return patternTiles[0];
                                              }

                                              if (isTop && isRight) {
                                                  return patternTiles[2];
                                              }

                                              if (isBottom && isLeft) {
                                                  return patternTiles[6];
                                              }

                                              if (isBottom && isRight) {
                                                  return patternTiles[8];
                                              }

                                              if (isTop) {
                                                  return patternTiles[1];
                                              }

                                              if (isBottom) {
                                                  return patternTiles[7];
                                              }

                                              if (isLeft) {
                                                  return patternTiles[3];
                                              }

                                              if (isRight) {
                                                  return patternTiles[5];
                                              }

                                              return patternTiles[4];
                                          }

                                          if (patternStrategy === "hash") {
                                              const hash =
                                                  Math.imul(tx, 73856093) ^
                                                  Math.imul(ty, 19349663);
                                              const index = mod(
                                                  hash,
                                                  patternTiles.length,
                                              );
                                              return patternTiles[index];
                                          }

                                          const localPatternX = mod(
                                              tx,
                                              patternColumns,
                                          );
                                          const localPatternY = mod(
                                              ty,
                                              patternRows,
                                          );
                                          const index =
                                              localPatternY * patternColumns +
                                              localPatternX;
                                          return patternTiles[
                                              index % patternTiles.length
                                          ];
                                      })()
                                    : (tileBackground.tile ?? [0, 0]);

                            let tilePos;
                            try {
                                tilePos = getTilePixelPosition(
                                    tileCoord[0],
                                    tileCoord[1],
                                    sourceTileSize,
                                    tileBackground.spriteSheetTileWidth,
                                    tileBackground.spriteSheetTileHeight,
                                );
                            } catch {
                                continue;
                            }

                            context.drawImage(
                                backgroundImage,
                                tilePos.x,
                                tilePos.y,
                                sourceTileSize,
                                sourceTileSize,
                                renderWorldX - frameState.cameraX,
                                renderWorldY - frameState.cameraY,
                                drawWidth,
                                drawHeight,
                            );
                        }
                    }
                }

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
            id: "render-runtime-screen-pseudo-shader",
            phase: "drawEffectsScreen",
            priority: 0.5,
            isActive: () => {
                const frameState = frameStateRef.current;
                return (
                    frameState.includeEffects &&
                    RENDER_V2_EFFECTS &&
                    screenPseudoShaderController.pass.isActive()
                );
            },
            update: (frame) => {
                screenPseudoShaderController.pass.update(frame.deltaMs);
            },
            draw: (frame) => {
                const frameState = frameStateRef.current;
                screenPseudoShaderController.pass.draw({
                    ctx: context,
                    width: frameState.width,
                    height: frameState.height,
                    deltaMs: frame.deltaMs,
                });
            },
            reset: () => {
                screenPseudoShaderController.pass.reset?.();
            },
            dispose: () => {
                screenPseudoShaderController.dispose();
                if (
                    screenPseudoShaderControllerRef.current ===
                    screenPseudoShaderController
                ) {
                    screenPseudoShaderControllerRef.current = null;
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
            backgroundTileImageRef.current = null;
            loadTokenRef.current += 1;
        };
    }, [runtime]);

    useEffect(() => {
        if (!backgroundTile) {
            backgroundTileImageRef.current = null;
            return;
        }

        const image = new Image();
        let cancelled = false;

        image.onload = () => {
            if (!cancelled) {
                backgroundTileImageRef.current = image;
            }
        };

        image.onerror = () => {
            if (!cancelled) {
                backgroundTileImageRef.current = null;
                console.error(
                    new Error(
                        `Skipping background tile due to load failure: ${backgroundTile.spriteImageSheet}`,
                    ),
                );
            }
        };

        image.src = backgroundTile.spriteImageSheet;

        return () => {
            cancelled = true;
        };
    }, [backgroundTile]);

    useEffect(() => {
        const existingBatch = spriteBatchRef.current;
        if (existingBatch) {
            existingBatch.setItems(items);

            const hasAllImages = items.every((item) =>
                existingBatch.hasSheetImage(item.spriteImageSheet),
            );

            if (hasAllImages) {
                return;
            }
        }

        const itemsToLoad =
            existingBatch === null
                ? items
                : items.filter(
                      (item) =>
                          !existingBatch.hasSheetImage(item.spriteImageSheet),
                  );

        if (itemsToLoad.length <= 0) {
            return;
        }

        const loadToken = loadTokenRef.current + 1;
        loadTokenRef.current = loadToken;

        let cancelled = false;

        (async () => {
            try {
                const { imagesByUrl, failedUrls } =
                    await loadSpriteSheetImages(itemsToLoad);
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

                if (existingBatch) {
                    for (const [url, image] of imagesByUrl) {
                        existingBatch.setSheetImage(url, image);
                    }
                    existingBatch.setItems(items);
                } else {
                    spriteBatchRef.current = new SpriteBatch(
                        items,
                        imagesByUrl,
                        performance.now(),
                    );
                }
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
