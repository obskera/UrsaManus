export type InventoryItemDefinition = {
    id: string;
    stackable?: boolean;
    maxStack?: number;
    weight?: number;
    tags?: string[];
};

export type InventorySlot = {
    itemId: string | null;
    quantity: number;
};

export type InventoryContainerDefinition = {
    id: string;
    capacity: number;
    maxWeight?: number;
};

export type InventoryContainerRuntime = {
    id: string;
    capacity: number;
    maxWeight: number | null;
    slots: InventorySlot[];
    totalWeight: number;
};

export type InventoryMoveTarget = {
    containerId: string;
    slotIndex: number;
};

export type InventoryService = {
    registerItem: (definition: InventoryItemDefinition) => boolean;
    registerContainer: (definition: InventoryContainerDefinition) => boolean;
    unregisterContainer: (containerId: string) => boolean;
    getContainer: (containerId: string) => InventoryContainerRuntime | null;
    addItem: (
        containerId: string,
        itemId: string,
        quantity: number,
    ) => {
        added: number;
        remaining: number;
    };
    removeItem: (
        containerId: string,
        slotIndex: number,
        quantity: number,
    ) => number;
    move: (
        source: InventoryMoveTarget,
        destination: InventoryMoveTarget,
    ) => boolean;
    split: (
        source: InventoryMoveTarget,
        destination: InventoryMoveTarget,
        quantity: number,
    ) => boolean;
    merge: (
        source: InventoryMoveTarget,
        destination: InventoryMoveTarget,
    ) => boolean;
};

const DEFAULT_MAX_STACK = 99;

function normalizeQuantity(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, Math.floor(value));
}

function cloneSlots(slots: InventorySlot[]): InventorySlot[] {
    return slots.map((slot) => ({ ...slot }));
}

