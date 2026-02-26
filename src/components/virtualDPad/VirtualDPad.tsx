import { type ReactNode, useEffect, useMemo, useState } from "react";
import "./VirtualDPad.css";

export type VirtualDPadDirection = "up" | "down" | "left" | "right";

export interface VirtualDPadPressedState {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
}

export interface VirtualDPadRenderState {
    pressed: VirtualDPadPressedState;
    activeDirections: VirtualDPadDirection[];
    vectorX: -1 | 0 | 1;
    vectorY: -1 | 0 | 1;
    disabled: boolean;
    canInteract: boolean;
    ariaLabel: string;
}

export interface VirtualDPadProps {
    label?: string;
    disabled?: boolean;
    className?: string;
    pressed?: Partial<VirtualDPadPressedState>;
    defaultPressed?: Partial<VirtualDPadPressedState>;
    onPressedChange?: (nextState: VirtualDPadPressedState) => void;
    onDirectionStart?: (direction: VirtualDPadDirection) => void;
    onDirectionEnd?: (direction: VirtualDPadDirection) => void;
    render?: (state: VirtualDPadRenderState) => ReactNode;
}

const DEFAULT_PRESSED: VirtualDPadPressedState = {
    up: false,
    down: false,
    left: false,
    right: false,
};

function normalizePressed(
    pressed?: Partial<VirtualDPadPressedState>,
): VirtualDPadPressedState {
    if (!pressed) {
        return { ...DEFAULT_PRESSED };
    }

    return {
        up: Boolean(pressed.up),
        down: Boolean(pressed.down),
        left: Boolean(pressed.left),
        right: Boolean(pressed.right),
    };
}

function buildRenderState({
    label = "Virtual DPad",
    disabled = false,
    pressed,
}: Pick<VirtualDPadProps, "label" | "disabled"> & {
    pressed: VirtualDPadPressedState;
}): VirtualDPadRenderState {
    const activeDirections: VirtualDPadDirection[] = [];
    if (pressed.up) activeDirections.push("up");
    if (pressed.right) activeDirections.push("right");
    if (pressed.down) activeDirections.push("down");
    if (pressed.left) activeDirections.push("left");

    const vectorX = (pressed.right ? 1 : 0) + (pressed.left ? -1 : 0);
    const vectorY = (pressed.down ? 1 : 0) + (pressed.up ? -1 : 0);

    return {
        pressed,
        activeDirections,
        vectorX: vectorX as -1 | 0 | 1,
        vectorY: vectorY as -1 | 0 | 1,
        disabled,
        canInteract: !disabled,
        ariaLabel: label,
    };
}

