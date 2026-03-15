import { createElement, useCallback } from "react";
import ScreenControlGroup from "./ScreenControlGroup";
import ScreenController from "./screenController";
import HjklKeyControl, { type HjklButtonKey } from "./hjklKeyControl";
import HjklOnScreenControl from "./hjklOnScreenControl";
import TopDownKeyControl from "./topDownKeyControl";
import TopDownOnScreenControl from "./topDownOnScreenControl";
import type { CreatePlayerInputActionsOptions } from "./inputActions";
import { TOP_DOWN_PLAYER_TUNING } from "@/config/playerTuning";
import { dataBus } from "@/services/DataBus";

export type TopDownControlsProps = {
    onMove?: () => void;
    allowDiagonal?: boolean;
    speedPxPerSec?: number;
    interactBehavior?: CreatePlayerInputActionsOptions["interactBehavior"];
    hjklButtons?: HjklButtonKey[];
};

const TopDownControls = ({
    onMove,
    allowDiagonal = true,
    speedPxPerSec = TOP_DOWN_PLAYER_TUNING.moveSpeedPxPerSec,
    hjklButtons = ["j", "k"],
}: TopDownControlsProps) => {
    const handleHjklPress = useCallback((key: HjklButtonKey) => {
        if (key === "j") {
            dataBus.playerAttack();
            return;
        }

        if (key === "k") {
            dataBus.playerSpecialAttack();
        }
    }, []);

    return createElement(
        ScreenController,
        { className: "snes-layout" },
        createElement(TopDownKeyControl, {
            onMove,
            allowDiagonal,
            speedPxPerSec,
        }),
        createElement(HjklKeyControl, {
            keys: hjklButtons,
            onPress: handleHjklPress,
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
            { className: "face-button-group hjkl-group" },
            createElement(HjklOnScreenControl, {
                keys: hjklButtons,
                onPress: handleHjklPress,
            }),
        ),
    );
};

export default TopDownControls;
