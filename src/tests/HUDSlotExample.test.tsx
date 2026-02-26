import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import HUDSlotExample from "@/components/examples/HUDSlotExample";

describe("HUDSlotExample", () => {
    it("renders slots and updates ammo/cooldown controls", async () => {
        const user = userEvent.setup();
        render(<HUDSlotExample />);

        expect(
            screen.getByRole("group", { name: "Health slot" }),
        ).toBeInTheDocument();

        const ammoSlot = screen.getByRole("group", { name: "Ammo slot" });
        expect(ammoSlot).toHaveAttribute("data-status", "ready");
        expect(screen.getByText("30/30")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Use ammo" }));
        expect(screen.getByText("29/30")).toBeInTheDocument();

        await user.click(
            screen.getByRole("button", { name: "Trigger slot cooldown" }),
        );
        expect(ammoSlot).toHaveAttribute("data-status", "cooldown");

        const blinkButton = screen.getByRole("button", { name: "Blink" });
        expect(screen.getByText("Used 0 times")).toBeInTheDocument();

        await user.click(blinkButton);
        expect(screen.getByText("Used 1 times")).toBeInTheDocument();
        expect(blinkButton).toBeDisabled();
    });
});
