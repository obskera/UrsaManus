import { createElement } from "react";
import ScreenControl from "./ScreenControl";

const CompassDirectionControl = () => {
    return createElement(
        "div",
        { className: "compass-direction-control" },
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
