import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Backpack } from "@/components/backpack/Backpack";

describe("Backpack", () => {
    it("renders slots with accessible labels and click selection", async () => {
        const user = userEvent.setup();
        const onSelectSlot = vi.fn();

        render(
            <Backpack
                variant="expanded"
                selectedIndex={1}
                onSelectSlot={onSelectSlot}
                slots={[
                    { itemId: "potion", quantity: 3 },
                    { itemId: null, quantity: 0 },
                ]}
            />,
        );

        expect(
            screen.getByRole("grid", { name: "Backpack inventory slots" }),
        ).toBeInTheDocument();

        const slot1 = screen.getByRole("gridcell", {
            name: "Slot 1, potion, quantity 3",
        });
        const slot2 = screen.getByRole("gridcell", {
            name: "Slot 2, empty",
        });

        await user.click(slot1);
        await user.click(slot2);
        expect(onSelectSlot).toHaveBeenNthCalledWith(1, 0);
        expect(onSelectSlot).toHaveBeenNthCalledWith(2, 1);
    });
});
