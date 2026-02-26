import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ActionButton } from "@/components/actionButton";

describe("ActionButton", () => {
    it("activates when ready", async () => {
        const user = userEvent.setup();
        const onClick = vi.fn();

        render(<ActionButton label="Dash" onClick={onClick} />);

        const button = screen.getByRole("button", { name: "Dash" });
        await user.click(button);

        expect(onClick).toHaveBeenCalledTimes(1);
        expect(button).toHaveAttribute("data-status", "ready");
    });

    it("does not activate when disabled", async () => {
        const user = userEvent.setup();
        const onClick = vi.fn();

        render(<ActionButton label="Dash" onClick={onClick} disabled />);

        const button = screen.getByRole("button", { name: "Dash" });
        expect(button).toBeDisabled();
        expect(button).toHaveAttribute("data-status", "disabled");

        await user.click(button);
        expect(onClick).not.toHaveBeenCalled();
    });

    it("does not activate during cooldown and shows cooldown text", async () => {
        const user = userEvent.setup();
        const onClick = vi.fn();

        render(
            <ActionButton
                label="Dash"
                onClick={onClick}
                cooldownRemainingMs={1200}
                cooldownTotalMs={3000}
            />,
        );

        const button = screen.getByRole("button", { name: "Dash" });
        expect(button).toBeDisabled();
        expect(button).toHaveAttribute("data-status", "cooldown");
        expect(screen.getByText("1.2s")).toBeInTheDocument();

        await user.click(button);
        expect(onClick).not.toHaveBeenCalled();
    });

    it("supports custom render override", () => {
        render(
            <ActionButton
                label="Dash"
                cooldownRemainingMs={1000}
                cooldownTotalMs={2000}
                render={(state) => (
                    <output data-testid="custom-action-button">
                        {state.status}:{state.cooldownPercentage}
                    </output>
                )}
            />,
        );

        expect(screen.getByTestId("custom-action-button")).toHaveTextContent(
            "cooldown:50",
        );
        expect(screen.queryByRole("button", { name: "Dash" })).toBeNull();
    });
});
