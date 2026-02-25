import { createElement, type ReactElement } from "react";
import "./screenController.css";

export interface ScreenControllerChildProps {
    id?: string;
}

export interface ScreenControlProps extends ScreenControllerChildProps {
    label: string;
    disabled?: boolean;
    onActivate?: () => void;
    className?: string;
}

export type ScreenControllerChild =
    | ReactElement<ScreenControllerChildProps>
    | ReactElement<ScreenControllerChildProps>[]
    | null;

export interface ScreenControllerProps {
    children?: ScreenControllerChild;
    className?: string;
}

const ScreenController = ({ children, className }: ScreenControllerProps) => {
    const resolvedClassName = className
        ? `screen-controller ${className}`
        : "screen-controller";

    return createElement("div", { className: resolvedClassName }, children);
};

export default ScreenController;
