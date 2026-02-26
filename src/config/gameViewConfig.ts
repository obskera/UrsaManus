export type CameraMode = "follow-player" | "manual";

export type GameViewConfig = {
    canvas: {
        width: number;
        height: number;
    };
    world: {
        width: number;
        height: number;
    };
    camera: {
        mode: CameraMode;
        clampToWorld: boolean;
        manualStart: {
            x: number;
            y: number;
        };
        panStepPx: number;
        fastPanMultiplier: number;
    };
};

export const GAME_VIEW_CONFIG: GameViewConfig = {
    canvas: {
        width: 400,
        height: 300,
    },
    world: {
        width: 500,
        height: 500,
    },
    camera: {
        mode: "follow-player",
        clampToWorld: true,
        manualStart: {
            x: 0,
            y: 0,
        },
        panStepPx: 24,
        fastPanMultiplier: 3,
    },
};
