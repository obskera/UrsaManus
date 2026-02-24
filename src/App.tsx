// src/App.tsx (dynamic: sync DataBus to Render props)
import { useEffect, useState } from "react";
import Render from "./components/Render/Render";
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

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (
                ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
                    e.key,
                )
            ) {
                e.preventDefault();
            }

            if (e.key === "ArrowRight") dataBus.movePlayerRight();
            if (e.key === "ArrowLeft") dataBus.movePlayerLeft();
            if (e.key === "ArrowUp") dataBus.movePlayerUp();
            if (e.key === "ArrowDown") dataBus.movePlayerDown();

            force((n) => n + 1);
        };

        window.addEventListener("keydown", onKeyDown, { passive: false });
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    return (
        <div className="GameContainer">
            <Render
                items={Object.values(dataBus.getState().entitiesById)}
                width={width}
                height={height}
            />
        </div>
    );
}
