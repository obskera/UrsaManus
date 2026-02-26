import { type ReactNode } from "react";

export interface BaseHUDPresetProps {
    safeArea?: boolean;
    offsetX?: number;
    offsetY?: number;
    className?: string;
    healthValue?: ReactNode;
    minimapValue?: ReactNode;
    topLeftSlot?: ReactNode;
    topRightSlot?: ReactNode;
    bottomLeftSlot?: ReactNode;
    bottomRightSlot?: ReactNode;
}
