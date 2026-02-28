import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import SurvivalHUDPresetExample from "@/components/examples/SurvivalHUDPresetExample";

describe("SurvivalHUDPresetExample", () => {
    it("updates hunger/temperature and applies craft cooldown", async () => {
        const user = userEvent.setup();
        render(<SurvivalHUDPresetExample />);

        expect(screen.getByText("74%")).toBeInTheDocument();
        expect(screen.getByText("Warm")).toBeInTheDocument();

        await user.click(
            screen.getByRole("button", { name: "Consume hunger" }),
        );
        expect(screen.getByText("69%")).toBeInTheDocument();

        await user.click(
            screen.getByRole("button", { name: "Toggle temperature" }),
        );
        expect(screen.getByText("Cold")).toBeInTheDocument();

        const craftButton = screen.getByRole("button", { name: "Craft" });
        await user.click(craftButton);
        expect(craftButton).toBeDisabled();
    });
});
