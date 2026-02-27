import { useCallback, useEffect, useRef } from "react";
import {
    audioBus,
    type AudioBus,
    type AudioCueDefinition,
    type FileCueDefinition,
    type PlayAudioCueRequest,
    type ToneCueDefinition,
    type ToneWaveform,
} from "@/services/audioBus";

export type SoundManagerProps = {
    bus?: AudioBus;
    cues?: Record<string, AudioCueDefinition>;
};

type TonePlayback = {
    kind: "tone";
    channel: string;
    oscillator: OscillatorNode;
};

type FilePlayback = {
    kind: "file";
    channel: string;
    audio: HTMLAudioElement;
};

type Playback = TonePlayback | FilePlayback;

function toOscillatorType(waveform: ToneWaveform): OscillatorType {
    return waveform;
}

function isMutedForChannel(
    managerBus: AudioBus,
    channel: "music" | "sfx" | "ui",
) {
    const state = managerBus.getState();
    return (
        !state.enabled ||
        state.masterMuted ||
        Boolean(state.channelMuted[channel])
    );
}

const SoundManager = ({ bus = audioBus, cues }: SoundManagerProps) => {
    const contextRef = useRef<AudioContext | null>(null);
    const playbackByCueRef = useRef<Map<string, Playback>>(new Map());

    const getContext = useCallback(() => {
        if (contextRef.current) return contextRef.current;

        if (typeof window === "undefined") {
            return null;
        }

        const AudioContextCtor =
            window.AudioContext ??
            (window as Window & { webkitAudioContext?: typeof AudioContext })
                .webkitAudioContext;

        if (!AudioContextCtor) {
            return null;
        }

        const next = new AudioContextCtor();
        contextRef.current = next;
        return next;
    }, []);

    const stopPlayback = useCallback((cueId?: string) => {
        const playbackByCue = playbackByCueRef.current;
        if (!cueId) {
            for (const [id, playback] of playbackByCue.entries()) {
                if (playback.kind === "tone") {
                    playback.oscillator.stop();
                } else {
                    playback.audio.pause();
                    playback.audio.currentTime = 0;
                }
                playbackByCue.delete(id);
            }
            return;
        }

        const playback = playbackByCue.get(cueId);
        if (!playback) return;

        if (playback.kind === "tone") {
            playback.oscillator.stop();
        } else {
            playback.audio.pause();
            playback.audio.currentTime = 0;
        }
        playbackByCue.delete(cueId);
    }, []);

    const playToneCue = useCallback(
        (
            cueId: string,
            cue: ToneCueDefinition,
            request: PlayAudioCueRequest,
        ) => {
            if (isMutedForChannel(bus, request.channel)) return;

            const context = getContext();
            if (!context) return;

            const state = bus.getState();
            if (request.restartIfPlaying) {
                stopPlayback(cueId);
            } else if (playbackByCueRef.current.has(cueId)) {
                return;
            }

            if (context.state === "suspended") {
                void context.resume();
            }

            const oscillator = context.createOscillator();
            const gainNode = context.createGain();

            oscillator.type = toOscillatorType(cue.waveform ?? "sine");
            oscillator.frequency.value = cue.frequencyHz;

            const cueGain = cue.gain ?? 1;
            const outputGain = Math.min(
                1,
                Math.max(0, state.masterVolume * request.volume * cueGain),
            );
            gainNode.gain.value = outputGain;

            oscillator.connect(gainNode);
            gainNode.connect(context.destination);

            oscillator.onended = () => {
                const active = playbackByCueRef.current.get(cueId);
                if (
                    active?.kind === "tone" &&
                    active.oscillator === oscillator
                ) {
                    playbackByCueRef.current.delete(cueId);
                }
            };

            oscillator.start();

            if (request.loop) {
                playbackByCueRef.current.set(cueId, {
                    kind: "tone",
                    channel: request.channel,
                    oscillator,
                });
                return;
            }

            oscillator.stop(context.currentTime + cue.durationMs / 1000);
        },
        [bus, getContext, stopPlayback],
    );

    const playFileCue = useCallback(
        (
            cueId: string,
            cue: FileCueDefinition,
            request: PlayAudioCueRequest,
        ) => {
            if (isMutedForChannel(bus, request.channel)) return;

            const state = bus.getState();
            if (request.restartIfPlaying) {
                stopPlayback(cueId);
            } else if (playbackByCueRef.current.has(cueId)) {
                return;
            }

            const cueGain = cue.gain ?? 1;
            const outputGain = Math.min(
                1,
                Math.max(0, state.masterVolume * request.volume * cueGain),
            );
            const audio = new Audio(cue.src);
            audio.loop = request.loop;
            audio.volume = outputGain;

            void audio.play().catch(() => {
                return;
            });

            if (request.loop) {
                playbackByCueRef.current.set(cueId, {
                    kind: "file",
                    channel: request.channel,
                    audio,
                });
            }
        },
        [bus, stopPlayback],
    );

    useEffect(() => {
        if (cues) {
            bus.registerCues(cues);
        }
    }, [bus, cues]);

    useEffect(() => {
        const unsubscribe = bus.subscribe((event) => {
            if (event.type === "play") {
                const definition = bus.getCue(event.request.cueId);
                if (!definition) return;

                if (definition.kind === "tone") {
                    playToneCue(event.request.cueId, definition, event.request);
                    return;
                }

                playFileCue(event.request.cueId, definition, event.request);
                return;
            }

            if (event.type === "stop") {
                stopPlayback(event.cueId);
                return;
            }

            if (event.type === "stop-channel") {
                for (const [
                    cueId,
                    playback,
                ] of playbackByCueRef.current.entries()) {
                    if (playback.channel === event.channel) {
                        stopPlayback(cueId);
                    }
                }
                return;
            }

            if (event.type === "state") {
                const shouldSilenceAll =
                    !event.state.enabled || event.state.masterMuted;
                if (shouldSilenceAll) {
                    stopPlayback();
                    return;
                }

                for (const [
                    cueId,
                    playback,
                ] of playbackByCueRef.current.entries()) {
                    const channel = playback.channel as "music" | "sfx" | "ui";
                    if (event.state.channelMuted[channel]) {
                        stopPlayback(cueId);
                    }
                }
            }
        });

        return () => {
            unsubscribe();
            stopPlayback();
            if (contextRef.current) {
                void contextRef.current.close();
                contextRef.current = null;
            }
        };
    }, [bus, playFileCue, playToneCue, stopPlayback]);

    return null;
};

export default SoundManager;
