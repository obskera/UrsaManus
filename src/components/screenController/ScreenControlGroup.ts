import { createElement, type ReactNode } from "react";
import type { ScreenControllerChildProps } from "./screenController";

export interface ScreenControlGroupProps extends ScreenControllerChildProps {
    title?: string;
    className?: string;
    children?: ReactNode;
}

const ScreenControlGroup = ({
    id,
    title,
    className,
    children,
}: ScreenControlGroupProps) => {
    const resolvedClassName = className
        ? `screen-control-group ${className}`
        : "screen-control-group";

    return createElement(
        "section",
        { id, className: resolvedClassName },
        title
            ? createElement(
                  "h3",
                  { className: "screen-control-group-title" },
                  title,
              )
            : null,
        createElement(
            "div",
            { className: "screen-control-group-content" },
            children,
        ),
    );
};

export default ScreenControlGroup;
