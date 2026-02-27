import { type CSSProperties, type ReactNode } from "react";
import "./HUDAnchor.css";

export type HUDAnchorPosition =
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right";

export interface HUDAnchorRenderState {
    anchor: HUDAnchorPosition;
    safeArea: boolean;
    offsetX: number;
    offsetY: number;
    ariaLabel: string;
}

export interface HUDAnchorProps {
    anchor: HUDAnchorPosition;
    children?: ReactNode;
    safeArea?: boolean;
    offsetX?: number;
    offsetY?: number;
    className?: string;
    ariaLabel?: string;
    render?: (state: HUDAnchorRenderState) => ReactNode;
}

function normalizeOffset(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return value;
}

function buildState({
    anchor,
    safeArea = true,
    offsetX = 0,
    offsetY = 0,
    ariaLabel,
}: Pick<
    HUDAnchorProps,
    "anchor" | "safeArea" | "offsetX" | "offsetY" | "ariaLabel"
>): HUDAnchorRenderState {
    return {
        anchor,
        safeArea,
        offsetX: normalizeOffset(offsetX),
        offsetY: normalizeOffset(offsetY),
        ariaLabel: ariaLabel ?? `HUD anchor ${anchor}`,
    };
}

const HUDAnchor = ({
    anchor,
    children,
    safeArea = true,
    offsetX = 0,
    offsetY = 0,
    className,
    ariaLabel,
    render,
}: HUDAnchorProps) => {
    const state = buildState({
        anchor,
        safeArea,
        offsetX,
        offsetY,
        ariaLabel,
    });

    if (render) {
        return <>{render(state)}</>;
    }

    const rootClassName = [
        "um-hud-anchor",
        `um-hud-anchor--${state.anchor}`,
        state.safeArea ? "um-hud-anchor--safe" : "um-hud-anchor--unsafe",
        className,
    ]
        .filter(Boolean)
        .join(" ");

    const style: CSSProperties & Record<`--${string}`, string> = {
        "--um-hud-anchor-offset-x": `${state.offsetX}px`,
        "--um-hud-anchor-offset-y": `${state.offsetY}px`,
    };

    return (
        <div
            className={rootClassName}
            role="group"
            aria-label={state.ariaLabel}
            data-anchor={state.anchor}
            data-safe-area={state.safeArea ? "true" : "false"}
            style={style}
        >
            {children}
        </div>
    );
};

export default HUDAnchor;
