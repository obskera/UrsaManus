import { describe, expect, it } from "vitest";
import { createInventoryService } from "@/services/inventoryCore";
import { createInventoryDragDropService } from "@/services/inventoryDragDrop";

describe("inventory core + drag-drop", () => {
    it("supports add/remove/split/merge/move operations", () => {
        const inventory = createInventoryService();
        inventory.registerItem({
            id: "potion",
            stackable: true,
            maxStack: 5,
            weight: 1,
        });
        inventory.registerContainer({ id: "bag", capacity: 4, maxWeight: 10 });

        const added = inventory.addItem("bag", "potion", 7);
        expect(added).toEqual({ added: 7, remaining: 0 });

        const bagA = inventory.getContainer("bag");
        expect(bagA?.slots[0]).toEqual({ itemId: "potion", quantity: 5 });
        expect(bagA?.slots[1]).toEqual({ itemId: "potion", quantity: 2 });

        expect(
            inventory.split(
                { containerId: "bag", slotIndex: 0 },
                { containerId: "bag", slotIndex: 2 },
                2,
            ),
        ).toBe(true);
        expect(
            inventory.merge(
                { containerId: "bag", slotIndex: 2 },
                { containerId: "bag", slotIndex: 1 },
            ),
        ).toBe(true);

        expect(
            inventory.move(
                { containerId: "bag", slotIndex: 1 },
                { containerId: "bag", slotIndex: 3 },
            ),
        ).toBe(true);

        const removed = inventory.removeItem("bag", 3, 2);
        expect(removed).toBe(2);
    });

    it("handles drag-drop split/merge/swap with deterministic rollback", () => {
        const inventory = createInventoryService();
        inventory.registerItem({ id: "apple", stackable: true, maxStack: 10 });
        inventory.registerItem({ id: "sword", stackable: false });
        inventory.registerContainer({ id: "bag", capacity: 3 });

        inventory.addItem("bag", "apple", 8);
        inventory.addItem("bag", "sword", 1);

        const dragDrop = createInventoryDragDropService(inventory);
        expect(
            dragDrop.beginDrag({ containerId: "bag", slotIndex: 0 }, 3),
        ).toBe(true);
        expect(dragDrop.drop({ containerId: "bag", slotIndex: 2 })).toBe(true);

        let bag = inventory.getContainer("bag");
        expect(bag?.slots[0]).toEqual({ itemId: "apple", quantity: 5 });
        expect(bag?.slots[2]).toEqual({ itemId: "apple", quantity: 3 });

        expect(dragDrop.beginDrag({ containerId: "bag", slotIndex: 2 })).toBe(
            true,
        );
        expect(dragDrop.drop({ containerId: "bag", slotIndex: 0 })).toBe(true);

        bag = inventory.getContainer("bag");
        expect(bag?.slots[0]).toEqual({ itemId: "apple", quantity: 8 });
        expect(bag?.slots[2]).toEqual({ itemId: null, quantity: 0 });

        expect(dragDrop.beginDrag({ containerId: "bag", slotIndex: 0 })).toBe(
            true,
        );
        expect(dragDrop.drop({ containerId: "bag", slotIndex: 1 })).toBe(true);
        bag = inventory.getContainer("bag");
        expect(bag?.slots[0]).toEqual({ itemId: "sword", quantity: 1 });
        expect(bag?.slots[1]).toEqual({ itemId: "apple", quantity: 8 });
    });
});