export function createInventoryService(): InventoryService {
    const itemsById = new Map<string, InventoryItemDefinition>();
    const containersById = new Map<string, InventoryContainerRuntime>();

    const getItemMeta = (itemId: string): InventoryItemDefinition | null => {
        const normalized = itemId.trim();
        if (!normalized) {
            return null;
        }

        return itemsById.get(normalized) ?? null;
    };

    const recomputeWeight = (container: InventoryContainerRuntime) => {
        container.totalWeight = container.slots.reduce((sum, slot) => {
            if (!slot.itemId || slot.quantity <= 0) {
                return sum;
            }

            const item = itemsById.get(slot.itemId);
            if (!item) {
                return sum;
            }

            const weight = Number.isFinite(item.weight)
                ? Math.max(0, item.weight ?? 0)
                : 0;
            return sum + weight * slot.quantity;
        }, 0);
    };

    const registerItem = (definition: InventoryItemDefinition) => {
        const id = definition.id.trim();
        if (!id) {
            return false;
        }

        const stackable = definition.stackable ?? true;
        const maxStack = stackable
            ? Math.max(
                  1,
                  normalizeQuantity(definition.maxStack ?? DEFAULT_MAX_STACK),
              )
            : 1;

        itemsById.set(id, {
            id,
            stackable,
            maxStack,
            weight: Number.isFinite(definition.weight)
                ? Math.max(0, definition.weight ?? 0)
                : 0,
            tags: (definition.tags ?? [])
                .map((tag) => tag.trim())
                .filter(Boolean),
        });

        return true;
    };

    const registerContainer = (definition: InventoryContainerDefinition) => {
        const id = definition.id.trim();
        const capacity = normalizeQuantity(definition.capacity);
        if (!id || capacity <= 0 || containersById.has(id)) {
            return false;
        }

        const maxWeight = Number.isFinite(definition.maxWeight)
            ? Math.max(0, definition.maxWeight ?? 0)
            : null;

        containersById.set(id, {
            id,
            capacity,
            maxWeight,
            slots: Array.from({ length: capacity }, () => ({
                itemId: null,
                quantity: 0,
            })),
            totalWeight: 0,
        });

        return true;
    };

    const getContainer = (containerId: string) => {
        const container = containersById.get(containerId.trim());
        if (!container) {
            return null;
        }

        return {
            ...container,
            slots: cloneSlots(container.slots),
        };
    };

    const addItem: InventoryService["addItem"] = (
        containerId,
        itemId,
        quantity,
    ) => {
        const container = containersById.get(containerId.trim());
        const item = getItemMeta(itemId);
        const total = normalizeQuantity(quantity);
        if (!container || !item || total <= 0) {
            return {
                added: 0,
                remaining: total,
            };
        }

        let remaining = total;
        const maxStack = item.stackable ? Math.max(1, item.maxStack ?? 1) : 1;
        const weightPerUnit = Number.isFinite(item.weight)
            ? Math.max(0, item.weight ?? 0)
            : 0;

        const canFitWeight = () => {
            if (container.maxWeight === null) {
                return true;
            }

            return container.totalWeight + weightPerUnit <= container.maxWeight;
        };

        for (const slot of container.slots) {
            if (remaining <= 0) {
                break;
            }

            if (slot.itemId !== item.id || slot.quantity >= maxStack) {
                continue;
            }

            while (
                remaining > 0 &&
                slot.quantity < maxStack &&
                canFitWeight()
            ) {
                slot.quantity += 1;
                remaining -= 1;
                container.totalWeight += weightPerUnit;
            }
        }

        for (const slot of container.slots) {
            if (remaining <= 0) {
                break;
            }

            if (slot.itemId !== null) {
                continue;
            }

            slot.itemId = item.id;
            slot.quantity = 0;
            while (
                remaining > 0 &&
                slot.quantity < maxStack &&
                canFitWeight()
            ) {
                slot.quantity += 1;
                remaining -= 1;
                container.totalWeight += weightPerUnit;
            }

            if (slot.quantity <= 0) {
                slot.itemId = null;
            }
        }

        return {
            added: total - remaining,
            remaining,
        };
    };

    const removeItem: InventoryService["removeItem"] = (
        containerId,
        slotIndex,
        quantity,
    ) => {
        const container = containersById.get(containerId.trim());
        if (!container) {
            return 0;
        }

        const slot = container.slots[slotIndex];
        if (!slot || !slot.itemId || slot.quantity <= 0) {
            return 0;
        }

        const requested = normalizeQuantity(quantity);
        if (requested <= 0) {
            return 0;
        }

        const removed = Math.min(slot.quantity, requested);
        const item = itemsById.get(slot.itemId);
        const unitWeight = Number.isFinite(item?.weight)
            ? Math.max(0, item?.weight ?? 0)
            : 0;

        slot.quantity -= removed;
        container.totalWeight = Math.max(
            0,
            container.totalWeight - unitWeight * removed,
        );
        if (slot.quantity <= 0) {
            slot.itemId = null;
            slot.quantity = 0;
        }

        return removed;
    };

    const readSlot = (target: InventoryMoveTarget): InventorySlot | null => {
        const container = containersById.get(target.containerId.trim());
        if (!container) {
            return null;
        }

        return container.slots[target.slotIndex] ?? null;
    };

    const move: InventoryService["move"] = (source, destination) => {
        const sourceSlot = readSlot(source);
        const destinationSlot = readSlot(destination);

        if (
            !sourceSlot ||
            !destinationSlot ||
            !sourceSlot.itemId ||
            sourceSlot.quantity <= 0
        ) {
            return false;
        }

        const sourceContainer = containersById.get(source.containerId.trim());
        const destinationContainer = containersById.get(
            destination.containerId.trim(),
        );
        if (!sourceContainer || !destinationContainer) {
            return false;
        }

        const sourceSnapshot = { ...sourceSlot };
        const destinationSnapshot = { ...destinationSlot };

        sourceSlot.itemId = destinationSnapshot.itemId;
        sourceSlot.quantity = destinationSnapshot.quantity;
        destinationSlot.itemId = sourceSnapshot.itemId;
        destinationSlot.quantity = sourceSnapshot.quantity;

        recomputeWeight(sourceContainer);
        recomputeWeight(destinationContainer);

        if (
            (sourceContainer.maxWeight !== null &&
                sourceContainer.totalWeight > sourceContainer.maxWeight) ||
            (destinationContainer.maxWeight !== null &&
                destinationContainer.totalWeight >
                    destinationContainer.maxWeight)
        ) {
            sourceSlot.itemId = sourceSnapshot.itemId;
            sourceSlot.quantity = sourceSnapshot.quantity;
            destinationSlot.itemId = destinationSnapshot.itemId;
            destinationSlot.quantity = destinationSnapshot.quantity;
            recomputeWeight(sourceContainer);
            recomputeWeight(destinationContainer);
            return false;
        }

        if (!sourceSlot.itemId || sourceSlot.quantity <= 0) {
            sourceSlot.itemId = null;
            sourceSlot.quantity = 0;
        }

        if (!destinationSlot.itemId || destinationSlot.quantity <= 0) {
            destinationSlot.itemId = null;
            destinationSlot.quantity = 0;
        }

        return true;
    };

    const split: InventoryService["split"] = (
        source,
        destination,
        quantity,
    ) => {
        const sourceSlot = readSlot(source);
        const destinationSlot = readSlot(destination);
        if (
            !sourceSlot ||
            !destinationSlot ||
            !sourceSlot.itemId ||
            destinationSlot.itemId
        ) {
            return false;
        }

        const requested = normalizeQuantity(quantity);
        if (requested <= 0 || requested >= sourceSlot.quantity) {
            return false;
        }

        const item = itemsById.get(sourceSlot.itemId);
        if (!item) {
            return false;
        }

        const maxStack = item.stackable ? Math.max(1, item.maxStack ?? 1) : 1;
        const moved = Math.min(requested, maxStack);
        destinationSlot.itemId = sourceSlot.itemId;
        destinationSlot.quantity = moved;
        sourceSlot.quantity -= moved;
        if (sourceSlot.quantity <= 0) {
            sourceSlot.itemId = null;
            sourceSlot.quantity = 0;
        }

        return true;
    };

    const merge: InventoryService["merge"] = (source, destination) => {
        const sourceSlot = readSlot(source);
        const destinationSlot = readSlot(destination);
        if (
            !sourceSlot ||
            !destinationSlot ||
            !sourceSlot.itemId ||
            !destinationSlot.itemId
        ) {
            return false;
        }

        if (sourceSlot.itemId !== destinationSlot.itemId) {
            return false;
        }

        const item = itemsById.get(sourceSlot.itemId);
        if (!item || !item.stackable) {
            return false;
        }

        const maxStack = Math.max(1, item.maxStack ?? 1);
        if (destinationSlot.quantity >= maxStack) {
            return false;
        }

        const space = maxStack - destinationSlot.quantity;
        const moved = Math.min(space, sourceSlot.quantity);
        destinationSlot.quantity += moved;
        sourceSlot.quantity -= moved;
        if (sourceSlot.quantity <= 0) {
            sourceSlot.itemId = null;
            sourceSlot.quantity = 0;
        }

        return moved > 0;
    };

    return {
        registerItem,
        registerContainer,
        unregisterContainer: (containerId: string) => {
            const id = containerId.trim();
            if (!id) {
                return false;
            }

            return containersById.delete(id);
        },
        getContainer,
        addItem,
        removeItem,
        move,
        split,
        merge,
    };
}
