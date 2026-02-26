import { createElement, useEffect, useState } from "react";
import { dataBus } from "../../services/DataBus";
import ScreenControl from "./ScreenControl";
import type { ScreenControllerChildProps } from "./screenController";

export interface OnScreenArrowControlProps extends ScreenControllerChildProps {
    onMove?: () => void;
}

const OnScreenArrowControl = ({ onMove }: OnScreenArrowControlProps) => {
    const [heldDirection, setHeldDirection] = useState<
        "north" | "south" | "east" | "west" | null
    >(null);

    useEffect(() => {
        const resetMoveInput = () => {
            dataBus.setPlayerMoveInput(0);
            setHeldDirection(null);
        };
        const onVisibilityChange = () => {
            if (document.visibilityState === "hidden") {
                resetMoveInput();
            }
        };

        window.addEventListener("blur", resetMoveInput);
        document.addEventListener("visibilitychange", onVisibilityChange);

        return () => {
            resetMoveInput();
            window.removeEventListener("blur", resetMoveInput);
            document.removeEventListener(
                "visibilitychange",
                onVisibilityChange,
            );
        };
    }, []);

    return createElement(
        "div",
        { className: "on-screen-arrow-control" },
        createElement(ScreenControl, {
            label: "↑",
            className:
                heldDirection === "north"
                    ? "direction-button north is-held"
                    : "direction-button north",
            onPressStart: () => setHeldDirection("north"),
            onPressEnd: () => setHeldDirection(null),
            onActivate: () => {
                if (dataBus.isPlayerGravityActive()) {
                    dataBus.requestPlayerJump();
                } else {
                    dataBus.movePlayerUp();
                }
                onMove?.();
            },
        }),
        createElement(ScreenControl, {
            label: "←",
            className:
                heldDirection === "west"
                    ? "direction-button west is-held"
                    : "direction-button west",
            onPressStart: () => {
                setHeldDirection("west");
                dataBus.setPlayerMoveInput(-1);
                onMove?.();
            },
            onPressEnd: () => {
                setHeldDirection(null);
                dataBus.setPlayerMoveInput(0);
            },
        }),
        createElement(ScreenControl, {
            label: "→",
            className:
                heldDirection === "east"
                    ? "direction-button east is-held"
                    : "direction-button east",
            onPressStart: () => {
                setHeldDirection("east");
                dataBus.setPlayerMoveInput(1);
                onMove?.();
            },
            onPressEnd: () => {
                setHeldDirection(null);
                dataBus.setPlayerMoveInput(0);
            },
        }),
        createElement(ScreenControl, {
            label: "↓",
            className:
                heldDirection === "south"
                    ? "direction-button south is-held"
                    : "direction-button south",
            onPressStart: () => setHeldDirection("south"),
            onPressEnd: () => setHeldDirection(null),
            onActivate: () => {
                dataBus.movePlayerDown();
                onMove?.();
            },
        }),
    );
};

export default OnScreenArrowControl;
