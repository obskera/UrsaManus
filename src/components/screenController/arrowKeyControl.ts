import { useEffect, useRef } from "react";
import { dataBus } from "../../services/DataBus";
import type { ScreenControllerChildProps } from "./screenController";

export interface ArrowKeyControlProps extends ScreenControllerChildProps {
    enabled?: boolean;
    onMove?: () => void;
}

const ArrowKeyControl = ({ enabled = true, onMove }: ArrowKeyControlProps) => {
    const onMoveRef = useRef(onMove);

    useEffect(() => {
        onMoveRef.current = onMove;
    }, [onMove]);

    useEffect(() => {
        if (!enabled) return;

        let isLeftPressed = false;
        let isRightPressed = false;

        const updateMoveIntent = () => {
            const inputX = (isRightPressed ? 1 : 0) + (isLeftPressed ? -1 : 0);
            dataBus.setPlayerMoveInput(inputX);
        };

        const isLeftKey = (key: string) => key === "arrowleft" || key === "a";
        const isRightKey = (key: string) => key === "arrowright" || key === "d";
        const isUpKey = (key: string) => key === "arrowup" || key === "w";
        const isDownKey = (key: string) => key === "arrowdown" || key === "s";

        const onKeyDown = (event: KeyboardEvent) => {
            const key = event.key.toLowerCase();
            const isJumpKey = event.code === "Space" || key === " ";
            if (
                [
                    "arrowup",
                    "arrowdown",
                    "arrowleft",
                    "arrowright",
                    "w",
                    "a",
                    "s",
                    "d",
                ].includes(key) ||
                isJumpKey
            ) {
                event.preventDefault();
            }

            if (isRightKey(key)) {
                isRightPressed = true;
                updateMoveIntent();
            }
            if (isLeftKey(key)) {
                isLeftPressed = true;
                updateMoveIntent();
            }
            if (isUpKey(key)) {
                if (dataBus.isPlayerGravityActive()) {
                    dataBus.requestPlayerJump();
                } else {
                    dataBus.movePlayerUp();
                }
            }
            if (isDownKey(key)) dataBus.movePlayerDown();
            if (isJumpKey) dataBus.requestPlayerJump();

            if (
                isUpKey(key) ||
                isDownKey(key) ||
                isLeftKey(key) ||
                isRightKey(key) ||
                isJumpKey
            ) {
                onMoveRef.current?.();
            }
        };

        const onKeyUp = (event: KeyboardEvent) => {
            const key = event.key.toLowerCase();
            let changedIntent = false;

            if (isRightKey(key)) {
                isRightPressed = false;
                changedIntent = true;
            }

            if (isLeftKey(key)) {
                isLeftPressed = false;
                changedIntent = true;
            }

            if (changedIntent) {
                updateMoveIntent();
            }
        };

        const resetInputState = () => {
            isLeftPressed = false;
            isRightPressed = false;
            dataBus.setPlayerMoveInput(0);
        };

        const onWindowBlur = () => {
            resetInputState();
        };

        const onVisibilityChange = () => {
            if (document.visibilityState === "hidden") {
                resetInputState();
            }
        };

        window.addEventListener("keydown", onKeyDown, { passive: false });
        window.addEventListener("keyup", onKeyUp);
        window.addEventListener("blur", onWindowBlur);
        document.addEventListener("visibilitychange", onVisibilityChange);

        return () => {
            resetInputState();
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
            window.removeEventListener("blur", onWindowBlur);
            document.removeEventListener(
                "visibilitychange",
                onVisibilityChange,
            );
        };
    }, [enabled]);

    return null;
};

export default ArrowKeyControl;
