import { type RefObject, useEffect } from "react";
import Render from "@/components/Render/Render";
import {
    ParticleEmitterOverlay,
    ScreenTransitionOverlay,
} from "@/components/effects";
import type { CameraMode } from "@/config/gameViewConfig";
import { dataBus } from "@/services/DataBus";

export type SideScrollerCanvasProps = {
    width?: number;
    height?: number;
    worldWidth?: number;
    worldHeight?: number;
    cameraMode?: CameraMode;
    cameraClampToWorld?: boolean;
    manualCameraStartX?: number;
    manualCameraStartY?: number;
    containerRef?: RefObject<HTMLDivElement | null>;
    includeEffects?: boolean;
    showDebugOutlines?: boolean;
};

const SideScrollerCanvas = ({
    width = 400,
    height = 300,
    worldWidth = width,
    worldHeight = height,
    cameraMode = "follow-player",
    cameraClampToWorld = true,
    manualCameraStartX = 0,
    manualCameraStartY = 0,
    containerRef,
    includeEffects = true,
    showDebugOutlines = import.meta.env.DEV,
}: SideScrollerCanvasProps) => {
    useEffect(() => {
        dataBus.setWorldSize(worldWidth, worldHeight);
        dataBus.setCameraViewport(width, height);
        dataBus.setCameraClampToWorld(cameraClampToWorld);
        if (cameraMode === "follow-player") {
            dataBus.setCameraFollowPlayer(true);
        } else {
            dataBus.setCameraMode("manual");
            dataBus.setCameraPosition(manualCameraStartX, manualCameraStartY);
        }
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
    }, [
        cameraClampToWorld,
        cameraMode,
        height,
        manualCameraStartX,
        manualCameraStartY,
        width,
        worldHeight,
        worldWidth,
    ]);

    const state = dataBus.getState();

    return (
        <div className="GameScreen" ref={containerRef}>
            <Render
                items={Object.values(state.entitiesById)}
                width={width}
                height={height}
                cameraX={state.camera.x}
                cameraY={state.camera.y}
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
