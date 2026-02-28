import { type ReactNode } from "react";
import { ActionButton } from "@/components/actionButton";
import { HUDSlot } from "@/components/hudSlot";
import HUDAnchor from "./HUDAnchor";
import QuickHUDLayout from "./QuickHUDLayout";
import { createHudPresetSlots } from "./createHudPresetSlots";
import type { BaseHUDPresetProps } from "./presetTypes";
import "./SurvivalHUDPreset.css";

export interface SurvivalHUDPresetProps extends BaseHUDPresetProps {
    hungerValue?: ReactNode;
    temperatureValue?: ReactNode;
    craftLabel?: string;
    onCraft?: () => void;
    craftCooldownRemainingMs?: number;
    craftCooldownTotalMs?: number;
}

const SurvivalHUDPreset = ({
    safeArea = true,
    offsetX = 8,
    offsetY = 8,
    className,
    healthValue = "84/100",
    minimapValue = "Camp 01",
    hungerValue = "74%",
    temperatureValue = "Warm",
    craftLabel = "Craft",
    onCraft,
    craftCooldownRemainingMs = 0,
    craftCooldownTotalMs = 0,
    topLeftSlot,
    topRightSlot,
    bottomLeftSlot,
    bottomRightSlot,
}: SurvivalHUDPresetProps) => {
    const rootClassName = className
        ? `um-survival-hud-preset ${className}`
        : "um-survival-hud-preset";

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
                <div className="um-survival-hud-preset__stack">
                    <HUDSlot label="Hunger" value={hungerValue} icon="◍" />
                    <HUDSlot
                        label="Temperature"
                        value={temperatureValue}
                        icon="☼"
                    />
                </div>
            ),
            bottomRight: (
                <ActionButton
                    label={craftLabel}
                    onClick={onCraft}
                    cooldownRemainingMs={craftCooldownRemainingMs}
                    cooldownTotalMs={craftCooldownTotalMs}
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

export default SurvivalHUDPreset;
