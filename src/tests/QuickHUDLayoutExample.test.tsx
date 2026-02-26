import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import QuickHUDLayoutExample from "@/components/examples/QuickHUDLayoutExample";

describe("QuickHUDLayoutExample", () => {
    it("renders quick layout and toggles safe-area mode", async () => {
        const user = userEvent.setup();
        render(<QuickHUDLayoutExample />);

        const topLeftAnchor = screen.getByRole("group", {
            name: "HUD anchor top-left",
        });
        expect(topLeftAnchor).toHaveAttribute("data-safe-area", "true");
        expect(screen.getByText("92/100")).toBeInTheDocument();
        expect(screen.getByText("Sector A2")).toBeInTheDocument();

        await user.click(
            screen.getByRole("button", { name: "Disable safe area" }),
        );
        expect(topLeftAnchor).toHaveAttribute("data-safe-area", "false");
        expect(
            screen.getByRole("button", { name: "Enable safe area" }),
        ).toBeInTheDocument();
    });
});
