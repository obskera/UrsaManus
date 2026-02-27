import { useEffect, useMemo } from "react";
import type { InputActionMap } from "./inputActions";

export type GamepadAxisDirection = "negative" | "positive";

export type GamepadAxisBinding = {
    axis: number;
    direction: GamepadAxisDirection;
};

export type GamepadAxisMap = {
    north: GamepadAxisBinding;
    south: GamepadAxisBinding;
    east: GamepadAxisBinding;
    west: GamepadAxisBinding;
};

export type GamepadButtonMap = {
    interact: number;
};

export type GamepadInputMap = {
    axis: Partial<GamepadAxisMap>;
    button: Partial<GamepadButtonMap>;
};

export type UseGamepadInputOptions = {
    enabled?: boolean;
    deadzone?: number;
    pollIntervalMs?: number;
    mapping?: GamepadInputMap;
    gamepadIndex?: number;
    onConnected?: (gamepad: Gamepad) => void;
    onDisconnected?: (gamepad: Gamepad) => void;
    getGamepads?: () => ArrayLike<Gamepad | null>;
};

const DEFAULT_AXIS_MAP: GamepadAxisMap = {
    north: { axis: 1, direction: "negative" },
    south: { axis: 1, direction: "positive" },
    east: { axis: 0, direction: "positive" },
    west: { axis: 0, direction: "negative" },
};

const DEFAULT_BUTTON_MAP: GamepadButtonMap = {
    interact: 0,
};

const DEFAULT_DEADZONE = 0.2;
const DEFAULT_POLL_INTERVAL_MS = 16;

type ResolvedMap = {
    axis: GamepadAxisMap;
    button: GamepadButtonMap;
};

function resolveMapping(mapping?: GamepadInputMap): ResolvedMap {
    return {
        axis: {
            north: mapping?.axis.north ?? DEFAULT_AXIS_MAP.north,
            south: mapping?.axis.south ?? DEFAULT_AXIS_MAP.south,
            east: mapping?.axis.east ?? DEFAULT_AXIS_MAP.east,
            west: mapping?.axis.west ?? DEFAULT_AXIS_MAP.west,
        },
        button: {
            interact: mapping?.button.interact ?? DEFAULT_BUTTON_MAP.interact,
        },
    };
}

function getAxisValue(gamepad: Gamepad, binding: GamepadAxisBinding): number {
    const value = gamepad.axes[binding.axis] ?? 0;
    return binding.direction === "negative" ? -value : value;
}

function getDefaultGamepads() {
    return navigator.getGamepads();
}

function pickGamepad(
    gamepads: ArrayLike<Gamepad | null>,
    gamepadIndex: number,
): Gamepad | null {
    if (gamepadIndex >= 0) {
        return gamepads[gamepadIndex] ?? null;
    }

    for (let i = 0; i < gamepads.length; i += 1) {
        const gamepad = gamepads[i];
        if (gamepad?.connected) {
            return gamepad;
        }
    }

    return null;
}

function getConnectedIds(gamepads: ArrayLike<Gamepad | null>) {
    const ids: string[] = [];
    for (let i = 0; i < gamepads.length; i += 1) {
        const gamepad = gamepads[i];
        if (gamepad?.connected) {
            ids.push(`${gamepad.index}:${gamepad.id}`);
        }
    }
    ids.sort();
    return ids;
}

export function useGamepadInput(
    actions: InputActionMap,
    {
        enabled = true,
        deadzone = DEFAULT_DEADZONE,
        pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
        mapping,
        gamepadIndex = -1,
        onConnected,
        onDisconnected,
        getGamepads = getDefaultGamepads,
    }: UseGamepadInputOptions = {},
) {
    const resolvedMapping = useMemo(() => resolveMapping(mapping), [mapping]);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const activeButtons = new Set<number>();
        let previousConnected = new Set<string>();

        const notifyConnectedDiff = (gamepads: ArrayLike<Gamepad | null>) => {
            const currentConnected = new Set(getConnectedIds(gamepads));

            for (const connectedId of currentConnected) {
                if (previousConnected.has(connectedId)) {
                    continue;
                }

                const [indexPart] = connectedId.split(":");
                const index = Number(indexPart);
                const gamepad = gamepads[index];
                if (gamepad) {
                    onConnected?.(gamepad);
                }
            }

            for (const disconnectedId of previousConnected) {
                if (currentConnected.has(disconnectedId)) {
                    continue;
                }

                const [indexPart, ...idParts] = disconnectedId.split(":");
                const index = Number(indexPart);
                const id = idParts.join(":");
                onDisconnected?.({
                    id,
                    index,
                    connected: false,
                } as Gamepad);
            }

            previousConnected = currentConnected;
        };

        const runPoll = () => {
            const gamepads = getGamepads();
            notifyConnectedDiff(gamepads);

            const activeGamepad = pickGamepad(gamepads, gamepadIndex);
            if (!activeGamepad) {
                activeButtons.clear();
                return;
            }

            const axisMap = resolvedMapping.axis;

            if (getAxisValue(activeGamepad, axisMap.north) >= deadzone) {
                actions.north();
            }
            if (getAxisValue(activeGamepad, axisMap.south) >= deadzone) {
                actions.south();
            }
            if (getAxisValue(activeGamepad, axisMap.east) >= deadzone) {
                actions.east();
            }
            if (getAxisValue(activeGamepad, axisMap.west) >= deadzone) {
                actions.west();
            }

            const interactButtonIndex = resolvedMapping.button.interact;
            const interactPressed =
                !!activeGamepad.buttons[interactButtonIndex]?.pressed;

            if (interactPressed && !activeButtons.has(interactButtonIndex)) {
                actions.interact();
                activeButtons.add(interactButtonIndex);
            } else if (!interactPressed) {
                activeButtons.delete(interactButtonIndex);
            }
        };

        runPoll();
        const intervalId = window.setInterval(runPoll, pollIntervalMs);

        const onGamepadConnected = (event: Event) => {
            const gamepadEvent = event as GamepadEvent;
            onConnected?.(gamepadEvent.gamepad);
        };

        const onGamepadDisconnected = (event: Event) => {
            const gamepadEvent = event as GamepadEvent;
            onDisconnected?.(gamepadEvent.gamepad);
        };

        window.addEventListener("gamepadconnected", onGamepadConnected);
        window.addEventListener("gamepaddisconnected", onGamepadDisconnected);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener("gamepadconnected", onGamepadConnected);
            window.removeEventListener(
                "gamepaddisconnected",
                onGamepadDisconnected,
            );
            activeButtons.clear();
        };
    }, [
        actions,
        deadzone,
        enabled,
        gamepadIndex,
        getGamepads,
        onConnected,
        onDisconnected,
        pollIntervalMs,
        resolvedMapping,
    ]);
}
