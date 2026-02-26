import { useEffect, useState } from "react";
import { signalBus } from "@/services/SignalBus";
import {
    TEMPLATE_EFFECT_SIGNAL,
    type PlayTemplateEffectPayload,
} from "./templateEffectSignal";

const DEFAULT_DURATION_MS = 300;

export function useTemplateEffect() {
    const [active, setActive] = useState(false);

    useEffect(() => {
        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        const unsubscribe = signalBus.on<PlayTemplateEffectPayload>(
            TEMPLATE_EFFECT_SIGNAL,
            (payload) => {
                if (timeoutId) clearTimeout(timeoutId);
                setActive(true);

                const durationMs = Math.max(
                    1,
                    payload.durationMs ?? DEFAULT_DURATION_MS,
                );

                timeoutId = setTimeout(() => {
                    setActive(false);
                    timeoutId = null;
                }, durationMs);
            },
        );

        return () => {
            unsubscribe();
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, []);

    return { active };
}
