import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import TopDownHUDPresetExample from "@/components/examples/TopDownHUDPresetExample";

describe("TopDownHUDPresetExample", () => {
    it("updates objective/stance and applies interact cooldown", async () => {
        const user = userEvent.setup();
        render(<TopDownHUDPresetExample />);

        expect(screen.getByText("2/5")).toBeInTheDocument();
        expect(screen.getByText("Stealth")).toBeInTheDocument();

        await user.click(
            screen.getByRole("button", { name: "Complete objective" }),
        );
        expect(screen.getByText("3/5")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Toggle stance" }));
        expect(screen.getByText("Assault")).toBeInTheDocument();

        const interactButton = screen.getByRole("button", { name: "Interact" });
        await user.click(interactButton);
        expect(interactButton).toBeDisabled();
    });
});
