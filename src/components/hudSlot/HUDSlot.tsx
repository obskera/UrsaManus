import { type ReactNode } from "react";
import { CooldownIndicator } from "@/components/cooldownIndicator";
import "./HUDSlot.css";

export interface HUDSlotRenderState {
    label: string;
    value: ReactNode;
    icon: ReactNode | null;
    badge: ReactNode | null;
    disabled: boolean;
    cooldownRemainingMs: number;
    cooldownTotalMs: number;
    isCoolingDown: boolean;
    canActivate: boolean;
    ariaLabel: string;
}

export interface HUDSlotProps {
    label: string;
    value?: ReactNode;
    icon?: ReactNode;
    badge?: ReactNode;
    disabled?: boolean;
    cooldownRemainingMs?: number;
    cooldownTotalMs?: number;
    showCooldownText?: boolean;
    className?: string;
    render?: (state: HUDSlotRenderState) => ReactNode;
}

function normalizeMs(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, value);
}

function buildState({
    label,
    value,
    icon,
    badge,
    disabled = false,
    cooldownRemainingMs = 0,
    cooldownTotalMs = 0,
}: Pick<
    HUDSlotProps,
    | "label"
    | "value"
    | "icon"
    | "badge"
    | "disabled"
    | "cooldownRemainingMs"
    | "cooldownTotalMs"
>): HUDSlotRenderState {
    const normalizedTotal = normalizeMs(cooldownTotalMs);
    const normalizedRemaining = Math.min(
        normalizeMs(cooldownRemainingMs),
        normalizedTotal > 0
            ? normalizedTotal
            : normalizeMs(cooldownRemainingMs),
    );

    const isCoolingDown = normalizedRemaining > 0;

    return {
        label,
        value: value ?? "",
        icon: icon ?? null,
        badge: badge ?? null,
        disabled,
        cooldownRemainingMs: normalizedRemaining,
        cooldownTotalMs: normalizedTotal,
        isCoolingDown,
        canActivate: !disabled && !isCoolingDown,
        ariaLabel: `${label} slot`,
    };
}

const HUDSlot = ({
    label,
    value,
    icon,
    badge,
    disabled = false,
    cooldownRemainingMs = 0,
    cooldownTotalMs = 0,
    showCooldownText = false,
    className,
    render,
}: HUDSlotProps) => {
    const state = buildState({
        label,
        value,
        icon,
        badge,
        disabled,
        cooldownRemainingMs,
        cooldownTotalMs,
    });

    if (render) {
        return <>{render(state)}</>;
    }

    const statusClass = state.disabled
        ? "um-hud-slot--disabled"
        : state.isCoolingDown
          ? "um-hud-slot--cooldown"
          : "um-hud-slot--ready";

    const rootClassName = className
        ? `um-hud-slot ${statusClass} ${className}`
        : `um-hud-slot ${statusClass}`;

    return (
        <div
            className={rootClassName}
            role="group"
            aria-label={state.ariaLabel}
            data-status={
                state.disabled
                    ? "disabled"
                    : state.isCoolingDown
                      ? "cooldown"
                      : "ready"
            }
        >
            {state.icon ? (
                <span className="um-hud-slot__icon">{state.icon}</span>
            ) : null}
            <div className="um-hud-slot__content">
                <span className="um-hud-slot__label">{state.label}</span>
                {state.value ? (
                    <span className="um-hud-slot__value">{state.value}</span>
                ) : null}
            </div>

            {state.badge ? (
                <span className="um-capsule">{state.badge}</span>
            ) : null}

            {state.isCoolingDown ? (
                <CooldownIndicator
                    className="um-hud-slot__cooldown"
                    label={`${state.label} cooldown`}
                    remainingMs={state.cooldownRemainingMs}
                    totalMs={state.cooldownTotalMs}
                    showText={showCooldownText}
                />
            ) : null}
        </div>
    );
};

export default HUDSlot;
