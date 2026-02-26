// src/App.tsx (dynamic: sync DataBus to Render props)
import { useCallback, useEffect, useRef, useState } from "react";
import {
    SideScrollerControls,
    TopDownControls,
} from "./components/screenController";
import { SideScrollerCanvas, TopDownCanvas } from "./components/gameModes";
import { setupDevEffectHotkeys } from "./components/effects/dev";
import { GAME_VIEW_CONFIG } from "@/config/gameViewConfig";
import { dataBus } from "./services/DataBus";
import "./App.css";

type GameMode = "side-scroller" | "top-down";

const GAME_MODE_QUERY_KEY = "mode";

function normalizeGameMode(value: string | null): GameMode | null {
    if (value === "side-scroller" || value === "top-down") {
        return value;
    }

    return null;
}

export default function App() {
    const [, force] = useState(0);
    const [hasProgress, setHasProgress] = useState(false);
    const isDevMode = import.meta.env.DEV;
    const [showDebugOutlines, setShowDebugOutlines] = useState(isDevMode);
    const [showDevControls, setShowDevControls] = useState(false);
    const [gameMode, setGameMode] = useState<GameMode>(() => {
        const modeFromQuery = normalizeGameMode(
            new URLSearchParams(window.location.search).get(
                GAME_MODE_QUERY_KEY,
            ),
        );

        return modeFromQuery ?? "side-scroller";
    });
    const gameScreenRef = useRef<HTMLDivElement | null>(null);

    const width = GAME_VIEW_CONFIG.canvas.width;
    const height = GAME_VIEW_CONFIG.canvas.height;
    const cameraPanStepPx = GAME_VIEW_CONFIG.camera.panStepPx;
    const cameraPanFastMultiplier = GAME_VIEW_CONFIG.camera.fastPanMultiplier;
    const state = dataBus.getState();
    const camera = state.camera;
    const cameraModeLabel =
        camera.mode === "follow-player" ? "Follow" : "Manual";

    useEffect(() => {
        if (!hasProgress) return;

        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = "";
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [hasProgress]);

    useEffect(() => {
        return setupDevEffectHotkeys({
            enabled: import.meta.env.DEV,
            width,
            height,
            getContainer: () => gameScreenRef.current,
            cameraPanStepPx,
            cameraPanFastMultiplier,
            onCameraPan: () => {
                force((n) => n + 1);
            },
        });
    }, [cameraPanFastMultiplier, cameraPanStepPx, height, width]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        params.set(GAME_MODE_QUERY_KEY, gameMode);
        const query = params.toString();
        const url = `${window.location.pathname}?${query}${window.location.hash}`;
        window.history.replaceState(null, "", url);
    }, [gameMode]);

    useEffect(() => {
        let rafId = 0;
        let lastFrame = performance.now();

        const tick = (now: number) => {
            const deltaMs = now - lastFrame;
            lastFrame = now;

            const didUpdate = dataBus.stepPhysics(deltaMs);
            if (didUpdate) {
                setHasProgress(true);
                force((n) => n + 1);
            }

            rafId = requestAnimationFrame(tick);
        };

        rafId = requestAnimationFrame(tick);

        return () => {
            if (rafId) {
                cancelAnimationFrame(rafId);
            }
        };
    }, []);

    const handleMove = useCallback(() => {
        setHasProgress(true);
        force((n) => n + 1);
    }, []);

    const switchToSideScroller = () => {
        dataBus.setPlayerMoveInput(0);
        setGameMode("side-scroller");
    };

    const switchToTopDown = () => {
        dataBus.setPlayerMoveInput(0);
        setGameMode("top-down");
    };

    const canvas =
        gameMode === "side-scroller" ? (
            <SideScrollerCanvas
                width={width}
                height={height}
                worldWidth={GAME_VIEW_CONFIG.world.width}
                worldHeight={GAME_VIEW_CONFIG.world.height}
                cameraMode={GAME_VIEW_CONFIG.camera.mode}
                cameraClampToWorld={GAME_VIEW_CONFIG.camera.clampToWorld}
                manualCameraStartX={GAME_VIEW_CONFIG.camera.manualStart.x}
                manualCameraStartY={GAME_VIEW_CONFIG.camera.manualStart.y}
                containerRef={gameScreenRef}
                showDebugOutlines={showDebugOutlines}
            />
        ) : (
            <TopDownCanvas
                width={width}
                height={height}
                worldWidth={GAME_VIEW_CONFIG.world.width}
                worldHeight={GAME_VIEW_CONFIG.world.height}
                cameraMode={GAME_VIEW_CONFIG.camera.mode}
                cameraClampToWorld={GAME_VIEW_CONFIG.camera.clampToWorld}
                manualCameraStartX={GAME_VIEW_CONFIG.camera.manualStart.x}
                manualCameraStartY={GAME_VIEW_CONFIG.camera.manualStart.y}
                containerRef={gameScreenRef}
                showDebugOutlines={showDebugOutlines}
            />
        );

    const controls =
        gameMode === "side-scroller" ? (
            <SideScrollerControls onMove={handleMove} />
        ) : (
            <TopDownControls onMove={handleMove} allowDiagonal />
        );

    const modeLabel =
        gameMode === "side-scroller" ? "Side Scroller" : "Top Down";

    return (
        <div className="GameContainer">
            <header className="AppHeader">
                <p className="AppEyebrow">UrsaManus Engine</p>
                <h1 className="AppTitle">
                    Build fast with modular gameplay presets
                </h1>
                <p className="AppSubtitle">
                    Start in side-scroller or top-down mode, then extend systems
                    as your project grows.
                </p>
            </header>

            <div className="GameSurface">
                <div className="GameControlsRow">
                    <div
                        className="GameModeSwitcher"
                        role="group"
                        aria-label="Game mode"
                    >
                        <button
                            type="button"
                            className={
                                gameMode === "side-scroller"
                                    ? "game-mode-button game-mode-button--side-scroller is-active"
                                    : "game-mode-button game-mode-button--side-scroller"
                            }
                            onClick={switchToSideScroller}
                        >
                            Side Scroller
                        </button>
                        <button
                            type="button"
                            className={
                                gameMode === "top-down"
                                    ? "game-mode-button game-mode-button--top-down is-active"
                                    : "game-mode-button game-mode-button--top-down"
                            }
                            onClick={switchToTopDown}
                        >
                            Top Down
                        </button>
                    </div>
                    {isDevMode ? (
                        <div className="DevToolsGroup">
                            <button
                                type="button"
                                className={
                                    showDebugOutlines
                                        ? "DebugToggle DebugToggle--active"
                                        : "DebugToggle"
                                }
                                aria-pressed={showDebugOutlines}
                                onClick={(event) => {
                                    setShowDebugOutlines((current) => !current);
                                    event.currentTarget.blur();
                                }}
                            >
                                {showDebugOutlines
                                    ? "Hide debug outlines"
                                    : "Show debug outlines"}
                            </button>

                            <button
                                type="button"
                                className={
                                    showDevControls
                                        ? "DebugToggle DebugToggle--active"
                                        : "DebugToggle"
                                }
                                aria-pressed={showDevControls}
                                onClick={(event) => {
                                    setShowDevControls((current) => !current);
                                    event.currentTarget.blur();
                                }}
                            >
                                {showDevControls
                                    ? "Hide dev controls"
                                    : "Show dev controls"}
                            </button>
                        </div>
                    ) : null}
                </div>

                {isDevMode && showDevControls ? (
                    <aside
                        className="DevControlsTab"
                        aria-label="Default dev controls"
                    >
                        <p className="DevControlsTitle">Default dev controls</p>
                        <ul className="DevControlsList">
                            <li>
                                <span className="DevKey">T</span>
                                Cycle screen transition previews
                            </li>
                            <li>
                                <span className="DevKey">P</span>
                                Spawn particle presets
                            </li>
                            <li>
                                <span className="DevKey">F</span>
                                Start torch flame at mouse position
                            </li>
                            <li>
                                <span className="DevKey">Shift + F</span>
                                Stop torch flame emitter
                            </li>
                            <li>
                                <span className="DevKey">I / J / K / L</span>
                                Pan camera in manual mode
                            </li>
                            <li>
                                <span className="DevKey">
                                    Shift + I / J / K / L
                                </span>
                                Pan camera faster in manual mode
                            </li>
                            <li>
                                <span className="DevKey">Arrows / WASD</span>
                                Move player
                            </li>
                            <li>
                                <span className="DevKey">Space / ↑</span>
                                Jump in side-scroller mode
                            </li>
                        </ul>
                    </aside>
                ) : null}

                <div className="CanvasPanel">
                    <div className="CanvasMetaRow" aria-label="Canvas details">
                        <span
                            className={`CanvasMetaPill CanvasMetaPill--mode CanvasMetaPill--${gameMode}`}
                        >
                            Mode: {modeLabel}
                        </span>
                        <span className="CanvasMetaPill">
                            Resolution: {width}×{height}
                        </span>
                        {isDevMode ? (
                            <>
                                <span className="CanvasMetaPill">
                                    World: {state.worldSize.width}×
                                    {state.worldSize.height}
                                </span>
                                <span className="CanvasMetaPill">
                                    Viewport: {camera.viewport.width}×
                                    {camera.viewport.height}
                                </span>
                                <span className="CanvasMetaPill">
                                    Camera: {cameraModeLabel} (
                                    {Math.round(camera.x)},
                                    {Math.round(camera.y)})
                                </span>
                            </>
                        ) : null}
                    </div>
                    {canvas}
                </div>
                <div className="ControlsPanel">{controls}</div>
            </div>
        </div>
    );
}
