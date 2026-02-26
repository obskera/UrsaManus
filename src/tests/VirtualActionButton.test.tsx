import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VirtualActionButton } from "@/components/virtualActionButton";

describe("VirtualActionButton", () => {
    it("activates and emits hold lifecycle callbacks when ready", () => {
        const onActivate = vi.fn();
        const onPressStart = vi.fn();
        const onPressEnd = vi.fn();

        render(
            <VirtualActionButton
                label="A"
                onActivate={onActivate}
                onPressStart={onPressStart}
                onPressEnd={onPressEnd}
            />,
        );

        const button = screen.getByRole("button", { name: "A" });
        fireEvent.pointerDown(button);
        expect(onPressStart).toHaveBeenCalledTimes(1);
        expect(button).toHaveAttribute("data-status", "held");

        fireEvent.pointerUp(button);
        expect(onPressEnd).toHaveBeenCalledTimes(1);

        fireEvent.click(button);
        expect(onActivate).toHaveBeenCalledTimes(1);
    });

    it("does not activate when disabled or in cooldown", () => {
        const onActivate = vi.fn();

        const { rerender } = render(
            <VirtualActionButton label="A" disabled onActivate={onActivate} />,
        );

        const disabledButton = screen.getByRole("button", { name: "A" });
        expect(disabledButton).toBeDisabled();
        fireEvent.click(disabledButton);
        expect(onActivate).not.toHaveBeenCalled();

        rerender(
            <VirtualActionButton
                label="A"
                cooldownRemainingMs={900}
                cooldownTotalMs={1200}
                onActivate={onActivate}
            />,
        );

        const cooldownButton = screen.getByRole("button", { name: "A" });
        expect(cooldownButton).toBeDisabled();
        expect(cooldownButton).toHaveAttribute("data-status", "cooldown");
        fireEvent.click(cooldownButton);
        expect(onActivate).not.toHaveBeenCalled();
    });

    it("supports full render override", () => {
        render(
            <VirtualActionButton
                label="Skill"
                cooldownRemainingMs={600}
                cooldownTotalMs={1200}
                render={(state) => (
                    <output data-testid="custom-virtual-action-button">
                        {state.status}:{state.cooldownPercentage}
                    </output>
                )}
            />,
        );

        expect(
            screen.getByTestId("custom-virtual-action-button"),
        ).toHaveTextContent("cooldown:50");
        expect(screen.queryByRole("button", { name: "Skill" })).toBeNull();
    });

    it("prioritizes disabled status over cooldown and does not start hold", () => {
        const onPressStart = vi.fn();

        render(
            <VirtualActionButton
                label="A"
                disabled
                cooldownRemainingMs={900}
                cooldownTotalMs={1200}
                onPressStart={onPressStart}
            />,
        );

        const button = screen.getByRole("button", { name: "A" });
        expect(button).toHaveAttribute("data-status", "disabled");

        fireEvent.pointerDown(button);
        expect(onPressStart).not.toHaveBeenCalled();
    });

    it("handles pointer cancel and pointer leave as press end", () => {
        const onPressEnd = vi.fn();

        render(<VirtualActionButton label="A" onPressEnd={onPressEnd} />);

        const button = screen.getByRole("button", { name: "A" });

        fireEvent.pointerDown(button);
        fireEvent.pointerCancel(button);

        fireEvent.pointerDown(button);
        fireEvent.pointerLeave(button);

        expect(onPressEnd).toHaveBeenCalledTimes(2);
    });

    it("does not emit press end when no hold is active", () => {
        const onPressEnd = vi.fn();

        render(<VirtualActionButton label="A" onPressEnd={onPressEnd} />);

        const button = screen.getByRole("button", { name: "A" });
        fireEvent.pointerUp(button);

        expect(onPressEnd).not.toHaveBeenCalled();
    });

    it("applies custom className and cooldown text formatting", () => {
        render(
            <VirtualActionButton
                label="A"
                className="extra"
                cooldownRemainingMs={900}
                cooldownTotalMs={1200}
                formatCooldownText={(state) => `${state.cooldownPercentage}%`}
            />,
        );

        const button = screen.getByRole("button", { name: "A" });
        expect(button).toHaveClass("um-virtual-action-button", "extra");
        expect(button).toHaveAttribute("data-status", "cooldown");
        expect(screen.getByText("75%")).toBeInTheDocument();
    });

    it("blurs on mouse and touch end", () => {
        const blurSpy = vi.spyOn(HTMLButtonElement.prototype, "blur");

        render(<VirtualActionButton label="A" />);
        const button = screen.getByRole("button", { name: "A" });

        fireEvent.mouseUp(button);
        fireEvent.touchEnd(button);

        expect(blurSpy).toHaveBeenCalled();
        blurSpy.mockRestore();
    });
});
