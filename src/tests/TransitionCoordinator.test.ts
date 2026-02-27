import { describe, expect, it, vi } from "vitest";
import { TransitionCoordinator } from "@/components/effects/screenTransition";

describe("TransitionCoordinator", () => {
    it("normalizes defaults and transitions through cover/reveal", () => {
        const coordinator = new TransitionCoordinator();
        const onCovered = vi.fn();
        const onComplete = vi.fn();

        coordinator.play({
            color: "#000",
            from: "top-left",
            durationMs: 40,
            stepMs: 0,
            boxSize: 8,
            onCovered,
            onComplete,
        });

        expect(coordinator.isActive()).toBe(true);
        expect(coordinator.getPhase()).toBe("cover");
        expect(coordinator.getActiveTransition()).toEqual(
            expect.objectContaining({
                variant: "diagonal",
                venetianOrientation: "horizontal",
                pushFrom: "left",
                irisOrigin: "center",
                mosaicSeed: 1,
            }),
        );

        coordinator.update(40);
        expect(coordinator.getPhase()).toBe("reveal");
        expect(coordinator.getPhaseElapsedMs()).toBe(0);
        expect(onCovered).toHaveBeenCalledTimes(1);

        coordinator.update(40);
        expect(onComplete).toHaveBeenCalledTimes(1);
        expect(coordinator.isActive()).toBe(false);
        expect(coordinator.getPhase()).toBe("cover");
    });

    it("fires callbacks once even with extra updates", () => {
        const coordinator = new TransitionCoordinator();
        const onCovered = vi.fn();
        const onComplete = vi.fn();

        coordinator.play({
            color: "#111",
            from: "bottom-right",
            durationMs: 30,
            stepMs: 0,
            boxSize: 8,
            onCovered,
            onComplete,
        });

        coordinator.update(30);
        coordinator.update(30);
        coordinator.update(999);

        expect(onCovered).toHaveBeenCalledTimes(1);
        expect(onComplete).toHaveBeenCalledTimes(1);
        expect(coordinator.isActive()).toBe(false);
    });

    it("resets active transition state", () => {
        const coordinator = new TransitionCoordinator();

        coordinator.play({
            color: "#fff",
            from: "top-right",
            durationMs: 100,
            stepMs: 0,
            boxSize: 10,
        });

        coordinator.update(16);
        expect(coordinator.isActive()).toBe(true);
        expect(coordinator.getPhaseElapsedMs()).toBe(16);

        coordinator.reset();

        expect(coordinator.isActive()).toBe(false);
        expect(coordinator.getPhase()).toBe("cover");
        expect(coordinator.getPhaseElapsedMs()).toBe(0);
    });
});
