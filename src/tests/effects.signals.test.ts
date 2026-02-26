import { afterEach, describe, expect, it, vi } from "vitest";
import { signalBus } from "@/services/SignalBus";
import {
    EMIT_PARTICLES_SIGNAL,
    PLAY_SCREEN_TRANSITION_SIGNAL,
    emitParticles,
    playBlackFade,
    playScreenTransition,
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
});
