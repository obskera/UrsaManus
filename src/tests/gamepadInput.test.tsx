import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    useGamepadInput,
    type GamepadInputMap,
} from "@/components/screenController/useGamepadInput";
import type { InputActionMap } from "@/components/screenController/inputActions";

function buildGamepad(overrides: Partial<Gamepad> = {}): Gamepad {
    return {
        id: "Test Pad",
        index: 0,
        connected: true,
        mapping: "standard",
        axes: [0, 0],
        buttons: [
            { pressed: false, touched: false, value: 0 } as GamepadButton,
        ],
        timestamp: Date.now(),
        vibrationActuator: null,
        hapticActuators: [],
        ...overrides,
    } as Gamepad;
}

function GamepadProbe({
    actions,
    getGamepads,
    mapping,
    deadzone,
    onConnected,
    onDisconnected,
}: {
    actions: InputActionMap;
    getGamepads: () => ArrayLike<Gamepad | null>;
    mapping?: GamepadInputMap;
    deadzone?: number;
    onConnected?: (gamepad: Gamepad) => void;
    onDisconnected?: (gamepad: Gamepad) => void;
}) {
    useGamepadInput(actions, {
        getGamepads,
        mapping,
        deadzone,
        pollIntervalMs: 5,
        onConnected,
        onDisconnected,
    });
    return null;
}

describe("useGamepadInput", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("applies deadzone before directional actions fire", () => {
        const actions: InputActionMap = {
            north: vi.fn(),
            south: vi.fn(),
            east: vi.fn(),
            west: vi.fn(),
            interact: vi.fn(),
        };

        let axes: [number, number] = [0.1, -0.1];
        const getGamepads = () => [buildGamepad({ axes })];

        render(
            <GamepadProbe
                actions={actions}
                getGamepads={getGamepads}
                deadzone={0.2}
            />,
        );

        vi.advanceTimersByTime(20);

        expect(actions.north).not.toHaveBeenCalled();
        expect(actions.east).not.toHaveBeenCalled();

        axes = [0.5, -0.6];
        vi.advanceTimersByTime(10);

        expect(actions.north).toHaveBeenCalled();
        expect(actions.east).toHaveBeenCalled();
    });

    it("supports init-time remapping for axes and buttons", () => {
        const actions: InputActionMap = {
            north: vi.fn(),
            south: vi.fn(),
            east: vi.fn(),
            west: vi.fn(),
            interact: vi.fn(),
        };

        const gamepad = buildGamepad({
            axes: [-0.8, 0],
            buttons: [
                { pressed: false, touched: false, value: 0 } as GamepadButton,
                { pressed: true, touched: true, value: 1 } as GamepadButton,
            ],
        });

        const getGamepads = () => [gamepad];
        const mapping: GamepadInputMap = {
            axis: {
                east: { axis: 0, direction: "negative" },
            },
            button: {
                interact: 1,
            },
        };

        render(
            <GamepadProbe
                actions={actions}
                getGamepads={getGamepads}
                mapping={mapping}
                deadzone={0.2}
            />,
        );

        vi.advanceTimersByTime(10);

        expect(actions.east).toHaveBeenCalled();
        expect(actions.interact).toHaveBeenCalledTimes(1);
    });

    it("reports connect and disconnect transitions", () => {
        const actions: InputActionMap = {
            north: vi.fn(),
            south: vi.fn(),
            east: vi.fn(),
            west: vi.fn(),
            interact: vi.fn(),
        };

        const onConnected = vi.fn();
        const onDisconnected = vi.fn();
        const gamepad = buildGamepad();
        let connected = false;

        const getGamepads = () => (connected ? [gamepad] : [null]);

        render(
            <GamepadProbe
                actions={actions}
                getGamepads={getGamepads}
                onConnected={onConnected}
                onDisconnected={onDisconnected}
            />,
        );

        connected = true;
        vi.advanceTimersByTime(10);
        expect(onConnected).toHaveBeenCalledWith(gamepad);

        connected = false;
        vi.advanceTimersByTime(10);
        expect(onDisconnected).toHaveBeenCalledTimes(1);
    });
});
