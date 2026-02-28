import { describe, expect, it } from "vitest";
import {
    isTimedStateActive,
    resolveEntityBehaviorState,
    type TimedEntityState,
} from "@/logic/entity/entityStateMachine";

describe("entityStateMachine", () => {
    it("resolves moving when there is move intent", () => {
        const state = resolveEntityBehaviorState({
            nowMs: 100,
            timedState: null,
            hasMoveIntent: true,
            speedX: 0,
        });

        expect(state).toBe("moving");
    });

    it("uses timed states as higher-priority interrupts", () => {
        const timedState: TimedEntityState = {
            state: "damaged",
            untilMs: 240,
        };

        const activeState = resolveEntityBehaviorState({
            nowMs: 150,
            timedState,
            hasMoveIntent: true,
            speedX: 20,
        });

        expect(activeState).toBe("damaged");
        expect(isTimedStateActive(timedState, 150)).toBe(true);
        expect(isTimedStateActive(timedState, 300)).toBe(false);
    });

    it("supports dodge and block as timed interrupt states", () => {
        const dodgeState: TimedEntityState = {
            state: "dodge",
            untilMs: 130,
        };
        const blockState: TimedEntityState = {
            state: "block",
            untilMs: 230,
        };

        expect(
            resolveEntityBehaviorState({
                nowMs: 100,
                timedState: dodgeState,
                hasMoveIntent: true,
                speedX: 20,
            }),
        ).toBe("dodge");

        expect(
            resolveEntityBehaviorState({
                nowMs: 200,
                timedState: blockState,
                hasMoveIntent: true,
                speedX: 20,
            }),
        ).toBe("block");
    });

    it("falls back to idle when no movement or timed state is active", () => {
        const state = resolveEntityBehaviorState({
            nowMs: 100,
            timedState: {
                state: "stunned",
                untilMs: 99,
            },
            hasMoveIntent: false,
            speedX: 0,
        });

        expect(state).toBe("idle");
    });
});
