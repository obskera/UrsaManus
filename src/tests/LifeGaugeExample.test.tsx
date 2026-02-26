import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import LifeGaugeExample from "@/components/examples/LifeGaugeExample";

describe("LifeGaugeExample", () => {
    it("renders default and custom gauges and updates value via controls", async () => {
        const user = userEvent.setup();
        render(<LifeGaugeExample />);

        const defaultMeter = screen.getByRole("meter", { name: "Player HP" });
        const customMeter = screen.getByRole("meter", {
            name: "Player HP (Custom)",
        });

        expect(defaultMeter).toHaveAttribute("aria-valuenow", "72");
        expect(customMeter).toHaveAttribute("aria-valuenow", "72");

        await user.click(screen.getByRole("button", { name: "Damage -12" }));

        expect(defaultMeter).toHaveAttribute("aria-valuenow", "60");
        expect(customMeter).toHaveAttribute("aria-valuenow", "60");

        await user.click(screen.getByRole("button", { name: "Reset" }));
        expect(defaultMeter).toHaveAttribute("aria-valuenow", "72");
        expect(customMeter).toHaveAttribute("aria-valuenow", "72");
    });
});
