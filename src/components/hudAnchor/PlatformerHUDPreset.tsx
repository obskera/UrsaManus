import { type ReactNode } from "react";
import { ActionButton } from "@/components/actionButton";
import { HUDSlot } from "@/components/hudSlot";
import HUDAnchor from "./HUDAnchor";
import QuickHUDLayout from "./QuickHUDLayout";
import { createHudPresetSlots } from "./createHudPresetSlots";
import type { BaseHUDPresetProps } from "./presetTypes";
import "./PlatformerHUDPreset.css";

export interface PlatformerHUDPresetProps extends BaseHUDPresetProps {
    coinsValue?: ReactNode;
    livesValue?: ReactNode;
    jumpLabel?: string;
    onJump?: () => void;
    jumpCooldownRemainingMs?: number;
    jumpCooldownTotalMs?: number;
}

const PlatformerHUDPreset = ({
    safeArea = true,
    offsetX = 8,
    offsetY = 8,
    className,
    healthValue = "84/100",
    minimapValue = "Stage 1-1",
    coinsValue = "12",
    livesValue = "3",
    jumpLabel = "Jump",
    onJump,
    jumpCooldownRemainingMs = 0,
    jumpCooldownTotalMs = 0,
    topLeftSlot,
    topRightSlot,
    bottomLeftSlot,
    bottomRightSlot,
}: PlatformerHUDPresetProps) => {
    const rootClassName = className
        ? `um-platformer-hud-preset ${className}`
        : "um-platformer-hud-preset";

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
                <div className="um-platformer-hud-preset__stack">
                    <HUDSlot label="Coins" value={coinsValue} icon="◌" />
                    <HUDSlot label="Lives" value={livesValue} icon="◆" />
                </div>
            ),
            bottomRight: (
                <ActionButton
                    label={jumpLabel}
                    onClick={onJump}
                    cooldownRemainingMs={jumpCooldownRemainingMs}
                    cooldownTotalMs={jumpCooldownTotalMs}
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

export default PlatformerHUDPreset;
