export type AnimationStateMachineReason = "manual" | "signal" | "time";

export type AnimationTransitionMatch<State extends string> =
    | State
    | readonly State[]
    | "*";

export type AnimationTransitionGuardInput<State extends string, Context> = {
    from: State;
    to: State;
    nowMs: number;
    enteredAtMs: number;
    elapsedMs: number;
    signal: string | null;
    reason: AnimationStateMachineReason;
    context: Context;
};

export type AnimationTransitionCallbackInput<
    State extends string,
    Context,
> = AnimationTransitionGuardInput<State, Context>;

export type AnimationStateTransition<State extends string, Context> = {
    from: AnimationTransitionMatch<State>;
    to: State;
    priority?: number;
    signal?: string;
    minElapsedMs?: number;
    guard?: (input: AnimationTransitionGuardInput<State, Context>) => boolean;
    onTransition?: (
        input: AnimationTransitionCallbackInput<State, Context>,
    ) => void;
};

export type AnimationStateMachineHooks<State extends string, Context> = {
    onEnter?: (
        state: State,
        input: AnimationTransitionCallbackInput<State, Context>,
    ) => void;
    onExit?: (
        state: State,
        input: AnimationTransitionCallbackInput<State, Context>,
    ) => void;
};

export type AnimationStateMachineOptions<State extends string, Context> = {
    initialState: State;
    transitions: readonly AnimationStateTransition<State, Context>[];
    hooks?: AnimationStateMachineHooks<State, Context>;
};

export type AnimationStateMachineSnapshot<State extends string> = {
    state: State;
    enteredAtMs: number;
};

export type AnimationStateMachine<State extends string, Context> = {
    getState: () => State;
    getEnteredAtMs: () => number;
    getSnapshot: () => AnimationStateMachineSnapshot<State>;
    transitionTo: (state: State, nowMs: number, context: Context) => boolean;
    send: (signal: string, nowMs: number, context: Context) => State;
    update: (nowMs: number, context: Context) => State;
};

function normalizeTransitionMatch<State extends string>(
    match: AnimationTransitionMatch<State>,
): readonly State[] | "*" {
    if (match === "*") {
        return "*";
    }

    if (Array.isArray(match)) {
        return [...match];
    }

    return [match as State];
}

function isTransitionFromMatch<State extends string>(
    transitionFrom: readonly State[] | "*",
    from: State,
): boolean {
    return transitionFrom === "*" ? true : transitionFrom.includes(from);
}

function sortTransitionsByPriority<State extends string, Context>(
    transitions: readonly AnimationStateTransition<State, Context>[],
): Array<{
    definition: AnimationStateTransition<State, Context>;
    order: number;
    from: readonly State[] | "*";
}> {
    return transitions
        .map((definition, order) => ({
            definition,
            order,
            from: normalizeTransitionMatch(definition.from),
        }))
        .sort((a, b) => {
            const priorityA = a.definition.priority ?? 0;
            const priorityB = b.definition.priority ?? 0;
            if (priorityA !== priorityB) {
                return priorityB - priorityA;
            }

            return a.order - b.order;
        });
}

export function createAnimationStateMachine<State extends string, Context>(
    options: AnimationStateMachineOptions<State, Context>,
): AnimationStateMachine<State, Context> {
    let currentState = options.initialState;
    let enteredAtMs = 0;
    const orderedTransitions = sortTransitionsByPriority(options.transitions);

    const applyTransition = (
        nextState: State,
        nowMs: number,
        context: Context,
        signal: string | null,
        reason: AnimationStateMachineReason,
        onTransition?: (
            input: AnimationTransitionCallbackInput<State, Context>,
        ) => void,
    ): boolean => {
        if (nextState === currentState) {
            return false;
        }

        const callbackInput: AnimationTransitionCallbackInput<State, Context> =
            {
                from: currentState,
                to: nextState,
                nowMs,
                enteredAtMs,
                elapsedMs: nowMs - enteredAtMs,
                signal,
                reason,
                context,
            };

        options.hooks?.onExit?.(currentState, callbackInput);
        onTransition?.(callbackInput);

        currentState = nextState;
        enteredAtMs = nowMs;

        options.hooks?.onEnter?.(nextState, callbackInput);

        return true;
    };

    const evaluate = (
        nowMs: number,
        context: Context,
        signal: string | null,
        reason: AnimationStateMachineReason,
    ): State => {
        for (const candidate of orderedTransitions) {
            const { definition, from } = candidate;

            if (!isTransitionFromMatch(from, currentState)) {
                continue;
            }

            if (signal !== null) {
                if (!definition.signal || definition.signal !== signal) {
                    continue;
                }
            } else if (definition.signal) {
                continue;
            }

            const elapsedMs = nowMs - enteredAtMs;
            if (
                definition.minElapsedMs !== undefined &&
                elapsedMs < definition.minElapsedMs
            ) {
                continue;
            }

            const guardInput: AnimationTransitionGuardInput<State, Context> = {
                from: currentState,
                to: definition.to,
                nowMs,
                enteredAtMs,
                elapsedMs,
                signal,
                reason,
                context,
            };

            if (definition.guard && !definition.guard(guardInput)) {
                continue;
            }

            const changed = applyTransition(
                definition.to,
                nowMs,
                context,
                signal,
                reason,
                definition.onTransition,
            );
            if (changed) {
                break;
            }
        }

        return currentState;
    };

    return {
        getState: () => currentState,
        getEnteredAtMs: () => enteredAtMs,
        getSnapshot: () => ({
            state: currentState,
            enteredAtMs,
        }),
        transitionTo: (state, nowMs, context) => {
            return applyTransition(state, nowMs, context, null, "manual");
        },
        send: (signal, nowMs, context) => {
            return evaluate(nowMs, context, signal, "signal");
        },
        update: (nowMs, context) => {
            return evaluate(nowMs, context, null, "time");
        },
    };
}
