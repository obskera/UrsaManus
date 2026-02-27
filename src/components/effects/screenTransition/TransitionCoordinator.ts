import type {
    IrisOrigin,
    PlayScreenTransitionPayload,
    PushDirection,
    ScreenTransitionVariant,
    VenetianOrientation,
} from "./screenTransitionSignal";

export type ActiveTransition = Required<
    Pick<
        PlayScreenTransitionPayload,
        | "color"
        | "from"
        | "variant"
        | "venetianOrientation"
        | "pushFrom"
        | "irisOrigin"
        | "mosaicSeed"
        | "durationMs"
        | "stepMs"
        | "boxSize"
    >
> & {
    onCovered?: () => void;
    onComplete?: () => void;
};

export type TransitionPhase = "cover" | "reveal";

const DEFAULT_VARIANT: ScreenTransitionVariant = "diagonal";
const DEFAULT_DURATION_MS = 450;
const DEFAULT_STEP_MS = 18;
const DEFAULT_BOX_SIZE = 16;
const DEFAULT_VENETIAN_ORIENTATION: VenetianOrientation = "horizontal";
const DEFAULT_PUSH_FROM: PushDirection = "left";
const DEFAULT_IRIS_ORIGIN: IrisOrigin = "center";

function makeActiveTransition(
    payload: PlayScreenTransitionPayload,
): ActiveTransition {
    return {
        color: payload.color,
        from: payload.from,
        variant: payload.variant ?? DEFAULT_VARIANT,
        venetianOrientation:
            payload.venetianOrientation ?? DEFAULT_VENETIAN_ORIENTATION,
        pushFrom: payload.pushFrom ?? DEFAULT_PUSH_FROM,
        irisOrigin: payload.irisOrigin ?? DEFAULT_IRIS_ORIGIN,
        mosaicSeed: payload.mosaicSeed ?? 1,
        durationMs: Math.max(1, payload.durationMs ?? DEFAULT_DURATION_MS),
        stepMs: Math.max(0, payload.stepMs ?? DEFAULT_STEP_MS),
        boxSize: Math.max(2, payload.boxSize ?? DEFAULT_BOX_SIZE),
        onCovered: payload.onCovered,
        onComplete: payload.onComplete,
    };
}

export class TransitionCoordinator {
    private activeTransition: ActiveTransition | null = null;
    private phase: TransitionPhase = "cover";
    private phaseElapsedMs = 0;

    play(payload: PlayScreenTransitionPayload): void {
        this.activeTransition = makeActiveTransition(payload);
        this.phase = "cover";
        this.phaseElapsedMs = 0;
    }

    update(deltaMs: number): void {
        if (!this.activeTransition) {
            return;
        }

        const elapsed = this.phaseElapsedMs + deltaMs;

        if (
            this.phase === "cover" &&
            elapsed >= this.activeTransition.durationMs
        ) {
            this.activeTransition.onCovered?.();
            this.phase = "reveal";
            this.phaseElapsedMs = 0;
            return;
        }

        if (
            this.phase === "reveal" &&
            elapsed >= this.activeTransition.durationMs
        ) {
            this.activeTransition.onComplete?.();
            this.activeTransition = null;
            this.phase = "cover";
            this.phaseElapsedMs = 0;
            return;
        }

        this.phaseElapsedMs = elapsed;
    }

    isActive(): boolean {
        return this.activeTransition !== null;
    }

    getActiveTransition(): ActiveTransition | null {
        return this.activeTransition;
    }

    getPhase(): TransitionPhase {
        return this.phase;
    }

    getPhaseElapsedMs(): number {
        return this.phaseElapsedMs;
    }

    reset(): void {
        this.activeTransition = null;
        this.phase = "cover";
        this.phaseElapsedMs = 0;
    }
}
