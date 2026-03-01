import type {
    InventoryMoveTarget,
    InventoryService,
    InventorySlot,
} from "@/services/inventoryCore";

export type InventoryDragSession = {
    source: InventoryMoveTarget;
    quantity: number;
};

export type InventoryDragDropService = {
    beginDrag: (source: InventoryMoveTarget, quantity?: number) => boolean;
    cancelDrag: () => void;
    drop: (destination: InventoryMoveTarget) => boolean;
    getSession: () => InventoryDragSession | null;
};

function readSlot(
    inventory: InventoryService,
    target: InventoryMoveTarget,
): InventorySlot | null {
    const container = inventory.getContainer(target.containerId);
    if (!container) {
        return null;
    }

    return container.slots[target.slotIndex] ?? null;
}

export function createInventoryDragDropService(
    inventory: InventoryService,
): InventoryDragDropService {
    let session: InventoryDragSession | null = null;

    const beginDrag = (source: InventoryMoveTarget, quantity?: number) => {
        const sourceSlot = readSlot(inventory, source);
        if (!sourceSlot || !sourceSlot.itemId || sourceSlot.quantity <= 0) {
            return false;
        }

        const dragQuantity = Math.max(
            1,
            Math.min(
                sourceSlot.quantity,
                Number.isFinite(quantity)
                    ? Math.floor(quantity ?? sourceSlot.quantity)
                    : sourceSlot.quantity,
            ),
        );

        session = {
            source: {
                containerId: source.containerId,
                slotIndex: source.slotIndex,
            },
            quantity: dragQuantity,
        };

        return true;
    };

    const cancelDrag = () => {
        session = null;
    };

    const drop = (destination: InventoryMoveTarget) => {
        if (!session) {
            return false;
        }

        const activeSession = session;
        const source = {
            ...activeSession.source,
        };
        const sourceSlot = readSlot(inventory, source);
        const destinationSlot = readSlot(inventory, destination);
        if (!sourceSlot || !destinationSlot || !sourceSlot.itemId) {
            return false;
        }

        let ok = false;

        if (destinationSlot.itemId === null) {
            if (activeSession.quantity < sourceSlot.quantity) {
                ok = inventory.split(
                    source,
                    destination,
                    activeSession.quantity,
                );
            } else {
                ok = inventory.move(source, destination);
            }
        } else if (destinationSlot.itemId === sourceSlot.itemId) {
            ok = inventory.merge(source, destination);
            if (!ok) {
                ok = inventory.move(source, destination);
            }
        } else {
            ok = inventory.move(source, destination);
        }

        if (!ok) {
            return false;
        }

        session = null;
        return true;
    };

    return {
        beginDrag,
        cancelDrag,
        drop,
        getSession: () =>
            session
                ? {
                      source: {
                          ...session.source,
                      },
                      quantity: session.quantity,
                  }
                : null,
    };
}
