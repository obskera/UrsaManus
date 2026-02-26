import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HUDSlot } from "@/components/hudSlot";

describe("HUDSlot", () => {
    it("renders icon, value, badge, and cooldown state", () => {
        render(
            <HUDSlot
                label="Ammo"
                value="12/30"
                icon="✦"
                badge="Low"
                cooldownRemainingMs={800}
                cooldownTotalMs={1600}
                showCooldownText
            />,
        );

        const slot = screen.getByRole("group", { name: "Ammo slot" });
        expect(slot).toHaveAttribute("data-status", "cooldown");
        expect(screen.getByText("Ammo")).toBeInTheDocument();
        expect(screen.getByText("12/30")).toBeInTheDocument();
        expect(screen.getByText("Low")).toBeInTheDocument();
        expect(
            screen.getByRole("progressbar", { name: "Ammo cooldown" }),
        ).toBeInTheDocument();
    });

    it("supports custom render override", () => {
        render(
            <HUDSlot
                label="Skill"
                render={(state) => (
                    <output data-testid="custom-slot">{state.label}</output>
                )}
            />,
        );

        expect(screen.getByTestId("custom-slot")).toHaveTextContent("Skill");
        expect(screen.queryByRole("group", { name: "Skill slot" })).toBeNull();
    });
});
