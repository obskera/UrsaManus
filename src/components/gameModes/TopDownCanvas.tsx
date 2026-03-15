import { type RefObject, useEffect, useRef, useState } from "react";
import Render from "@/components/Render/Render";
import type { CameraMode } from "@/config/gameViewConfig";
import { dataBus } from "@/services/DataBus";
import { audioBus } from "@/services/audioBus";
import { ScoreDisplay } from "@/components/score";
import { resolvePublicAssetPath } from "@/utils/assetPaths";
import SoundManager from "./SoundManager";
import { GAME_MODE_AUDIO_CUES } from "./sceneAudio";

const TOP_DOWN_FLOOR_TILESET =
    resolvePublicAssetPath(
        "Ninja%20Adventure%20-%20Asset%20Pack/Backgrounds/Tilesets/TilesetFloor.png",
    );
const PLAYER_LIFE_SPRITE = resolvePublicAssetPath(
    "Ninja%20Adventure%20-%20Asset%20Pack/Actor/Characters/NinjaGreen/SeparateAnim/Idle.png",
);

const TOP_DOWN_FLOOR_PATTERN_TILES: ReadonlyArray<readonly [number, number]> = [
    [0, 0],
    [1, 0],
    [2, 0],
    [0, 1],
    [1, 1],
    [2, 1],
    [0, 2],
    [1, 2],
    [2, 2],
];

export type TopDownCanvasProps = {
    width?: number;
    height?: number;
    worldWidth?: number;
    worldHeight?: number;
    cameraMode?: CameraMode;
    cameraClampToWorld?: boolean;
    manualCameraStartX?: number;
    manualCameraStartY?: number;
    containerRef?: RefObject<HTMLDivElement | null>;
    includeEffects?: boolean;
    showDebugOutlines?: boolean;
    tapMarker?: { x: number; y: number } | null;
    playerLives?: number;
    playerMaxLives?: number;
};

