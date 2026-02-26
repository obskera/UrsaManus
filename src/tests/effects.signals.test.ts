import { afterEach, describe, expect, it, vi } from "vitest";
import { signalBus } from "@/services/SignalBus";
import {
    EMIT_PARTICLES_SIGNAL,
    PLAY_SCREEN_TRANSITION_SIGNAL,
    emitParticles,
    playBlackFade,
    playDirectionalPushTransition,
    playIrisTransition,
    playMosaicDissolveTransition,
    playScreenTransition,
    playVenetianBlindsTransition,
} from "@/components/effects";

describe("effects signal helpers", () => {
    afterEach(() => {
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
});
