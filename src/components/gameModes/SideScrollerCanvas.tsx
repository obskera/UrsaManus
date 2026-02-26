import { type RefObject, useEffect } from "react";
import Render from "@/components/Render/Render";
import {
    ParticleEmitterOverlay,
    ScreenTransitionOverlay,
} from "@/components/effects";
import { dataBus } from "@/services/DataBus";

export type SideScrollerCanvasProps = {
    width?: number;
    height?: number;
    containerRef?: RefObject<HTMLDivElement | null>;
    includeEffects?: boolean;
    showDebugOutlines?: boolean;
};

const SideScrollerCanvas = ({
    width = 400,
    height = 300,
    containerRef,
    includeEffects = true,
    showDebugOutlines = import.meta.env.DEV,
}: SideScrollerCanvasProps) => {
    useEffect(() => {
        dataBus.setWorldSize(width, height);
        dataBus.setWorldBoundsEnabled(true);
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

export default SideScrollerCanvas;
