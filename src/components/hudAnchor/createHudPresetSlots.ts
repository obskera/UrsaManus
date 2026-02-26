import { type ReactNode } from "react";

export interface HudPresetSlotOverrides {
    topLeftSlot?: ReactNode;
    topRightSlot?: ReactNode;
    bottomLeftSlot?: ReactNode;
    bottomRightSlot?: ReactNode;
}

export interface HudPresetSlotDefaults {
    topLeft: ReactNode;
    topRight: ReactNode;
    bottomLeft: ReactNode;
    bottomRight: ReactNode;
}

export interface ResolvedHudPresetSlots {
    topLeft: ReactNode;
    topRight: ReactNode;
    bottomLeft: ReactNode;
    bottomRight: ReactNode;
}

export function createHudPresetSlots(
    overrides: HudPresetSlotOverrides,
    defaults: HudPresetSlotDefaults,
): ResolvedHudPresetSlots {
    return {
        topLeft: overrides.topLeftSlot ?? defaults.topLeft,
        topRight: overrides.topRightSlot ?? defaults.topRight,
        bottomLeft: overrides.bottomLeftSlot ?? defaults.bottomLeft,
        bottomRight: overrides.bottomRightSlot ?? defaults.bottomRight,
    };
}
