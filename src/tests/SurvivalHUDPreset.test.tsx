import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SurvivalHUDPreset } from "@/components/hudAnchor";

describe("SurvivalHUDPreset", () => {
    it("renders default survival slots and craft action", () => {
        render(
            <SurvivalHUDPreset
                healthValue="90/100"
                minimapValue="Camp 01"
                hungerValue="70%"
                temperatureValue="Cold"
            />,
        );

        expect(
            screen.getByRole("region", { name: "Quick HUD layout" }),
        ).toBeInTheDocument();
        expect(screen.getByText("90/100")).toBeInTheDocument();
        expect(screen.getByText("Camp 01")).toBeInTheDocument();
        expect(screen.getByText("70%")).toBeInTheDocument();
        expect(screen.getByText("Cold")).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Craft" }),
        ).toBeInTheDocument();
    });

    it("supports slot overrides and craft callback", async () => {
        const user = userEvent.setup();
        const onCraft = vi.fn();
        const { rerender } = render(
            <SurvivalHUDPreset
                onCraft={onCraft}
                topLeftSlot={<span>Custom health</span>}
                bottomRightSlot={<span>Custom action</span>}
            />,
        );

        expect(screen.getByText("Custom health")).toBeInTheDocument();
        expect(screen.getByText("Custom action")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Craft" })).toBeNull();

        rerender(<SurvivalHUDPreset onCraft={onCraft} />);
        await user.click(screen.getByRole("button", { name: "Craft" }));
        expect(onCraft).toHaveBeenCalledTimes(1);
    });
});
