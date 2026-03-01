import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Hotbar } from "@/components/hotbar/Hotbar";

describe("Hotbar component", () => {
    it("renders slots and handles selection callbacks", async () => {
        const user = userEvent.setup();
        const onSelectSlot = vi.fn();

        render(
            <Hotbar
                activeIndex={1}
                onSelectSlot={onSelectSlot}
                slots={[
                    { label: "Potion" },
                    { label: "Dash", cooldownRemainingMs: 900 },
                ]}
            />,
        );

        expect(
            screen.getByRole("toolbar", { name: "Hotbar" }),
        ).toBeInTheDocument();

        const slot1 = screen.getByRole("button", {
            name: "Hotbar slot 1, key 1, Potion",
        });
        const slot2 = screen.getByRole("button", {
            name: "Hotbar slot 2, key 2, Dash",
        });

        await user.click(slot1);
        await user.click(slot2);
        expect(onSelectSlot).toHaveBeenNthCalledWith(1, 0);
        expect(onSelectSlot).toHaveBeenNthCalledWith(2, 1);

        expect(screen.getByText("0.9s")).toBeInTheDocument();
    });
});
