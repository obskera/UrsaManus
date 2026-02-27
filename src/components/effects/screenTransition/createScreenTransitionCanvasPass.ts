import { signalBus } from "@/services/signalBus";
import type { CanvasEffectPass } from "../canvas";
import {
    TransitionCoordinator,
    type ActiveTransition,
} from "./TransitionCoordinator";
import {
    PLAY_SCREEN_TRANSITION_SIGNAL,
    type IrisOrigin,
    type PlayScreenTransitionPayload,
    type PushDirection,
    type ScreenTransitionVariant,
    type TransitionCorner,
    type VenetianOrientation,
} from "./screenTransitionSignal";

type CreateScreenTransitionCanvasPassOptions = {
    width: number;
    height: number;
    passId?: string;
};

export type ScreenTransitionCanvasPassController = {
    pass: CanvasEffectPass;
    setBounds: (width: number, height: number) => void;
    dispose: () => void;
};

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

function hashToUnit(value: number): number {
    const x = Math.sin(value) * 43758.5453123;
    return x - Math.floor(x);
}

function hashCellToUnit(column: number, row: number, seed: number): number {
    const mix = column * 127.1 + row * 311.7 + seed * 17.37;
    return hashToUnit(mix);
}

function includesTop(from: TransitionCorner): boolean {
    return from === "top-left" || from === "top-right";
}

function includesLeft(from: TransitionCorner): boolean {
    return from === "top-left" || from === "bottom-left";
}

function getIrisOriginPoint(
    irisOrigin: IrisOrigin,
    width: number,
    height: number,
): { x: number; y: number } {
    if (irisOrigin === "center") {
        return { x: width / 2, y: height / 2 };
    }

    switch (irisOrigin) {
        case "top-left":
            return { x: 0, y: 0 };
        case "top-right":
            return { x: width, y: 0 };
        case "bottom-left":
            return { x: 0, y: height };
        case "bottom-right":
            return { x: width, y: height };
    }
}

function getDirectionalNormalizedPosition(
    pushFrom: PushDirection,
    x: number,
    y: number,
    cellSize: number,
    width: number,
    height: number,
): number {
    switch (pushFrom) {
        case "left":
            return x / Math.max(width, 1);
        case "right":
            return 1 - (x + cellSize) / Math.max(width, 1);
        case "top":
            return y / Math.max(height, 1);
        case "bottom":
            return 1 - (y + cellSize) / Math.max(height, 1);
    }
}

