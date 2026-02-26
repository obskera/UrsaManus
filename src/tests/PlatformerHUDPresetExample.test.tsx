import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import PlatformerHUDPresetExample from "@/components/examples/PlatformerHUDPresetExample";

describe("PlatformerHUDPresetExample", () => {
    it("updates coins/lives and applies jump cooldown", async () => {
        const user = userEvent.setup();
        render(<PlatformerHUDPresetExample />);

        expect(screen.getByText("12")).toBeInTheDocument();
        expect(screen.getByText("3")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Collect coin" }));
        expect(screen.getByText("13")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Lose life" }));
        expect(screen.getByText("2")).toBeInTheDocument();

        const jumpButton = screen.getByRole("button", { name: "Jump" });
        await user.click(jumpButton);
        expect(jumpButton).toBeDisabled();
    });
});
