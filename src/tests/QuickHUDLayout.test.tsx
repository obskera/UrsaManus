import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuickHUDLayout } from "@/components/hudAnchor";

describe("QuickHUDLayout", () => {
    it("renders default top-left health and top-right minimap slots", () => {
        render(<QuickHUDLayout healthValue="90/100" minimapValue="Zone 3" />);

        expect(
            screen.getByRole("region", { name: "Quick HUD layout" }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("group", { name: "HUD anchor top-left" }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("group", { name: "HUD anchor top-right" }),
        ).toBeInTheDocument();
        expect(screen.getByText("90/100")).toBeInTheDocument();
        expect(screen.getByText("Zone 3")).toBeInTheDocument();
    });

    it("supports custom left/right slots", () => {
        render(
            <QuickHUDLayout
                leftSlot={<span>Custom left</span>}
                rightSlot={<span>Custom right</span>}
            />,
        );

        expect(screen.getByText("Custom left")).toBeInTheDocument();
        expect(screen.getByText("Custom right")).toBeInTheDocument();
    });
});
