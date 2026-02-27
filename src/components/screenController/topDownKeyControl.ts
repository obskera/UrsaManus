import { useEffect, useRef } from "react";
import { dataBus } from "@/services/DataBus";
import type { ScreenControllerChildProps } from "./screenController";

export interface TopDownKeyControlProps extends ScreenControllerChildProps {
    enabled?: boolean;
    onMove?: () => void;
    speedPxPerSec?: number;
    allowDiagonal?: boolean;
}

const TopDownKeyControl = ({
    enabled = true,
    onMove,
    speedPxPerSec = 220,
    allowDiagonal = true,
}: TopDownKeyControlProps) => {
    const inputStateRef = useRef({
        left: false,
        right: false,
        up: false,
        down: false,
    });

    useEffect(() => {
        if (!enabled) return;

        let rafId = 0;
        let lastTime = performance.now();

        const isLeft = (key: string) => key === "arrowleft" || key === "a";
        const isRight = (key: string) => key === "arrowright" || key === "d";
        const isUp = (key: string) => key === "arrowup" || key === "w";
        const isDown = (key: string) => key === "arrowdown" || key === "s";

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

        const onKeyDown = (event: KeyboardEvent) => {
            const key = event.key.toLowerCase();
            const target = event.target as HTMLElement | null;
            if (
                target &&
                (target.tagName === "INPUT" ||
                    target.tagName === "TEXTAREA" ||
                    target.tagName === "SELECT" ||
                    target.isContentEditable)
            ) {
                return;
            }

            if (isLeft(key) || isRight(key) || isUp(key) || isDown(key)) {
                event.preventDefault();
            }

            if (isLeft(key) || isRight(key) || isUp(key) || isDown(key)) {
                inputStateRef.current = {
                    left: inputStateRef.current.left || isLeft(key),
                    right: inputStateRef.current.right || isRight(key),
                    up: inputStateRef.current.up || isUp(key),
                    down: inputStateRef.current.down || isDown(key),
                };
            }
        };

        const onKeyUp = (event: KeyboardEvent) => {
            const key = event.key.toLowerCase();

            if (isLeft(key) || isRight(key) || isUp(key) || isDown(key)) {
                inputStateRef.current = {
                    left: isLeft(key) ? false : inputStateRef.current.left,
                    right: isRight(key) ? false : inputStateRef.current.right,
                    up: isUp(key) ? false : inputStateRef.current.up,
                    down: isDown(key) ? false : inputStateRef.current.down,
                };
            }
        };

        window.addEventListener("keydown", onKeyDown, { passive: false });
        window.addEventListener("keyup", onKeyUp);
        rafId = requestAnimationFrame(tick);

        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
        };
    }, [allowDiagonal, enabled, onMove, speedPxPerSec]);

    useEffect(() => {
        const resetState = () => {
            inputStateRef.current = {
                left: false,
                right: false,
                up: false,
                down: false,
            };
        };

        const onWindowBlur = () => {
            resetState();
        };

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

    return null;
};

export default TopDownKeyControl;
