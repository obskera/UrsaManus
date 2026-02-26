// src/App.tsx (dynamic: sync DataBus to Render props)
import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
} from "react";
import {
    SideScrollerControls,
    TopDownControls,
} from "./components/screenController";
import { SideScrollerCanvas, TopDownCanvas } from "./components/gameModes";
import {
    ActionButtonExample,
    CooldownIndicatorExample,
    HUDAnchorExample,
    HUDSlotExample,
    LifeGaugeExample,
    PlatformerHUDPresetExample,
    QuickHUDLayoutExample,
    ToggleExample,
    VirtualActionButtonExample,
    VirtualDPadExample,
    TopDownHUDPresetExample,
} from "./components/examples";
import { setupDevEffectHotkeys } from "./components/effects/dev";
import { GAME_VIEW_CONFIG } from "@/config/gameViewConfig";
import { dataBus } from "./services/DataBus";
import {
    createQuickSaveScheduler,
    exportSaveFile,
    importSaveFile,
    quickLoad,
    quickSave,
} from "@/services/save";
import "./App.css";

type GameMode = "side-scroller" | "top-down";
type DevSaveStatusTone = "neutral" | "success" | "error";

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
    const [showExamplesTab, setShowExamplesTab] = useState(false);
    const [devSaveStatus, setDevSaveStatus] = useState<{
        tone: DevSaveStatusTone;
        message: string;
    } | null>(null);
    const [gameMode, setGameMode] = useState<GameMode>(() => {
        const modeFromQuery = normalizeGameMode(
            new URLSearchParams(window.location.search).get(
                GAME_MODE_QUERY_KEY,
            ),
        );

        return modeFromQuery ?? "side-scroller";
    });
    const gameScreenRef = useRef<HTMLDivElement | null>(null);
    const saveImportInputRef = useRef<HTMLInputElement | null>(null);
    const devSaveStatusTimerRef = useRef<number | null>(null);
    const quickSaveSchedulerRef = useRef(
        createQuickSaveScheduler({ waitMs: 700 }),
    );

    const publishDevSaveStatus = useCallback(
        (message: string, tone: DevSaveStatusTone = "neutral") => {
            setDevSaveStatus({ message, tone });

            if (devSaveStatusTimerRef.current !== null) {
                window.clearTimeout(devSaveStatusTimerRef.current);
            }

            devSaveStatusTimerRef.current = window.setTimeout(() => {
                setDevSaveStatus(null);
                devSaveStatusTimerRef.current = null;
            }, 2600);
        },
        [],
    );

    const runQuickSaveAction = useCallback(() => {
        const ok = quickSave();

        if (ok) {
            setHasProgress(true);
            publishDevSaveStatus("Quick save complete", "success");
            return;
        }

        publishDevSaveStatus("Quick save failed", "error");
    }, [publishDevSaveStatus]);

    const runQuickLoadAction = useCallback(() => {
        const ok = quickLoad();

        if (ok) {
            setHasProgress(true);
            publishDevSaveStatus("Quick load complete", "success");
            force((n) => n + 1);
            return;
        }

        publishDevSaveStatus("No quick save found", "neutral");
    }, [publishDevSaveStatus]);

    const runExportSaveAction = useCallback(() => {
        const result = exportSaveFile();

        if (result.ok) {
            publishDevSaveStatus(`Exported ${result.fileName}`, "success");
            return;
        }

        publishDevSaveStatus(result.message, "error");
    }, [publishDevSaveStatus]);

    const triggerImportPicker = useCallback(() => {
        saveImportInputRef.current?.click();
    }, []);

    const onImportFileChange = useCallback(
        async (event: ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            if (!file) return;

            const result = await importSaveFile(file);
            if (result.ok) {
                setHasProgress(true);
                publishDevSaveStatus(`Imported ${result.fileName}`, "success");
                force((n) => n + 1);
            } else {
                publishDevSaveStatus(result.message, "error");
            }

            event.target.value = "";
        },
        [publishDevSaveStatus],
    );

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
        const quickSaveScheduler = quickSaveSchedulerRef.current;
        const didRestore = quickLoad();
        if (didRestore) {
            queueMicrotask(() => {
                setHasProgress(true);
                force((n) => n + 1);
            });
        }

        return () => {
            if (devSaveStatusTimerRef.current !== null) {
                window.clearTimeout(devSaveStatusTimerRef.current);
                devSaveStatusTimerRef.current = null;
            }
            quickSaveScheduler.dispose();
        };
    }, []);

    useEffect(() => {
        if (!isDevMode) {
            return;
        }

        const onKeyDown = (event: KeyboardEvent) => {
            if (!event.altKey || !event.shiftKey) {
                return;
            }

            const target = event.target as HTMLElement | null;
            if (
                target &&
                (target.tagName === "INPUT" ||
                    target.tagName === "TEXTAREA" ||
                    target.tagName === "SELECT" ||
                    target.isContentEditable)
            ) {
                return;
            }

            const key = event.key.toLowerCase();
            if (key === "s") {
                event.preventDefault();
                runQuickSaveAction();
                return;
            }

            if (key === "l") {
                event.preventDefault();
                runQuickLoadAction();
                return;
            }

            if (key === "e") {
                event.preventDefault();
                runExportSaveAction();
                return;
            }

            if (key === "i") {
                event.preventDefault();
                triggerImportPicker();
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [
        isDevMode,
        runExportSaveAction,
        runQuickLoadAction,
        runQuickSaveAction,
        triggerImportPicker,
    ]);

    useEffect(() => {
        return setupDevEffectHotkeys({
            enabled: import.meta.env.DEV,
            width,
            height,
            getContainer: () => gameScreenRef.current,
            cameraPanStepPx,
            cameraPanFastMultiplier,
            onCameraPan: () => {
                quickSaveSchedulerRef.current.notifyChange();
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
                quickSaveSchedulerRef.current.notifyChange();
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
        quickSaveSchedulerRef.current.notifyChange();
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

                            <button
                                type="button"
                                className={
                                    showExamplesTab
                                        ? "DebugToggle DebugToggle--active"
                                        : "DebugToggle"
                                }
                                aria-pressed={showExamplesTab}
                                onClick={(event) => {
                                    setShowExamplesTab((current) => !current);
                                    event.currentTarget.blur();
                                }}
                            >
                                {showExamplesTab
                                    ? "Hide example components"
                                    : "Show example components"}
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
                        <div
                            className="DevSaveActionRow"
                            role="group"
                            aria-label="Save and load actions"
                        >
                            <button
                                type="button"
                                className="DebugToggle"
                                onClick={(event) => {
                                    runQuickSaveAction();
                                    event.currentTarget.blur();
                                }}
                            >
                                Quick Save
                            </button>
                            <button
                                type="button"
                                className="DebugToggle"
                                onClick={(event) => {
                                    runQuickLoadAction();
                                    event.currentTarget.blur();
                                }}
                            >
                                Quick Load
                            </button>
                            <button
                                type="button"
                                className="DebugToggle"
                                onClick={(event) => {
                                    runExportSaveAction();
                                    event.currentTarget.blur();
                                }}
                            >
                                Export Save
                            </button>
                            <button
                                type="button"
                                className="DebugToggle"
                                onClick={(event) => {
                                    triggerImportPicker();
                                    event.currentTarget.blur();
                                }}
                            >
                                Import Save
                            </button>
                            <input
                                ref={saveImportInputRef}
                                type="file"
                                accept="application/json,.json"
                                className="DevHiddenFileInput"
                                onChange={(event) => {
                                    void onImportFileChange(event);
                                }}
                            />
                        </div>
                        {devSaveStatus ? (
                            <p
                                className={`DevSaveStatus DevSaveStatus--${devSaveStatus.tone}`}
                                role="status"
                                aria-live="polite"
                            >
                                {devSaveStatus.message}
                            </p>
                        ) : null}
                        <ul className="DevControlsList">
                            <li>
                                <span className="DevKey">Alt + Shift + S</span>
                                Quick save
                            </li>
                            <li>
                                <span className="DevKey">Alt + Shift + L</span>
                                Quick load
                            </li>
                            <li>
                                <span className="DevKey">Alt + Shift + E</span>
                                Export save file
                            </li>
                            <li>
                                <span className="DevKey">Alt + Shift + I</span>
                                Import save file
                            </li>
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

                {isDevMode && showExamplesTab ? (
                    <aside className="DevControlsTab DevExamplesTab">
                        <p className="DevControlsTitle">Example components</p>
                        <div className="DevExamplesArea DevExamplesStack">
                            <LifeGaugeExample title="LifeGauge preview" />
                            <ActionButtonExample title="ActionButton preview" />
                            <ToggleExample title="Toggle preview" />
                            <VirtualActionButtonExample title="VirtualActionButton preview" />
                            <VirtualDPadExample title="VirtualDPad preview" />
                            <CooldownIndicatorExample title="CooldownIndicator preview" />
                            <HUDSlotExample title="HUDSlot preview" />
                            <HUDAnchorExample title="HUDAnchor preview" />
                            <QuickHUDLayoutExample title="QuickHUDLayout preview" />
                            <PlatformerHUDPresetExample title="PlatformerHUDPreset preview" />
                            <TopDownHUDPresetExample title="TopDownHUDPreset preview" />
                        </div>
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
