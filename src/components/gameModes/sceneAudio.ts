import type { AudioCueDefinition } from "@/services/audioBus";

export const GAME_MODE_AUDIO_CUES: Record<string, AudioCueDefinition> = {
    "scene:side-scroller:music": {
        kind: "tone",
        frequencyHz: 164,
        durationMs: 420,
        gain: 0.08,
        waveform: "triangle",
    },
    "scene:top-down:music": {
        kind: "file",
        src: "/Ninja%20Adventure%20-%20Asset%20Pack/Audio/Musics/1%20-%20Adventure%20Begin.ogg",
        gain: 0.5,
    },
    "player:step": {
        kind: "tone",
        frequencyHz: 680,
        durationMs: 45,
        gain: 0.05,
        waveform: "square",
    },
    "ui:tap:beep": {
        kind: "file",
        src: "/beep%201.wav",
        gain: 0.5,
    },
};
