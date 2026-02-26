import { type MouseEvent, type ReactNode, useState } from "react";
import { CooldownIndicator } from "@/components/cooldownIndicator";
import "./VirtualActionButton.css";

export type VirtualActionButtonStatus =
    | "ready"
    | "held"
    | "cooldown"
    | "disabled";

export interface VirtualActionButtonRenderState {
    held: boolean;
    disabled: boolean;
    isCoolingDown: boolean;
    status: VirtualActionButtonStatus;
    canActivate: boolean;
    cooldownRemainingMs: number;
    cooldownTotalMs: number;
    cooldownRatio: number;
    cooldownPercentage: number;
    cooldownText: string;
    ariaLabel: string;
}

export interface VirtualActionButtonProps {
    label: string;
    disabled?: boolean;
    cooldownRemainingMs?: number;
    cooldownTotalMs?: number;
    showCooldownText?: boolean;
    className?: string;
    render?: (state: VirtualActionButtonRenderState) => ReactNode;
    formatCooldownText?: (state: VirtualActionButtonRenderState) => string;
    onActivate?: () => void;
    onPressStart?: () => void;
    onPressEnd?: () => void;
}

function normalizeMs(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, value);
}

function buildState({
    label,
    held,
    disabled = false,
    cooldownRemainingMs = 0,
    cooldownTotalMs = 0,
    formatCooldownText,
}: Pick<
    VirtualActionButtonProps,
    | "label"
    | "disabled"
    | "cooldownRemainingMs"
    | "cooldownTotalMs"
    | "formatCooldownText"
> & {
    held: boolean;
}): VirtualActionButtonRenderState {
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

    let status: VirtualActionButtonStatus = "ready";
    if (disabled) {
        status = "disabled";
    } else if (isCoolingDown) {
        status = "cooldown";
    } else if (held) {
        status = "held";
    }

    const state: VirtualActionButtonRenderState = {
        held,
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

const VirtualActionButton = ({
    label,
    disabled = false,
    cooldownRemainingMs = 0,
    cooldownTotalMs = 0,
    showCooldownText = true,
    className,
    render,
    formatCooldownText,
    onActivate,
    onPressStart,
    onPressEnd,
}: VirtualActionButtonProps) => {
    const [held, setHeld] = useState(false);
    const state = buildState({
        label,
        held,
        disabled,
        cooldownRemainingMs,
        cooldownTotalMs,
        formatCooldownText,
    });

    if (render) {
        return <>{render(state)}</>;
    }

    const rootClassName = className
        ? `um-virtual-action-button um-virtual-action-button--${state.status} ${className}`
        : `um-virtual-action-button um-virtual-action-button--${state.status}`;

    const beginPress = () => {
        if (!state.canActivate) {
            return;
        }

        setHeld(true);
        onPressStart?.();
    };

    const endPress = () => {
        if (!held) {
            return;
        }

        setHeld(false);
        onPressEnd?.();
    };

    const onButtonClick = (event: MouseEvent<HTMLButtonElement>) => {
        if (!state.canActivate) {
            event.preventDefault();
            return;
        }

        onActivate?.();
    };

    return (
        <button
            type="button"
            className={rootClassName}
            aria-label={state.ariaLabel}
            aria-pressed={state.held}
            aria-disabled={!state.canActivate}
            disabled={!state.canActivate}
            data-status={state.status}
            onClick={onButtonClick}
            onPointerDown={beginPress}
            onPointerUp={endPress}
            onPointerCancel={endPress}
            onPointerLeave={endPress}
            onMouseUp={(event) => {
                event.currentTarget.blur();
            }}
            onTouchEnd={(event) => {
                event.currentTarget.blur();
            }}
        >
            <span className="um-virtual-action-button__label">{label}</span>

            {state.isCoolingDown ? (
                <span
                    className="um-virtual-action-button__cooldown"
                    aria-hidden="true"
                >
                    <CooldownIndicator
                        className="um-virtual-action-button__indicator"
                        remainingMs={state.cooldownRemainingMs}
                        totalMs={state.cooldownTotalMs}
                        showText={showCooldownText}
                        formatText={() => state.cooldownText}
                        label={`${state.ariaLabel} cooldown`}
                    />
                </span>
            ) : null}
        </button>
    );
};

export default VirtualActionButton;
