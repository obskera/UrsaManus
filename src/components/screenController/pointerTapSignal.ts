export const POINTER_TAP_SIGNAL = "input:pointer:tap";

export type PointerTapPayload = {
    clientX: number;
    clientY: number;
    localX: number;
    localY: number;
    pointerType: string;
    insideTarget: boolean;
    targetWidth: number;
    targetHeight: number;
    timestampMs: number;
};
