// src/App.tsx (dynamic: sync DataBus to Render props)
import { useCallback, useEffect, useRef, useState } from "react";
import Render from "./components/Render/Render";
import {
    ArrowKeyControl,
    CompassDirectionControl,
    OnScreenArrowControl,
    ScreenControlGroup,
    ScreenController,
} from "./components/screenController";
import {
    ParticleEmitterOverlay,
    ScreenTransitionOverlay,
} from "./components/effects";
import { setupDevEffectHotkeys } from "./components/effects/dev";
import { dataBus } from "./services/DataBus";
import "./App.css";

export default function App() {
    const [, force] = useState(0);
    const [hasProgress, setHasProgress] = useState(false);
    const gameScreenRef = useRef<HTMLDivElement | null>(null);

    const width = 400;
    const height = 300;

    useEffect(() => {
        dataBus.setWorldSize(width, height);
        dataBus.setWorldBoundsEnabled(true);
        // dataBus.setPlayerCanPassWorldBounds(true);
        dataBus.setPlayerCanPassWorldBounds(false);
        dataBus.setPlayerMovementConfig({
            maxSpeedX: 240,
            groundAcceleration: 2200,
            airAcceleration: 1300,
            groundDeceleration: 2600,
            airDeceleration: 800,
            jumpVelocity: 560,
        });
        dataBus.setPlayerJumpAssistConfig({
            coyoteTimeMs: 130,
            jumpBufferMs: 130,
            groundProbeDistance: 2,
        });
        dataBus.enablePlayerGravity({
            gravityScale: 1,
            velocity: { x: 0, y: 0 },
            dragX: 0,
        });
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
        return setupDevEffectHotkeys({
            enabled: import.meta.env.DEV,
            width,
            height,
            getContainer: () => gameScreenRef.current,
        });
    }, [height, width]);

    useEffect(() => {
        let rafId = 0;
        let lastFrame = performance.now();

        const tick = (now: number) => {
            const deltaMs = now - lastFrame;
            lastFrame = now;

            const didUpdate = dataBus.stepPhysics(deltaMs);
            if (didUpdate) {
                setHasProgress(true);
                force((n) => n + 1);
            }

            rafId = requestAnimationFrame(tick);
        };

        rafId = requestAnimationFrame(tick);

        return () => {
            if (rafId) {
                cancelAnimationFrame(rafId);
            }
        };
    }, []);

    const handleMove = useCallback(() => {
        setHasProgress(true);
        force((n) => n + 1);
    }, []);

    return (
        <div className="GameContainer">
            <div className="GameScreen" ref={gameScreenRef}>
                <Render
                    items={Object.values(dataBus.getState().entitiesById)}
                    width={width}
                    height={height}
                />
                <ParticleEmitterOverlay width={width} height={height} />
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
