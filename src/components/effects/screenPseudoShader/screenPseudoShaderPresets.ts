import type {
    ScreenPseudoShaderEffect,
    ScreenPseudoShaderPresetName,
} from "./screenPseudoShaderSignal";

const SCREEN_PSEUDO_SHADER_PRESETS: Readonly<
    Record<ScreenPseudoShaderPresetName, ScreenPseudoShaderEffect[]>
> = {
    "cutscene-warm": [
        { id: "warm-tint", kind: "tint", color: "#f59e0b", alpha: 0.16 },
        { id: "warm-scan", kind: "scanline", lineAlpha: 0.08, lineSpacing: 3 },
    ],
    "cutscene-cold": [
        { id: "cold-tint", kind: "tint", color: "#38bdf8", alpha: 0.14 },
        {
            id: "cold-wave",
            kind: "wavy",
            amplitudePx: 1.5,
            frequency: 2,
            speedHz: 0.6,
            verticalStep: 2,
        },
    ],
    "flashback-mono": [
        { id: "flashback-mono", kind: "monochrome", amount: 0.8 },
        {
            id: "flashback-scan",
            kind: "scanline",
            lineAlpha: 0.1,
            lineSpacing: 2,
        },
    ],
    "vhs-noir": [
        { id: "vhs-mono", kind: "monochrome", amount: 0.45 },
        {
            id: "vhs-main",
            kind: "vhs",
            noiseAlpha: 0.15,
            scanlineAlpha: 0.12,
            jitterPx: 2,
            speedHz: 1.2,
        },
    ],
};

export function createScreenPseudoShaderPreset(
    preset: ScreenPseudoShaderPresetName,
): ScreenPseudoShaderEffect[] {
    const effects = SCREEN_PSEUDO_SHADER_PRESETS[preset] ?? [];
    return effects.map((effect) => ({ ...effect }));
}
