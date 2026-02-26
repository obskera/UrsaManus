import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Toggle } from "@/components/toggle";

describe("Toggle", () => {
    it("renders switch semantics and toggles via onChange", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();

        render(<Toggle label="SFX" checked={false} onChange={onChange} />);

        const toggle = screen.getByRole("switch", { name: "SFX" });
        expect(toggle).toHaveAttribute("aria-checked", "false");
        expect(toggle).toHaveAttribute("data-status", "off");

        await user.click(toggle);

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith(true);
    });

    it("does not toggle when disabled", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();

        render(
            <Toggle
                label="Online"
                checked={true}
                disabled
                onChange={onChange}
            />,
        );

        const toggle = screen.getByRole("switch", { name: "Online" });
        expect(toggle).toHaveAttribute("data-status", "disabled");
        expect(toggle).toBeDisabled();

        await user.click(toggle);
        expect(onChange).not.toHaveBeenCalled();
    });

    it("supports full custom render override", () => {
        render(
            <Toggle
                label="Stealth"
                checked
                render={(state) => (
                    <output data-testid="custom-toggle">
                        {state.status}:{String(state.checked)}
                    </output>
                )}
            />,
        );

        expect(screen.getByTestId("custom-toggle")).toHaveTextContent(
            "on:true",
        );
        expect(screen.queryByRole("switch", { name: "Stealth" })).toBeNull();
    });
});
