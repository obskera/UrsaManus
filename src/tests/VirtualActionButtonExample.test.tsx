import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import VirtualActionButtonExample from "@/components/examples/VirtualActionButtonExample";

describe("VirtualActionButtonExample", () => {
    it("updates hold and activation state when the primary button is used", () => {
        render(<VirtualActionButtonExample />);

        expect(screen.getByText("Activations: 0")).toBeInTheDocument();
        expect(screen.getByText("Holding: No")).toBeInTheDocument();

        const actionButton = screen.getByRole("button", { name: "A" });

        fireEvent.pointerDown(actionButton);
        expect(screen.getByText("Holding: Yes")).toBeInTheDocument();

        fireEvent.pointerUp(actionButton);
        fireEvent.click(actionButton);

        expect(screen.getByText("Activations: 1")).toBeInTheDocument();
    });
});
