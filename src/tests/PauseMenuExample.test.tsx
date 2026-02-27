import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import PauseMenuExample from "@/components/examples/PauseMenuExample";

describe("PauseMenuExample", () => {
    it("handles pause, resume, restart, and quit-to-menu flow", async () => {
        const user = userEvent.setup();
        render(<PauseMenuExample />);

        expect(screen.getByText("Current state: playing")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Pause game" }));
        expect(
            screen.getByRole("button", { name: "Resume" }),
        ).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Restart Run" }));
        expect(screen.getByText("Run #: 2")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Pause game" }));
        await user.click(
            screen.getByRole("button", { name: "Quit to Main Menu" }),
        );
        expect(screen.getByText("Current state: main")).toBeInTheDocument();
    });
});
