import { type ReactNode } from "react";
import { HUDSlot } from "@/components/hudSlot";
import HUDAnchor from "./HUDAnchor";
import "./QuickHUDLayout.css";

export interface QuickHUDLayoutProps {
    safeArea?: boolean;
    offsetX?: number;
    offsetY?: number;
    className?: string;
    healthValue?: ReactNode;
    minimapValue?: ReactNode;
    leftSlot?: ReactNode;
    rightSlot?: ReactNode;
    children?: ReactNode;
}

const QuickHUDLayout = ({
    safeArea = true,
    offsetX = 8,
    offsetY = 8,
    className,
    healthValue = "84/100",
    minimapValue = "Map",
    leftSlot,
    rightSlot,
    children,
}: QuickHUDLayoutProps) => {
    const rootClassName = className
        ? `um-quick-hud-layout ${className}`
        : "um-quick-hud-layout";

    return (
        <div
            className={rootClassName}
            role="region"
            aria-label="Quick HUD layout"
        >
            <HUDAnchor
                anchor="top-left"
                safeArea={safeArea}
                offsetX={offsetX}
                offsetY={offsetY}
            >
                {leftSlot ?? (
                    <HUDSlot label="Health" value={healthValue} icon="❤" />
                )}
            </HUDAnchor>

            <HUDAnchor
                anchor="top-right"
                safeArea={safeArea}
                offsetX={offsetX}
                offsetY={offsetY}
            >
                {rightSlot ?? (
                    <HUDSlot label="Minimap" value={minimapValue} icon="⌖" />
                )}
            </HUDAnchor>

            {children}
        </div>
    );
};

export default QuickHUDLayout;
