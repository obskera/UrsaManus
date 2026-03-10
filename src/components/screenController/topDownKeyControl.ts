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
    const isDev = import.meta.env.DEV;
    const inputStateRef = useRef({
        left: false,
        right: false,
        up: false,
        down: false,
    });
    const keyboardOwnsIntentRef = useRef(false);

    useEffect(() => {
        if (!enabled) return;

        let rafId = 0;
        let lastTime = performance.now();

        const isLeft = (key: string) => key === "arrowleft" || key === "a";
        const isRight = (key: string) => key === "arrowright" || key === "d";
        const isUp = (key: string) => key === "arrowup" || key === "w";
        const isDown = (key: string) => key === "arrowdown" || key === "s";

        const resolveDebugSnapshot = () => {
            const bus = dataBus as unknown as {
                getState?: () => { playerId: string };
                getEntityBehaviorState?: (entityId: string) => unknown;
                getPlayerFacingDirection?: () => unknown;
                getPlayerMoveIntent?: () => unknown;
            };

            const playerId = bus.getState?.().playerId;

            return {
                currentBehaviorState: playerId
                    ? bus.getEntityBehaviorState?.(playerId)
                    : undefined,
                facingDirection: bus.getPlayerFacingDirection?.(),
                moveIntent: bus.getPlayerMoveIntent?.(),
            };
        };

        const tick = (now: number) => {
            const deltaMs = now - lastTime;
            lastTime = now;

            const { left, right, up, down } = inputStateRef.current;
            const dxInput = (right ? 1 : 0) + (left ? -1 : 0);
            const dyInput = (down ? 1 : 0) + (up ? -1 : 0);

            if (dxInput !== 0 || dyInput !== 0) {
                keyboardOwnsIntentRef.current = true;
                dataBus.setPlayerTopDownMoveInput(dxInput, dyInput);
            } else if (keyboardOwnsIntentRef.current) {
                keyboardOwnsIntentRef.current = false;
                dataBus.setPlayerTopDownMoveInput(0, 0);
            }

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

            if (event.repeat) {
                return;
            }

            if (isLeft(key) || isRight(key) || isUp(key) || isDown(key)) {
                const previousState = inputStateRef.current;
                inputStateRef.current = {
                    left: previousState.left || isLeft(key),
                    right: previousState.right || isRight(key),
                    up: previousState.up || isUp(key),
                    down: previousState.down || isDown(key),
                };

                const didChange =
                    previousState.left !== inputStateRef.current.left ||
                    previousState.right !== inputStateRef.current.right ||
                    previousState.up !== inputStateRef.current.up ||
                    previousState.down !== inputStateRef.current.down;

                if (!didChange) {
                    return;
                }

                const immediateDxInput =
                    (inputStateRef.current.right ? 1 : 0) +
                    (inputStateRef.current.left ? -1 : 0);
                const immediateDyInput =
                    (inputStateRef.current.down ? 1 : 0) +
                    (inputStateRef.current.up ? -1 : 0);

                keyboardOwnsIntentRef.current =
                    immediateDxInput !== 0 || immediateDyInput !== 0;
                dataBus.setPlayerTopDownMoveInput(
                    immediateDxInput,
                    immediateDyInput,
                );

                if (isDev) {
                    console.log("[TopDownKeyControl] keydown", {
                        key,
                        inputState: inputStateRef.current,
                        ...resolveDebugSnapshot(),
                    });
                }
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

                const immediateDxInput =
                    (inputStateRef.current.right ? 1 : 0) +
                    (inputStateRef.current.left ? -1 : 0);
                const immediateDyInput =
                    (inputStateRef.current.down ? 1 : 0) +
                    (inputStateRef.current.up ? -1 : 0);

                keyboardOwnsIntentRef.current =
                    immediateDxInput !== 0 || immediateDyInput !== 0;
                dataBus.setPlayerTopDownMoveInput(
                    immediateDxInput,
                    immediateDyInput,
                );

                if (isDev) {
                    console.log("[TopDownKeyControl] keyup", {
                        key,
                        inputState: inputStateRef.current,
                        ...resolveDebugSnapshot(),
                    });
                }
            }
        };

        window.addEventListener("keydown", onKeyDown, { passive: false });
        window.addEventListener("keyup", onKeyUp);
        rafId = requestAnimationFrame(tick);

        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            keyboardOwnsIntentRef.current = false;
            dataBus.setPlayerTopDownMoveInput(0, 0);
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
        };
    }, [allowDiagonal, enabled, isDev, onMove, speedPxPerSec]);

    useEffect(() => {
        const resetState = () => {
            inputStateRef.current = {
                left: false,
                right: false,
                up: false,
                down: false,
            };
            keyboardOwnsIntentRef.current = false;
            dataBus.setPlayerTopDownMoveInput(0, 0);
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
