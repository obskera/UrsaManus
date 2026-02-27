import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import MainMenuExample from "@/components/examples/MainMenuExample";

describe("MainMenuExample", () => {
    it("handles start, return, and settings toggle flow", async () => {
        const user = userEvent.setup();
        render(<MainMenuExample />);

        const continueButton = screen.getByRole("button", {
            name: "Continue",
        });
        expect(continueButton).toBeDisabled();

        await user.click(
            screen.getByRole("button", { name: "Start New Game" }),
        );
        expect(screen.getByText("Current state: playing")).toBeInTheDocument();

        await user.click(
            screen.getByRole("button", { name: "Return to menu" }),
        );
        expect(screen.getByText("Current state: main")).toBeInTheDocument();

        expect(
            screen.getByRole("button", { name: "Continue" }),
        ).not.toBeDisabled();

        await user.click(screen.getByRole("button", { name: "Settings" }));
        expect(screen.getByText("Settings: open")).toBeInTheDocument();
    });
});
