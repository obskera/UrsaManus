import type { AudioCueDefinition } from "@/services/AudioBus";

export const GAME_MODE_AUDIO_CUES: Record<string, AudioCueDefinition> = {
    "scene:side-scroller:music": {
        kind: "tone",
        frequencyHz: 164,
        durationMs: 420,
        gain: 0.08,
        waveform: "triangle",
    },
    "scene:top-down:music": {
        kind: "tone",
        frequencyHz: 220,
        durationMs: 380,
        gain: 0.08,
        waveform: "sine",
    },
    "player:step": {
        kind: "tone",
        frequencyHz: 680,
        durationMs: 45,
        gain: 0.05,
        waveform: "square",
    },
};
