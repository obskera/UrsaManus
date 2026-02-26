import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LifeGauge } from "@/components/lifeGauge";

describe("LifeGauge", () => {
    it("renders default skin with label, value text, and meter semantics", () => {
        render(<LifeGauge value={64} max={100} label="HP" />);

        const meter = screen.getByRole("meter", { name: "HP" });
        expect(meter).toHaveAttribute("aria-valuemin", "0");
        expect(meter).toHaveAttribute("aria-valuemax", "100");
        expect(meter).toHaveAttribute("aria-valuenow", "64");
        expect(meter).toHaveAttribute("data-tone", "healthy");
        expect(screen.getByText("64 / 100")).toBeInTheDocument();

        const fill = meter.querySelector(".um-life-gauge__fill");
        expect(fill).toHaveStyle({ width: "64%" });
    });

    it("clamps out-of-range values and computes tone from clamped ratio", () => {
        render(<LifeGauge value={-5} max={50} min={10} label="Life" />);

        const meter = screen.getByRole("meter", { name: "Life" });
        expect(meter).toHaveAttribute("aria-valuemin", "10");
        expect(meter).toHaveAttribute("aria-valuemax", "50");
        expect(meter).toHaveAttribute("aria-valuenow", "10");
        expect(meter).toHaveAttribute("data-tone", "critical");

        const fill = meter.querySelector(".um-life-gauge__fill");
        expect(fill).toHaveStyle({ width: "0%" });
    });

    it("supports custom rendering for full skin overrides", () => {
        render(
            <LifeGauge
                value={35}
                max={70}
                render={(state) => (
                    <output data-testid="custom-life">
                        {state.percentage}% {state.tone}
                    </output>
                )}
            />,
        );

        expect(screen.getByTestId("custom-life")).toHaveTextContent(
            "50% warning",
        );
        expect(screen.queryByRole("meter")).not.toBeInTheDocument();
    });
});
