import { useMemo } from "react";

export type BackpackSlotViewModel = {
    itemId: string | null;
    quantity: number;
};

export type BackpackProps = {
    slots: BackpackSlotViewModel[];
    variant?: "compact" | "expanded";
    columns?: number;
    selectedIndex?: number;
    onSelectSlot?: (index: number) => void;
};

export function Backpack({
    slots,
    variant = "compact",
    columns,
    selectedIndex = -1,
    onSelectSlot,
}: BackpackProps) {
    const gridColumns = useMemo(() => {
        if (Number.isFinite(columns) && (columns ?? 0) > 0) {
            return Math.max(1, Math.floor(columns ?? 1));
        }

        return variant === "expanded" ? 8 : 5;
    }, [columns, variant]);

    const sizeClass =
        variant === "expanded" ? "min-h-16 min-w-16" : "min-h-12 min-w-12";
    const quantityClass = variant === "expanded" ? "text-xs" : "text-[10px]";

    return (
        <div
            role="grid"
            aria-label="Backpack inventory slots"
            className="inline-grid gap-2"
            style={{
                gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
            }}
        >
            {slots.map((slot, index) => {
                const isSelected = index === selectedIndex;
                const label = slot.itemId
                    ? `Slot ${index + 1}, ${slot.itemId}, quantity ${slot.quantity}`
                    : `Slot ${index + 1}, empty`;

                return (
                    <button
                        key={`backpack-slot-${index}`}
                        type="button"
                        role="gridcell"
                        aria-label={label}
                        aria-selected={isSelected}
                        className={`rounded border px-2 py-1 text-left ${sizeClass} ${
                            isSelected
                                ? "border-blue-400 bg-blue-900/30"
                                : "border-slate-700 bg-slate-900/40"
                        }`}
                        onClick={() => {
                            onSelectSlot?.(index);
                        }}
                    >
                        <div className="truncate text-[11px] text-slate-200">
                            {slot.itemId ?? "—"}
                        </div>
                        <div className={`text-slate-400 ${quantityClass}`}>
                            x{slot.quantity}
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
