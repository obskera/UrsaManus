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
    usePointerTapTracking,
    type PointerTapPayload,
} from "./components/screenController";
import { SideScrollerCanvas, TopDownCanvas } from "./components/gameModes";
import {
    ActionButtonExample,
    AbilityBarExample,
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
    TopDownMiniGameExample,
    SideScrollerMiniGameExample,
    MainMenuExample,
    PauseMenuExample,
    GameOverScreenExample,
    TextBoxExample,
    ToastsExample,
} from "./components/examples";
import { setupDevEffectHotkeys } from "./components/effects/dev";
import { GAME_VIEW_CONFIG } from "@/config/gameViewConfig";
import { dataBus } from "./services/DataBus";
import { audioBus } from "@/services/audioBus";
import {
    createQuickSaveScheduler,
    exportSaveFile,
    importSaveFile,
    quickLoad,
    quickSave,
    sanitizePersistedState,
    type PersistedStateSanitizeScope,
} from "@/services/save";
import "./App.css";

type GameMode = "side-scroller" | "top-down";
type DevSaveStatusTone = "neutral" | "success" | "error";
type InteractBehaviorMode = "attack" | "dodge";

type CanvasTapMarker = {
    x: number;
    y: number;
};

type DevPerfStats = {
    fps: number;
    frameMs: number;
};

