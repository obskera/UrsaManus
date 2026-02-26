import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import HUDAnchorExample from "@/components/examples/HUDAnchorExample";

describe("HUDAnchorExample", () => {
    it("renders four anchors and updates safe-area toggle", async () => {
        const user = userEvent.setup();
        render(<HUDAnchorExample />);

        expect(
            screen.getByRole("group", { name: "HUD anchor top-left" }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("group", { name: "HUD anchor top-right" }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("group", { name: "HUD anchor bottom-left" }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("group", { name: "HUD anchor bottom-right" }),
        ).toBeInTheDocument();

        const topLeftAnchor = screen.getByRole("group", {
            name: "HUD anchor top-left",
        });
        expect(topLeftAnchor).toHaveAttribute("data-safe-area", "true");

        await user.click(
            screen.getByRole("button", { name: "Disable safe area" }),
        );
        expect(topLeftAnchor).toHaveAttribute("data-safe-area", "false");
        expect(
            screen.getByRole("button", { name: "Enable safe area" }),
        ).toBeInTheDocument();
    });
});
