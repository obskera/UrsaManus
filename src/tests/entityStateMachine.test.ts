import { describe, expect, it, vi } from "vitest";
import {
    ENTITY_BEHAVIOR_SIGNAL,
    createEntityBehaviorStateMachine,
    resolveEntityAnimationClip,
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

    it("supports interrupt priorities where damaged overrides attacking", () => {
        const machine = createEntityBehaviorStateMachine("player");

        machine.send(ENTITY_BEHAVIOR_SIGNAL.attack, 10, {
            hasMoveIntent: true,
        });
        expect(machine.getState()).toBe("attacking");

        machine.send(ENTITY_BEHAVIOR_SIGNAL.damaged, 20, {
            hasMoveIntent: true,
        });
        expect(machine.getState()).toBe("damaged");
    });

    it("fires onEnter/onExit hooks and keeps animation clip bound to active state", () => {
        const onEnter = vi.fn();
        const onExit = vi.fn();

        const machine = createEntityBehaviorStateMachine("player", {
            onEnter,
            onExit,
        });

        machine.send(ENTITY_BEHAVIOR_SIGNAL.dodge, 10, {
            hasMoveIntent: true,
        });
        expect(machine.getState()).toBe("dodge");
        expect(machine.getAnimationClip()).toBe("dodge");

        machine.update(200, {
            hasMoveIntent: false,
        });
        expect(machine.getState()).toBe("idle");
        expect(resolveEntityAnimationClip(machine.getState())).toBe("idle");

        expect(onExit).toHaveBeenCalled();
        expect(onEnter).toHaveBeenCalled();
    });

    it("supports npc taxonomy states patrol/flee", () => {
        const machine = createEntityBehaviorStateMachine("npc");

        machine.send(ENTITY_BEHAVIOR_SIGNAL.patrol, 5, {
            hasMoveIntent: true,
            wantsPatrol: true,
        });
        expect(machine.getState()).toBe("patrol");

        machine.send(ENTITY_BEHAVIOR_SIGNAL.flee, 10, {
            hasMoveIntent: true,
            wantsFlee: true,
        });
        expect(machine.getState()).toBe("flee");
    });

    it("supports boss taxonomy states phase-1/phase-2", () => {
        const machine = createEntityBehaviorStateMachine("boss");

        expect(machine.getState()).toBe("phase-1");
        expect(machine.getAnimationClip()).toBe("phase-1");

        machine.send(ENTITY_BEHAVIOR_SIGNAL.phase2, 20, {
            hasMoveIntent: false,
            bossPhase: 2,
        });

        expect(machine.getState()).toBe("phase-2");
        expect(machine.getAnimationClip()).toBe("phase-2");
    });
});
