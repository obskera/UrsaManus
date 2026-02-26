import { describe, expect, it, vi } from "vitest";
import {
    createInputComponentAdapters,
    invokeDirectionalAction,
    toInputDirection,
} from "@/components/screenController/inputMappingAdapters";
import type { InputActionMap } from "@/components/screenController/inputActions";

function createActions(): InputActionMap {
    return {
        north: vi.fn(),
        south: vi.fn(),
        east: vi.fn(),
        west: vi.fn(),
        interact: vi.fn(),
    };
}

describe("inputMappingAdapters", () => {
    it("maps virtual aliases to canonical input directions", () => {
        expect(toInputDirection("up")).toBe("north");
        expect(toInputDirection("down")).toBe("south");
        expect(toInputDirection("left")).toBe("west");
        expect(toInputDirection("right")).toBe("east");
        expect(toInputDirection("north")).toBe("north");
    });

    it("invokes directional actions from aliases", () => {
        const actions = createActions();

        invokeDirectionalAction(actions, "up");
        invokeDirectionalAction(actions, "right");
        invokeDirectionalAction(actions, "down");
        invokeDirectionalAction(actions, "left");

        expect(actions.north).toHaveBeenCalledTimes(1);
        expect(actions.east).toHaveBeenCalledTimes(1);
        expect(actions.south).toHaveBeenCalledTimes(1);
        expect(actions.west).toHaveBeenCalledTimes(1);
    });

    it("creates adapters for compass, virtual dpad, and action button", () => {
        const actions = createActions();
        const adapters = createInputComponentAdapters(actions);

        adapters.compassActions.north();
        adapters.compassActions.west();
        adapters.virtualDPad.onDirectionStart("right");
        adapters.actionButton.onActivate();

        expect(actions.north).toHaveBeenCalledTimes(1);
        expect(actions.west).toHaveBeenCalledTimes(1);
        expect(actions.east).toHaveBeenCalledTimes(1);
        expect(actions.interact).toHaveBeenCalledTimes(1);
    });
});
