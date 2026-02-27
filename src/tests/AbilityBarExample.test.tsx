import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import AbilityBarExample from "@/components/examples/AbilityBarExample";

describe("AbilityBarExample", () => {
    it("applies cooldown when ability triggers and resets with control button", async () => {
        const user = userEvent.setup();
        render(<AbilityBarExample />);

        const dashButton = screen.getByRole("button", { name: "Dash" });
        expect(dashButton).toBeEnabled();

        await user.click(dashButton);
        expect(dashButton).toBeDisabled();

        await user.click(
            screen.getByRole("button", { name: "Reset cooldowns" }),
        );
        expect(screen.getByRole("button", { name: "Dash" })).toBeEnabled();
    });
});