const TopDownCanvas = ({
    width = 400,
    height = 300,
    worldWidth = width,
    worldHeight = height,
    cameraMode = "follow-player",
    cameraClampToWorld = true,
    manualCameraStartX = 0,
    manualCameraStartY = 0,
    containerRef,
    includeEffects = true,
    showDebugOutlines = import.meta.env.DEV,
    tapMarker,
    playerLives = 3,
    playerMaxLives = 3,
}: TopDownCanvasProps) => {
    const [, forceRender] = useState(0);
    const initialSetupRef = useRef({
        width,
        height,
        worldWidth,
        worldHeight,
        cameraMode,
        cameraClampToWorld,
        manualCameraStartX,
        manualCameraStartY,
    });

    useEffect(() => {
        const initial = initialSetupRef.current;

        dataBus.setWorldSize(initial.worldWidth, initial.worldHeight);
        dataBus.setCameraViewport(initial.width, initial.height);
        dataBus.setCameraClampToWorld(initial.cameraClampToWorld);
        if (initial.cameraMode === "follow-player") {
            dataBus.setCameraFollowPlayer(true);
        } else {
            dataBus.setCameraMode("manual");
            dataBus.setCameraPosition(
                initial.manualCameraStartX,
                initial.manualCameraStartY,
            );
        }
        dataBus.setWorldBoundsEnabled(true);
        dataBus.setPlayerCanPassWorldBounds(false);
        dataBus.disablePlayerPhysics();
        dataBus.setPlayerMoveInput(0);
        dataBus.startEnemySpawning();
        forceRender((value) => value + 1);

        let hasDisposed = false;

        const playTopDownMusic = () => {
            if (hasDisposed) {
                return;
            }

            audioBus.play("scene:top-down:music", {
                channel: "music",
                loop: true,
                restartIfPlaying: false,
                volume: 0.55,
            });
        };

        const playOnFirstGesture = () => {
            playTopDownMusic();
            window.removeEventListener("pointerdown", playOnFirstGesture);
            window.removeEventListener("keydown", playOnFirstGesture);
            window.removeEventListener("touchstart", playOnFirstGesture);
        };

        requestAnimationFrame(() => {
            playTopDownMusic();
        });

        window.addEventListener("pointerdown", playOnFirstGesture, {
            passive: true,
            once: true,
        });
        window.addEventListener("keydown", playOnFirstGesture, {
            passive: true,
            once: true,
        });
        window.addEventListener("touchstart", playOnFirstGesture, {
            passive: true,
            once: true,
        });

        return () => {
            hasDisposed = true;
            window.removeEventListener("pointerdown", playOnFirstGesture);
            window.removeEventListener("keydown", playOnFirstGesture);
            window.removeEventListener("touchstart", playOnFirstGesture);
            audioBus.stop("scene:top-down:music");
            dataBus.stopEnemySpawning();
        };
    }, []);

    const state = dataBus.getState();
    const player = state.entitiesById[state.playerId];
    const floorDrawTileSize = Math.max(16, player.spriteSize * player.scaler);
    const visibleLives = Math.max(0, Math.min(playerMaxLives, playerLives));
    const playerScore = Math.max(0, state.playerScore ?? 0);
    const enemyWave = dataBus.getEnemySpawnWave();
    const playerSpecialCooldownRemainingMs =
        dataBus.getPlayerSpecialCooldownRemainingMs();
    const playerSpecialCooldownSeconds = Math.max(
        0,
        Math.ceil(playerSpecialCooldownRemainingMs / 1000),
    );
    const isPlayerHurtFlashing = dataBus.isPlayerHurtFlashing();
    const blinkCycleMs = 100;
    const blinkVisible =
        !isPlayerHurtFlashing ||
        Math.floor(performance.now() / blinkCycleMs) % 2 === 0;
    const renderItems = blinkVisible
        ? Object.values(state.entitiesById)
        : Object.values(state.entitiesById).filter(
              (e) => e.id !== state.playerId,
          );

    return (
        <div className="GameScreen" ref={containerRef}>
            <SoundManager cues={GAME_MODE_AUDIO_CUES} />
            <div className="GameScreenViewport" style={{ width, height }}>
                <Render
                    items={renderItems}
                    width={width}
                    height={height}
                    cameraX={state.camera.x}
                    cameraY={state.camera.y}
                    backgroundTile={{
                        spriteImageSheet: TOP_DOWN_FLOOR_TILESET,
                        tileSize: 16,
                        sourceTileSize: 16,
                        drawTileSize: floorDrawTileSize,
                        spriteSheetTileWidth: 22,
                        spriteSheetTileHeight: 26,
                        patternTiles: TOP_DOWN_FLOOR_PATTERN_TILES,
                        patternColumns: 3,
                        patternStrategy: "edge-3x3",
                        worldWidth: state.worldSize.width,
                        worldHeight: state.worldSize.height,
                    }}
                    showDebugOutlines={showDebugOutlines}
                    includeEffects={includeEffects}
                    enableTransitionEffects
                />

                <div
                    className="CanvasHudTopLeft CanvasLivesRow"
                    aria-label={`Lives remaining: ${visibleLives}`}
                >
                    {Array.from({ length: visibleLives }).map((_, index) => (
                        <span
                            key={`life-${index}`}
                            className="CanvasLifeSprite"
                            style={{
                                backgroundImage: `url("${PLAYER_LIFE_SPRITE}")`,
                            }}
                            aria-hidden="true"
                        />
                    ))}
                </div>

                <div className="CanvasHudBottomRight" aria-live="polite">
                    <ScoreDisplay score={enemyWave} label="Wave" />
                    <ScoreDisplay score={playerScore} label="Score" />
                    {playerSpecialCooldownRemainingMs > 0 ? (
                        <ScoreDisplay
                            score={playerSpecialCooldownSeconds}
                            label="Special"
                        />
                    ) : (
                        <div
                            className="um-score-display um-score-display--ready"
                            role="status"
                            aria-label="Special ready"
                        >
                            Special Ready!
                        </div>
                    )}
                </div>

                {tapMarker ? (
                    <span
                        aria-hidden="true"
                        className="CanvasTapMarker"
                        style={{
                            left: `${tapMarker.x}px`,
                            top: `${tapMarker.y}px`,
                        }}
                    />
                ) : null}
            </div>
        </div>
    );
};

export default TopDownCanvas;
