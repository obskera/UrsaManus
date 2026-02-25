import { useEffect } from "react";
import { dataBus } from "../../services/DataBus";
import type { ScreenControllerChildProps } from "./screenController";

export interface ArrowKeyControlProps extends ScreenControllerChildProps {
    enabled?: boolean;
    onMove?: () => void;
}

const ArrowKeyControl = ({ enabled = true, onMove }: ArrowKeyControlProps) => {
    useEffect(() => {
        if (!enabled) return;

        const onKeyDown = (event: KeyboardEvent) => {
            const key = event.key.toLowerCase();
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
                ].includes(key)
            ) {
                event.preventDefault();
            }

            if (key === "arrowright" || key === "d") dataBus.movePlayerRight();
            if (key === "arrowleft" || key === "a") dataBus.movePlayerLeft();
            if (key === "arrowup" || key === "w") dataBus.movePlayerUp();
            if (key === "arrowdown" || key === "s") dataBus.movePlayerDown();

            if (
                key === "arrowup" ||
                key === "arrowdown" ||
                key === "arrowleft" ||
                key === "arrowright" ||
                key === "w" ||
                key === "a" ||
                key === "s" ||
                key === "d"
            ) {
                onMove?.();
            }
        };

        window.addEventListener("keydown", onKeyDown, { passive: false });
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [enabled, onMove]);

    return null;
};

export default ArrowKeyControl;