const VirtualDPad = ({
    label = "Virtual DPad",
    disabled = false,
    className,
    pressed,
    defaultPressed,
    onPressedChange,
    onDirectionStart,
    onDirectionEnd,
    render,
}: VirtualDPadProps) => {
    const isControlled = pressed !== undefined;
    const [uncontrolledPressed, setUncontrolledPressed] = useState(() =>
        normalizePressed(defaultPressed),
    );

    const effectivePressed = useMemo(
        () => (isControlled ? normalizePressed(pressed) : uncontrolledPressed),
        [isControlled, pressed, uncontrolledPressed],
    );

    const state = buildRenderState({
        label,
        disabled,
        pressed: effectivePressed,
    });

    const updatePressed = (
        direction: VirtualDPadDirection,
        nextPressedValue: boolean,
    ) => {
        if (!state.canInteract) {
            return;
        }

        const currentValue = effectivePressed[direction];
        if (currentValue === nextPressedValue) {
            return;
        }

        const nextState: VirtualDPadPressedState = {
            ...effectivePressed,
            [direction]: nextPressedValue,
        };

        if (!isControlled) {
            setUncontrolledPressed(nextState);
        }

        onPressedChange?.(nextState);

        if (nextPressedValue) {
            onDirectionStart?.(direction);
        } else {
            onDirectionEnd?.(direction);
        }
    };

    const resetAll = () => {
        if (!state.canInteract) {
            return;
        }

        const hasAnyPressed =
            effectivePressed.up ||
            effectivePressed.down ||
            effectivePressed.left ||
            effectivePressed.right;

        if (!hasAnyPressed) {
            return;
        }

        const nextState = { ...DEFAULT_PRESSED };
        if (!isControlled) {
            setUncontrolledPressed(nextState);
        }
        onPressedChange?.(nextState);

        if (effectivePressed.up) onDirectionEnd?.("up");
        if (effectivePressed.right) onDirectionEnd?.("right");
        if (effectivePressed.down) onDirectionEnd?.("down");
        if (effectivePressed.left) onDirectionEnd?.("left");
    };

    useEffect(() => {
        const onWindowBlur = () => {
            resetAll();
        };

        window.addEventListener("blur", onWindowBlur);
        return () => {
            window.removeEventListener("blur", onWindowBlur);
        };
    });

    if (render) {
        return <>{render(state)}</>;
    }

    const rootClassName = className
        ? `um-virtual-dpad ${state.disabled ? "um-virtual-dpad--disabled" : ""} ${className}`
        : state.disabled
          ? "um-virtual-dpad um-virtual-dpad--disabled"
          : "um-virtual-dpad";

    const directionButtonClassName = (
        direction: VirtualDPadDirection,
        positionClassName: string,
    ) =>
        effectivePressed[direction]
            ? `um-virtual-dpad__button ${positionClassName} is-held`
            : `um-virtual-dpad__button ${positionClassName}`;

    return (
        <div
            className={rootClassName}
            role="group"
            aria-label={state.ariaLabel}
            data-disabled={state.disabled ? "true" : "false"}
            data-vector-x={state.vectorX}
            data-vector-y={state.vectorY}
        >
            <button
                type="button"
                className={directionButtonClassName(
                    "up",
                    "um-virtual-dpad__up",
                )}
                aria-label="Move up"
                aria-pressed={effectivePressed.up}
                disabled={!state.canInteract}
                onPointerDown={() => {
                    updatePressed("up", true);
                }}
                onPointerUp={() => {
                    updatePressed("up", false);
                }}
                onPointerCancel={() => {
                    updatePressed("up", false);
                }}
                onPointerLeave={() => {
                    updatePressed("up", false);
                }}
            >
                ↑
            </button>

            <button
                type="button"
                className={directionButtonClassName(
                    "left",
                    "um-virtual-dpad__left",
                )}
                aria-label="Move left"
                aria-pressed={effectivePressed.left}
                disabled={!state.canInteract}
                onPointerDown={() => {
                    updatePressed("left", true);
                }}
                onPointerUp={() => {
                    updatePressed("left", false);
                }}
                onPointerCancel={() => {
                    updatePressed("left", false);
                }}
                onPointerLeave={() => {
                    updatePressed("left", false);
                }}
            >
                ←
            </button>

            <button
                type="button"
                className={directionButtonClassName(
                    "right",
                    "um-virtual-dpad__right",
                )}
                aria-label="Move right"
                aria-pressed={effectivePressed.right}
                disabled={!state.canInteract}
                onPointerDown={() => {
                    updatePressed("right", true);
                }}
                onPointerUp={() => {
                    updatePressed("right", false);
                }}
                onPointerCancel={() => {
                    updatePressed("right", false);
                }}
                onPointerLeave={() => {
                    updatePressed("right", false);
                }}
            >
                →
            </button>

            <button
                type="button"
                className={directionButtonClassName(
                    "down",
                    "um-virtual-dpad__down",
                )}
                aria-label="Move down"
                aria-pressed={effectivePressed.down}
                disabled={!state.canInteract}
                onPointerDown={() => {
                    updatePressed("down", true);
                }}
                onPointerUp={() => {
                    updatePressed("down", false);
                }}
                onPointerCancel={() => {
                    updatePressed("down", false);
                }}
                onPointerLeave={() => {
                    updatePressed("down", false);
                }}
            >
                ↓
            </button>
        </div>
    );
};

export default VirtualDPad;
