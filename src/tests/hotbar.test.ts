import { describe, expect, it } from "vitest";
import { createHotbarService } from "@/services/hotbar";

describe("hotbar service", () => {
    it("supports slot binding, key activation, cooldown, and disabled flags", () => {
        const hotbar = createHotbarService({ slotCount: 10 });

        expect(
            hotbar.bindInventoryItem(0, {
                itemId: "potion",
                containerId: "bag",
                slotIndex: 2,
            }),
        ).toBe(true);
        expect(hotbar.bindSlot(1, { type: "action", actionId: "dash" })).toBe(
            true,
        );

        expect(hotbar.handleKey("Digit2")).toBe(true);
        expect(hotbar.getState().activeIndex).toBe(1);

        expect(hotbar.setSlotCooldown(1, 300)).toBe(true);
        hotbar.update(120);
        expect(hotbar.getState().slots[1].cooldownRemainingMs).toBe(180);

        expect(hotbar.setSlotDisabled(1, true)).toBe(true);
        expect(hotbar.getState().slots[1].disabled).toBe(true);

        expect(hotbar.clearSlot(0)).toBe(true);
        expect(hotbar.getState().slots[0].binding).toBeNull();
    });
});
