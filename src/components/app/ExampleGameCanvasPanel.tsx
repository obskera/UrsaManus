import type { RefObject } from "react";
import { TopDownCanvas } from "@/components/gameModes";
import { GAME_VIEW_CONFIG } from "@/config/gameViewConfig";
import { TOP_DOWN_PLAYER_TUNING } from "@/config/playerTuning";

type ExampleGameCanvasPanelProps = {
    width: number;
    height: number;
    hasStartedExampleGame: boolean;
    showDebugOutlines: boolean;
    playerStateLabel: string;
    playerPositionLabel: string;
    showDevTuningPill: boolean;
    gameScreenRef: RefObject<HTMLDivElement | null>;
    onStartGame: () => void;
};

const ExampleGameCanvasPanel = ({
    width,
    height,
    hasStartedExampleGame,
    showDebugOutlines,
    playerStateLabel,
    playerPositionLabel,
    showDevTuningPill,
    gameScreenRef,
    onStartGame,
}: ExampleGameCanvasPanelProps) => {
    return (
        <div className="CanvasPanel">
            <div className="CanvasMetaRow" aria-label="Canvas details">
                <span className="CanvasMetaPill CanvasMetaPill--mode CanvasMetaPill--top-down">
                    Mode: Top Down
                </span>
                <span className="CanvasMetaPill">
                    Resolution: {width}×{height}
                </span>
                <span className="CanvasMetaPill">
                    Player State: {playerStateLabel}
                </span>
                <span className="CanvasMetaPill">
                    Player Pos: {playerPositionLabel}
                </span>
                {showDevTuningPill ? (
                    <span className="CanvasMetaPill">
                        Tuning: {TOP_DOWN_PLAYER_TUNING.moveSpeedPxPerSec}px/s ·{" "}
                        {TOP_DOWN_PLAYER_TUNING.walkAnimationFps}fps
                    </span>
                ) : null}
            </div>
            <div className="CanvasOverlayHost">
                {hasStartedExampleGame ? (
                    <TopDownCanvas
                        width={width}
                        height={height}
                        worldWidth={GAME_VIEW_CONFIG.world.width}
                        worldHeight={GAME_VIEW_CONFIG.world.height}
                        cameraMode={GAME_VIEW_CONFIG.camera.mode}
                        cameraClampToWorld={
                            GAME_VIEW_CONFIG.camera.clampToWorld
                        }
                        manualCameraStartX={
                            GAME_VIEW_CONFIG.camera.manualStart.x
                        }
                        manualCameraStartY={
                            GAME_VIEW_CONFIG.camera.manualStart.y
                        }
                        containerRef={gameScreenRef}
                        showDebugOutlines={showDebugOutlines}
                        tapMarker={null}
                    />
                ) : (
                    <div
                        className="CanvasStartSurface"
                        aria-hidden="true"
                        style={{ width, height }}
                    />
                )}

                {!hasStartedExampleGame ? (
                    <div className="CanvasStartOverlay">
                        <aside className="DevControlsTab CanvasStartCard">
                            <p className="DevControlsTitle">Example game</p>
                            <div className="DevToolsGroup CanvasStartActions">
                                <button
                                    type="button"
                                    className="game-mode-button is-active"
                                    onClick={(event) => {
                                        onStartGame();
                                        event.currentTarget.blur();
                                    }}
                                >
                                    Start Game
                                </button>
                                <button
                                    type="button"
                                    className="game-mode-button"
                                    disabled
                                    aria-disabled="true"
                                    title="Load Game coming soon"
                                >
                                    Load Game (Soon)
                                </button>
                            </div>
                        </aside>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default ExampleGameCanvasPanel;
