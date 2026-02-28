import { createElement } from "react";
import CompassActionControl from "./CompassActionControl";
import {
    createPlayerInputActions,
    type CreatePlayerInputActionsOptions,
} from "./inputActions";
import ScreenControl from "./ScreenControl";
import type { ScreenControllerChildProps } from "./screenController";

export type CompassDirectionControlMode = "log" | "player-actions";

export type CompassDirectionControlProps = ScreenControllerChildProps & {
    mode?: CompassDirectionControlMode;
    onMove?: () => void;
    onInteract?: () => void;
    interactBehavior?: CreatePlayerInputActionsOptions["interactBehavior"];
    className?: string;
};

const CompassDirectionControl = ({
    mode = "log",
    onMove,
    onInteract,
    interactBehavior,
    className,
}: CompassDirectionControlProps) => {
    if (mode === "player-actions") {
        return createElement(CompassActionControl, {
            className,
            actions: createPlayerInputActions({
                onChanged: onMove,
                onInteract,
                interactBehavior,
            }),
        });
    }

    const resolvedClassName = className
        ? `compass-direction-control ${className}`
        : "compass-direction-control";

    return createElement(
        "div",
        { className: resolvedClassName },
        createElement(ScreenControl, {
            label: "N",
            className: "compass-button north",
            onActivate: () => console.log("North"),
        }),
        createElement(ScreenControl, {
            label: "W",
            className: "compass-button west",
            onActivate: () => console.log("West"),
        }),
        createElement(ScreenControl, {
            label: "E",
            className: "compass-button east",
            onActivate: () => console.log("East"),
        }),
        createElement(ScreenControl, {
            label: "S",
            className: "compass-button south",
            onActivate: () => console.log("South"),
        }),
    );
};

export default CompassDirectionControl;
