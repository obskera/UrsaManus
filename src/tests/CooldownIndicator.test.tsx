import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CooldownIndicator } from "@/components/cooldownIndicator";

describe("CooldownIndicator", () => {
    it("renders default indicator semantics and text", () => {
        render(
            <CooldownIndicator
                label="Dash cooldown"
                remainingMs={900}
                totalMs={1800}
            />,
        );

        const indicator = screen.getByRole("progressbar", {
            name: "Dash cooldown",
        });
        expect(indicator).toHaveAttribute("aria-valuenow", "50");
        expect(indicator).toHaveAttribute("aria-valuetext", "0.9s");
        expect(screen.getByText("0.9s")).toBeInTheDocument();

        const fill = indicator.querySelector(".um-cooldown-indicator__fill");
        expect(fill).toHaveStyle({ width: "50%" });
    });

    it("supports hidden default text and custom render override", () => {
        const { rerender } = render(
            <CooldownIndicator
                remainingMs={1200}
                totalMs={2000}
                showText={false}
            />,
        );

        expect(screen.queryByText("1.2s")).toBeNull();

        rerender(
            <CooldownIndicator
                remainingMs={1000}
                totalMs={2000}
                render={(state) => (
                    <output data-testid="custom-cooldown">
                        {state.percentage}% {state.text}
                    </output>
                )}
            />,
        );

        expect(screen.getByTestId("custom-cooldown")).toHaveTextContent(
            "50% 1.0s",
        );
        expect(screen.queryByRole("progressbar")).toBeNull();
    });
});
