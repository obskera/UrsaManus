export type GameFlowState =
    | "boot"
    | "menu"
    | "play"
    | "pause"
    | "cutscene"
    | "gameover";

export type GameStateTransitionContext = {
    reason?: string;
    meta?: Record<string, unknown>;
};

export type GameStateTransitionEvent = {
    type: "transition";
    from: GameFlowState;
    to: GameFlowState;
    reason?: string;
    meta?: Record<string, unknown>;
};

export type GameStateBlockedEvent = {
    type: "blocked";
    from: GameFlowState;
    to: GameFlowState;
    reason?: string;
    meta?: Record<string, unknown>;
};

export type GameStateFlowEvent =
    | GameStateTransitionEvent
    | GameStateBlockedEvent;

export type GameStateFlowListener = (event: GameStateFlowEvent) => void;
export type GameStateFlowUnsubscribe = () => void;

const ALLOWED_TRANSITIONS: Record<GameFlowState, GameFlowState[]> = {
    boot: ["menu"],
    menu: ["play", "boot"],
    play: ["pause", "cutscene", "gameover", "menu"],
    pause: ["play", "menu", "cutscene"],
    cutscene: ["play", "pause", "menu", "gameover"],
    gameover: ["menu", "play"],
};

export class GameStateFlowController {
    private state: GameFlowState;
    private listeners = new Set<GameStateFlowListener>();

    constructor(initialState: GameFlowState = "boot") {
        this.state = initialState;
    }

    getState(): GameFlowState {
        return this.state;
    }

    getAllowedTransitions(state: GameFlowState = this.state): GameFlowState[] {
        return [...(ALLOWED_TRANSITIONS[state] ?? [])];
    }

    canTransition(to: GameFlowState): boolean {
        if (to === this.state) {
            return true;
        }

        return this.getAllowedTransitions().includes(to);
    }

    transition(
        to: GameFlowState,
        context: GameStateTransitionContext = {},
    ): boolean {
        const from = this.state;

        if (to === from) {
            return true;
        }

        if (!this.canTransition(to)) {
            this.emit({
                type: "blocked",
                from,
                to,
                reason: context.reason,
                meta: context.meta,
            });
            return false;
        }

        this.state = to;
        this.emit({
            type: "transition",
            from,
            to,
            reason: context.reason,
            meta: context.meta,
        });

        return true;
    }

    reset(state: GameFlowState = "boot") {
        this.state = state;
    }

    subscribe(listener: GameStateFlowListener): GameStateFlowUnsubscribe {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    onEnter(
        state: GameFlowState,
        handler: (event: GameStateTransitionEvent) => void,
    ): GameStateFlowUnsubscribe {
        return this.subscribe((event) => {
            if (event.type !== "transition") {
                return;
            }

            if (event.to === state) {
                handler(event);
            }
        });
    }

    onExit(
        state: GameFlowState,
        handler: (event: GameStateTransitionEvent) => void,
    ): GameStateFlowUnsubscribe {
        return this.subscribe((event) => {
            if (event.type !== "transition") {
                return;
            }

            if (event.from === state) {
                handler(event);
            }
        });
    }

    private emit(event: GameStateFlowEvent) {
        for (const listener of this.listeners) {
            listener(event);
        }
    }
}

export const gameStateFlow = new GameStateFlowController();
