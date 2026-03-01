export type HotbarBinding =
    | {
          type: "item";
          itemId: string;
          containerId?: string;
          slotIndex?: number;
      }
    | {
          type: "action";
          actionId: string;
      };

export type HotbarSlotState = {
    index: number;
    binding: HotbarBinding | null;
    cooldownRemainingMs: number;
    disabled: boolean;
};

export type HotbarService = {
    bindSlot: (index: number, binding: HotbarBinding) => boolean;
    bindInventoryItem: (
        index: number,
        item: {
            itemId: string;
            containerId: string;
            slotIndex: number;
        },
    ) => boolean;
    clearSlot: (index: number) => boolean;
    setActiveIndex: (index: number) => boolean;
    handleKey: (key: string) => boolean;
    setSlotCooldown: (index: number, durationMs: number) => boolean;
    setSlotDisabled: (index: number, disabled: boolean) => boolean;
    update: (deltaMs: number) => void;
    getState: () => {
        activeIndex: number;
        slots: HotbarSlotState[];
    };
};

const HOTBAR_KEY_ORDER = [
    "Digit1",
    "Digit2",
    "Digit3",
    "Digit4",
    "Digit5",
    "Digit6",
    "Digit7",
    "Digit8",
    "Digit9",
    "Digit0",
];

function normalizeMs(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, Math.floor(value));
}

export function createHotbarService(options?: {
    slotCount?: number;
}): HotbarService {
    const slotCount = Math.max(
        1,
        Math.min(10, Math.floor(options?.slotCount ?? 10)),
    );

    const slots: HotbarSlotState[] = Array.from(
        { length: slotCount },
        (_, index) => ({
            index,
            binding: null,
            cooldownRemainingMs: 0,
            disabled: false,
        }),
    );

    let activeIndex = 0;

    const indexValid = (index: number) => index >= 0 && index < slots.length;

    return {
        bindSlot: (index, binding) => {
            if (!indexValid(index)) {
                return false;
            }

            if (binding.type === "item") {
                const itemId = binding.itemId.trim();
                if (!itemId) {
                    return false;
                }

                slots[index].binding = {
                    ...binding,
                    itemId,
                };
                return true;
            }

            const actionId = binding.actionId.trim();
            if (!actionId) {
                return false;
            }

            slots[index].binding = {
                type: "action",
                actionId,
            };
            return true;
        },
        bindInventoryItem: (index, item) => {
            return indexValid(index)
                ? !!item.itemId.trim() &&
                  !!item.containerId.trim() &&
                  item.slotIndex >= 0
                    ? (() => {
                          slots[index].binding = {
                              type: "item",
                              itemId: item.itemId.trim(),
                              containerId: item.containerId.trim(),
                              slotIndex: Math.floor(item.slotIndex),
                          };
                          return true;
                      })()
                    : false
                : false;
        },
        clearSlot: (index) => {
            if (!indexValid(index)) {
                return false;
            }

            slots[index].binding = null;
            slots[index].cooldownRemainingMs = 0;
            slots[index].disabled = false;
            return true;
        },
        setActiveIndex: (index) => {
            if (!indexValid(index)) {
                return false;
            }

            activeIndex = index;
            return true;
        },
        handleKey: (key) => {
            const normalized = key.trim();
            const mapped = HOTBAR_KEY_ORDER.indexOf(normalized);
            if (mapped < 0 || mapped >= slotCount) {
                return false;
            }

            activeIndex = mapped;
            return true;
        },
        setSlotCooldown: (index, durationMs) => {
            if (!indexValid(index)) {
                return false;
            }

            slots[index].cooldownRemainingMs = normalizeMs(durationMs);
            return true;
        },
        setSlotDisabled: (index, disabled) => {
            if (!indexValid(index)) {
                return false;
            }

            slots[index].disabled = disabled;
            return true;
        },
        update: (deltaMs) => {
            const normalized = normalizeMs(deltaMs);
            if (normalized <= 0) {
                return;
            }

            for (const slot of slots) {
                slot.cooldownRemainingMs = Math.max(
                    0,
                    slot.cooldownRemainingMs - normalized,
                );
            }
        },
        getState: () => ({
            activeIndex,
            slots: slots.map((slot) => ({
                ...slot,
                binding: slot.binding ? { ...slot.binding } : null,
            })),
        }),
    };
}
