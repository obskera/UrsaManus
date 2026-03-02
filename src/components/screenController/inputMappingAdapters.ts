import type { InputActionMap } from "./inputActions";

export type InputDirection = "north" | "south" | "east" | "west";
export type InputDirectionAlias =
    | InputDirection
    | "up"
    | "down"
    | "left"
    | "right";

export type DirectionalActions = Pick<
    InputActionMap,
    "north" | "south" | "east" | "west"
>;

export type InputComponentAdapters = {
    compassActions: DirectionalActions;
    virtualDPad: {
        onDirectionStart: (direction: InputDirectionAlias) => void;
    };
    virtualControlStick: {
        onVectorChange: (vector: {
            x: number;
            y: number;
            magnitude: number;
            active: boolean;
        }) => void;
        onRelease: () => void;
    };
    actionButton: {
        onActivate: () => void;
    };
};

export type InputComponentAdapterOptions = {
    analogDirectionThreshold?: number;
};

const DEFAULT_ANALOG_DIRECTION_THRESHOLD = 0.35;

function normalizeAnalogThreshold(value: number | undefined): number {
    if (!Number.isFinite(value)) {
        return DEFAULT_ANALOG_DIRECTION_THRESHOLD;
    }

    return Math.max(
        0,
        Math.min(1, value ?? DEFAULT_ANALOG_DIRECTION_THRESHOLD),
    );
}

function resolveAnalogDirection(
    vector: { x: number; y: number; magnitude: number; active: boolean },
    threshold: number,
): InputDirection | null {
    if (!vector.active || vector.magnitude < threshold) {
        return null;
    }

    if (Math.abs(vector.x) >= Math.abs(vector.y)) {
        return vector.x >= 0 ? "east" : "west";
    }

    return vector.y >= 0 ? "south" : "north";
}

export function toInputDirection(
    direction: InputDirectionAlias,
): InputDirection {
    if (direction === "up") return "north";
    if (direction === "down") return "south";
    if (direction === "left") return "west";
    if (direction === "right") return "east";
    return direction;
}

export function invokeDirectionalAction(
    actions: DirectionalActions,
    direction: InputDirectionAlias,
): void {
    const mappedDirection = toInputDirection(direction);
    actions[mappedDirection]();
}

export function createInputComponentAdapters(
    actions: InputActionMap,
    options: InputComponentAdapterOptions = {},
): InputComponentAdapters {
    const analogThreshold = normalizeAnalogThreshold(
        options.analogDirectionThreshold,
    );
    let activeAnalogDirection: InputDirection | null = null;

    return {
        compassActions: {
            north: actions.north,
            south: actions.south,
            east: actions.east,
            west: actions.west,
        },
        virtualDPad: {
            onDirectionStart: (direction) => {
                invokeDirectionalAction(actions, direction);
            },
        },
        virtualControlStick: {
            onVectorChange: (vector) => {
                const nextDirection = resolveAnalogDirection(
                    vector,
                    analogThreshold,
                );

                if (!nextDirection) {
                    activeAnalogDirection = null;
                    return;
                }

                if (activeAnalogDirection === nextDirection) {
                    return;
                }

                activeAnalogDirection = nextDirection;
                actions[nextDirection]();
            },
            onRelease: () => {
                activeAnalogDirection = null;
            },
        },
        actionButton: {
            onActivate: () => {
                actions.interact();
            },
        },
    };
}
