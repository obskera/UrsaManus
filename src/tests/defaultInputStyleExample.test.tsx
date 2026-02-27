import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DefaultInputStyleExample from "@/components/examples/DefaultInputStyleExample";
import { signalBus } from "@/services/signalBus";
import { POINTER_TAP_SIGNAL } from "@/components/screenController";

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
        const emitSpy = vi.spyOn(signalBus, "emit");

        render(<DefaultInputStyleExample onChanged={onChanged} />);

        const trackingArea = screen.getByLabelText("Pointer tracking area");
        vi.spyOn(trackingArea, "getBoundingClientRect").mockReturnValue({
            x: 10,
            y: 20,
            width: 100,
            height: 80,
            top: 20,
            right: 110,
            bottom: 100,
            left: 10,
            toJSON: () => ({}),
        });

        fireEvent.keyDown(window, { key: "w" });
        fireEvent.click(screen.getByRole("button", { name: "N" }));
        fireEvent.click(screen.getByRole("button", { name: "Interact" }));
        fireEvent.pointerUp(window, {
            clientX: 30,
            clientY: 40,
            pointerType: "touch",
        });

        expect(screen.getByRole("status")).toHaveTextContent(
            "Tap: 30, 40 · Local: 20, 20 · Inside: yes",
        );

        fireEvent.pointerUp(window, {
            clientX: 200,
            clientY: 200,
            pointerType: "mouse",
        });

        expect(screen.getByRole("status")).toHaveTextContent("Inside: no");

        expect(dataBusMocks.movePlayerUp).toHaveBeenCalledTimes(2);
        expect(onChanged).toHaveBeenCalled();
        expect(emitSpy).toHaveBeenCalledWith(
            POINTER_TAP_SIGNAL,
            expect.objectContaining({
                clientX: 30,
                clientY: 40,
                localX: 20,
                localY: 20,
                insideTarget: true,
                pointerType: "touch",
            }),
        );
        expect(emitSpy).toHaveBeenCalledWith(
            POINTER_TAP_SIGNAL,
            expect.objectContaining({
                clientX: 200,
                clientY: 200,
                insideTarget: false,
                pointerType: "mouse",
            }),
        );

        emitSpy.mockRestore();
    });
});
