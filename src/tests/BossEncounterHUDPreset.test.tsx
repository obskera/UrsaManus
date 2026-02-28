import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BossEncounterHUDPreset } from "@/components/hudAnchor";

describe("BossEncounterHUDPreset", () => {
    it("renders default boss encounter slots and special action", () => {
        render(
            <BossEncounterHUDPreset
                healthValue="66/100"
                minimapValue="Arena"
                bossNameValue="Warden"
                bossPhaseValue="Phase 2"
            />,
        );

        expect(
            screen.getByRole("region", { name: "Quick HUD layout" }),
        ).toBeInTheDocument();
        expect(screen.getByText("66/100")).toBeInTheDocument();
        expect(screen.getByText("Arena")).toBeInTheDocument();
        expect(screen.getByText("Warden")).toBeInTheDocument();
        expect(screen.getByText("Phase 2")).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Special" }),
        ).toBeInTheDocument();
    });

    it("supports slot overrides and special callback", async () => {
        const user = userEvent.setup();
        const onSpecial = vi.fn();
        const { rerender } = render(
            <BossEncounterHUDPreset
                onSpecial={onSpecial}
                topLeftSlot={<span>Custom health</span>}
                bottomRightSlot={<span>Custom action</span>}
            />,
        );

        expect(screen.getByText("Custom health")).toBeInTheDocument();
        expect(screen.getByText("Custom action")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Special" })).toBeNull();

        rerender(<BossEncounterHUDPreset onSpecial={onSpecial} />);
        await user.click(screen.getByRole("button", { name: "Special" }));
        expect(onSpecial).toHaveBeenCalledTimes(1);
    });
});
