import { type ReactNode } from "react";
import { ActionButton } from "@/components/actionButton";
import { HUDSlot } from "@/components/hudSlot";
import HUDAnchor from "./HUDAnchor";
import QuickHUDLayout from "./QuickHUDLayout";
import { createHudPresetSlots } from "./createHudPresetSlots";
import type { BaseHUDPresetProps } from "./presetTypes";
import "./BossEncounterHUDPreset.css";

export interface BossEncounterHUDPresetProps extends BaseHUDPresetProps {
    bossNameValue?: ReactNode;
    bossPhaseValue?: ReactNode;
    specialLabel?: string;
    onSpecial?: () => void;
    specialCooldownRemainingMs?: number;
    specialCooldownTotalMs?: number;
}

const BossEncounterHUDPreset = ({
    safeArea = true,
    offsetX = 8,
    offsetY = 8,
    className,
    healthValue = "84/100",
    minimapValue = "Arena",
    bossNameValue = "Warden",
    bossPhaseValue = "Phase 1",
    specialLabel = "Special",
    onSpecial,
    specialCooldownRemainingMs = 0,
    specialCooldownTotalMs = 0,
    topLeftSlot,
    topRightSlot,
    bottomLeftSlot,
    bottomRightSlot,
}: BossEncounterHUDPresetProps) => {
    const rootClassName = className
        ? `um-boss-encounter-hud-preset ${className}`
        : "um-boss-encounter-hud-preset";

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
                <div className="um-boss-encounter-hud-preset__stack">
                    <HUDSlot label="Boss" value={bossNameValue} icon="✦" />
                    <HUDSlot label="Phase" value={bossPhaseValue} icon="◇" />
                </div>
            ),
            bottomRight: (
                <ActionButton
                    label={specialLabel}
                    onClick={onSpecial}
                    cooldownRemainingMs={specialCooldownRemainingMs}
                    cooldownTotalMs={specialCooldownTotalMs}
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

export default BossEncounterHUDPreset;
