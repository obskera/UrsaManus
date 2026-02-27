import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SoundManager from "@/components/gameModes/SoundManager";
import { AudioBus } from "@/services/AudioBus";

describe("SoundManager", () => {
    const originalAudioContext = window.AudioContext;
    const originalAudio = window.Audio;

    afterEach(() => {
        window.AudioContext = originalAudioContext;
        window.Audio = originalAudio;
        vi.restoreAllMocks();
    });

    it("plays and stops tone cues from AudioBus events", () => {
        const oscillatorStop = vi.fn();
        const oscillatorStart = vi.fn();
        const oscillatorConnect = vi.fn();
        const gainConnect = vi.fn();

        const oscillator = {
            type: "sine",
            frequency: { value: 0 },
            connect: oscillatorConnect,
            start: oscillatorStart,
            stop: oscillatorStop,
            onended: null,
        } as unknown as OscillatorNode;

        const gainNode = {
            gain: { value: 1 },
            connect: gainConnect,
        } as unknown as GainNode;

        const audioContextClose = vi.fn();
        const audioContextResume = vi.fn();

        const fakeAudioContext = {
            state: "running",
            currentTime: 0,
            destination: {},
            createOscillator: vi.fn(() => oscillator),
            createGain: vi.fn(() => gainNode),
            close: audioContextClose,
            resume: audioContextResume,
        } as unknown as AudioContext;

        class AudioContextMock {
            constructor() {
                return fakeAudioContext;
            }
        }

        window.AudioContext =
            AudioContextMock as unknown as typeof AudioContext;

        const bus = new AudioBus();
        bus.registerCue("test:tone", {
            kind: "tone",
            frequencyHz: 440,
            durationMs: 60,
            gain: 0.4,
            waveform: "triangle",
        });

        const { unmount } = render(<SoundManager bus={bus} />);

        bus.play("test:tone", { channel: "sfx", loop: true });
        expect(oscillatorStart).toHaveBeenCalledTimes(1);

        bus.stop("test:tone");
        expect(oscillatorStop).toHaveBeenCalledTimes(1);

        unmount();
        expect(audioContextClose).toHaveBeenCalledTimes(1);
    });

    it("manages file cue playback for stop-channel and mute state", () => {
        const createdAudio: Array<{
            loop: boolean;
            volume: number;
            currentTime: number;
            pause: ReturnType<typeof vi.fn>;
            play: ReturnType<typeof vi.fn>;
            src: string;
        }> = [];

        class AudioMock {
            loop = false;
            volume = 1;
            currentTime = 0;
            pause = vi.fn();
            play = vi.fn(async () => undefined);
            src: string;

            constructor(src: string) {
                this.src = src;
                createdAudio.push(this);
            }
        }

        window.Audio = AudioMock as unknown as typeof Audio;

        const bus = new AudioBus();
        bus.registerCue("test:file", {
            kind: "file",
            src: "/sound/test.mp3",
            gain: 0.5,
        });

        render(<SoundManager bus={bus} />);

        bus.play("test:file", {
            channel: "music",
            loop: true,
            volume: 0.8,
            restartIfPlaying: true,
        });

        expect(createdAudio).toHaveLength(1);
        expect(createdAudio[0].play).toHaveBeenCalledTimes(1);
        expect(createdAudio[0].loop).toBe(true);
        expect(createdAudio[0].volume).toBeCloseTo(0.4, 5);

        bus.stopChannel("music");
        expect(createdAudio[0].pause).toHaveBeenCalledTimes(1);
        expect(createdAudio[0].currentTime).toBe(0);

        bus.play("test:file", {
            channel: "music",
            loop: true,
            restartIfPlaying: true,
        });
        expect(createdAudio).toHaveLength(2);

        bus.setMasterMuted(true);
        expect(createdAudio[1].pause).toHaveBeenCalledTimes(1);
        expect(createdAudio[1].currentTime).toBe(0);

        bus.setMasterMuted(false);
        bus.setChannelMuted("music", true);
        bus.play("test:file", {
            channel: "music",
            loop: true,
            restartIfPlaying: true,
        });

        expect(createdAudio).toHaveLength(2);
    });

    it("registers cues from props and skips replay when restartIfPlaying is false", () => {
        const createdAudio: Array<{
            play: ReturnType<typeof vi.fn>;
            pause: ReturnType<typeof vi.fn>;
            currentTime: number;
            loop: boolean;
            volume: number;
            src: string;
        }> = [];

        class AudioMock {
            loop = false;
            volume = 1;
            currentTime = 0;
            pause = vi.fn();
            play = vi.fn(async () => undefined);
            src: string;

            constructor(src: string) {
                this.src = src;
                createdAudio.push(this);
            }
        }

        window.Audio = AudioMock as unknown as typeof Audio;

        const bus = new AudioBus();

        render(
            <SoundManager
                bus={bus}
                cues={{
                    "test:prop-file": {
                        kind: "file",
                        src: "/sound/prop.mp3",
                    },
                }}
            />,
        );

        bus.play("test:prop-file", {
            channel: "sfx",
            loop: true,
            restartIfPlaying: false,
        });
        bus.play("test:prop-file", {
            channel: "sfx",
            loop: true,
            restartIfPlaying: false,
        });

        expect(createdAudio).toHaveLength(1);
        expect(createdAudio[0].play).toHaveBeenCalledTimes(1);

        bus.stop("test:prop-file");
        expect(createdAudio[0].pause).toHaveBeenCalledTimes(1);
        expect(createdAudio[0].currentTime).toBe(0);
    });
});
