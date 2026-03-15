import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SideScrollerCanvas from "@/components/gameModes/SideScrollerCanvas";
import TopDownCanvas from "@/components/gameModes/TopDownCanvas";

const dataBusMocks = vi.hoisted(() => {
    return {
        setWorldSize: vi.fn(),
        setCameraViewport: vi.fn(),
        setCameraClampToWorld: vi.fn(),
        setCameraMode: vi.fn(),
        setCameraPosition: vi.fn(),
        setCameraFollowPlayer: vi.fn(),
        setWorldBoundsEnabled: vi.fn(),
        setPlayerCanPassWorldBounds: vi.fn(),
        startEnemySpawning: vi.fn(),
        stopEnemySpawning: vi.fn(),
        isPlayerHurtFlashing: vi.fn(() => false),
        getEnemySpawnWave: vi.fn(() => 1),
        getPlayerSpecialCooldownRemainingMs: vi.fn(() => 0),
        setPlayerMovementConfig: vi.fn(),
        setPlayerJumpAssistConfig: vi.fn(),
        enablePlayerGravity: vi.fn(),
        disablePlayerPhysics: vi.fn(),
        setPlayerMoveInput: vi.fn(),
        getState: vi.fn(() => ({
            playerId: "player-1",
            entitiesById: {
                "player-1": {
                    spriteSize: 16,
                    scaler: 5,
                },
            },
            worldSize: {
                width: 320,
                height: 240,
            },
            playerScore: 0,
            camera: { x: 0, y: 0 },
        })),
    };
});

const audioBusMocks = vi.hoisted(() => {
    return {
        play: vi.fn(),
        stop: vi.fn(),
    };
});

const renderMocks = vi.hoisted(() => {
    return {
        render: vi.fn(() => null),
    };
});

vi.mock("@/services/DataBus", () => {
    return {
        dataBus: {
            ...dataBusMocks,
        },
    };
});

vi.mock("@/services/audioBus", () => {
    return {
        audioBus: {
            ...audioBusMocks,
        },
    };
});

vi.mock("@/components/gameModes/SoundManager", () => {
    return {
        default: () => null,
    };
});

vi.mock("@/components/Render/Render", () => {
    return {
        default: renderMocks.render,
    };
});

describe("game mode canvas presets", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("configures side scroller mode with gravity", () => {
        render(<SideScrollerCanvas width={320} height={240} />);

        expect(dataBusMocks.setWorldSize).toHaveBeenCalledWith(320, 240);
        expect(dataBusMocks.setCameraViewport).toHaveBeenCalledWith(320, 240);
        expect(dataBusMocks.setCameraFollowPlayer).toHaveBeenCalledWith(true);
        expect(dataBusMocks.enablePlayerGravity).toHaveBeenCalled();
        expect(dataBusMocks.setPlayerMovementConfig).toHaveBeenCalled();
        expect(audioBusMocks.play).toHaveBeenCalledWith(
            "scene:side-scroller:music",
            expect.objectContaining({ channel: "music", loop: true }),
        );
        expect(renderMocks.render).toHaveBeenCalledWith(
            expect.objectContaining({
                includeEffects: true,
                enableTransitionEffects: true,
            }),
            undefined,
        );
    });

    it("configures top down mode without gravity", () => {
        render(<TopDownCanvas width={320} height={240} />);

        expect(dataBusMocks.setWorldSize).toHaveBeenCalledWith(320, 240);
        expect(dataBusMocks.setCameraViewport).toHaveBeenCalledWith(320, 240);
        expect(dataBusMocks.setCameraFollowPlayer).toHaveBeenCalledWith(true);
        expect(dataBusMocks.disablePlayerPhysics).toHaveBeenCalled();
        expect(dataBusMocks.setPlayerMoveInput).toHaveBeenCalledWith(0);
        expect(renderMocks.render).toHaveBeenCalledWith(
            expect.objectContaining({
                includeEffects: true,
                enableTransitionEffects: true,
            }),
            undefined,
        );
    });

    it("passes includeEffects=false to Render when disabled", () => {
        render(
            <SideScrollerCanvas
                width={320}
                height={240}
                includeEffects={false}
            />,
        );

        expect(renderMocks.render).toHaveBeenCalledWith(
            expect.objectContaining({
                includeEffects: false,
                enableTransitionEffects: true,
            }),
            undefined,
        );
    });
});
