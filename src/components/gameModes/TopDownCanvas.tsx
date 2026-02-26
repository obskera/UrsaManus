import { type RefObject, useEffect } from "react";
import Render from "@/components/Render/Render";
import {
    ParticleEmitterOverlay,
    ScreenTransitionOverlay,
} from "@/components/effects";
import { dataBus } from "@/services/DataBus";

export type TopDownCanvasProps = {
    width?: number;
    height?: number;
    containerRef?: RefObject<HTMLDivElement | null>;
    includeEffects?: boolean;
    showDebugOutlines?: boolean;
};

const TopDownCanvas = ({
    width = 400,
    height = 300,
    containerRef,
    includeEffects = true,
    showDebugOutlines = import.meta.env.DEV,
}: TopDownCanvasProps) => {
    useEffect(() => {
        dataBus.setWorldSize(width, height);
        dataBus.setWorldBoundsEnabled(true);
        dataBus.setPlayerCanPassWorldBounds(false);
        dataBus.disablePlayerPhysics();
        dataBus.setPlayerMoveInput(0);
    }, [height, width]);

    return (
        <div className="GameScreen" ref={containerRef}>
            <Render
                items={Object.values(dataBus.getState().entitiesById)}
                width={width}
                height={height}
                showDebugOutlines={showDebugOutlines}
            />
            {includeEffects ? (
                <>
                    <ParticleEmitterOverlay width={width} height={height} />
                    <ScreenTransitionOverlay width={width} height={height} />
                </>
            ) : null}
        </div>
    );
};

export default TopDownCanvas;