function getTransitionWaveIndex(
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

function getWaveIndexForVenetian(
    column: number,
    row: number,
    columns: number,
    rows: number,
    from: TransitionCorner,
    orientation: VenetianOrientation,
): number {
    if (orientation === "horizontal") {
        return includesTop(from) ? row : rows - 1 - row;
    }

    return includesLeft(from) ? column : columns - 1 - column;
}

function getMaxWaveIndex(
    variant: ScreenTransitionVariant,
    columns: number,
    rows: number,
    orientation: VenetianOrientation,
): number {
    if (variant === "venetian-blinds") {
        return orientation === "horizontal" ? rows - 1 : columns - 1;
    }

    return columns + rows - 2;
}

function drawTransition(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    phase: "cover" | "reveal",
    phaseElapsedMs: number,
    activeTransition: ActiveTransition,
) {
    const columns = Math.ceil(width / activeTransition.boxSize);
    const rows = Math.ceil(height / activeTransition.boxSize);
    const maxWaveIndex = Math.max(
        getMaxWaveIndex(
            activeTransition.variant,
            columns,
            rows,
            activeTransition.venetianOrientation,
        ),
        1,
    );
    const rawMaxDelayMs = maxWaveIndex * activeTransition.stepMs;
    const maxAllowedDelayMs = activeTransition.durationMs * 0.7;
    const delayScale =
        rawMaxDelayMs > maxAllowedDelayMs
            ? maxAllowedDelayMs / rawMaxDelayMs
            : 1;
    const maxDelayMs =
        activeTransition.variant === "mosaic-dissolve" ||
        activeTransition.variant === "iris" ||
        activeTransition.variant === "directional-push"
            ? 0
            : rawMaxDelayMs * delayScale;

    const visibleTransitionMs = Math.max(
        1,
        activeTransition.durationMs - maxDelayMs,
    );
    const phaseProgress = easeInOutCubic(
        phaseElapsedMs / activeTransition.durationMs,
    );
    const easedElapsedMs = phaseProgress * activeTransition.durationMs;

    const irisOrigin = getIrisOriginPoint(
        activeTransition.irisOrigin,
        width,
        height,
    );
    const maxRadius = Math.max(
        Math.hypot(irisOrigin.x, irisOrigin.y),
        Math.hypot(width - irisOrigin.x, irisOrigin.y),
        Math.hypot(irisOrigin.x, height - irisOrigin.y),
        Math.hypot(width - irisOrigin.x, height - irisOrigin.y),
    );

    ctx.fillStyle = activeTransition.color;

    for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
            const x = column * activeTransition.boxSize;
            const y = row * activeTransition.boxSize;
            let opacity = 0;

            if (activeTransition.variant === "mosaic-dissolve") {
                const order = hashCellToUnit(
                    column,
                    row,
                    activeTransition.mosaicSeed,
                );
                const feather = 0.08;
                const threshold =
                    phase === "cover" ? phaseProgress : 1 - phaseProgress;

                opacity = smoothstep(
                    (threshold - order + feather) / (2 * feather),
                );
            } else if (activeTransition.variant === "iris") {
                const centerX = x + activeTransition.boxSize / 2;
                const centerY = y + activeTransition.boxSize / 2;
                const distance = Math.hypot(
                    centerX - irisOrigin.x,
                    centerY - irisOrigin.y,
                );
                const feather = activeTransition.boxSize * 1.5;
                const radius =
                    (phase === "cover" ? phaseProgress : 1 - phaseProgress) *
                    maxRadius;

                opacity = smoothstep(
                    (radius - distance + feather) / (2 * feather),
                );
            } else if (activeTransition.variant === "directional-push") {
                const normalizedPosition = getDirectionalNormalizedPosition(
                    activeTransition.pushFrom,
                    x,
                    y,
                    activeTransition.boxSize,
                    width,
                    height,
                );
                const feather = Math.max(
                    0.02,
                    (activeTransition.boxSize / Math.max(width, height)) * 2,
                );
                const threshold =
                    phase === "cover" ? phaseProgress : 1 - phaseProgress;

                opacity = smoothstep(
                    (threshold - normalizedPosition + feather) / (2 * feather),
                );
            } else {
                const waveIndex =
                    activeTransition.variant === "venetian-blinds"
                        ? getWaveIndexForVenetian(
                              column,
                              row,
                              columns,
                              rows,
                              activeTransition.from,
                              activeTransition.venetianOrientation,
                          )
                        : getTransitionWaveIndex(
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
                opacity = phase === "cover" ? fillProgress : 1 - fillProgress;
            }

            if (opacity <= 0) {
                continue;
            }

            ctx.globalAlpha = opacity;
            ctx.fillRect(
                x,
                y,
                activeTransition.boxSize,
                activeTransition.boxSize,
            );
        }
    }

    ctx.globalAlpha = 1;
}

export function createScreenTransitionCanvasPass({
    width,
    height,
    passId = "transition-main",
}: CreateScreenTransitionCanvasPassOptions): ScreenTransitionCanvasPassController {
    let bounds = { width, height };
    const coordinator = new TransitionCoordinator();

    const unsubscribe = signalBus.on<PlayScreenTransitionPayload>(
        PLAY_SCREEN_TRANSITION_SIGNAL,
        (payload) => {
            coordinator.play(payload);
        },
    );

    return {
        pass: {
            id: passId,
            layer: "transition",
            isActive: () => coordinator.isActive(),
            update: (deltaMs) => {
                coordinator.update(deltaMs);
            },
            draw: ({ ctx }) => {
                const activeTransition = coordinator.getActiveTransition();
                if (!activeTransition) {
                    return;
                }

                drawTransition(
                    ctx,
                    bounds.width,
                    bounds.height,
                    coordinator.getPhase(),
                    coordinator.getPhaseElapsedMs(),
                    activeTransition,
                );
            },
            reset: () => {
                coordinator.reset();
            },
        },
        setBounds: (nextWidth, nextHeight) => {
            bounds = { width: nextWidth, height: nextHeight };
        },
        dispose: () => {
            unsubscribe();
            coordinator.reset();
        },
    };
}
