import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HUDAnchor } from "@/components/hudAnchor";

describe("HUDAnchor", () => {
    it("renders anchored content with safe-area and offset attributes", () => {
        render(
            <HUDAnchor anchor="top-right" offsetX={12} offsetY={6}>
                <span>Mini map</span>
            </HUDAnchor>,
        );

        const anchor = screen.getByRole("group", {
            name: "HUD anchor top-right",
        });

        expect(anchor).toHaveAttribute("data-anchor", "top-right");
        expect(anchor).toHaveAttribute("data-safe-area", "true");
        expect(anchor).toHaveTextContent("Mini map");
        expect(anchor).toHaveStyle({
            "--um-hud-anchor-offset-x": "12px",
            "--um-hud-anchor-offset-y": "6px",
        });
    });

    it("supports unsafe mode and render override", () => {
        const { rerender } = render(
            <HUDAnchor anchor="bottom-left" safeArea={false}>
                <span>Inventory</span>
            </HUDAnchor>,
        );

        expect(
            screen.getByRole("group", { name: "HUD anchor bottom-left" }),
        ).toHaveAttribute("data-safe-area", "false");

        rerender(
            <HUDAnchor
                anchor="top-left"
                render={(state) => (
                    <output data-testid="custom-anchor">{state.anchor}</output>
                )}
            />,
        );

        expect(screen.getByTestId("custom-anchor")).toHaveTextContent(
            "top-left",
        );
        expect(screen.queryByRole("group")).toBeNull();
    });
});
