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
    actionButton: {
        onActivate: () => void;
    };
};

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
): InputComponentAdapters {
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
        actionButton: {
            onActivate: () => {
                actions.interact();
            },
        },
    };
}
