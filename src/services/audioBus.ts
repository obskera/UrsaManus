export type AudioChannel = "music" | "sfx" | "ui";

export type ToneWaveform = "sine" | "square" | "sawtooth" | "triangle";

export type ToneCueDefinition = {
    kind: "tone";
    frequencyHz: number;
    durationMs: number;
    gain?: number;
    waveform?: ToneWaveform;
};

export type FileCueDefinition = {
    kind: "file";
    src: string;
    gain?: number;
};

export type AudioCueDefinition = ToneCueDefinition | FileCueDefinition;

export type AudioBusState = {
    enabled: boolean;
    masterMuted: boolean;
    masterVolume: number;
    channelMuted: Record<AudioChannel, boolean>;
};

export type PlayAudioCueOptions = {
    channel?: AudioChannel;
    volume?: number;
    loop?: boolean;
    restartIfPlaying?: boolean;
};

export type PlayAudioCueRequest = {
    cueId: string;
    channel: AudioChannel;
    volume: number;
    loop: boolean;
    restartIfPlaying: boolean;
};

export type AudioBusEvent =
    | { type: "play"; request: PlayAudioCueRequest }
    | { type: "stop"; cueId?: string }
    | { type: "stop-channel"; channel: AudioChannel }
    | { type: "state"; state: AudioBusState };

export type AudioBusListener = (event: AudioBusEvent) => void;
export type AudioBusUnsubscribe = () => void;

class AudioBus {
    private listeners = new Set<AudioBusListener>();
    private cues: Record<string, AudioCueDefinition> = {};
    private state: AudioBusState = {
        enabled: true,
        masterMuted: false,
        masterVolume: 1,
        channelMuted: {
            music: false,
            sfx: false,
            ui: false,
        },
    };

    subscribe(listener: AudioBusListener): AudioBusUnsubscribe {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    registerCue(cueId: string, definition: AudioCueDefinition) {
        this.cues[cueId] = definition;
    }

    registerCues(cues: Record<string, AudioCueDefinition>) {
        for (const [cueId, definition] of Object.entries(cues)) {
            this.registerCue(cueId, definition);
        }
    }

    getCue(cueId: string) {
        return this.cues[cueId];
    }

    clearCues() {
        this.cues = {};
    }

    getState(): AudioBusState {
        return {
            enabled: this.state.enabled,
            masterMuted: this.state.masterMuted,
            masterVolume: this.state.masterVolume,
            channelMuted: {
                ...this.state.channelMuted,
            },
        };
    }

    setEnabled(enabled: boolean) {
        if (this.state.enabled === enabled) return;
        this.state.enabled = enabled;
        this.emit({ type: "state", state: this.getState() });
    }

    setMasterMuted(muted: boolean) {
        if (this.state.masterMuted === muted) return;
        this.state.masterMuted = muted;
        this.emit({ type: "state", state: this.getState() });
    }

    setMasterVolume(volume: number) {
        const next = Math.min(1, Math.max(0, volume));
        if (this.state.masterVolume === next) return;
        this.state.masterVolume = next;
        this.emit({ type: "state", state: this.getState() });
    }

    setChannelMuted(channel: AudioChannel, muted: boolean) {
        if (this.state.channelMuted[channel] === muted) return;
        this.state.channelMuted[channel] = muted;
        this.emit({ type: "state", state: this.getState() });
    }

    play(cueId: string, options: PlayAudioCueOptions = {}) {
        const request: PlayAudioCueRequest = {
            cueId,
            channel: options.channel ?? "sfx",
            volume: options.volume ?? 1,
            loop: options.loop ?? false,
            restartIfPlaying: options.restartIfPlaying ?? true,
        };

        this.emit({ type: "play", request });
    }

    stop(cueId?: string) {
        this.emit({ type: "stop", cueId });
    }

    stopChannel(channel: AudioChannel) {
        this.emit({ type: "stop-channel", channel });
    }

    private emit(event: AudioBusEvent) {
        for (const listener of this.listeners) {
            listener(event);
        }
    }
}

export { AudioBus };
export const audioBus = new AudioBus();
