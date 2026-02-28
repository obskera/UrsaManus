import {
    createAnimationStateMachine,
    type AnimationStateMachine,
    type AnimationTransitionCallbackInput,
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

export type EntityArchetype = "player" | "npc" | "boss";

export type EntityStateProfileContext = {
    hasMoveIntent: boolean;
    isDead?: boolean;
    wantsPatrol?: boolean;
    wantsFlee?: boolean;
    bossPhase?: 1 | 2;
};

export const ENTITY_STATE_ANIMATION_CLIPS: Record<EntityBehaviorState, string> =
    {
        idle: "idle",
        moving: "moving",
        patrol: "moving",
        chase: "moving",
        flee: "moving",
        dodge: "dodge",
        block: "block",
        attacking: "attacking",
        damaged: "damaged",
        stunned: "stunned",
        "phase-1": "phase-1",
        "phase-2": "phase-2",
        dead: "dead",
    };

export const ENTITY_BEHAVIOR_SIGNAL = {
    attack: "attack",
    damaged: "damaged",
    stunned: "stunned",
    dodge: "dodge",
    block: "block",
    patrol: "patrol",
    flee: "flee",
    phase2: "phase-2",
} as const;

export const resolveEntityAnimationClip = (
    state: EntityBehaviorState,
): string => {
    return ENTITY_STATE_ANIMATION_CLIPS[state];
};

function createBaseEntityBehaviorTransitions() {
    return [
        {
            from: "*" as const,
            to: "dead" as const,
            priority: 200,
            guard: ({ context }: { context: EntityStateProfileContext }) =>
                Boolean(context.isDead),
        },
        {
            from: "*" as const,
            to: "damaged" as const,
            signal: ENTITY_BEHAVIOR_SIGNAL.damaged,
            priority: 160,
        },
        {
            from: "*" as const,
            to: "stunned" as const,
            signal: ENTITY_BEHAVIOR_SIGNAL.stunned,
            priority: 150,
        },
        {
            from: [
                "idle",
                "moving",
                "patrol",
                "flee",
                "phase-1",
                "phase-2",
            ] as const,
            to: "attacking" as const,
            signal: ENTITY_BEHAVIOR_SIGNAL.attack,
            priority: 130,
        },
        {
            from: "attacking" as const,
            to: "moving" as const,
            minElapsedMs: 180,
            priority: 60,
            guard: ({ context }: { context: EntityStateProfileContext }) =>
                context.hasMoveIntent,
        },
        {
            from: "attacking" as const,
            to: "idle" as const,
            minElapsedMs: 180,
            priority: 60,
            guard: ({ context }: { context: EntityStateProfileContext }) =>
                !context.hasMoveIntent,
        },
        {
            from: ["damaged", "stunned"] as const,
            to: "moving" as const,
            minElapsedMs: 160,
            priority: 55,
            guard: ({ context }: { context: EntityStateProfileContext }) =>
                context.hasMoveIntent,
        },
        {
            from: ["damaged", "stunned"] as const,
            to: "idle" as const,
            minElapsedMs: 160,
            priority: 55,
            guard: ({ context }: { context: EntityStateProfileContext }) =>
                !context.hasMoveIntent,
        },
        {
            from: "idle" as const,
            to: "moving" as const,
            priority: 20,
            guard: ({ context }: { context: EntityStateProfileContext }) =>
                context.hasMoveIntent,
        },
        {
            from: "moving" as const,
            to: "idle" as const,
            priority: 20,
            guard: ({ context }: { context: EntityStateProfileContext }) =>
                !context.hasMoveIntent,
        },
    ];
}

function createArchetypeTransitions(archetype: EntityArchetype) {
    if (archetype === "player") {
        return [
            {
                from: ["idle", "moving", "attacking", "damaged"] as const,
                to: "dodge" as const,
                signal: ENTITY_BEHAVIOR_SIGNAL.dodge,
                priority: 170,
            },
            {
                from: ["idle", "moving"] as const,
                to: "block" as const,
                signal: ENTITY_BEHAVIOR_SIGNAL.block,
                priority: 145,
            },
            {
                from: "dodge" as const,
                to: "moving" as const,
                minElapsedMs: 120,
                priority: 80,
                guard: ({ context }: { context: EntityStateProfileContext }) =>
                    context.hasMoveIntent,
            },
            {
                from: "dodge" as const,
                to: "idle" as const,
                minElapsedMs: 120,
                priority: 80,
                guard: ({ context }: { context: EntityStateProfileContext }) =>
                    !context.hasMoveIntent,
            },
            {
                from: "block" as const,
                to: "moving" as const,
                minElapsedMs: 140,
                priority: 75,
                guard: ({ context }: { context: EntityStateProfileContext }) =>
                    context.hasMoveIntent,
            },
            {
                from: "block" as const,
                to: "idle" as const,
                minElapsedMs: 140,
                priority: 75,
                guard: ({ context }: { context: EntityStateProfileContext }) =>
                    !context.hasMoveIntent,
            },
        ];
    }

    if (archetype === "npc") {
        return [
            {
                from: ["idle", "moving", "patrol"] as const,
                to: "flee" as const,
                signal: ENTITY_BEHAVIOR_SIGNAL.flee,
                priority: 90,
            },
            {
                from: ["idle", "moving", "flee"] as const,
                to: "patrol" as const,
                signal: ENTITY_BEHAVIOR_SIGNAL.patrol,
                priority: 85,
            },
            {
                from: "patrol" as const,
                to: "flee" as const,
                priority: 86,
                guard: ({ context }: { context: EntityStateProfileContext }) =>
                    context.wantsFlee ?? false,
            },
            {
                from: "flee" as const,
                to: "patrol" as const,
                priority: 84,
                guard: ({ context }: { context: EntityStateProfileContext }) =>
                    (context.wantsPatrol ?? false) &&
                    !(context.wantsFlee ?? false),
            },
            {
                from: "patrol" as const,
                to: "idle" as const,
                priority: 30,
                guard: ({ context }: { context: EntityStateProfileContext }) =>
                    !context.hasMoveIntent && !(context.wantsPatrol ?? false),
            },
            {
                from: "flee" as const,
                to: "idle" as const,
                priority: 30,
                guard: ({ context }: { context: EntityStateProfileContext }) =>
                    !context.hasMoveIntent && !(context.wantsFlee ?? false),
            },
        ];
    }

    return [
        {
            from: "phase-1" as const,
            to: "phase-2" as const,
            signal: ENTITY_BEHAVIOR_SIGNAL.phase2,
            priority: 110,
        },
        {
            from: "phase-1" as const,
            to: "phase-2" as const,
            priority: 100,
            guard: ({ context }: { context: EntityStateProfileContext }) =>
                context.bossPhase === 2,
        },
        {
            from: ["idle", "moving"] as const,
            to: "phase-1" as const,
            priority: 35,
            guard: ({ context }: { context: EntityStateProfileContext }) =>
                context.bossPhase !== 2,
        },
        {
            from: ["idle", "moving"] as const,
            to: "phase-2" as const,
            priority: 35,
            guard: ({ context }: { context: EntityStateProfileContext }) =>
                context.bossPhase === 2,
        },
    ];
}

export const createEntityBehaviorStateMachine = (
    archetype: EntityArchetype,
    hooks?: {
        onEnter?: (
            state: EntityBehaviorState,
            input: AnimationTransitionCallbackInput<
                EntityBehaviorState,
                EntityStateProfileContext
            >,
        ) => void;
        onExit?: (
            state: EntityBehaviorState,
            input: AnimationTransitionCallbackInput<
                EntityBehaviorState,
                EntityStateProfileContext
            >,
        ) => void;
    },
) => {
    const initialState: EntityBehaviorState =
        archetype === "boss" ? "phase-1" : "idle";

    const machine = createAnimationStateMachine<
        EntityBehaviorState,
        EntityStateProfileContext
    >({
        initialState,
        hooks,
        transitions: [
            ...createBaseEntityBehaviorTransitions(),
            ...createArchetypeTransitions(archetype),
        ],
    });

    return {
        ...machine,
        getAnimationClip: () => resolveEntityAnimationClip(machine.getState()),
    };
};
