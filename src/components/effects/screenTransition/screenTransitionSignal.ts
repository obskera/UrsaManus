import { signalBus } from "@/services/SignalBus";

export type TransitionCorner =
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right";

export type PlayScreenTransitionPayload = {
    color: string;
    from: TransitionCorner;
    durationMs?: number;
    stepMs?: number;
    boxSize?: number;
    onCovered?: () => void;
    onComplete?: () => void;
};

export const PLAY_SCREEN_TRANSITION_SIGNAL = "effects:screen-transition:play";

export function playScreenTransition(payload: PlayScreenTransitionPayload) {
    signalBus.emit(PLAY_SCREEN_TRANSITION_SIGNAL, payload);
}

export type BlackFadeOptions = Omit<PlayScreenTransitionPayload, "color">;

export function playBlackFade(options: BlackFadeOptions) {
    playScreenTransition({
        color: "black",
        ...options,
    });
}
