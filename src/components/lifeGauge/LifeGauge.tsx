import { type CSSProperties, type ReactNode } from "react";
import "./LifeGauge.css";

export type LifeGaugeTone = "critical" | "warning" | "healthy";

export interface LifeGaugeRenderState {
    min: number;
    max: number;
    value: number;
    clampedValue: number;
    ratio: number;
    percentage: number;
    tone: LifeGaugeTone;
    valueText: string;
    ariaLabel: string;
}

export interface LifeGaugeProps {
    value: number;
    max: number;
    min?: number;
    label?: string;
    showValueText?: boolean;
    className?: string;
    render?: (state: LifeGaugeRenderState) => ReactNode;
    formatValueText?: (state: LifeGaugeRenderState) => string;
}

const DEFAULT_MIN = 0;

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function normalizeBounds(
    min: number,
    max: number,
): { min: number; max: number } {
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
        return { min: DEFAULT_MIN, max: 1 };
    }

    if (max <= min) {
        return { min, max: min + 1 };
    }

    return { min, max };
}

function resolveTone(ratio: number): LifeGaugeTone {
    if (ratio <= 0.25) {
        return "critical";
    }

    if (ratio <= 0.6) {
        return "warning";
    }

    return "healthy";
}

function buildRenderState({
    value,
    min,
    max,
    label,
    formatValueText,
}: Pick<
    LifeGaugeProps,
    "value" | "min" | "max" | "label" | "formatValueText"
>): LifeGaugeRenderState {
    const bounds = normalizeBounds(min ?? DEFAULT_MIN, max);
    const clampedValue = clamp(value, bounds.min, bounds.max);
    const range = bounds.max - bounds.min;
    const ratio = range <= 0 ? 0 : (clampedValue - bounds.min) / range;
    const percentage = Math.round(ratio * 100);
    const tone = resolveTone(ratio);

    const draftState: LifeGaugeRenderState = {
        min: bounds.min,
        max: bounds.max,
        value,
        clampedValue,
        ratio,
        percentage,
        tone,
        valueText: `${Math.round(clampedValue)} / ${Math.round(bounds.max)}`,
        ariaLabel: label ?? "Life gauge",
    };

    if (formatValueText) {
        draftState.valueText = formatValueText(draftState);
    }

    return draftState;
}

const LifeGauge = ({
    value,
    max,
    min = DEFAULT_MIN,
    label = "Life",
    showValueText = true,
    className,
    render,
    formatValueText,
}: LifeGaugeProps) => {
    const state = buildRenderState({
        value,
        min,
        max,
        label,
        formatValueText,
    });

    if (render) {
        return <>{render(state)}</>;
    }

    const rootClassName = className
        ? `um-life-gauge um-life-gauge--${state.tone} ${className}`
        : `um-life-gauge um-life-gauge--${state.tone}`;

    const fillStyle = {
        width: `${state.percentage}%`,
    } satisfies CSSProperties;

    return (
        <div
            className={rootClassName}
            role="meter"
            aria-label={state.ariaLabel}
            aria-valuemin={state.min}
            aria-valuemax={state.max}
            aria-valuenow={state.clampedValue}
            aria-valuetext={state.valueText}
            data-tone={state.tone}
        >
            <div className="um-life-gauge__header">
                <span className="um-life-gauge__label">{label}</span>
                {showValueText ? (
                    <span className="um-life-gauge__value">
                        {state.valueText}
                    </span>
                ) : null}
            </div>
            <div className="um-life-gauge__track" aria-hidden="true">
                <div className="um-life-gauge__fill" style={fillStyle} />
            </div>
        </div>
    );
};

export default LifeGauge;
