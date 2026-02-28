import { signalBus } from "@/services/signalBus";

export type ScreenPseudoShaderEffect =
    | {
          id?: string;
          kind: "tint";
          color: string;
          alpha?: number;
          enabled?: boolean;
      }
    | {
          id?: string;
          kind: "monochrome";
          amount?: number;
          enabled?: boolean;
      }
    | {
          id?: string;
          kind: "scanline";
          lineAlpha?: number;
          lineSpacing?: number;
          enabled?: boolean;
      }
    | {
          id?: string;
          kind: "wavy";
          amplitudePx?: number;
          frequency?: number;
          speedHz?: number;
          verticalStep?: number;
          enabled?: boolean;
      }
    | {
          id?: string;
          kind: "vhs";
          noiseAlpha?: number;
          scanlineAlpha?: number;
          jitterPx?: number;
          speedHz?: number;
          enabled?: boolean;
      };

export type ScreenPseudoShaderPresetName =
    | "cutscene-warm"
    | "cutscene-cold"
    | "flashback-mono"
    | "vhs-noir";

export const SET_SCREEN_PSEUDO_SHADER_EFFECTS_SIGNAL =
    "effects:screen-pseudo-shader:set";
export const PUSH_SCREEN_PSEUDO_SHADER_EFFECT_SIGNAL =
    "effects:screen-pseudo-shader:push";
export const REMOVE_SCREEN_PSEUDO_SHADER_EFFECT_SIGNAL =
    "effects:screen-pseudo-shader:remove";
export const CLEAR_SCREEN_PSEUDO_SHADER_EFFECTS_SIGNAL =
    "effects:screen-pseudo-shader:clear";
export const APPLY_SCREEN_PSEUDO_SHADER_PRESET_SIGNAL =
    "effects:screen-pseudo-shader:preset";

export function setScreenPseudoShaderEffects(
    effects: ScreenPseudoShaderEffect[],
) {
    signalBus.emit(SET_SCREEN_PSEUDO_SHADER_EFFECTS_SIGNAL, effects);
}

export function pushScreenPseudoShaderEffect(effect: ScreenPseudoShaderEffect) {
    signalBus.emit(PUSH_SCREEN_PSEUDO_SHADER_EFFECT_SIGNAL, effect);
}

export function removeScreenPseudoShaderEffect(effectId: string) {
    signalBus.emit(REMOVE_SCREEN_PSEUDO_SHADER_EFFECT_SIGNAL, effectId);
}

export function clearScreenPseudoShaderEffects() {
    signalBus.emit(CLEAR_SCREEN_PSEUDO_SHADER_EFFECTS_SIGNAL, undefined);
}

export function applyScreenPseudoShaderPreset(
    preset: ScreenPseudoShaderPresetName,
) {
    signalBus.emit(APPLY_SCREEN_PSEUDO_SHADER_PRESET_SIGNAL, preset);
}
