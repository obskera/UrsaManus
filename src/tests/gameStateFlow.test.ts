import { describe, expect, it, vi } from "vitest";
import { GameStateFlowController } from "@/services/gameStateFlow";

describe("GameStateFlowController", () => {
    it("starts in boot and allows canonical transition chain", () => {
        const flow = new GameStateFlowController();

        expect(flow.getState()).toBe("boot");
        expect(flow.transition("menu", { reason: "boot-complete" })).toBe(true);
        expect(flow.transition("play", { reason: "new-game" })).toBe(true);
        expect(flow.transition("pause", { reason: "pause-key" })).toBe(true);
        expect(flow.transition("play", { reason: "resume" })).toBe(true);
        expect(flow.transition("gameover", { reason: "player-dead" })).toBe(
            true,
        );
        expect(flow.getState()).toBe("gameover");
    });

    it("blocks invalid transitions and emits blocked events", () => {
        const flow = new GameStateFlowController("boot");
        const listener = vi.fn();

        flow.subscribe(listener);
        const ok = flow.transition("pause", { reason: "invalid" });

        expect(ok).toBe(false);
        expect(flow.getState()).toBe("boot");
        expect(listener).toHaveBeenCalledWith({
            type: "blocked",
            from: "boot",
            to: "pause",
            reason: "invalid",
            meta: undefined,
        });
    });

    it("supports subscribe/onEnter/onExit hooks with unsubscribe", () => {
        const flow = new GameStateFlowController("menu");
        const onAny = vi.fn();
        const onPlayEnter = vi.fn();
        const onMenuExit = vi.fn();

        const offAny = flow.subscribe(onAny);
        const offEnter = flow.onEnter("play", onPlayEnter);
        const offExit = flow.onExit("menu", onMenuExit);

        flow.transition("play", { reason: "start" });

        expect(onAny).toHaveBeenCalledTimes(1);
        expect(onPlayEnter).toHaveBeenCalledTimes(1);
        expect(onMenuExit).toHaveBeenCalledTimes(1);

        offAny();
        offEnter();
        offExit();

        flow.transition("pause", { reason: "pause" });

        expect(onAny).toHaveBeenCalledTimes(1);
        expect(onPlayEnter).toHaveBeenCalledTimes(1);
        expect(onMenuExit).toHaveBeenCalledTimes(1);
    });

    it("returns allowed transitions and supports reset", () => {
        const flow = new GameStateFlowController("play");

        expect(flow.getAllowedTransitions()).toEqual(
            expect.arrayContaining(["pause", "cutscene", "gameover", "menu"]),
        );

        flow.reset("boot");
        expect(flow.getState()).toBe("boot");
        expect(flow.canTransition("menu")).toBe(true);
        expect(flow.canTransition("play")).toBe(false);
    });
});
