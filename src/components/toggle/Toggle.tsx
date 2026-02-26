import { type MouseEvent, type ReactNode } from "react";
import "./Toggle.css";

export type ToggleStatus = "on" | "off" | "disabled";

export interface ToggleRenderState {
    checked: boolean;
    disabled: boolean;
    canToggle: boolean;
    status: ToggleStatus;
    ariaLabel: string;
}

export interface ToggleProps {
    checked: boolean;
    label?: string;
    disabled?: boolean;
    className?: string;
    render?: (state: ToggleRenderState) => ReactNode;
    onChange?: (nextChecked: boolean) => void;
}

function buildState({
    checked,
    disabled = false,
    label = "Toggle",
}: Pick<ToggleProps, "checked" | "disabled" | "label">): ToggleRenderState {
    return {
        checked,
        disabled,
        canToggle: !disabled,
        status: disabled ? "disabled" : checked ? "on" : "off",
        ariaLabel: label,
    };
}

const Toggle = ({
    checked,
    label = "Toggle",
    disabled = false,
    className,
    render,
    onChange,
}: ToggleProps) => {
    const state = buildState({ checked, disabled, label });

    if (render) {
        return <>{render(state)}</>;
    }

    const rootClassName = className
        ? `um-toggle um-toggle--${state.status} ${className}`
        : `um-toggle um-toggle--${state.status}`;

    const onButtonClick = (event: MouseEvent<HTMLButtonElement>) => {
        if (!state.canToggle) {
            event.preventDefault();
            return;
        }

        onChange?.(!state.checked);
    };

    return (
        <button
            type="button"
            role="switch"
            aria-label={state.ariaLabel}
            aria-checked={state.checked}
            aria-disabled={!state.canToggle}
            disabled={!state.canToggle}
            className={rootClassName}
            data-status={state.status}
            onClick={onButtonClick}
        >
            <span className="um-toggle__track" aria-hidden="true">
                <span className="um-toggle__thumb" />
            </span>
            <span className="um-toggle__label">{label}</span>
        </button>
    );
};

export default Toggle;
