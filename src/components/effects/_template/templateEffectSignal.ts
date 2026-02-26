import { signalBus } from "@/services/SignalBus";

export type PlayTemplateEffectPayload = {
    durationMs?: number;
};

export const TEMPLATE_EFFECT_SIGNAL = "effects:template:play";

export function playTemplateEffect(payload: PlayTemplateEffectPayload = {}) {
    signalBus.emit(TEMPLATE_EFFECT_SIGNAL, payload);
}
