import { createElement } from "react";
import CompassDirectionControl from "./compassDirectionControl";
import ScreenControlGroup from "./ScreenControlGroup";
import ScreenController from "./screenController";
import TopDownKeyControl from "./topDownKeyControl";
import TopDownOnScreenControl from "./topDownOnScreenControl";

export type TopDownControlsProps = {
    onMove?: () => void;
    allowDiagonal?: boolean;
    speedPxPerSec?: number;
};

const TopDownControls = ({
    onMove,
    allowDiagonal = true,
    speedPxPerSec = 220,
}: TopDownControlsProps) => {
    return createElement(
        ScreenController,
        { className: "snes-layout" },
        createElement(TopDownKeyControl, {
            onMove,
            allowDiagonal,
            speedPxPerSec,
        }),
        createElement(
            ScreenControlGroup,
            { className: "dpad-group" },
            createElement(TopDownOnScreenControl, {
                onMove,
                allowDiagonal,
                speedPxPerSec,
            }),
        ),
        createElement(
            ScreenControlGroup,
            { className: "face-button-group" },
            createElement(CompassDirectionControl),
        ),
    );
};

export default TopDownControls;
