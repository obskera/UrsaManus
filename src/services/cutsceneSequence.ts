import { signalBus } from "@/services/signalBus";

export type CutsceneSkipPolicy = "disabled" | "hold-to-skip" | "instant";

export type CutsceneStep =
    | {
          type: "text";
          text: string;
          speakerName?: string;
          portrait?: string;
          emotion?: string;
          voiceCue?: string;
          speedMs?: number;
          awaitInput?: boolean;
      }
    | {
          type: "toast";
          message: string;
          variant?: "info" | "success" | "warn" | "error";
          awaitInput?: boolean;
      }
    | {
          type: "wait";
          durationMs: number;
          awaitInput?: boolean;
      }
    | {
          type: "signal";
          signal: string;
          payload?: Record<string, unknown>;
          awaitInput?: boolean;
      }
    | {
          type: "camera";
          target: string;
          x?: number;
          y?: number;
          zoom?: number;
          awaitInput?: boolean;
      }
    | {
          type: "transition";
          transition: string;
          durationMs?: number;
          awaitInput?: boolean;
      };

export type CutsceneSequenceDefinition = {
    id: string;
    steps: CutsceneStep[];
    skipPolicy?: CutsceneSkipPolicy;
    holdToSkipMs?: number;
};

export type CutsceneCompletionReason = "completed" | "skipped";

export type CutsceneRuntimeState = {
    sequenceId: string;
    active: boolean;
    currentStepIndex: number;
    waitingForInput: boolean;
    waitRemainingMs: number;
    skipHoldingMs: number;
    skipPolicy: CutsceneSkipPolicy;
    startedAtMs: number;
    completedAtMs: number | null;
};

export type CutsceneSequenceService = {
    start: (
        sequence: CutsceneSequenceDefinition,
        options?: {
            onComplete?: (reason: CutsceneCompletionReason) => void;
        },
    ) => boolean;
    continue: () => boolean;
    update: (deltaMs: number) => void;
    skip: () => boolean;
    setSkipHolding: (holding: boolean) => void;
    getState: () => CutsceneRuntimeState | null;
    stop: () => boolean;
};

export const CUTSCENE_SEQUENCE_COMPLETED_SIGNAL = "cutscene:sequence:completed";
export const CUTSCENE_SEQUENCE_STEP_SIGNAL = "cutscene:sequence:step";

function normalizeMs(value: number | undefined, fallback: number): number {
    if (!Number.isFinite(value)) {
        return fallback;
    }

    return Math.max(0, Math.floor(value ?? fallback));
}

function normalizeNow(now: () => number): number {
    const value = now();
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, value);
}

