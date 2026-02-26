import { useEffect, useMemo, useState } from "react";
import { signalBus } from "@/services/SignalBus";
import {
    PLAY_SCREEN_TRANSITION_SIGNAL,
    type PlayScreenTransitionPayload,
    type TransitionCorner,
} from "./screenTransitionSignal";

export type TransitionCell = {
    key: string;
    x: number;
    y: number;
    opacity: number;
};

export type ScreenTransitionState = {
    active: boolean;
    color: string;
    boxSize: number;
    cells: TransitionCell[];
};

type ActiveTransition = Required<
    Pick<
        PlayScreenTransitionPayload,
        "color" | "from" | "durationMs" | "stepMs" | "boxSize"
    >
> & {
    onCovered?: () => void;
    onComplete?: () => void;
};

const DEFAULT_DURATION_MS = 450;
const DEFAULT_STEP_MS = 18;
const DEFAULT_BOX_SIZE = 16;

export function getTransitionWaveIndex(
    column: number,
    row: number,
    columns: number,
    rows: number,
    from: TransitionCorner,
): number {
    switch (from) {
        case "top-left":
            return column + row;
        case "top-right":
            return columns - 1 - column + row;
        case "bottom-left":
            return column + (rows - 1 - row);
        case "bottom-right":
            return columns - 1 - column + (rows - 1 - row);
    }
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

function easeInOutCubic(value: number): number {
    const t = clamp(value, 0, 1);
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function smoothstep(value: number): number {
    const t = clamp(value, 0, 1);
    return t * t * (3 - 2 * t);
}

function makeActiveTransition(
    payload: PlayScreenTransitionPayload,
): ActiveTransition {
    return {
        color: payload.color,
        from: payload.from,
        durationMs: Math.max(1, payload.durationMs ?? DEFAULT_DURATION_MS),
        stepMs: Math.max(0, payload.stepMs ?? DEFAULT_STEP_MS),
        boxSize: Math.max(2, payload.boxSize ?? DEFAULT_BOX_SIZE),
        onCovered: payload.onCovered,
        onComplete: payload.onComplete,
    };
}

export function useScreenTransition(
    width: number,
    height: number,
): ScreenTransitionState {
    const [activeTransition, setActiveTransition] =
        useState<ActiveTransition | null>(null);
    const [phaseElapsedMs, setPhaseElapsedMs] = useState(0);
    const [phase, setPhase] = useState<"cover" | "reveal">("cover");

    useEffect(() => {
        const unsubscribe = signalBus.on<PlayScreenTransitionPayload>(
            PLAY_SCREEN_TRANSITION_SIGNAL,
            (payload) => {
                setActiveTransition(makeActiveTransition(payload));
                setPhase("cover");
                setPhaseElapsedMs(0);
            },
        );

        return unsubscribe;
    }, []);

    useEffect(() => {
        if (!activeTransition) return;

        let raf = 0;
        let startedAt = performance.now();
        let coveredCalled = false;

        const tick = (now: number) => {
            const elapsed = now - startedAt;

            if (phase === "cover" && elapsed >= activeTransition.durationMs) {
                if (!coveredCalled) {
                    coveredCalled = true;
                    activeTransition.onCovered?.();
                }

                setPhase("reveal");
                setPhaseElapsedMs(0);
                startedAt = now;
                raf = requestAnimationFrame(tick);
                return;
            }

            if (phase === "reveal" && elapsed >= activeTransition.durationMs) {
                activeTransition.onComplete?.();
                setActiveTransition(null);
                setPhaseElapsedMs(0);
                return;
            }

            setPhaseElapsedMs(elapsed);
            raf = requestAnimationFrame(tick);
        };

        raf = requestAnimationFrame(tick);

        return () => {
            if (raf) cancelAnimationFrame(raf);
        };
    }, [activeTransition, phase]);

    const cells = useMemo(() => {
        if (!activeTransition) return [];

        const columns = Math.ceil(width / activeTransition.boxSize);
        const rows = Math.ceil(height / activeTransition.boxSize);
        const maxWaveIndex = Math.max(columns + rows - 2, 1);
        const rawMaxDelayMs = maxWaveIndex * activeTransition.stepMs;
        const maxAllowedDelayMs = activeTransition.durationMs * 0.7;
        const delayScale =
            rawMaxDelayMs > maxAllowedDelayMs
                ? maxAllowedDelayMs / rawMaxDelayMs
                : 1;
        const maxDelayMs = rawMaxDelayMs * delayScale;

        const visibleTransitionMs = Math.max(
            1,
            activeTransition.durationMs - maxDelayMs,
        );
        const phaseProgress = easeInOutCubic(
            phaseElapsedMs / activeTransition.durationMs,
        );
        const easedElapsedMs = phaseProgress * activeTransition.durationMs;

        const computedCells: TransitionCell[] = [];

        for (let row = 0; row < rows; row++) {
            for (let column = 0; column < columns; column++) {
                const waveIndex = getTransitionWaveIndex(
                    column,
                    row,
                    columns,
                    rows,
                    activeTransition.from,
                );
                const delay = waveIndex * activeTransition.stepMs * delayScale;
                const fillProgress = smoothstep(
                    (easedElapsedMs - delay) / visibleTransitionMs,
                );
                const opacity =
                    phase === "cover" ? fillProgress : 1 - fillProgress;

                computedCells.push({
                    key: `${column}:${row}`,
                    x: column * activeTransition.boxSize,
                    y: row * activeTransition.boxSize,
                    opacity,
                });
            }
        }

        return computedCells;
    }, [activeTransition, height, phase, phaseElapsedMs, width]);

    if (!activeTransition) {
        return {
            active: false,
            color: "transparent",
            boxSize: DEFAULT_BOX_SIZE,
            cells: [],
        };
    }

    return {
        active: true,
        color: activeTransition.color,
        boxSize: activeTransition.boxSize,
        cells,
    };
}
