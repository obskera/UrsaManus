// src/App.tsx (dynamic: sync DataBus to Render props)
import { useEffect, useState } from "react";
import Render from "./components/Render/Render";
import {
    ArrowKeyControl,
    CompassDirectionControl,
    OnScreenArrowControl,
    ScreenControlGroup,
    ScreenController,
} from "./components/screenController";
import {
    ScreenTransitionOverlay,
    playScreenTransition,
    type TransitionCorner,
} from "./components/effects";
import { dataBus } from "./services/DataBus";
import "./App.css";

export default function App() {
    const [, force] = useState(0);
    const [hasProgress, setHasProgress] = useState(false);

    const width = 400;
    const height = 300;

    useEffect(() => {
        dataBus.setWorldSize(width, height);
        dataBus.setWorldBoundsEnabled(true);
        // dataBus.setPlayerCanPassWorldBounds(true);
        dataBus.setPlayerCanPassWorldBounds(false);
    }, [width, height]);

    useEffect(() => {
        if (!hasProgress) return;

        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = "";
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [hasProgress]);

    useEffect(() => {
        if (!import.meta.env.DEV) return;

        const corners: TransitionCorner[] = [
            "top-left",
            "top-right",
            "bottom-left",
            "bottom-right",
        ];
        let index = 0;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key.toLowerCase() !== "t" || event.repeat) return;

            const from = corners[index % corners.length];
            index += 1;

            playScreenTransition({
                color: "black",
                from,
                durationMs: 500,
                stepMs: 16,
                boxSize: 16,
            });
        };

        window.addEventListener("keydown", onKeyDown);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
        };
    }, []);

    const handleMove = () => {
        setHasProgress(true);
        force((n) => n + 1);
    };

    return (
        <div className="GameContainer">
            <div className="GameScreen">
                <Render
                    items={Object.values(dataBus.getState().entitiesById)}
                    width={width}
                    height={height}
                />
                <ScreenTransitionOverlay width={width} height={height} />
            </div>
            <ScreenController className="snes-layout">
                <ArrowKeyControl onMove={handleMove} />
                <ScreenControlGroup className="dpad-group">
                    <OnScreenArrowControl onMove={handleMove} />
                </ScreenControlGroup>
                <ScreenControlGroup className="face-button-group">
                    <CompassDirectionControl />
                </ScreenControlGroup>
            </ScreenController>
        </div>
    );
}