export function createCutsceneSequenceService(options?: {
    now?: () => number;
    emit?: <TPayload>(signal: string, payload: TPayload) => void;
    onText?: (payload: {
        text: string;
        speakerName?: string;
        portrait?: string;
        emotion?: string;
        voiceCue?: string;
        speedMs?: number;
    }) => void;
    onToast?: (payload: {
        message: string;
        variant: "info" | "success" | "warn" | "error";
    }) => void;
    onCamera?: (payload: {
        target: string;
        x?: number;
        y?: number;
        zoom?: number;
    }) => void;
    onTransition?: (payload: {
        transition: string;
        durationMs: number;
    }) => void;
}): CutsceneSequenceService {
    const now = options?.now ?? (() => Date.now());
    const emit =
        options?.emit ??
        (<TPayload>(signal: string, payload: TPayload) => {
            signalBus.emit(signal, payload);
        });

    let state: CutsceneRuntimeState | null = null;
    let currentSequence: CutsceneSequenceDefinition | null = null;
    let onComplete: ((reason: CutsceneCompletionReason) => void) | undefined;
    let skipHolding = false;

    const complete = (reason: CutsceneCompletionReason) => {
        if (!state || !currentSequence) {
            return;
        }

        state.active = false;
        state.waitingForInput = false;
        state.waitRemainingMs = 0;
        state.completedAtMs = normalizeNow(now);

        emit(CUTSCENE_SEQUENCE_COMPLETED_SIGNAL, {
            sequenceId: state.sequenceId,
            reason,
            completedAtMs: state.completedAtMs,
        });

        try {
            onComplete?.(reason);
        } catch {
            // ignore callback failures to keep deterministic cleanup
        }

        currentSequence = null;
        onComplete = undefined;
        skipHolding = false;
    };

    const processStep = () => {
        if (!state || !currentSequence || !state.active) {
            return;
        }

        while (state.active && currentSequence) {
            if (state.currentStepIndex >= currentSequence.steps.length) {
                complete("completed");
                return;
            }

            const step = currentSequence.steps[state.currentStepIndex];
            state.waitingForInput = Boolean(step.awaitInput);
            state.waitRemainingMs = 0;

            emit(CUTSCENE_SEQUENCE_STEP_SIGNAL, {
                sequenceId: state.sequenceId,
                stepIndex: state.currentStepIndex,
                stepType: step.type,
                atMs: normalizeNow(now),
            });

            if (step.type === "text") {
                options?.onText?.({
                    text: step.text,
                    ...(step.speakerName
                        ? { speakerName: step.speakerName }
                        : {}),
                    ...(step.portrait ? { portrait: step.portrait } : {}),
                    ...(step.emotion ? { emotion: step.emotion } : {}),
                    ...(step.voiceCue ? { voiceCue: step.voiceCue } : {}),
                    ...(Number.isFinite(step.speedMs)
                        ? { speedMs: normalizeMs(step.speedMs, 0) }
                        : {}),
                });
            }

            if (step.type === "toast") {
                options?.onToast?.({
                    message: step.message,
                    variant: step.variant ?? "info",
                });
            }

            if (step.type === "signal") {
                emit(step.signal, {
                    ...(step.payload ? { ...step.payload } : {}),
                    sequenceId: state.sequenceId,
                    stepIndex: state.currentStepIndex,
                });
            }

            if (step.type === "camera") {
                options?.onCamera?.({
                    target: step.target,
                    ...(Number.isFinite(step.x) ? { x: step.x } : {}),
                    ...(Number.isFinite(step.y) ? { y: step.y } : {}),
                    ...(Number.isFinite(step.zoom) ? { zoom: step.zoom } : {}),
                });
            }

            if (step.type === "transition") {
                options?.onTransition?.({
                    transition: step.transition,
                    durationMs: normalizeMs(step.durationMs, 0),
                });
            }

            if (step.type === "wait") {
                state.waitRemainingMs = normalizeMs(step.durationMs, 0);
            }

            if (state.waitingForInput) {
                return;
            }

            if (step.type === "wait" && state.waitRemainingMs > 0) {
                return;
            }

            state.currentStepIndex += 1;
        }
    };

    const start: CutsceneSequenceService["start"] = (
        sequence,
        startOptions,
    ) => {
        const sequenceId = sequence.id.trim();
        if (!sequenceId || sequence.steps.length === 0) {
            return false;
        }

        const skipPolicy = sequence.skipPolicy ?? "disabled";
        state = {
            sequenceId,
            active: true,
            currentStepIndex: 0,
            waitingForInput: false,
            waitRemainingMs: 0,
            skipHoldingMs: 0,
            skipPolicy,
            startedAtMs: normalizeNow(now),
            completedAtMs: null,
        };

        currentSequence = {
            ...sequence,
            id: sequenceId,
            holdToSkipMs: normalizeMs(sequence.holdToSkipMs, 500),
            steps: [...sequence.steps],
        };
        onComplete = startOptions?.onComplete;
        skipHolding = false;

        processStep();
        return true;
    };

    const continueStep = () => {
        if (!state || !currentSequence || !state.active) {
            return false;
        }

        if (!state.waitingForInput) {
            return false;
        }

        state.waitingForInput = false;
        state.waitRemainingMs = 0;
        state.currentStepIndex += 1;
        processStep();
        return true;
    };

    const update = (deltaMs: number) => {
        if (!state || !currentSequence || !state.active) {
            return;
        }

        const normalizedDelta = normalizeMs(deltaMs, 0);
        if (normalizedDelta <= 0) {
            return;
        }

        if (state.skipPolicy === "hold-to-skip" && skipHolding) {
            state.skipHoldingMs += normalizedDelta;
            if (state.skipHoldingMs >= (currentSequence.holdToSkipMs ?? 500)) {
                complete("skipped");
                return;
            }
        }

        if (state.waitingForInput || state.waitRemainingMs <= 0) {
            return;
        }

        state.waitRemainingMs = Math.max(
            0,
            state.waitRemainingMs - normalizedDelta,
        );
        if (state.waitRemainingMs === 0) {
            state.currentStepIndex += 1;
            processStep();
        }
    };

    const skip = () => {
        if (!state || !state.active) {
            return false;
        }

        if (state.skipPolicy === "disabled") {
            return false;
        }

        if (state.skipPolicy === "instant") {
            complete("skipped");
            return true;
        }

        return false;
    };

    const setSkipHolding = (holding: boolean) => {
        if (!state || !state.active || state.skipPolicy !== "hold-to-skip") {
            return;
        }

        if (!holding) {
            state.skipHoldingMs = 0;
        }

        skipHolding = holding;
    };

    const getState = () => {
        if (!state) {
            return null;
        }

        return {
            ...state,
        };
    };

    const stop = () => {
        if (!state || !state.active) {
            return false;
        }

        complete("skipped");
        return true;
    };

    return {
        start,
        continue: continueStep,
        update,
        skip,
        setSkipHolding,
        getState,
        stop,
    };
}
