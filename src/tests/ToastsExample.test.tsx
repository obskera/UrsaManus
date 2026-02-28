import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import ToastsExample from "@/components/examples/ToastsExample";

describe("ToastsExample", () => {
    it("enqueues and dismisses toasts while updating queue status", async () => {
        const user = userEvent.setup();
        render(<ToastsExample />);

        expect(
            screen.getByText("Anchor: top-right. Pending entries: 0."),
        ).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Enqueue info" }));
        await user.click(
            screen.getByRole("button", { name: "Enqueue success" }),
        );

        expect(
            screen.getByText("Anchor: top-right. Pending entries: 2."),
        ).toBeInTheDocument();

        await user.click(
            screen.getByRole("button", { name: "Dismiss info toast" }),
        );

        expect(
            screen.getByText("Anchor: top-right. Pending entries: 1."),
        ).toBeInTheDocument();

        await user.click(
            screen.getByRole("button", {
                name: "Rotate anchor (top-right)",
            }),
        );

        expect(
            screen.getByText("Anchor: bottom-right. Pending entries: 1."),
        ).toBeInTheDocument();
    });
});
