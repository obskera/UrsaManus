import { describe, expect, it, vi } from "vitest";
import { AudioBus } from "@/services/AudioBus";

describe("AudioBus", () => {
    it("registers cues and emits play requests", () => {
        const bus = new AudioBus();
        const listener = vi.fn();

        bus.registerCue("ui:confirm", {
            kind: "tone",
            frequencyHz: 440,
            durationMs: 120,
            waveform: "triangle",
            gain: 0.2,
        });

        const unsubscribe = bus.subscribe(listener);
        bus.play("ui:confirm", { channel: "ui", volume: 0.5, loop: false });

        expect(bus.getCue("ui:confirm")).toEqual(
            expect.objectContaining({ kind: "tone", frequencyHz: 440 }),
        );
        expect(listener).toHaveBeenCalledWith({
            type: "play",
            request: {
                cueId: "ui:confirm",
                channel: "ui",
                volume: 0.5,
                loop: false,
                restartIfPlaying: true,
            },
        });

        unsubscribe();
        bus.play("ui:confirm");
        expect(listener).toHaveBeenCalledTimes(1);
    });

    it("emits state and stop events", () => {
        const bus = new AudioBus();
        const listener = vi.fn();
        bus.subscribe(listener);

        bus.setMasterVolume(0.65);
        bus.setChannelMuted("music", true);
        bus.stop("bgm");
        bus.stopChannel("music");

        expect(listener).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "state",
                state: expect.objectContaining({
                    masterVolume: 0.65,
                    channelMuted: expect.objectContaining({ music: true }),
                }),
            }),
        );
        expect(listener).toHaveBeenCalledWith({ type: "stop", cueId: "bgm" });
        expect(listener).toHaveBeenCalledWith({
            type: "stop-channel",
            channel: "music",
        });
    });
});
