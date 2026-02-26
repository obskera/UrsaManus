import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TopDownHUDPreset } from "@/components/hudAnchor";

describe("TopDownHUDPreset", () => {
    it("renders default top-down slots and interact action", () => {
        render(
            <TopDownHUDPreset
                healthValue="76/100"
                minimapValue="Sector B4"
                objectivesValue="2/5"
                stanceValue="Stealth"
            />,
        );

        expect(
            screen.getByRole("region", { name: "Quick HUD layout" }),
        ).toBeInTheDocument();
        expect(screen.getByText("76/100")).toBeInTheDocument();
        expect(screen.getByText("Sector B4")).toBeInTheDocument();
        expect(screen.getByText("2/5")).toBeInTheDocument();
        expect(screen.getByText("Stealth")).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Interact" }),
        ).toBeInTheDocument();
    });

    it("supports slot overrides and interact callback", async () => {
        const user = userEvent.setup();
        const onInteract = vi.fn();
        const { rerender } = render(
            <TopDownHUDPreset
                onInteract={onInteract}
                topLeftSlot={<span>Custom top-left</span>}
                bottomRightSlot={<span>Custom action</span>}
            />,
        );

        expect(screen.getByText("Custom top-left")).toBeInTheDocument();
        expect(screen.getByText("Custom action")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Interact" })).toBeNull();

        rerender(<TopDownHUDPreset onInteract={onInteract} />);
        await user.click(screen.getByRole("button", { name: "Interact" }));
        expect(onInteract).toHaveBeenCalledTimes(1);
    });
});
