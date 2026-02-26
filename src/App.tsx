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
    ParticleEmitterOverlay,
    ScreenTransitionOverlay,
    emitParticles,
    playScreenTransition,
    type TransitionCorner,
    type ScreenTransitionVariant,
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
        const transitionVariants: ScreenTransitionVariant[] = [
            "diagonal",
            "venetian-blinds",
            "mosaic-dissolve",
            "iris",
            "directional-push",
        ];
        const particleColors = [
            "#ffd166",
            "#ef476f",
            "#06d6a0",
            "#118ab2",
            "#f78c6b",
            "#c77dff",
        ];
        let transitionIndex = 0;

        const onKeyDown = (event: KeyboardEvent) => {
            const key = event.key.toLowerCase();
            if (event.repeat) return;

            if (key === "p") {
                const x = Math.random() * width;
                const y = Math.random() * height;
                const color =
                    particleColors[
                        Math.floor(Math.random() * particleColors.length)
                    ];

                emitParticles({
                    amount: 40,
                    location: { x, y },
                    direction: {
                        angleDeg: 270,
                        speed: 160,
                        spreadDeg: 360,
                        speedJitter: 80,
                    },
                    emissionShape: "point",
                    lifeMs: 700,
                    color,
                    size: 2,
                    sizeJitter: 1,
                    gravity: 120,
                    drag: 0.15,
                });
                return;
            }

            if (key !== "t") return;

            const from = corners[transitionIndex % corners.length];
            const variant =
                transitionVariants[transitionIndex % transitionVariants.length];
            transitionIndex += 1;

            const variantOptions =
                variant === "venetian-blinds"
                    ? { venetianOrientation: "horizontal" as const }
                    : variant === "mosaic-dissolve"
                      ? { mosaicSeed: transitionIndex }
                      : variant === "iris"
                        ? { irisOrigin: "center" as const }
                        : variant === "directional-push"
                          ? {
                                pushFrom: (
                                    ["left", "right", "top", "bottom"] as const
                                )[transitionIndex % 4],
                            }
                          : {};

            playScreenTransition({
                color: "black",
                from,
                variant,
                durationMs: 500,
                stepMs: 16,
                boxSize: 16,
                ...variantOptions,
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
