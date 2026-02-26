import { createElement } from "react";
import ScreenControl from "./ScreenControl";
import type { ScreenControllerChildProps } from "./screenController";
import type { InputActionMap } from "./inputActions";

export type CompassActionControlProps = ScreenControllerChildProps & {
    actions: Pick<InputActionMap, "north" | "south" | "east" | "west">;
    className?: string;
};

const CompassActionControl = ({
    actions,
    className,
}: CompassActionControlProps) => {
    const resolvedClassName = className
        ? `compass-direction-control ${className}`
        : "compass-direction-control";

    return createElement(
        "div",
        { className: resolvedClassName },
        createElement(ScreenControl, {
            label: "N",
            className: "compass-button north",
            onActivate: actions.north,
        }),
        createElement(ScreenControl, {
            label: "W",
            className: "compass-button west",
            onActivate: actions.west,
        }),
        createElement(ScreenControl, {
            label: "E",
            className: "compass-button east",
            onActivate: actions.east,
        }),
        createElement(ScreenControl, {
            label: "S",
            className: "compass-button south",
            onActivate: actions.south,
        }),
    );
};

export default CompassActionControl;
