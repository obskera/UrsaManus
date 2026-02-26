import { type MouseEvent, type ReactNode } from "react";
import { CooldownIndicator } from "@/components/cooldownIndicator";
import "./ActionButton.css";

export type ActionButtonStatus = "ready" | "pressed" | "cooldown" | "disabled";

export interface ActionButtonRenderState {
    pressed: boolean;
    disabled: boolean;
    isCoolingDown: boolean;
    status: ActionButtonStatus;
    canActivate: boolean;
    cooldownRemainingMs: number;
    cooldownTotalMs: number;
    cooldownRatio: number;
    cooldownPercentage: number;
    cooldownText: string;
    ariaLabel: string;
}

export interface ActionButtonProps {
    label: string;
    onClick?: () => void;
    pressed?: boolean;
    disabled?: boolean;
    cooldownRemainingMs?: number;
    cooldownTotalMs?: number;
    showCooldownText?: boolean;
    className?: string;
    render?: (state: ActionButtonRenderState) => ReactNode;
    formatCooldownText?: (state: ActionButtonRenderState) => string;
}

function normalizeMs(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, value);
}

function buildState({
    label,
    pressed = false,
    disabled = false,
    cooldownRemainingMs = 0,
    cooldownTotalMs = 0,
    formatCooldownText,
}: Pick<
    ActionButtonProps,
    | "label"
    | "pressed"
    | "disabled"
    | "cooldownRemainingMs"
    | "cooldownTotalMs"
    | "formatCooldownText"
>): ActionButtonRenderState {
    const normalizedTotal = normalizeMs(cooldownTotalMs);
    const normalizedRemaining = Math.min(
        normalizeMs(cooldownRemainingMs),
        normalizedTotal > 0
            ? normalizedTotal
            : normalizeMs(cooldownRemainingMs),
    );
    const isCoolingDown = normalizedRemaining > 0;

    const cooldownRatio =
        normalizedTotal > 0
            ? Math.min(1, normalizedRemaining / normalizedTotal)
            : isCoolingDown
              ? 1
              : 0;

    const cooldownPercentage = Math.round(cooldownRatio * 100);

    let status: ActionButtonStatus = "ready";
    if (disabled) {
        status = "disabled";
    } else if (isCoolingDown) {
        status = "cooldown";
    } else if (pressed) {
        status = "pressed";
    }

    const state: ActionButtonRenderState = {
        pressed,
        disabled,
        isCoolingDown,
        status,
        canActivate: !disabled && !isCoolingDown,
        cooldownRemainingMs: normalizedRemaining,
        cooldownTotalMs: normalizedTotal,
        cooldownRatio,
        cooldownPercentage,
        cooldownText: `${(normalizedRemaining / 1000).toFixed(1)}s`,
        ariaLabel: label,
    };

    if (formatCooldownText) {
        state.cooldownText = formatCooldownText(state);
    }

    return state;
}

const ActionButton = ({
    label,
    onClick,
    pressed = false,
    disabled = false,
    cooldownRemainingMs = 0,
    cooldownTotalMs = 0,
    showCooldownText = true,
    className,
    render,
    formatCooldownText,
}: ActionButtonProps) => {
    const state = buildState({
        label,
        pressed,
        disabled,
        cooldownRemainingMs,
        cooldownTotalMs,
        formatCooldownText,
    });

    if (render) {
        return <>{render(state)}</>;
    }

    const rootClassName = className
        ? `um-action-button um-action-button--${state.status} ${className}`
        : `um-action-button um-action-button--${state.status}`;

    const onButtonClick = (event: MouseEvent<HTMLButtonElement>) => {
        if (!state.canActivate) {
            event.preventDefault();
            return;
        }

        onClick?.();
    };

    return (
        <button
            type="button"
            className={rootClassName}
            aria-label={state.ariaLabel}
            aria-pressed={state.pressed}
            aria-disabled={!state.canActivate}
            disabled={!state.canActivate}
            data-status={state.status}
            onClick={onButtonClick}
        >
            <span className="um-action-button__label">{label}</span>
            {state.isCoolingDown ? (
                <span className="um-action-button__cooldown" aria-hidden="true">
                    <CooldownIndicator
                        className="um-action-button__indicator"
                        remainingMs={state.cooldownRemainingMs}
                        totalMs={state.cooldownTotalMs}
                        showText={showCooldownText}
                        formatText={() => state.cooldownText}
                        label={`${state.ariaLabel} cooldown`}
                    />
                </span>
            ) : null}
            {state.isCoolingDown ? (
                <span
                    className="um-action-button__overlay"
                    aria-hidden="true"
                />
            ) : null}
        </button>
    );
};

export default ActionButton;
