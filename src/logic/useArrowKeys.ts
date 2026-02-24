import { useEffect } from "react";

export type ArrowDirection = "up" | "down" | "left" | "right";

type Options = {
    onDirection: (direction: ArrowDirection) => void;
    preventDefault?: boolean;
    enabled?: boolean;
};

export default function useArrowKeys({
    onDirection,
    preventDefault = true,
    enabled = true,
}: Options) {
    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (!enabled) return;

            if (
                preventDefault &&
                (event.key === "ArrowUp" ||
                    event.key === "ArrowDown" ||
                    event.key === "ArrowLeft" ||
                    event.key === "ArrowRight")
            ) {
                event.preventDefault();
            }

            switch (event.key) {
                case "ArrowUp":
                    onDirection("up");
                    break;
                case "ArrowDown":
                    onDirection("down");
                    break;
                case "ArrowLeft":
                    onDirection("left");
                    break;
                case "ArrowRight":
                    onDirection("right");
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onDirection, preventDefault, enabled]);
}
