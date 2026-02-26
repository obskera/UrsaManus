import { type ReactNode } from "react";
import { ActionButton } from "@/components/actionButton";
import { HUDSlot } from "@/components/hudSlot";
import HUDAnchor from "./HUDAnchor";
import QuickHUDLayout from "./QuickHUDLayout";
import { createHudPresetSlots } from "./createHudPresetSlots";
import type { BaseHUDPresetProps } from "./presetTypes";
import "./TopDownHUDPreset.css";

export interface TopDownHUDPresetProps extends BaseHUDPresetProps {
    objectivesValue?: ReactNode;
    stanceValue?: ReactNode;
    interactLabel?: string;
    onInteract?: () => void;
    interactCooldownRemainingMs?: number;
    interactCooldownTotalMs?: number;
}

const TopDownHUDPreset = ({
    safeArea = true,
    offsetX = 8,
    offsetY = 8,
    className,
    healthValue = "84/100",
    minimapValue = "Sector A2",
    objectivesValue = "2/5",
    stanceValue = "Stealth",
    interactLabel = "Interact",
    onInteract,
    interactCooldownRemainingMs = 0,
    interactCooldownTotalMs = 0,
    topLeftSlot,
    topRightSlot,
    bottomLeftSlot,
    bottomRightSlot,
}: TopDownHUDPresetProps) => {
    const rootClassName = className
        ? `um-topdown-hud-preset ${className}`
        : "um-topdown-hud-preset";

    const slots = createHudPresetSlots(
        {
            topLeftSlot,
            topRightSlot,
            bottomLeftSlot,
            bottomRightSlot,
        },
        {
            topLeft: <HUDSlot label="Health" value={healthValue} icon="❤" />,
            topRight: <HUDSlot label="Minimap" value={minimapValue} icon="⌖" />,
            bottomLeft: (
                <div className="um-topdown-hud-preset__stack">
                    <HUDSlot
                        label="Objectives"
                        value={objectivesValue}
                        icon="◎"
                    />
                    <HUDSlot label="Stance" value={stanceValue} icon="◈" />
                </div>
            ),
            bottomRight: (
                <ActionButton
                    label={interactLabel}
                    onClick={onInteract}
                    cooldownRemainingMs={interactCooldownRemainingMs}
                    cooldownTotalMs={interactCooldownTotalMs}
                />
            ),
        },
    );

    return (
        <QuickHUDLayout
            className={rootClassName}
            safeArea={safeArea}
            offsetX={offsetX}
            offsetY={offsetY}
            leftSlot={slots.topLeft}
            rightSlot={slots.topRight}
        >
            <HUDAnchor
                anchor="bottom-left"
                safeArea={safeArea}
                offsetX={offsetX}
                offsetY={offsetY}
            >
                {slots.bottomLeft}
            </HUDAnchor>

            <HUDAnchor
                anchor="bottom-right"
                safeArea={safeArea}
                offsetX={offsetX}
                offsetY={offsetY}
            >
                {slots.bottomRight}
            </HUDAnchor>
        </QuickHUDLayout>
    );
};

export default TopDownHUDPreset;
