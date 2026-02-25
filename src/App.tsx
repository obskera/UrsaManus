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
import { dataBus } from "./services/DataBus";
import "./App.css";

export default function App() {
    const [, force] = useState(0);

    const width = 400;
    const height = 300;

    useEffect(() => {
        dataBus.setWorldSize(width, height);
        dataBus.setWorldBoundsEnabled(true);
        // dataBus.setPlayerCanPassWorldBounds(true);
        dataBus.setPlayerCanPassWorldBounds(false);
    }, [width, height]);

    return (
        <div className="GameContainer">
            <div className="GameScreen">
                <Render
                    items={Object.values(dataBus.getState().entitiesById)}
                    width={width}
                    height={height}
                />
            </div>
            <ScreenController className="snes-layout">
                <ArrowKeyControl onMove={() => force((n) => n + 1)} />
                <ScreenControlGroup className="dpad-group">
                    <OnScreenArrowControl onMove={() => force((n) => n + 1)} />
                </ScreenControlGroup>
                <ScreenControlGroup className="face-button-group">
                    <CompassDirectionControl />
                </ScreenControlGroup>
            </ScreenController>
        </div>
    );
}
