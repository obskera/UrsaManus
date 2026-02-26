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
        setPlayerMovementConfig: vi.fn(),
        setPlayerJumpAssistConfig: vi.fn(),
        enablePlayerGravity: vi.fn(),
        disablePlayerPhysics: vi.fn(),
        setPlayerMoveInput: vi.fn(),
        getState: vi.fn(() => ({
            entitiesById: {},
            camera: { x: 0, y: 0 },
        })),
    };
});

vi.mock("@/services/DataBus", () => {
    return {
        dataBus: {
            ...dataBusMocks,
        },
    };
});

vi.mock("@/components/Render/Render", () => {
    return {
        default: () => null,
    };
});

vi.mock("@/components/effects", () => {
    return {
        ParticleEmitterOverlay: () => null,
        ScreenTransitionOverlay: () => null,
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
    });

    it("configures top down mode without gravity", () => {
        render(<TopDownCanvas width={320} height={240} />);

        expect(dataBusMocks.setWorldSize).toHaveBeenCalledWith(320, 240);
        expect(dataBusMocks.setCameraViewport).toHaveBeenCalledWith(320, 240);
        expect(dataBusMocks.setCameraFollowPlayer).toHaveBeenCalledWith(true);
        expect(dataBusMocks.disablePlayerPhysics).toHaveBeenCalled();
        expect(dataBusMocks.setPlayerMoveInput).toHaveBeenCalledWith(0);
    });
});
