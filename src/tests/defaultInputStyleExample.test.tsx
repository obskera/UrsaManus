import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DefaultInputStyleExample from "@/components/examples/DefaultInputStyleExample";

const dataBusMocks = vi.hoisted(() => {
    return {
        isPlayerGravityActive: vi.fn(() => false),
        requestPlayerJump: vi.fn(),
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
            movePlayerUp: dataBusMocks.movePlayerUp,
            movePlayerDown: dataBusMocks.movePlayerDown,
            movePlayerLeft: dataBusMocks.movePlayerLeft,
            movePlayerRight: dataBusMocks.movePlayerRight,
        },
    };
});

describe("DefaultInputStyleExample", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        dataBusMocks.isPlayerGravityActive.mockReturnValue(false);
    });

    it("renders and maps keyboard + compass actions", () => {
        const onChanged = vi.fn();

        render(<DefaultInputStyleExample onChanged={onChanged} />);

        fireEvent.keyDown(window, { key: "w" });
        fireEvent.click(screen.getByRole("button", { name: "N" }));
        fireEvent.click(screen.getByRole("button", { name: "Interact" }));

        expect(dataBusMocks.movePlayerUp).toHaveBeenCalledTimes(2);
        expect(onChanged).toHaveBeenCalled();
    });
});
