import { useCallback, useRef, useState } from "react";
import { TopDownControls } from "./components/screenController";
import { ExamplePrefabsPanel } from "./components/examples";
import {
    AppMainTabs,
    ExampleGameCanvasPanel,
    ExampleGameToolbar,
} from "./components/app";
import { GAME_VIEW_CONFIG } from "@/config/gameViewConfig";
import { dataBus } from "./services/DataBus";
import { useAudioChannelState } from "./hooks/useAudioChannelState";
import { useStartScreenWorldPause } from "./hooks/useStartScreenWorldPause";
import { useTopDownGameLoop } from "./hooks/useTopDownGameLoop";
import "./App.css";

export default function App() {
    const [, force] = useState(0);
    const [activeMainTab, setActiveMainTab] = useState<
        "example-game" | "prefab-examples"
    >("prefab-examples");
    const [hasStartedExampleGame, setHasStartedExampleGame] = useState(false);
    const [showDebugOutlines, setShowDebugOutlines] = useState(false);
    const gameScreenRef = useRef<HTMLDivElement | null>(null);
    const shouldRunGameLoop =
        activeMainTab === "example-game" && hasStartedExampleGame;

    const { isMusicMuted, isSfxMuted, toggleMusicMuted, toggleSfxMuted } =
        useAudioChannelState();

    useTopDownGameLoop(shouldRunGameLoop, () => {
        force((n) => n + 1);
    });
    useStartScreenWorldPause(hasStartedExampleGame);

    const handleMove = useCallback(() => {
        force((n) => n + 1);
    }, []);

    const handleSelectExampleGameTab = useCallback(() => {
        setActiveMainTab("example-game");
    }, []);

    const handleSelectPrefabExamplesTab = useCallback(() => {
        if (activeMainTab === "example-game" && hasStartedExampleGame) {
            const shouldLeave = window.confirm(
                "Switch to Example Prefabs? Any unsaved progress in the game will be lost.",
            );

            if (!shouldLeave) {
                return;
            }

            setHasStartedExampleGame(false);
        }

        setActiveMainTab("prefab-examples");
    }, [activeMainTab, hasStartedExampleGame]);

    const width = GAME_VIEW_CONFIG.canvas.width;
    const height = GAME_VIEW_CONFIG.canvas.height;
    const state = dataBus.getState();
    const playerBehaviorState = dataBus.getEntityBehaviorState(state.playerId);
    const playerFacingDirection = dataBus.getPlayerFacingDirection();
    const playerMoveIntent = dataBus.getPlayerMoveIntent();
    const hasLiveMoveIntent =
        playerMoveIntent.x !== 0 || playerMoveIntent.y !== 0;
    const playerStateLabel = `${hasLiveMoveIntent ? "moving" : playerBehaviorState} ${playerFacingDirection}`;
    const player = state.entitiesById[state.playerId];
    const playerPositionLabel = `${Math.round(player.position.x)}, ${Math.round(
        player.position.y,
    )}`;
    const playerLives = dataBus.getPlayerLives();
    const playerMaxLives = dataBus.getPlayerMaxLives();
    const playerScore = dataBus.getPlayerScore();
    const isGameOver = dataBus.isGameOver();
    const showDevTuningPill = import.meta.env.DEV;

    const handleRestartGame = useCallback(() => {
        dataBus.restartGame();
        force((n) => n + 1);
    }, []);

    return (
        <div className="GameContainer">
            <div className="GameSurface">
                <AppMainTabs
                    activeMainTab={activeMainTab}
                    onSelectPrefabExamplesTab={handleSelectPrefabExamplesTab}
                    onSelectExampleGameTab={handleSelectExampleGameTab}
                />

                {activeMainTab === "example-game" ? (
                    <>
                        <ExampleGameToolbar
                            isMusicMuted={isMusicMuted}
                            isSfxMuted={isSfxMuted}
                            showDebugOutlines={showDebugOutlines}
                            onToggleMusicMuted={toggleMusicMuted}
                            onToggleSfxMuted={toggleSfxMuted}
                            onToggleDebugOutlines={() => {
                                setShowDebugOutlines((current) => !current);
                            }}
                        />

                        <ExampleGameCanvasPanel
                            width={width}
                            height={height}
                            hasStartedExampleGame={hasStartedExampleGame}
                            showDebugOutlines={showDebugOutlines}
                            playerStateLabel={playerStateLabel}
                            playerPositionLabel={playerPositionLabel}
                            showDevTuningPill={showDevTuningPill}
                            playerLives={playerLives}
                            playerMaxLives={playerMaxLives}
                            playerScore={playerScore}
                            isGameOver={isGameOver}
                            gameScreenRef={gameScreenRef}
                            onStartGame={() => {
                                setHasStartedExampleGame(true);
                            }}
                            onRestartGame={handleRestartGame}
                        />

                        <div className="ControlsPanel">
                            <TopDownControls
                                onMove={handleMove}
                                allowDiagonal
                            />
                        </div>

                        <div
                            className="ControlsHelpPanel"
                            aria-label="Controls help"
                        >
                            <div className="CanvasControlsHelp">
                                <span className="CanvasControlsHelp__title">
                                    Controls:
                                </span>
                                <span className="CanvasControlsHelp__item">
                                    Move: arrows or WASD
                                </span>
                                <span className="CanvasControlsHelp__item">
                                    Attack: J
                                </span>
                                <span className="CanvasControlsHelp__item">
                                    Special: K
                                </span>
                            </div>
                        </div>
                    </>
                ) : null}

                {activeMainTab === "prefab-examples" ? (
                    <ExamplePrefabsPanel />
                ) : null}
            </div>
        </div>
    );
}
