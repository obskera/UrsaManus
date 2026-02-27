import { useEffect } from "react";
import { signalBus } from "@/services/signalBus";
import { POINTER_TAP_SIGNAL, type PointerTapPayload } from "./pointerTapSignal";

export type UsePointerTapTrackingOptions = {
    enabled?: boolean;
    getTarget: () => HTMLElement | null;
    onTap?: (payload: PointerTapPayload) => void;
};

export function usePointerTapTracking({
    enabled = true,
    getTarget,
    onTap,
}: UsePointerTapTrackingOptions) {
    useEffect(() => {
        if (!enabled) {
            return;
        }

        const onPointerUp = (event: PointerEvent) => {
            const target = getTarget();
            if (!target) {
                return;
            }

            const rect = target.getBoundingClientRect();
            const localX = event.clientX - rect.left;
            const localY = event.clientY - rect.top;
            const insideTarget =
                localX >= 0 &&
                localY >= 0 &&
                localX <= rect.width &&
                localY <= rect.height;

            const payload: PointerTapPayload = {
                clientX: event.clientX,
                clientY: event.clientY,
                localX,
                localY,
                pointerType: event.pointerType || "mouse",
                insideTarget,
                targetWidth: rect.width,
                targetHeight: rect.height,
                timestampMs: Date.now(),
            };

            onTap?.(payload);
            signalBus.emit(POINTER_TAP_SIGNAL, payload);
        };

        window.addEventListener("pointerup", onPointerUp);

        return () => {
            window.removeEventListener("pointerup", onPointerUp);
        };
    }, [enabled, getTarget, onTap]);
}
