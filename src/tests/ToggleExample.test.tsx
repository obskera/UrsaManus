import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import ToggleExample from "@/components/examples/ToggleExample";

describe("ToggleExample", () => {
    it("renders toggles and updates status text when toggled", async () => {
        const user = userEvent.setup();
        render(<ToggleExample />);

        expect(screen.getByText("SFX: On")).toBeInTheDocument();

        const sfxToggle = screen.getByRole("switch", { name: "SFX" });
        await user.click(sfxToggle);

        expect(screen.getByText("SFX: Off")).toBeInTheDocument();
        expect(sfxToggle).toHaveAttribute("aria-checked", "false");

        const stealthToggle = screen.getByRole("button", {
            name: "Stealth: Disabled",
        });
        await user.click(stealthToggle);
        expect(
            screen.getByRole("button", { name: "Stealth: Enabled" }),
        ).toBeInTheDocument();
    });
});
