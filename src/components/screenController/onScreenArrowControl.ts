import { createElement } from "react";
import { dataBus } from "../../services/DataBus";
import ScreenControl from "./ScreenControl";
import type { ScreenControllerChildProps } from "./screenController";

export interface OnScreenArrowControlProps extends ScreenControllerChildProps {
    onMove?: () => void;
}

const OnScreenArrowControl = ({ onMove }: OnScreenArrowControlProps) => {
    return createElement(
        "div",
        { className: "on-screen-arrow-control" },
        createElement(ScreenControl, {
            label: "↑",
            className: "direction-button north",
            onActivate: () => {
                dataBus.movePlayerUp();
                onMove?.();
            },
        }),
        createElement(ScreenControl, {
            label: "←",
            className: "direction-button west",
            onActivate: () => {
                dataBus.movePlayerLeft();
                onMove?.();
            },
        }),
        createElement(ScreenControl, {
            label: "→",
            className: "direction-button east",
            onActivate: () => {
                dataBus.movePlayerRight();
                onMove?.();
            },
        }),
        createElement(ScreenControl, {
            label: "↓",
            className: "direction-button south",
            onActivate: () => {
                dataBus.movePlayerDown();
                onMove?.();
            },
        }),
    );
};

export default OnScreenArrowControl;