const GAME_MODE_QUERY_KEY = "mode";
const AUDIO_MUTE_STORAGE_KEY = "ursa:audio:masterMuted:v1";
const AUDIO_MUSIC_MUTE_STORAGE_KEY = "ursa:audio:musicMuted:v1";
const AUDIO_SFX_MUTE_STORAGE_KEY = "ursa:audio:sfxMuted:v1";

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
    const [devInteractBehavior, setDevInteractBehavior] =
        useState<InteractBehaviorMode>("attack");
    const [devBossTargetIndex, setDevBossTargetIndex] = useState(0);
    const [canvasPresetRevision, setCanvasPresetRevision] = useState(0);
    const [canvasTapMarker, setCanvasTapMarker] =
        useState<CanvasTapMarker | null>(null);
    const [devPerfStats, setDevPerfStats] = useState<DevPerfStats>({
        fps: 0,
        frameMs: 0,
    });
    const [isAudioMuted, setIsAudioMuted] = useState(() => {
        const fallback = audioBus.getState().masterMuted;

        try {
            const storedValue = window.localStorage.getItem(
                AUDIO_MUTE_STORAGE_KEY,
            );
            if (storedValue === null) {
                audioBus.setMasterMuted(fallback);
                return fallback;
            }

            const parsed = storedValue === "1" || storedValue === "true";
            audioBus.setMasterMuted(parsed);
            return parsed;
        } catch {
            audioBus.setMasterMuted(fallback);
            return fallback;
        }
    });
    const [isMusicMuted, setIsMusicMuted] = useState(() => {
        const fallback = audioBus.getState().channelMuted.music;

        try {
            const storedValue = window.localStorage.getItem(
                AUDIO_MUSIC_MUTE_STORAGE_KEY,
            );
            if (storedValue === null) {
                audioBus.setChannelMuted("music", fallback);
                return fallback;
            }

            const parsed = storedValue === "1" || storedValue === "true";
            audioBus.setChannelMuted("music", parsed);
            return parsed;
        } catch {
            audioBus.setChannelMuted("music", fallback);
            return fallback;
        }
    });
    const [isSfxMuted, setIsSfxMuted] = useState(() => {
        const fallback = audioBus.getState().channelMuted.sfx;

        try {
            const storedValue = window.localStorage.getItem(
                AUDIO_SFX_MUTE_STORAGE_KEY,
            );
            if (storedValue === null) {
                audioBus.setChannelMuted("sfx", fallback);
                return fallback;
            }

            const parsed = storedValue === "1" || storedValue === "true";
            audioBus.setChannelMuted("sfx", parsed);
            return parsed;
        } catch {
            audioBus.setChannelMuted("sfx", fallback);
            return fallback;
        }
    });
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
    const devPerfRafRef = useRef<number | null>(null);
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

    const runSanitizeStateAction = useCallback(
        (scope: PersistedStateSanitizeScope = "all") => {
            const result = sanitizePersistedState(scope);
            if (!result.ok) {
                publishDevSaveStatus("State sanitize failed", "error");
                return;
            }

            if (scope === "all") {
                audioBus.setMasterMuted(false);
                audioBus.setChannelMuted("music", false);
                audioBus.setChannelMuted("sfx", false);
                setIsAudioMuted(false);
                setIsMusicMuted(false);
                setIsSfxMuted(false);
            }

            setHasProgress(false);

            const label =
                scope === "all"
                    ? "Sanitized local Ursa state"
                    : scope === "input-profiles"
                      ? "Sanitized input profiles"
                      : "Sanitized quick save state";
            publishDevSaveStatus(
                `${label} (${result.removedKeys.length} keys)`,
                "success",
            );
        },
        [publishDevSaveStatus],
    );

    const confirmSanitizeStateAction = useCallback(
        (scope: PersistedStateSanitizeScope = "all") => {
            const scopeLabel =
                scope === "all"
                    ? "all local Ursa state"
                    : scope === "input-profiles"
                      ? "input profile state"
                      : "quick save state";

            if (
                typeof window !== "undefined" &&
                !window.confirm(
                    `Confirm sanitize of ${scopeLabel}? This cannot be undone.`,
                )
            ) {
                publishDevSaveStatus("Sanitize cancelled", "neutral");
                return;
            }

            runSanitizeStateAction(scope);
        },
        [publishDevSaveStatus, runSanitizeStateAction],
    );

    const toggleWorldPauseAction = useCallback(() => {
        const pauseReason = "dev-toggle";

        if (dataBus.isWorldPaused()) {
            dataBus.resumeWorld(pauseReason);
            publishDevSaveStatus("World -> running", "success");
        } else {
            dataBus.pauseWorld(pauseReason);
            publishDevSaveStatus("World -> paused", "neutral");
        }

        force((n) => n + 1);
    }, [publishDevSaveStatus]);

    const toggleInteractBehaviorAction = useCallback(() => {
        setDevInteractBehavior((current) => {
            const next: InteractBehaviorMode =
                current === "attack" ? "dodge" : "attack";
            const label = next === "dodge" ? "Dodge" : "Attack";
            publishDevSaveStatus(`Interact behavior: ${label}`, "neutral");
            return next;
        });
    }, [publishDevSaveStatus]);

    const triggerPlayerDodgeAction = useCallback(() => {
        dataBus.markPlayerDodging();
        publishDevSaveStatus("Player -> dodge", "neutral");
        force((n) => n + 1);
    }, [publishDevSaveStatus]);

    const triggerPlayerAttackAction = useCallback(() => {
        dataBus.markPlayerAttacking();
        publishDevSaveStatus("Player -> attack", "neutral");
        force((n) => n + 1);
    }, [publishDevSaveStatus]);

    const triggerPlayerBlockAction = useCallback(() => {
        dataBus.markPlayerBlocking();
        publishDevSaveStatus("Player -> block", "neutral");
        force((n) => n + 1);
    }, [publishDevSaveStatus]);

    const triggerPlayerDamagedAction = useCallback(() => {
        dataBus.markPlayerDamaged();
        publishDevSaveStatus("Player -> damaged", "neutral");
        force((n) => n + 1);
    }, [publishDevSaveStatus]);

    const triggerPlayerStunnedAction = useCallback(() => {
        dataBus.markPlayerStunned();
        publishDevSaveStatus("Player -> stunned", "neutral");
        force((n) => n + 1);
    }, [publishDevSaveStatus]);

    const triggerBossPhaseAction = useCallback(
        (phase: "phase-1" | "phase-2") => {
            const enemyIds = Object.values(dataBus.getState().entitiesById)
                .filter((entity) => entity.type === "enemy")
                .map((entity) => entity.id);
            const targetId =
                enemyIds[devBossTargetIndex] ?? enemyIds[0] ?? null;

            if (!targetId) {
                publishDevSaveStatus("Boss target unavailable", "error");
                return;
            }

            dataBus.setEntityBossPhase(targetId, phase);
            publishDevSaveStatus(
                `Boss ${targetId.slice(0, 8)} -> ${phase === "phase-1" ? "p1" : "p2"}`,
                "neutral",
            );
            force((n) => n + 1);
        },
        [devBossTargetIndex, publishDevSaveStatus],
    );

    const cycleBossTargetAction = useCallback(() => {
        const enemyIds = Object.values(dataBus.getState().entitiesById)
            .filter((entity) => entity.type === "enemy")
            .map((entity) => entity.id);
        const enemyCount = enemyIds.length;

        if (enemyCount <= 0) {
            publishDevSaveStatus("Boss target unavailable", "error");
            return;
        }

        setDevBossTargetIndex((current) => {
            const normalizedCurrent = Math.min(
                Math.max(current, 0),
                enemyCount - 1,
            );
            const next = (normalizedCurrent + 1) % enemyCount;
            const nextId = enemyIds[next] ?? enemyIds[0];
            if (nextId) {
                const wrapped =
                    enemyCount > 1 &&
                    normalizedCurrent === enemyCount - 1 &&
                    next === 0;
                publishDevSaveStatus(
                    wrapped
                        ? `Boss tgt [next] ${next + 1}/${enemyCount} ${nextId.slice(0, 8)} (wrap)`
                        : `Boss tgt [next] ${next + 1}/${enemyCount} ${nextId.slice(0, 8)}`,
                    "neutral",
                );
            }
            return next;
        });
    }, [publishDevSaveStatus]);

    const cycleBossTargetReverseAction = useCallback(() => {
        const enemyIds = Object.values(dataBus.getState().entitiesById)
            .filter((entity) => entity.type === "enemy")
            .map((entity) => entity.id);
        const enemyCount = enemyIds.length;

        if (enemyCount <= 0) {
            publishDevSaveStatus("Boss target unavailable", "error");
            return;
        }

        setDevBossTargetIndex((current) => {
            const normalizedCurrent = Math.min(
                Math.max(current, 0),
                enemyCount - 1,
            );
            const next = (normalizedCurrent - 1 + enemyCount) % enemyCount;
            const nextId = enemyIds[next] ?? enemyIds[enemyCount - 1];
            if (nextId) {
                const wrapped =
                    enemyCount > 1 &&
                    normalizedCurrent === 0 &&
                    next === enemyCount - 1;
                publishDevSaveStatus(
                    wrapped
                        ? `Boss tgt [prev] ${next + 1}/${enemyCount} ${nextId.slice(0, 8)} (wrap)`
                        : `Boss tgt [prev] ${next + 1}/${enemyCount} ${nextId.slice(0, 8)}`,
                    "neutral",
                );
            }
            return next;
        });
    }, [publishDevSaveStatus]);

    const toggleAudioMuted = useCallback(() => {
        setIsAudioMuted((current) => {
            const next = !current;
            audioBus.setMasterMuted(next);

            try {
                window.localStorage.setItem(
                    AUDIO_MUTE_STORAGE_KEY,
                    next ? "1" : "0",
                );
            } catch {
                return next;
            }

            return next;
        });
    }, []);

    const toggleMusicMuted = useCallback(() => {
        setIsMusicMuted((current) => {
            const next = !current;
            audioBus.setChannelMuted("music", next);

            try {
                window.localStorage.setItem(
                    AUDIO_MUSIC_MUTE_STORAGE_KEY,
                    next ? "1" : "0",
                );
            } catch {
                return next;
            }

            return next;
        });
    }, []);

    const toggleSfxMuted = useCallback(() => {
        setIsSfxMuted((current) => {
            const next = !current;
            audioBus.setChannelMuted("sfx", next);

            try {
                window.localStorage.setItem(
                    AUDIO_SFX_MUTE_STORAGE_KEY,
                    next ? "1" : "0",
                );
            } catch {
                return next;
            }

            return next;
        });
    }, []);

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
    const playerBehaviorState = dataBus.getEntityBehaviorState(state.playerId);
    const playerBehaviorTrail = dataBus
        .getEntityBehaviorTransitions(state.playerId, 3)
        .map((entry) => `${entry.from}→${entry.to}@${Math.round(entry.atMs)}`)
        .join(" | ");
    const formatNpcTrailMs = (value: number) => Math.round(value / 10) * 10;
    const npcBehaviorStates = Object.values(state.entitiesById)
        .filter((entity) => entity.type === "enemy")
        .map((entity) => ({
            id: entity.id,
            state: dataBus.getEntityBehaviorState(entity.id),
            trail: dataBus
                .getEntityBehaviorTransitions(entity.id, 2)
                .map(
                    (entry) =>
                        `${entry.from}→${entry.to}@${formatNpcTrailMs(entry.atMs)}`,
                )
                .join(" · "),
        }));
    const npcBehaviorTooltip = npcBehaviorStates
        .map((entry) =>
            entry.trail
                ? `${entry.id}:${entry.state} [${entry.trail}]`
                : `${entry.id}:${entry.state}`,
        )
        .join(" | ");
    const totalEntityCount = Object.keys(state.entitiesById).length;
    const enemyEntityCount = npcBehaviorStates.length;
    const devBossTargetCount = npcBehaviorStates.length;
    const devBossTargetId =
        npcBehaviorStates[devBossTargetIndex]?.id ??
        npcBehaviorStates[0]?.id ??
        null;
    const devBossTargetSlotLabel =
        devBossTargetCount > 0
            ? `${Math.min(devBossTargetIndex + 1, devBossTargetCount)}/${devBossTargetCount}`
            : "0/0";
    const devBossTargetLabel = devBossTargetId
        ? devBossTargetId.slice(0, 8)
        : "none";
    const devBossPhaseLabel = devBossTargetId
        ? dataBus.getEntityBehaviorState(devBossTargetId)
        : "n/a";
    const isWorldPaused = dataBus.isWorldPaused();

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
                setCanvasPresetRevision((value) => value + 1);
                setHasProgress(true);
                force((n) => n + 1);
            });
        }

        return () => {
            if (devSaveStatusTimerRef.current !== null) {
                window.clearTimeout(devSaveStatusTimerRef.current);
                devSaveStatusTimerRef.current = null;
            }
            if (devPerfRafRef.current !== null) {
                window.cancelAnimationFrame(devPerfRafRef.current);
                devPerfRafRef.current = null;
            }
            quickSaveScheduler.dispose();
        };
    }, []);

    useEffect(() => {
        if (!isDevMode) {
            return;
        }

        let isDisposed = false;
        let lastNow = performance.now();
        let sampleStart = lastNow;
        let sampleFrames = 0;
        let smoothedFrameMs = 16.7;

        const tick = (now: number) => {
            if (isDisposed) {
                return;
            }

            const deltaMs = Math.max(0, now - lastNow);
            lastNow = now;
            sampleFrames += 1;

            if (deltaMs > 0) {
                smoothedFrameMs = smoothedFrameMs * 0.85 + deltaMs * 0.15;
            }

            const sampleWindowMs = now - sampleStart;
            if (sampleWindowMs >= 500) {
                const fps = (sampleFrames * 1000) / sampleWindowMs;
                setDevPerfStats({
                    fps: Math.round(fps * 10) / 10,
                    frameMs: Math.round(smoothedFrameMs * 10) / 10,
                });
                sampleFrames = 0;
                sampleStart = now;
            }

            devPerfRafRef.current = window.requestAnimationFrame(tick);
        };

        devPerfRafRef.current = window.requestAnimationFrame(tick);

        return () => {
            isDisposed = true;
            if (devPerfRafRef.current !== null) {
                window.cancelAnimationFrame(devPerfRafRef.current);
                devPerfRafRef.current = null;
            }
        };
    }, [isDevMode]);

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
                return;
            }

            if (key === "m") {
                event.preventDefault();
                toggleAudioMuted();
                return;
            }

            if (key === "n") {
                event.preventDefault();
                toggleMusicMuted();
                return;
            }

            if (key === "b") {
                event.preventDefault();
                toggleSfxMuted();
                return;
            }

            if (key === "p") {
                event.preventDefault();
                toggleWorldPauseAction();
                return;
            }

            if (key === "d") {
                event.preventDefault();
                toggleInteractBehaviorAction();
                return;
            }

            if (key === "a") {
                event.preventDefault();
                triggerPlayerAttackAction();
                return;
            }

            if (key === "z") {
                event.preventDefault();
                triggerPlayerDodgeAction();
                return;
            }

            if (key === "x") {
                event.preventDefault();
                triggerPlayerBlockAction();
                return;
            }

            if (key === "c") {
                event.preventDefault();
                triggerPlayerDamagedAction();
                return;
            }

            if (key === "v") {
                event.preventDefault();
                triggerPlayerStunnedAction();
                return;
            }

            if (key === "g") {
                event.preventDefault();
                triggerBossPhaseAction("phase-1");
                return;
            }

            if (key === "h") {
                event.preventDefault();
                triggerBossPhaseAction("phase-2");
                return;
            }

            if (key === "j") {
                event.preventDefault();
                cycleBossTargetAction();
                return;
            }

            if (key === "k") {
                event.preventDefault();
                cycleBossTargetReverseAction();
                return;
            }

            if (key === "q") {
                event.preventDefault();
                confirmSanitizeStateAction("save-only");
                return;
            }

            if (key === "y") {
                event.preventDefault();
                confirmSanitizeStateAction("input-profiles");
                return;
            }

            if (key === "r") {
                event.preventDefault();
                confirmSanitizeStateAction("all");
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
        cycleBossTargetAction,
        cycleBossTargetReverseAction,
        confirmSanitizeStateAction,
        triggerBossPhaseAction,
        triggerPlayerAttackAction,
        triggerPlayerBlockAction,
        triggerPlayerDamagedAction,
        triggerPlayerDodgeAction,
        triggerPlayerStunnedAction,
        toggleInteractBehaviorAction,
        toggleWorldPauseAction,
        toggleAudioMuted,
        toggleMusicMuted,
        toggleSfxMuted,
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
        audioBus.play("player:step", {
            channel: "sfx",
            volume: 0.55,
            restartIfPlaying: false,
        });
        setHasProgress(true);
        quickSaveSchedulerRef.current.notifyChange();
        force((n) => n + 1);
    }, []);

    const handleCanvasTap = useCallback((payload: PointerTapPayload) => {
        if (!payload.insideTarget) {
            return;
        }

        const gameScreen = gameScreenRef.current;
        const canvasElement = gameScreen?.querySelector("canvas");

        if (!gameScreen || !canvasElement) {
            return;
        }

        const gameScreenRect = gameScreen.getBoundingClientRect();
        const canvasRect = canvasElement.getBoundingClientRect();
        const markerX = canvasRect.left - gameScreenRect.left + payload.localX;
        const markerY = canvasRect.top - gameScreenRect.top + payload.localY;

        setCanvasTapMarker({
            x: markerX,
            y: markerY,
        });

        audioBus.play("ui:tap:beep", {
            channel: "ui",
            restartIfPlaying: true,
            volume: 0.9,
        });
    }, []);

    const getCanvasElement = useCallback(() => {
        return gameScreenRef.current?.querySelector("canvas") ?? null;
    }, []);

    usePointerTapTracking({
        enabled: true,
        getTarget: getCanvasElement,
        onTap: handleCanvasTap,
    });

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
                key={`side-scroller-${canvasPresetRevision}`}
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
                tapMarker={canvasTapMarker}
            />
        ) : (
            <TopDownCanvas
                key={`top-down-${canvasPresetRevision}`}
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
                tapMarker={canvasTapMarker}
            />
        );

    const controls =
        gameMode === "side-scroller" ? (
            <SideScrollerControls
                onMove={handleMove}
                interactBehavior={devInteractBehavior}
            />
        ) : (
            <TopDownControls
                onMove={handleMove}
                allowDiagonal
                interactBehavior={devInteractBehavior}
            />
        );

    const modeLabel =
        gameMode === "side-scroller" ? "Side Scroller" : "Top Down";

    const audioStatusLabel = isAudioMuted
        ? "Muted"
        : isMusicMuted && isSfxMuted
          ? "Music/SFX off"
          : isMusicMuted
            ? "Music off"
            : isSfxMuted
              ? "SFX off"
              : "On";
    const interactModeLabel =
        devInteractBehavior === "dodge" ? "Dodge" : "Attack";

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
                    <div
                        className="DevToolsGroup"
                        role="group"
                        aria-label="Audio controls"
                    >
                        <button
                            type="button"
                            className={
                                isAudioMuted
                                    ? "DebugToggle DebugToggle--active"
                                    : "DebugToggle"
                            }
                            aria-pressed={isAudioMuted}
                            onClick={(event) => {
                                toggleAudioMuted();
                                event.currentTarget.blur();
                            }}
                        >
                            {isAudioMuted ? "Unmute audio" : "Mute audio"}
                        </button>
                        <button
                            type="button"
                            className={
                                isMusicMuted
                                    ? "DebugToggle DebugToggle--active"
                                    : "DebugToggle"
                            }
                            aria-pressed={isMusicMuted}
                            onClick={(event) => {
                                toggleMusicMuted();
                                event.currentTarget.blur();
                            }}
                        >
                            {isMusicMuted ? "Unmute music" : "Mute music"}
                        </button>
                        <button
                            type="button"
                            className={
                                isSfxMuted
                                    ? "DebugToggle DebugToggle--active"
                                    : "DebugToggle"
                            }
                            aria-pressed={isSfxMuted}
                            onClick={(event) => {
                                toggleSfxMuted();
                                event.currentTarget.blur();
                            }}
                        >
                            {isSfxMuted ? "Unmute SFX" : "Mute SFX"}
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
                            <button
                                type="button"
                                className="DebugToggle"
                                onClick={(event) => {
                                    confirmSanitizeStateAction("save-only");
                                    event.currentTarget.blur();
                                }}
                            >
                                Sanitize Save State
                            </button>
                            <button
                                type="button"
                                className="DebugToggle"
                                onClick={(event) => {
                                    confirmSanitizeStateAction(
                                        "input-profiles",
                                    );
                                    event.currentTarget.blur();
                                }}
                            >
                                Sanitize Input Profiles
                            </button>
                            <button
                                type="button"
                                className="DebugToggle"
                                onClick={(event) => {
                                    confirmSanitizeStateAction("all");
                                    event.currentTarget.blur();
                                }}
                            >
                                Sanitize Local Ursa State
                            </button>
                            <button
                                type="button"
                                className={
                                    isWorldPaused
                                        ? "DebugToggle DebugToggle--active"
                                        : "DebugToggle"
                                }
                                aria-pressed={isWorldPaused}
                                onClick={(event) => {
                                    toggleWorldPauseAction();
                                    event.currentTarget.blur();
                                }}
                            >
                                {isWorldPaused ? "Resume World" : "Pause World"}
                            </button>
                            <button
                                type="button"
                                className={
                                    devInteractBehavior === "dodge"
                                        ? "DebugToggle DebugToggle--active"
                                        : "DebugToggle"
                                }
                                aria-pressed={devInteractBehavior === "dodge"}
                                onClick={(event) => {
                                    toggleInteractBehaviorAction();
                                    event.currentTarget.blur();
                                }}
                            >
                                Interact Mode: {interactModeLabel}
                            </button>
                            <span className="DevActionLabel" role="note">
                                Boss Phase
                            </span>
                            <button
                                type="button"
                                className="DebugToggle"
                                onClick={(event) => {
                                    cycleBossTargetAction();
                                    event.currentTarget.blur();
                                }}
                            >
                                Cycle Boss Target
                            </button>
                            <button
                                type="button"
                                className="DebugToggle"
                                onClick={(event) => {
                                    cycleBossTargetReverseAction();
                                    event.currentTarget.blur();
                                }}
                            >
                                Cycle Boss Target (Prev)
                            </button>
                            <button
                                type="button"
                                className="DebugToggle"
                                onClick={(event) => {
                                    triggerBossPhaseAction("phase-1");
                                    event.currentTarget.blur();
                                }}
                            >
                                Boss Phase 1
                            </button>
                            <button
                                type="button"
                                className="DebugToggle"
                                onClick={(event) => {
                                    triggerBossPhaseAction("phase-2");
                                    event.currentTarget.blur();
                                }}
                            >
                                Boss Phase 2
                            </button>
                            <span className="DevActionLabel" role="note">
                                Player Timed Triggers
                            </span>
                            <button
                                type="button"
                                className="DebugToggle"
                                onClick={(event) => {
                                    triggerPlayerAttackAction();
                                    event.currentTarget.blur();
                                }}
                            >
                                Player Attack
                            </button>
                            <button
                                type="button"
                                className="DebugToggle"
                                onClick={(event) => {
                                    triggerPlayerDodgeAction();
                                    event.currentTarget.blur();
                                }}
                            >
                                Player Dodge
                            </button>
                            <button
                                type="button"
                                className="DebugToggle"
                                onClick={(event) => {
                                    triggerPlayerBlockAction();
                                    event.currentTarget.blur();
                                }}
                            >
                                Player Block
                            </button>
                            <button
                                type="button"
                                className="DebugToggle"
                                onClick={(event) => {
                                    triggerPlayerDamagedAction();
                                    event.currentTarget.blur();
                                }}
                            >
                                Player Damaged
                            </button>
                            <button
                                type="button"
                                className="DebugToggle"
                                onClick={(event) => {
                                    triggerPlayerStunnedAction();
                                    event.currentTarget.blur();
                                }}
                            >
                                Player Stunned
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
                        <p className="DevSaveStatus DevSaveStatus--neutral">
                            Audio status: {audioStatusLabel}
                        </p>
                        <p className="DevSaveStatus DevSaveStatus--neutral">
                            World pause: {isWorldPaused ? "Paused" : "Running"}
                        </p>
                        <p className="DevSaveStatus DevSaveStatus--neutral">
                            Interact Mode: {interactModeLabel}
                        </p>
                        <p className="DevSaveStatus DevSaveStatus--neutral">
                            Boss Target: {devBossTargetLabel} [
                            {devBossTargetSlotLabel}] ({devBossPhaseLabel})
                        </p>
                        <p className="DevSaveStatus DevSaveStatus--neutral">
                            Perf: {devPerfStats.fps.toFixed(1)} fps (
                            {devPerfStats.frameMs.toFixed(1)}ms)
                        </p>
                        <p className="DevSaveStatus DevSaveStatus--neutral">
                            Entities: {totalEntityCount} total /{" "}
                            {enemyEntityCount} enemy
                        </p>
                        <ul className="DevControlsList">
                            <li>
                                <span className="DevKey">Alt + Shift + S</span>
                                Quick Save
                            </li>
                            <li>
                                <span className="DevKey">Alt + Shift + L</span>
                                Quick Load
                            </li>
                            <li>
                                <span className="DevKey">Alt + Shift + E</span>
                                Export Save File
                            </li>
                            <li>
                                <span className="DevKey">Alt + Shift + I</span>
                                Import Save File
                            </li>
                            <li>
                                <span className="DevKey">Alt + Shift + M</span>
                                Toggle Audio Mute
                            </li>
                            <li>
                                <span className="DevKey">Alt + Shift + N</span>
                                Toggle Music Mute
                            </li>
                            <li>
                                <span className="DevKey">Alt + Shift + B</span>
                                Toggle SFX Mute
                            </li>
                            <li>
                                <span className="DevKey">Alt + Shift + P</span>
                                Toggle World Pause (Dev Reason)
                            </li>
                            <li>
                                <span className="DevKey">Alt + Shift + D</span>
                                Toggle Interact Mode (Attack/Dodge)
                            </li>
                            <li>
                                <span className="DevKey">Alt + Shift + A</span>
                                Trigger Player Attack State
                            </li>
                            <li>
                                <span className="DevKey">Alt + Shift + Z</span>
                                Trigger Player Dodge State
                            </li>
                            <li>
                                <span className="DevKey">Alt + Shift + X</span>
                                Trigger Player Block State
                            </li>
                            <li>
                                <span className="DevKey">Alt + Shift + C</span>
                                Trigger Player Damaged State
                            </li>
                            <li>
                                <span className="DevKey">Alt + Shift + V</span>
                                Trigger Player Stunned State
                            </li>
                            <li>
                                <span className="DevKey">Alt + Shift + G</span>
                                Trigger Boss Phase-1 on Selected Enemy
                            </li>
                            <li>
                                <span className="DevKey">Alt + Shift + H</span>
                                Trigger Boss Phase-2 on Selected Enemy
                            </li>
                            <li>
                                <span className="DevKey">Alt + Shift + J</span>
                                Cycle Boss Target Enemy
                            </li>
                            <li>
                                <span className="DevKey">Alt + Shift + K</span>
                                Cycle Boss Target Enemy (Reverse)
                            </li>
                            <li>
                                <span className="DevKey">Alt + Shift + Q</span>
                                Sanitize Quick-Save State
                            </li>
                            <li>
                                <span className="DevKey">Alt + Shift + Y</span>
                                Sanitize Input Profiles
                            </li>
                            <li>
                                <span className="DevKey">Alt + Shift + R</span>
                                Sanitize Local Ursa State
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
                            <AbilityBarExample title="AbilityBar preview" />
                            <HUDSlotExample title="HUDSlot preview" />
                            <HUDAnchorExample title="HUDAnchor preview" />
                            <QuickHUDLayoutExample title="QuickHUDLayout preview" />
                            <PlatformerHUDPresetExample title="PlatformerHUDPreset preview" />
                            <TopDownHUDPresetExample title="TopDownHUDPreset preview" />
                            <TopDownMiniGameExample title="Top-down mini game MVP" />
                            <SideScrollerMiniGameExample title="Sidescroller mini game MVP" />
                            <MainMenuExample title="MainMenu preview" />
                            <PauseMenuExample title="PauseMenu preview" />
                            <GameOverScreenExample title="GameOverScreen preview" />
                            <TextBoxExample title="TextBox preview" />
                            <ToastsExample title="Toasts preview" />
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
                        <span className="CanvasMetaPill">
                            Audio: {audioStatusLabel}
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
                                <span className="CanvasMetaPill">
                                    Player State: {playerBehaviorState}
                                </span>
                                <span className="CanvasMetaPill">
                                    Player Trail: {playerBehaviorTrail || "—"}
                                </span>
                                <span className="CanvasMetaPill">
                                    Interact Mode: {interactModeLabel}
                                </span>
                                <span className="CanvasMetaPill">
                                    Boss Target: {devBossTargetLabel} [
                                    {devBossTargetSlotLabel}] (
                                    {devBossPhaseLabel})
                                </span>
                                <span className="CanvasMetaPill">
                                    Perf: {devPerfStats.fps.toFixed(1)} fps (
                                    {devPerfStats.frameMs.toFixed(1)}ms)
                                </span>
                                <span className="CanvasMetaPill">
                                    Entities: {totalEntityCount} total /{" "}
                                    {enemyEntityCount} enemy
                                </span>
                                <span className="CanvasMetaPill">
                                    NPC States: {npcBehaviorStates.length}
                                </span>
                            </>
                        ) : null}
                    </div>
                    {isDevMode && npcBehaviorStates.length > 0 ? (
                        <p
                            className="DevSaveStatus DevSaveStatus--neutral"
                            title={npcBehaviorTooltip}
                        >
                            NPC Behaviors:{" "}
                            {npcBehaviorStates
                                .map((entry) =>
                                    entry.trail
                                        ? `${entry.id.slice(0, 8)}:${entry.state} [${entry.trail}]`
                                        : `${entry.id.slice(0, 8)}:${entry.state}`,
                                )
                                .join(" | ")}
                        </p>
                    ) : null}
                    {canvas}
                </div>
                <div className="ControlsPanel">{controls}</div>
            </div>
        </div>
    );
}
