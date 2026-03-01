export type HotbarSlotViewModel = {
    label: string;
    cooldownRemainingMs?: number;
    disabled?: boolean;
};

export type HotbarProps = {
    slots: HotbarSlotViewModel[];
    activeIndex: number;
    onSelectSlot?: (index: number) => void;
};

const KEY_LABELS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

export function Hotbar({ slots, activeIndex, onSelectSlot }: HotbarProps) {
    return (
        <div role="toolbar" aria-label="Hotbar" className="inline-flex gap-2">
            {slots.slice(0, 10).map((slot, index) => {
                const isActive = index === activeIndex;
                const isDisabled = Boolean(slot.disabled);
                const cooldownMs = Math.max(
                    0,
                    Math.floor(slot.cooldownRemainingMs ?? 0),
                );

                return (
                    <button
                        key={`hotbar-slot-${index}`}
                        type="button"
                        aria-label={`Hotbar slot ${index + 1}, key ${KEY_LABELS[index]}, ${slot.label}`}
                        aria-pressed={isActive}
                        disabled={isDisabled}
                        className={`relative min-h-12 min-w-12 rounded border px-2 py-1 text-left ${
                            isActive
                                ? "border-amber-300 bg-amber-950/40"
                                : "border-slate-700 bg-slate-900/40"
                        } ${isDisabled ? "opacity-60" : ""}`}
                        onClick={() => {
                            onSelectSlot?.(index);
                        }}
                    >
                        <div className="text-[10px] text-slate-400">
                            {KEY_LABELS[index]}
                        </div>
                        <div className="truncate text-[11px] text-slate-200">
                            {slot.label}
                        </div>
                        {cooldownMs > 0 ? (
                            <div className="text-[10px] text-rose-300">
                                {Math.ceil(cooldownMs / 100) / 10}s
                            </div>
                        ) : null}
                    </button>
                );
            })}
        </div>
    );
}
