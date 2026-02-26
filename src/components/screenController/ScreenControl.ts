import { createElement } from "react";
import type { ScreenControlProps } from "./screenController";

const ScreenControl = ({
    id,
    label,
    disabled = false,
    onActivate,
    onPressStart,
    onPressEnd,
    className,
}: ScreenControlProps) => {
    return createElement(
        "button",
        {
            id,
            className: className
                ? `screen-control ${className}`
                : "screen-control",
            disabled,
            onClick: onActivate,
            onPointerDown: onPressStart,
            onPointerUp: onPressEnd,
            onPointerCancel: onPressEnd,
            onPointerLeave: onPressEnd,
            onMouseUp: (event) => event.currentTarget.blur(),
            onTouchEnd: (event) => event.currentTarget.blur(),
            type: "button",
        },
        label,
    );
};

export default ScreenControl;
