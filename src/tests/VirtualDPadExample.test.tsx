import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import VirtualDPadExample from "@/components/examples/VirtualDPadExample";

describe("VirtualDPadExample", () => {
    it("updates vector display and custom active text when directions change", () => {
        render(<VirtualDPadExample />);

        expect(screen.getByText("Vector: 0,0")).toBeInTheDocument();
        expect(screen.getByText("Active: none")).toBeInTheDocument();

        const movementPad = screen.getByRole("group", {
            name: "Movement DPad",
        });
        const moveRight = within(movementPad).getByRole("button", {
            name: "Move right",
        });
        fireEvent.pointerDown(moveRight);

        expect(screen.getByText("Vector: 1,0")).toBeInTheDocument();
        expect(screen.getByText("Active: right")).toBeInTheDocument();

        fireEvent.pointerUp(moveRight);
        expect(screen.getByText("Vector: 0,0")).toBeInTheDocument();
    });
});
