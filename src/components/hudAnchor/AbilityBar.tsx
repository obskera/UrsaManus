import { ActionButton } from "@/components/actionButton";
import HUDAnchor from "./HUDAnchor";
import "./AbilityBar.css";

export type AbilityBarItem = {
    id: string;
    label: string;
    cooldownRemainingMs?: number;
    cooldownTotalMs?: number;
    disabled?: boolean;
    pressed?: boolean;
    onTrigger?: () => void;
};

export interface AbilityBarProps {
    abilities?: AbilityBarItem[];
    safeArea?: boolean;
    offsetX?: number;
    offsetY?: number;
    className?: string;
    ariaLabel?: string;
    onAbilityTrigger?: (abilityId: string) => void;
}

const DEFAULT_ABILITIES: AbilityBarItem[] = [
    {
        id: "ability-primary",
        label: "Primary",
    },
    {
        id: "ability-secondary",
        label: "Secondary",
    },
    {
        id: "ability-ultimate",
        label: "Ultimate",
    },
];

const AbilityBar = ({
    abilities = DEFAULT_ABILITIES,
    safeArea = true,
    offsetX = 8,
    offsetY = 8,
    className,
    ariaLabel = "Ability bar",
    onAbilityTrigger,
}: AbilityBarProps) => {
    const rootClassName = className
        ? `um-ability-bar ${className}`
        : "um-ability-bar";

    return (
        <HUDAnchor
            anchor="bottom-right"
            safeArea={safeArea}
            offsetX={offsetX}
            offsetY={offsetY}
            ariaLabel={ariaLabel}
        >
            <div className={rootClassName}>
                {abilities.map((ability) => (
                    <ActionButton
                        key={ability.id}
                        className="um-ability-bar__button"
                        label={ability.label}
                        pressed={ability.pressed}
                        disabled={ability.disabled}
                        cooldownRemainingMs={ability.cooldownRemainingMs ?? 0}
                        cooldownTotalMs={ability.cooldownTotalMs ?? 0}
                        showCooldownText={false}
                        onClick={() => {
                            ability.onTrigger?.();
                            onAbilityTrigger?.(ability.id);
                        }}
                    />
                ))}
            </div>
        </HUDAnchor>
    );
};

export default AbilityBar;
