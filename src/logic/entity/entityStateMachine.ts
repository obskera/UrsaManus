import {
    createAnimationStateMachine,
    type AnimationStateMachine,
} from "@/logic/entity/animationStateMachine";

export type EntityBehaviorState =
    | "idle"
    | "moving"
    | "patrol"
    | "chase"
    | "flee"
    | "dodge"
    | "block"
    | "attacking"
    | "damaged"
    | "stunned"
    | "phase-1"
    | "phase-2"
    | "dead";

export type TimedEntityState = {
    state: Extract<
        EntityBehaviorState,
        "attacking" | "damaged" | "stunned" | "dodge" | "block"
    >;
    untilMs: number;
};

type ResolveEntityBehaviorStateInput = {
    nowMs: number;
    timedState: TimedEntityState | null;
    isDead?: boolean;
    hasMoveIntent?: boolean;
    speedX?: number;
    movingSpeedThreshold?: number;
};

const DEFAULT_MOVING_SPEED_THRESHOLD = 0.5;

export const resolveEntityBehaviorState = ({
    nowMs,
    timedState,
    isDead = false,
    hasMoveIntent = false,
    speedX = 0,
    movingSpeedThreshold = DEFAULT_MOVING_SPEED_THRESHOLD,
}: ResolveEntityBehaviorStateInput): EntityBehaviorState => {
    if (isDead) {
        return "dead";
    }

    if (timedState && timedState.untilMs > nowMs) {
        return timedState.state;
    }

    if (hasMoveIntent || Math.abs(speedX) > movingSpeedThreshold) {
        return "moving";
    }

    return "idle";
};

export const isTimedStateActive = (
    timedState: TimedEntityState | null,
    nowMs: number,
): timedState is TimedEntityState => {
    return !!timedState && timedState.untilMs > nowMs;
};

export type BasicEntityAnimationProfileState =
    | "idle"
    | "run"
    | "jump"
    | "attack";

export type BasicEntityAnimationProfileContext = {
    hasMoveIntent: boolean;
    isGrounded: boolean;
    attackQueued: boolean;
};

export const createBasicEntityAnimationProfileStateMachine =
    (): AnimationStateMachine<
        BasicEntityAnimationProfileState,
        BasicEntityAnimationProfileContext
    > => {
        return createAnimationStateMachine<
            BasicEntityAnimationProfileState,
            BasicEntityAnimationProfileContext
        >({
            initialState: "idle",
            transitions: [
                {
                    from: "*",
                    to: "attack",
                    signal: "attack",
                    priority: 20,
                },
                {
                    from: "attack",
                    to: "idle",
                    minElapsedMs: 180,
                    guard: ({ context }) => !context.hasMoveIntent,
                    priority: 15,
                },
                {
                    from: "attack",
                    to: "run",
                    minElapsedMs: 180,
                    guard: ({ context }) => context.hasMoveIntent,
                    priority: 15,
                },
                {
                    from: ["idle", "run"],
                    to: "jump",
                    signal: "jump",
                    priority: 12,
                },
                {
                    from: "jump",
                    to: "run",
                    guard: ({ context }) =>
                        context.isGrounded && context.hasMoveIntent,
                    priority: 10,
                },
                {
                    from: "jump",
                    to: "idle",
                    guard: ({ context }) =>
                        context.isGrounded && !context.hasMoveIntent,
                    priority: 10,
                },
                {
                    from: "idle",
                    to: "run",
                    guard: ({ context }) => context.hasMoveIntent,
                    priority: 5,
                },
                {
                    from: "run",
                    to: "idle",
                    guard: ({ context }) => !context.hasMoveIntent,
                    priority: 5,
                },
            ],
        });
    };
