import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AbilityBar } from "@/components/hudAnchor";

describe("AbilityBar", () => {
    it("renders default ability buttons", () => {
        render(<AbilityBar />);

        expect(
            screen.getByRole("button", { name: "Primary" }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Secondary" }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Ultimate" }),
        ).toBeInTheDocument();
    });

    it("fires trigger callbacks and respects cooldown disabled state", async () => {
        const user = userEvent.setup();
        const onAbilityTrigger = vi.fn();
        const onDash = vi.fn();

        render(
            <AbilityBar
                onAbilityTrigger={onAbilityTrigger}
                abilities={[
                    {
                        id: "dash",
                        label: "Dash",
                        onTrigger: onDash,
                    },
                    {
                        id: "blink",
                        label: "Blink",
                        cooldownRemainingMs: 800,
                        cooldownTotalMs: 1000,
                    },
                ]}
            />,
        );

        const dashButton = screen.getByRole("button", { name: "Dash" });
        const blinkButton = screen.getByRole("button", { name: "Blink" });

        expect(blinkButton).toBeDisabled();

        await user.click(dashButton);
        await user.click(blinkButton);

        expect(onDash).toHaveBeenCalledTimes(1);
        expect(onAbilityTrigger).toHaveBeenCalledTimes(1);
        expect(onAbilityTrigger).toHaveBeenCalledWith("dash");
    });
});
