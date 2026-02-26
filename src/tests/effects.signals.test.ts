import { afterEach, describe, expect, it, vi } from "vitest";
import { signalBus } from "@/services/SignalBus";
import {
    EMIT_PARTICLES_SIGNAL,
    PLAY_SCREEN_TRANSITION_SIGNAL,
    emitBurningFlameParticles,
    emitDebrisParticles,
    emitMagicShimmerParticles,
    emitParticles,
    emitSmokeParticles,
    emitSparkParticles,
    playBlackFade,
    playDirectionalPushTransition,
    playIrisTransition,
    playMosaicDissolveTransition,
    playScreenTransition,
    playVenetianBlindsTransition,
    startTorchFlameEmitter,
    stopAllTorchFlameEmitters,
} from "@/components/effects";

describe("effects signal helpers", () => {
    afterEach(() => {
        stopAllTorchFlameEmitters();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("playScreenTransition emits transition payload", () => {
        const emitSpy = vi.spyOn(signalBus, "emit");

        const payload = {
            color: "#000",
            from: "top-left" as const,
            durationMs: 500,
            stepMs: 16,
            boxSize: 16,
        };

        playScreenTransition(payload);

        expect(emitSpy).toHaveBeenCalledWith(
            PLAY_SCREEN_TRANSITION_SIGNAL,
            payload,
        );
    });

    it("playBlackFade emits black transition with merged options", () => {
        const emitSpy = vi.spyOn(signalBus, "emit");

        playBlackFade({
            from: "bottom-right",
            durationMs: 300,
            stepMs: 12,
            boxSize: 10,
        });

        expect(emitSpy).toHaveBeenCalledWith(
            PLAY_SCREEN_TRANSITION_SIGNAL,
            expect.objectContaining({
                color: "black",
                from: "bottom-right",
                durationMs: 300,
                stepMs: 12,
                boxSize: 10,
            }),
        );
    });

    it("emitParticles emits particle payload", () => {
        const emitSpy = vi.spyOn(signalBus, "emit");

        const payload = {
            amount: 4,
            location: { x: 10, y: 20 },
            direction: { angleDeg: 90, speed: 120 },
            emissionShape: "point" as const,
            lifeMs: 250,
            color: "#fff",
        };

        emitParticles(payload);

        expect(emitSpy).toHaveBeenCalledWith(EMIT_PARTICLES_SIGNAL, payload);
    });

    it("variant helper emitters set correct transition variant", () => {
        const emitSpy = vi.spyOn(signalBus, "emit");

        playVenetianBlindsTransition({
            color: "#111111",
            from: "top-left",
            venetianOrientation: "vertical",
        });
        playMosaicDissolveTransition({
            color: "#222222",
            from: "top-left",
            mosaicSeed: 7,
        });
        playIrisTransition({
            color: "#333333",
            from: "top-left",
            irisOrigin: "center",
        });
        playDirectionalPushTransition({
            color: "#444444",
            from: "top-left",
            pushFrom: "left",
        });

        expect(emitSpy).toHaveBeenNthCalledWith(
            1,
            PLAY_SCREEN_TRANSITION_SIGNAL,
            expect.objectContaining({
                variant: "venetian-blinds",
                color: "#111111",
            }),
        );
        expect(emitSpy).toHaveBeenNthCalledWith(
            2,
            PLAY_SCREEN_TRANSITION_SIGNAL,
            expect.objectContaining({
                variant: "mosaic-dissolve",
                color: "#222222",
            }),
        );
        expect(emitSpy).toHaveBeenNthCalledWith(
            3,
            PLAY_SCREEN_TRANSITION_SIGNAL,
            expect.objectContaining({
                variant: "iris",
                color: "#333333",
            }),
        );
        expect(emitSpy).toHaveBeenNthCalledWith(
            4,
            PLAY_SCREEN_TRANSITION_SIGNAL,
            expect.objectContaining({
                variant: "directional-push",
                color: "#444444",
            }),
        );
    });

    it("particle preset helpers emit expected payloads", () => {
        const emitSpy = vi.spyOn(signalBus, "emit");

        emitSmokeParticles({ x: 10, y: 20 });
        emitSparkParticles({ x: 10, y: 20 });
        emitMagicShimmerParticles({ x: 10, y: 20 });
        emitDebrisParticles({ x: 10, y: 20 });
        emitBurningFlameParticles({ x: 10, y: 20 });

        expect(emitSpy).toHaveBeenNthCalledWith(
            1,
            EMIT_PARTICLES_SIGNAL,
            expect.objectContaining({
                location: { x: 10, y: 20 },
                emissionShape: "circle",
                color: "#9ca3af",
            }),
        );
        expect(emitSpy).toHaveBeenNthCalledWith(
            2,
            EMIT_PARTICLES_SIGNAL,
            expect.objectContaining({
                location: { x: 10, y: 20 },
                emissionShape: "point",
                color: "#ffd166",
            }),
        );
        expect(emitSpy).toHaveBeenNthCalledWith(
            3,
            EMIT_PARTICLES_SIGNAL,
            expect.objectContaining({
                location: { x: 10, y: 20 },
                emissionShape: "circle",
                color: "#c77dff",
            }),
        );
        expect(emitSpy).toHaveBeenNthCalledWith(
            4,
            EMIT_PARTICLES_SIGNAL,
            expect.objectContaining({
                location: { x: 10, y: 20 },
                emissionShape: "line",
                color: "#8d6e63",
            }),
        );
        expect(emitSpy).toHaveBeenNthCalledWith(
            5,
            EMIT_PARTICLES_SIGNAL,
            expect.objectContaining({
                location: { x: 10, y: 20 },
                emissionShape: "circle",
                color: "#ff6b00",
            }),
        );
        expect(emitSpy).toHaveBeenNthCalledWith(
            6,
            EMIT_PARTICLES_SIGNAL,
            expect.objectContaining({
                location: { x: 10, y: 18 },
                emissionShape: "circle",
                color: "#6b7280",
            }),
        );
    });

    it("continuous torch emitter repeats and stops", () => {
        vi.useFakeTimers();

        const emitSpy = vi.spyOn(signalBus, "emit");

        const stop = startTorchFlameEmitter(
            "torch-1",
            { x: 5, y: 6 },
            { intervalMs: 100, amount: 9 },
        );

        expect(emitSpy).toHaveBeenCalledTimes(2);

        vi.advanceTimersByTime(220);

        expect(emitSpy).toHaveBeenCalledTimes(6);

        stop();
        vi.advanceTimersByTime(300);

        expect(emitSpy).toHaveBeenCalledTimes(6);
    });
});
