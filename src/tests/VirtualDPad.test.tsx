import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VirtualDPad } from "@/components/virtualDPad";

describe("VirtualDPad", () => {
    it("renders movement buttons and updates pressed state via callback", () => {
        const onPressedChange = vi.fn();

        render(
            <VirtualDPad label="Movement" onPressedChange={onPressedChange} />,
        );

        const right = screen.getByRole("button", { name: "Move right" });

        fireEvent.pointerDown(right);
        expect(onPressedChange).toHaveBeenCalledWith({
            up: false,
            down: false,
            left: false,
            right: true,
        });

        fireEvent.pointerUp(right);
        expect(onPressedChange).toHaveBeenCalledWith({
            up: false,
            down: false,
            left: false,
            right: false,
        });
    });

    it("emits direction start and end callbacks", () => {
        const onDirectionStart = vi.fn();
        const onDirectionEnd = vi.fn();

        render(
            <VirtualDPad
                onDirectionStart={onDirectionStart}
                onDirectionEnd={onDirectionEnd}
            />,
        );

        const up = screen.getByRole("button", { name: "Move up" });
        fireEvent.pointerDown(up);
        fireEvent.pointerCancel(up);

        expect(onDirectionStart).toHaveBeenCalledWith("up");
        expect(onDirectionEnd).toHaveBeenCalledWith("up");
    });

    it("prevents interaction when disabled", () => {
        const onPressedChange = vi.fn();

        render(<VirtualDPad disabled onPressedChange={onPressedChange} />);
        const left = screen.getByRole("button", { name: "Move left" });

        expect(left).toBeDisabled();
        fireEvent.pointerDown(left);

        expect(onPressedChange).not.toHaveBeenCalled();
    });

    it("supports full custom render override", () => {
        render(
            <VirtualDPad
                pressed={{ right: true }}
                render={(state) => (
                    <output data-testid="custom-virtual-dpad">
                        {state.vectorX},{state.vectorY}
                    </output>
                )}
            />,
        );

        expect(screen.getByTestId("custom-virtual-dpad")).toHaveTextContent(
            "1,0",
        );
        expect(screen.queryByRole("button", { name: "Move right" })).toBeNull();
    });

    it("respects defaultPressed and custom className in uncontrolled mode", () => {
        render(
            <VirtualDPad
                className="extra"
                defaultPressed={{ up: true, left: true }}
            />,
        );

        const root = screen.getByRole("group", { name: "Virtual DPad" });
        expect(root).toHaveClass("um-virtual-dpad", "extra");
        expect(root).toHaveAttribute("data-vector-x", "-1");
        expect(root).toHaveAttribute("data-vector-y", "-1");

        const up = screen.getByRole("button", { name: "Move up" });
        const left = screen.getByRole("button", { name: "Move left" });
        expect(up).toHaveClass("is-held");
        expect(left).toHaveClass("is-held");
    });

    it("resets pressed state on window blur and emits end callbacks for active directions", () => {
        const onPressedChange = vi.fn();
        const onDirectionEnd = vi.fn();

        render(
            <VirtualDPad
                defaultPressed={{ up: true, right: true }}
                onPressedChange={onPressedChange}
                onDirectionEnd={onDirectionEnd}
            />,
        );

        fireEvent.blur(window);

        expect(onPressedChange).toHaveBeenCalledWith({
            up: false,
            down: false,
            left: false,
            right: false,
        });
        expect(onDirectionEnd).toHaveBeenCalledWith("up");
        expect(onDirectionEnd).toHaveBeenCalledWith("right");
    });

    it("does not emit duplicate change events for same controlled pressed value", () => {
        const onPressedChange = vi.fn();

        render(
            <VirtualDPad
                pressed={{ right: true }}
                onPressedChange={onPressedChange}
            />,
        );

        const right = screen.getByRole("button", { name: "Move right" });
        fireEvent.pointerDown(right);

        expect(onPressedChange).not.toHaveBeenCalled();
    });

    it("handles all pointer event paths across every direction", () => {
        const onPressedChange = vi.fn();
        const onDirectionStart = vi.fn();
        const onDirectionEnd = vi.fn();

        render(
            <VirtualDPad
                onPressedChange={onPressedChange}
                onDirectionStart={onDirectionStart}
                onDirectionEnd={onDirectionEnd}
            />,
        );

        const directions = [
            { label: "Move up", key: "up" },
            { label: "Move down", key: "down" },
            { label: "Move left", key: "left" },
            { label: "Move right", key: "right" },
        ] as const;

        for (const direction of directions) {
            const button = screen.getByRole("button", {
                name: direction.label,
            });

            fireEvent.pointerDown(button);
            fireEvent.pointerUp(button);
            fireEvent.pointerDown(button);
            fireEvent.pointerCancel(button);
            fireEvent.pointerDown(button);
            fireEvent.pointerLeave(button);
        }

        expect(onDirectionStart).toHaveBeenCalledTimes(directions.length * 3);
        expect(onDirectionEnd).toHaveBeenCalledTimes(directions.length * 3);
        expect(onPressedChange).toHaveBeenCalled();
    });
});
