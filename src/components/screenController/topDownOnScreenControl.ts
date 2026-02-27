import { createElement, useEffect, useRef, useState } from "react";
import { dataBus } from "@/services/DataBus";
import ScreenControl from "./ScreenControl";
import type { ScreenControllerChildProps } from "./screenController";

export interface TopDownOnScreenControlProps extends ScreenControllerChildProps {
    onMove?: () => void;
    speedPxPerSec?: number;
    allowDiagonal?: boolean;
}

const TopDownOnScreenControl = ({
    onMove,
    speedPxPerSec = 220,
    allowDiagonal = true,
}: TopDownOnScreenControlProps) => {
    const inputStateRef = useRef({
        left: false,
        right: false,
        up: false,
        down: false,
    });
    const [heldDirection, setHeldDirection] = useState<
        "north" | "south" | "east" | "west" | null
    >(null);

    useEffect(() => {
        let rafId = 0;
        let lastTime = performance.now();

        const tick = (now: number) => {
            const deltaMs = now - lastTime;
            lastTime = now;

            const { left, right, up, down } = inputStateRef.current;
            const dxInput = (right ? 1 : 0) + (left ? -1 : 0);
            const dyInput = (down ? 1 : 0) + (up ? -1 : 0);

            if (dxInput !== 0 || dyInput !== 0) {
                let dx = dxInput;
                let dy = dyInput;

                if (!allowDiagonal && dx !== 0 && dy !== 0) {
                    dy = 0;
                }

                if (dx !== 0 && dy !== 0) {
                    const invMagnitude = 1 / Math.hypot(dx, dy);
                    dx *= invMagnitude;
                    dy *= invMagnitude;
                }

                const step = speedPxPerSec * (Math.min(deltaMs, 50) / 1000);
                const moved = dataBus.movePlayerBy(dx * step, dy * step);
                if (moved) {
                    onMove?.();
                }
            }

            rafId = requestAnimationFrame(tick);
        };

        rafId = requestAnimationFrame(tick);

        return () => {
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, [allowDiagonal, onMove, speedPxPerSec]);

    useEffect(() => {
        const resetState = () => {
            inputStateRef.current = {
                left: false,
                right: false,
                up: false,
                down: false,
            };
            setHeldDirection(null);
        };

        const onWindowBlur = () => resetState();
        const onVisibilityChange = () => {
            if (document.visibilityState === "hidden") {
                resetState();
            }
        };

        window.addEventListener("blur", onWindowBlur);
        document.addEventListener("visibilitychange", onVisibilityChange);

        return () => {
            window.removeEventListener("blur", onWindowBlur);
            document.removeEventListener(
                "visibilitychange",
                onVisibilityChange,
            );
        };
    }, []);

    const setPressed = (
        direction: "left" | "right" | "up" | "down",
        pressed: boolean,
    ) => {
        inputStateRef.current = {
            ...inputStateRef.current,
            [direction]: pressed,
        };

        if (pressed) {
            const nextHeld =
                direction === "left"
                    ? "west"
                    : direction === "right"
                      ? "east"
                      : direction === "up"
                        ? "north"
                        : "south";
            setHeldDirection(nextHeld);
            return;
        }

        const nextState = inputStateRef.current;

        const { left, right, up, down } = nextState;
        if (left) setHeldDirection("west");
        else if (right) setHeldDirection("east");
        else if (up) setHeldDirection("north");
        else if (down) setHeldDirection("south");
        else setHeldDirection(null);
    };

    return createElement(
        "div",
        { className: "on-screen-arrow-control" },
        createElement(ScreenControl, {
            label: "↑",
            className:
                heldDirection === "north"
                    ? "direction-button north is-held"
                    : "direction-button north",
            onPressStart: () => setPressed("up", true),
            onPressEnd: () => setPressed("up", false),
        }),
        createElement(ScreenControl, {
            label: "←",
            className:
                heldDirection === "west"
                    ? "direction-button west is-held"
                    : "direction-button west",
            onPressStart: () => setPressed("left", true),
            onPressEnd: () => setPressed("left", false),
        }),
        createElement(ScreenControl, {
            label: "→",
            className:
                heldDirection === "east"
                    ? "direction-button east is-held"
                    : "direction-button east",
            onPressStart: () => setPressed("right", true),
            onPressEnd: () => setPressed("right", false),
        }),
        createElement(ScreenControl, {
            label: "↓",
            className:
                heldDirection === "south"
                    ? "direction-button south is-held"
                    : "direction-button south",
            onPressStart: () => setPressed("down", true),
            onPressEnd: () => setPressed("down", false),
        }),
    );
};

export default TopDownOnScreenControl;
