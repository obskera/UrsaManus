import { createElement } from "react";
import ArrowKeyControl from "./arrowKeyControl";
import CompassDirectionControl from "./compassDirectionControl";
import OnScreenArrowControl from "./onScreenArrowControl";
import ScreenControlGroup from "./ScreenControlGroup";
import ScreenController from "./screenController";
import type { CreatePlayerInputActionsOptions } from "./inputActions";

export type SideScrollerControlsProps = {
    onMove?: () => void;
    interactBehavior?: CreatePlayerInputActionsOptions["interactBehavior"];
};

const SideScrollerControls = ({
    onMove,
    interactBehavior,
}: SideScrollerControlsProps) => {
    return createElement(
        ScreenController,
        { className: "snes-layout" },
        createElement(ArrowKeyControl, { onMove }),
        createElement(
            ScreenControlGroup,
            { className: "dpad-group" },
            createElement(OnScreenArrowControl, { onMove }),
        ),
        createElement(
            ScreenControlGroup,
            { className: "face-button-group" },
            createElement(CompassDirectionControl, {
                mode: "player-actions",
                onMove,
                interactBehavior,
            }),
        ),
    );
};

export default SideScrollerControls;
