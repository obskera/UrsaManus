import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import "./VirtualControlStick.css";

export type VirtualControlStickVector = {
    x: number;
    y: number;
    magnitude: number;
    angleRad: number;
    active: boolean;
};

export type VirtualControlStickRenderState = {
    label: string;
    disabled: boolean;
    active: boolean;
    vector: VirtualControlStickVector;
};

export type VirtualControlStickProps = {
    label?: string;
    disabled?: boolean;
    className?: string;
    sizePx?: number;
    deadzone?: number;
    sensitivity?: number;
    snapToCardinal?: boolean;
    onVectorChange?: (vector: VirtualControlStickVector) => void;
    onRelease?: () => void;
    render?: (state: VirtualControlStickRenderState) => ReactNode;
};

const DEFAULT_SIZE_PX = 112;
const DEFAULT_DEADZONE = 0.16;
const DEFAULT_SENSITIVITY = 1;

const ZERO_VECTOR: VirtualControlStickVector = {
    x: 0,
    y: 0,
    magnitude: 0,
    angleRad: 0,
    active: false,
};

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function normalizeDeadzone(value: number | undefined): number {
    if (!Number.isFinite(value)) {
        return DEFAULT_DEADZONE;
    }

    return clamp(value ?? DEFAULT_DEADZONE, 0, 0.95);
}

function normalizeSensitivity(value: number | undefined): number {
    if (!Number.isFinite(value)) {
        return DEFAULT_SENSITIVITY;
    }

    return clamp(value ?? DEFAULT_SENSITIVITY, 0.1, 2.5);
}

function normalizeSize(value: number | undefined): number {
    if (!Number.isFinite(value)) {
        return DEFAULT_SIZE_PX;
    }

    return Math.max(64, Math.floor(value ?? DEFAULT_SIZE_PX));
}

function computeVector(input: {
    clientX: number;
    clientY: number;
    rect: DOMRect;
    deadzone: number;
    sensitivity: number;
    snapToCardinal: boolean;
}): VirtualControlStickVector {
    const centerX = input.rect.left + input.rect.width / 2;
    const centerY = input.rect.top + input.rect.height / 2;
    const radius = Math.max(
        1,
        Math.min(input.rect.width, input.rect.height) / 2,
    );

    const deltaX = input.clientX - centerX;
    const deltaY = input.clientY - centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance <= 0.0001) {
        return { ...ZERO_VECTOR, active: true };
    }

    const rawMagnitude = clamp(distance / radius, 0, 1);
    if (rawMagnitude <= input.deadzone) {
        return { ...ZERO_VECTOR, active: true };
    }

    const normalizedMagnitude =
        (rawMagnitude - input.deadzone) / (1 - input.deadzone);
    const scaledMagnitude = clamp(
        normalizedMagnitude * input.sensitivity,
        0,
        1,
    );

    const normalX = deltaX / distance;
    const normalY = deltaY / distance;

    let x = normalX * scaledMagnitude;
    let y = normalY * scaledMagnitude;

    if (input.snapToCardinal) {
        if (Math.abs(x) >= Math.abs(y)) {
            y = 0;
            x = Math.sign(x) * scaledMagnitude;
        } else {
            x = 0;
            y = Math.sign(y) * scaledMagnitude;
        }
    }

    return {
        x,
        y,
        magnitude: Math.sqrt(x * x + y * y),
        angleRad: Math.atan2(y, x),
        active: true,
    };
}

const VirtualControlStick = ({
    label = "Virtual control stick",
    disabled = false,
    className,
    sizePx = DEFAULT_SIZE_PX,
    deadzone = DEFAULT_DEADZONE,
    sensitivity = DEFAULT_SENSITIVITY,
    snapToCardinal = false,
    onVectorChange,
    onRelease,
    render,
}: VirtualControlStickProps) => {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const pointerIdRef = useRef<number | null>(null);
    const [vector, setVector] =
        useState<VirtualControlStickVector>(ZERO_VECTOR);

    const normalizedDeadzone = normalizeDeadzone(deadzone);
    const normalizedSensitivity = normalizeSensitivity(sensitivity);
    const normalizedSize = normalizeSize(sizePx);

    const state = useMemo<VirtualControlStickRenderState>(
        () => ({
            label,
            disabled,
            active: vector.active,
            vector,
        }),
        [disabled, label, vector],
    );

    const applyVector = (nextVector: VirtualControlStickVector) => {
        setVector(nextVector);
        onVectorChange?.(nextVector);
    };

    const resetVector = () => {
        const wasActive = vector.active;
        applyVector(ZERO_VECTOR);
        if (wasActive) {
            onRelease?.();
        }
    };

    useEffect(() => {
        const onWindowBlur = () => {
            pointerIdRef.current = null;
            resetVector();
        };

        window.addEventListener("blur", onWindowBlur);
        return () => {
            window.removeEventListener("blur", onWindowBlur);
        };
    });

    const handlePointerDown: React.PointerEventHandler<HTMLDivElement> = (
        event,
    ) => {
        if (disabled) {
            return;
        }

        pointerIdRef.current = event.pointerId;
        event.currentTarget.setPointerCapture?.(event.pointerId);

        const rect = event.currentTarget.getBoundingClientRect();
        const next = computeVector({
            clientX: event.clientX,
            clientY: event.clientY,
            rect,
            deadzone: normalizedDeadzone,
            sensitivity: normalizedSensitivity,
            snapToCardinal,
        });

        applyVector(next);
    };

    const handlePointerMove: React.PointerEventHandler<HTMLDivElement> = (
        event,
    ) => {
        if (disabled) {
            return;
        }

        if (pointerIdRef.current !== event.pointerId) {
            return;
        }

        const rect = event.currentTarget.getBoundingClientRect();
        const next = computeVector({
            clientX: event.clientX,
            clientY: event.clientY,
            rect,
            deadzone: normalizedDeadzone,
            sensitivity: normalizedSensitivity,
            snapToCardinal,
        });

        applyVector(next);
    };

    const releasePointer: React.PointerEventHandler<HTMLDivElement> = (
        event,
    ) => {
        if (pointerIdRef.current !== event.pointerId) {
            return;
        }

        pointerIdRef.current = null;
        resetVector();
    };

    if (render) {
        return <>{render(state)}</>;
    }

    const rootClassName = className
        ? `um-virtual-control-stick ${disabled ? "um-virtual-control-stick--disabled" : ""} ${className}`
        : disabled
          ? "um-virtual-control-stick um-virtual-control-stick--disabled"
          : "um-virtual-control-stick";

    const thumbOffsetPx = normalizedSize * 0.28;
    const thumbTranslateX = vector.x * thumbOffsetPx;
    const thumbTranslateY = vector.y * thumbOffsetPx;

    return (
        <div
            ref={rootRef}
            role="group"
            aria-label={label}
            className={rootClassName}
            style={{
                width: `${normalizedSize}px`,
                height: `${normalizedSize}px`,
            }}
            data-active={state.active ? "true" : "false"}
            data-vector-x={vector.x.toFixed(4)}
            data-vector-y={vector.y.toFixed(4)}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={releasePointer}
            onPointerCancel={releasePointer}
        >
            <div
                className="um-virtual-control-stick__base"
                aria-hidden="true"
            />
            <div
                className="um-virtual-control-stick__thumb"
                aria-hidden="true"
                style={{
                    transform: `translate(${thumbTranslateX}px, ${thumbTranslateY}px)`,
                }}
            />
        </div>
    );
};

export default VirtualControlStick;
