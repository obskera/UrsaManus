import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import TextBoxExample from "@/components/examples/TextBoxExample";

describe("TextBoxExample", () => {
    it("enqueues lines and switches queue policy controls", async () => {
        const user = userEvent.setup();
        render(<TextBoxExample />);

        expect(
            screen.getByText("Active policy: queue. Pending entries: 0."),
        ).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Enqueue line" }));

        expect(
            screen.getByText("Active policy: queue. Pending entries: 1."),
        ).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Next line" }));

        expect(
            screen.getByText("Active policy: queue. Pending entries: 0."),
        ).toBeInTheDocument();

        await user.click(
            screen.getByRole("button", { name: "Toggle policy (queue)" }),
        );

        expect(
            screen.getByRole("button", { name: "Toggle policy (stack)" }),
        ).toBeInTheDocument();
    });
});
