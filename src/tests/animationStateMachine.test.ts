import { describe, expect, it, vi } from "vitest";
import { createAnimationStateMachine } from "@/logic/entity/animationStateMachine";
import { createBasicEntityAnimationProfileStateMachine } from "@/logic/entity/entityStateMachine";

describe("animationStateMachine", () => {
    it("runs prioritized signal transitions with guard callbacks", () => {
        const onTransition = vi.fn();
        const machine = createAnimationStateMachine<
            "idle" | "run" | "jump" | "attack",
            { stamina: number }
        >({
            initialState: "idle",
            transitions: [
                {
                    from: "*",
                    to: "attack",
                    signal: "attack",
                    priority: 10,
                    guard: ({ context }) => context.stamina > 0,
                    onTransition,
                },
                {
                    from: "*",
                    to: "jump",
                    signal: "attack",
                    priority: 5,
                },
            ],
        });

        machine.send("attack", 100, { stamina: 0 });
        expect(machine.getState()).toBe("jump");

        machine.transitionTo("idle", 120, { stamina: 1 });
        machine.send("attack", 130, { stamina: 1 });
        expect(machine.getState()).toBe("attack");
        expect(onTransition).toHaveBeenCalledTimes(1);
    });

    it("supports time-based transitions", () => {
        const machine = createAnimationStateMachine<
            "idle" | "attack",
            { wantsLoop: boolean }
        >({
            initialState: "attack",
            transitions: [
                {
                    from: "attack",
                    to: "idle",
                    minElapsedMs: 200,
                    guard: ({ context }) => !context.wantsLoop,
                },
            ],
        });

        machine.update(100, { wantsLoop: false });
        expect(machine.getState()).toBe("attack");

        machine.update(201, { wantsLoop: false });
        expect(machine.getState()).toBe("idle");
    });

    it("fires onEnter/onExit hooks with transition reason", () => {
        const onEnter = vi.fn();
        const onExit = vi.fn();

        const machine = createAnimationStateMachine<
            "idle" | "run",
            { move: boolean }
        >({
            initialState: "idle",
            hooks: {
                onEnter,
                onExit,
            },
            transitions: [
                {
                    from: "idle",
                    to: "run",
                    guard: ({ context }) => context.move,
                },
            ],
        });

        machine.update(50, { move: true });

        expect(machine.getState()).toBe("run");
        expect(onExit).toHaveBeenCalledWith(
            "idle",
            expect.objectContaining({ reason: "time", to: "run" }),
        );
        expect(onEnter).toHaveBeenCalledWith(
            "run",
            expect.objectContaining({ reason: "time", from: "idle" }),
        );
    });

    it("provides a basic entity profile machine for idle/run/jump/attack", () => {
        const machine = createBasicEntityAnimationProfileStateMachine();

        machine.update(0, {
            hasMoveIntent: true,
            isGrounded: true,
            attackQueued: false,
        });
        expect(machine.getState()).toBe("run");

        machine.send("jump", 30, {
            hasMoveIntent: true,
            isGrounded: true,
            attackQueued: false,
        });
        expect(machine.getState()).toBe("jump");

        machine.update(50, {
            hasMoveIntent: false,
            isGrounded: true,
            attackQueued: false,
        });
        expect(machine.getState()).toBe("idle");

        machine.send("attack", 70, {
            hasMoveIntent: false,
            isGrounded: true,
            attackQueued: true,
        });
        expect(machine.getState()).toBe("attack");

        machine.update(300, {
            hasMoveIntent: false,
            isGrounded: true,
            attackQueued: false,
        });
        expect(machine.getState()).toBe("idle");
    });
});
