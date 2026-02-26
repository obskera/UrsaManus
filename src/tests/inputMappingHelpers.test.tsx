import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CompassActionControl from "@/components/screenController/CompassActionControl";
import { useActionKeyBindings } from "@/components/screenController/useActionKeyBindings";
import type { InputActionMap } from "@/components/screenController/inputActions";

function KeyBindingsProbe({
    actions,
    enabled = true,
    preventDefault = true,
}: {
    actions: InputActionMap;
    enabled?: boolean;
    preventDefault?: boolean;
}) {
    useActionKeyBindings(actions, { enabled, preventDefault });
    return null;
}

describe("input mapping helpers", () => {
    it("triggers mapped actions for default key bindings", () => {
        const actions: InputActionMap = {
            north: vi.fn(),
            south: vi.fn(),
            east: vi.fn(),
            west: vi.fn(),
            interact: vi.fn(),
        };

        render(<KeyBindingsProbe actions={actions} />);

        fireEvent.keyDown(window, { key: "w" });
        fireEvent.keyDown(window, { key: "ArrowDown" });
        fireEvent.keyDown(window, { key: "d" });
        fireEvent.keyDown(window, { key: "ArrowLeft" });
        fireEvent.keyDown(window, { key: "Enter" });

        expect(actions.north).toHaveBeenCalledTimes(1);
        expect(actions.south).toHaveBeenCalledTimes(1);
        expect(actions.east).toHaveBeenCalledTimes(1);
        expect(actions.west).toHaveBeenCalledTimes(1);
        expect(actions.interact).toHaveBeenCalledTimes(1);
    });

    it("respects disabled mode for key bindings", () => {
        const actions: InputActionMap = {
            north: vi.fn(),
            south: vi.fn(),
            east: vi.fn(),
            west: vi.fn(),
            interact: vi.fn(),
        };

        render(<KeyBindingsProbe actions={actions} enabled={false} />);
        fireEvent.keyDown(window, { key: "w" });

        expect(actions.north).not.toHaveBeenCalled();
    });

    it("renders compass action buttons and invokes provided actions", () => {
        const actions = {
            north: vi.fn(),
            south: vi.fn(),
            east: vi.fn(),
            west: vi.fn(),
        };

        render(<CompassActionControl actions={actions} />);

        fireEvent.click(screen.getByRole("button", { name: "N" }));
        fireEvent.click(screen.getByRole("button", { name: "S" }));
        fireEvent.click(screen.getByRole("button", { name: "E" }));
        fireEvent.click(screen.getByRole("button", { name: "W" }));

        expect(actions.north).toHaveBeenCalledTimes(1);
        expect(actions.south).toHaveBeenCalledTimes(1);
        expect(actions.east).toHaveBeenCalledTimes(1);
        expect(actions.west).toHaveBeenCalledTimes(1);
    });
});
