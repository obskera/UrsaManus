import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Button from "../components/Button/Button";

describe("Button", () => {
    it("renders label and responds to clicks", async () => {
        const user = userEvent.setup();
        const handle = vi.fn();

        render(<Button label="Click me" onClick={handle} />);

        const btn = screen.getByRole("button", { name: /click me/i });
        await user.click(btn);

        expect(handle).toHaveBeenCalledTimes(1);
    });

    it("is disabled when disabled prop is true", async () => {
        const user = userEvent.setup();
        const handle = vi.fn();

        render(<Button label="Nope" onClick={handle} disabled />);

        const btn = screen.getByRole("button", { name: /nope/i });
        expect(btn).toBeDisabled();
        await user.click(btn);
        expect(handle).not.toHaveBeenCalled();
    });
});
