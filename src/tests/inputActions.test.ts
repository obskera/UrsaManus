import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPlayerInputActions } from "@/components/screenController/inputActions";

const dataBusMocks = vi.hoisted(() => {
    return {
        isPlayerGravityActive: vi.fn(() => false),
        requestPlayerJump: vi.fn(),
        markPlayerAttacking: vi.fn(),
        markPlayerDodging: vi.fn(),
        movePlayerUp: vi.fn(),
        movePlayerDown: vi.fn(),
        movePlayerLeft: vi.fn(),
        movePlayerRight: vi.fn(),
    };
});

vi.mock("@/services/DataBus", () => {
    return {
        dataBus: {
            isPlayerGravityActive: dataBusMocks.isPlayerGravityActive,
            requestPlayerJump: dataBusMocks.requestPlayerJump,
            markPlayerAttacking: dataBusMocks.markPlayerAttacking,
            markPlayerDodging: dataBusMocks.markPlayerDodging,
            movePlayerUp: dataBusMocks.movePlayerUp,
            movePlayerDown: dataBusMocks.movePlayerDown,
            movePlayerLeft: dataBusMocks.movePlayerLeft,
            movePlayerRight: dataBusMocks.movePlayerRight,
        },
    };
});

describe("createPlayerInputActions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        dataBusMocks.isPlayerGravityActive.mockReturnValue(false);
    });

    it("maps cardinal actions to player movement", () => {
        const onChanged = vi.fn();
        const actions = createPlayerInputActions({ onChanged });

        actions.north();
        actions.south();
        actions.east();
        actions.west();

        expect(dataBusMocks.movePlayerUp).toHaveBeenCalledTimes(1);
        expect(dataBusMocks.movePlayerDown).toHaveBeenCalledTimes(1);
        expect(dataBusMocks.movePlayerRight).toHaveBeenCalledTimes(1);
        expect(dataBusMocks.movePlayerLeft).toHaveBeenCalledTimes(1);
        expect(onChanged).toHaveBeenCalledTimes(4);
    });

    it("uses jump request for north action when gravity is active", () => {
        dataBusMocks.isPlayerGravityActive.mockReturnValue(true);
        const actions = createPlayerInputActions();

        actions.north();

        expect(dataBusMocks.requestPlayerJump).toHaveBeenCalledTimes(1);
        expect(dataBusMocks.movePlayerUp).not.toHaveBeenCalled();
    });

    it("calls interact callback and change callback", () => {
        const onChanged = vi.fn();
        const onInteract = vi.fn();
        const actions = createPlayerInputActions({ onChanged, onInteract });

        actions.interact();

        expect(dataBusMocks.markPlayerAttacking).toHaveBeenCalledTimes(1);
        expect(onInteract).toHaveBeenCalledTimes(1);
        expect(onChanged).toHaveBeenCalledTimes(1);
    });

    it("can map interact action to dodge for quick testing", () => {
        const actions = createPlayerInputActions({
            interactBehavior: "dodge",
        });

        actions.interact();

        expect(dataBusMocks.markPlayerDodging).toHaveBeenCalledTimes(1);
        expect(dataBusMocks.markPlayerAttacking).not.toHaveBeenCalled();
    });
});
