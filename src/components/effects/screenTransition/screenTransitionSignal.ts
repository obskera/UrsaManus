import { signalBus } from "@/services/signalBus";

export type TransitionCorner =
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right";

export type ScreenTransitionVariant =
    | "diagonal"
    | "venetian-blinds"
    | "mosaic-dissolve"
    | "iris"
    | "directional-push";

export type VenetianOrientation = "horizontal" | "vertical";
export type PushDirection = "left" | "right" | "top" | "bottom";
export type IrisOrigin = "center" | TransitionCorner;

export type PlayScreenTransitionPayload = {
    color: string;
    from: TransitionCorner;
    variant?: ScreenTransitionVariant;
    venetianOrientation?: VenetianOrientation;
    pushFrom?: PushDirection;
    irisOrigin?: IrisOrigin;
    mosaicSeed?: number;
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
export type ColoredTransitionOptions = BlackFadeOptions & { color?: string };

export function playBlackFade(options: BlackFadeOptions) {
    playScreenTransition({
        color: "black",
        ...options,
    });
}

export function playVenetianBlindsTransition(
    options: ColoredTransitionOptions,
) {
    playScreenTransition({
        color: options.color ?? "black",
        ...options,
        variant: "venetian-blinds",
    });
}

export function playMosaicDissolveTransition(
    options: ColoredTransitionOptions,
) {
    playScreenTransition({
        color: options.color ?? "black",
        ...options,
        variant: "mosaic-dissolve",
    });
}

export function playIrisTransition(options: ColoredTransitionOptions) {
    playScreenTransition({
        color: options.color ?? "black",
        ...options,
        variant: "iris",
    });
}

export function playDirectionalPushTransition(
    options: ColoredTransitionOptions,
) {
    playScreenTransition({
        color: options.color ?? "black",
        ...options,
        variant: "directional-push",
    });
}
