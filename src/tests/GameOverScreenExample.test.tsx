import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import GameOverScreenExample from "@/components/examples/GameOverScreenExample";

describe("GameOverScreenExample", () => {
    it("handles retry and return-to-menu flow", async () => {
        const user = userEvent.setup();
        render(<GameOverScreenExample />);

        expect(
            screen.getByText("Current state: game-over"),
        ).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Retry" }));
        expect(screen.getByText("Current state: playing")).toBeInTheDocument();

        await user.click(
            screen.getByRole("button", { name: "Trigger game over" }),
        );
        const gameOverSection = screen.getByLabelText("Game Over");
        expect(
            within(gameOverSection).getByText((_, element) => {
                const content = element?.textContent
                    ?.replace(/\s+/g, " ")
                    .trim();
                return content === "Attempt : 2" || content === "Attempt: 2";
            }),
        ).toBeInTheDocument();

        await user.click(
            screen.getByRole("button", { name: "Return to Main Menu" }),
        );
        expect(screen.getByText("Current state: main")).toBeInTheDocument();
    });
});
