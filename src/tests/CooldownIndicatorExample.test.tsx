import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import CooldownIndicatorExample from "@/components/examples/CooldownIndicatorExample";

describe("CooldownIndicatorExample", () => {
    it("renders indicators and updates progress when cooldown is triggered", async () => {
        const user = userEvent.setup();
        render(<CooldownIndicatorExample />);

        const dash = screen.getByRole("progressbar", { name: "Dash cooldown" });
        const skill = screen.getByRole("progressbar", {
            name: "Skill cooldown",
        });

        expect(dash).toHaveAttribute("aria-valuenow", "0");
        expect(skill).toHaveAttribute("aria-valuenow", "0");
        expect(screen.getByText("Orb 0%")).toBeInTheDocument();

        await user.click(
            screen.getByRole("button", { name: "Trigger cooldown" }),
        );

        expect(
            Number(dash.getAttribute("aria-valuenow") ?? "0"),
        ).toBeGreaterThan(0);
        expect(
            Number(skill.getAttribute("aria-valuenow") ?? "0"),
        ).toBeGreaterThan(0);

        await user.click(screen.getByRole("button", { name: "Reset" }));
        expect(dash).toHaveAttribute("aria-valuenow", "0");
    });
});
