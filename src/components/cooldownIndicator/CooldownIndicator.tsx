import { type CSSProperties, type ReactNode } from "react";
import "./CooldownIndicator.css";

export interface CooldownIndicatorRenderState {
    remainingMs: number;
    totalMs: number;
    ratio: number;
    percentage: number;
    isActive: boolean;
    text: string;
    ariaLabel: string;
}

export interface CooldownIndicatorProps {
    remainingMs: number;
    totalMs?: number;
    label?: string;
    showText?: boolean;
    className?: string;
    render?: (state: CooldownIndicatorRenderState) => ReactNode;
    formatText?: (state: CooldownIndicatorRenderState) => string;
}

function normalizeMs(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, value);
}

function buildState({
    remainingMs,
    totalMs = 0,
    label = "Cooldown",
    formatText,
}: Pick<
    CooldownIndicatorProps,
    "remainingMs" | "totalMs" | "label" | "formatText"
>): CooldownIndicatorRenderState {
    const normalizedTotal = normalizeMs(totalMs);
    const normalizedRemaining = Math.min(
        normalizeMs(remainingMs),
        normalizedTotal > 0 ? normalizedTotal : normalizeMs(remainingMs),
    );
    const isActive = normalizedRemaining > 0;

    const ratio =
        normalizedTotal > 0
            ? Math.min(1, normalizedRemaining / normalizedTotal)
            : isActive
              ? 1
              : 0;
    const percentage = Math.round(ratio * 100);

    const state: CooldownIndicatorRenderState = {
        remainingMs: normalizedRemaining,
        totalMs: normalizedTotal,
        ratio,
        percentage,
        isActive,
        text: `${(normalizedRemaining / 1000).toFixed(1)}s`,
        ariaLabel: label,
    };

    if (formatText) {
        state.text = formatText(state);
    }

    return state;
}

const CooldownIndicator = ({
    remainingMs,
    totalMs = 0,
    label = "Cooldown",
    showText = true,
    className,
    render,
    formatText,
}: CooldownIndicatorProps) => {
    const state = buildState({ remainingMs, totalMs, label, formatText });

    if (render) {
        return <>{render(state)}</>;
    }

    const rootClassName = className
        ? `um-cooldown-indicator ${className}`
        : "um-cooldown-indicator";

    const fillStyle = {
        width: `${state.percentage}%`,
    } satisfies CSSProperties;

    return (
        <div
            className={rootClassName}
            role="progressbar"
            aria-label={state.ariaLabel}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={state.percentage}
            aria-valuetext={state.text}
            data-active={state.isActive ? "true" : "false"}
        >
            <div className="um-cooldown-indicator__track" aria-hidden="true">
                <div
                    className="um-cooldown-indicator__fill"
                    style={fillStyle}
                />
            </div>
            {showText ? (
                <span className="um-cooldown-indicator__text">
                    {state.text}
                </span>
            ) : null}
        </div>
    );
};

export default CooldownIndicator;
