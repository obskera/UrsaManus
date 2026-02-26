import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ArrowKeyControl from "../components/screenController/arrowKeyControl";
import CompassDirectionControl from "../components/screenController/compassDirectionControl";
import OnScreenArrowControl from "../components/screenController/onScreenArrowControl";

const dataBusMocks = vi.hoisted(() => {
    return {
        movePlayerUp: vi.fn(),
        movePlayerDown: vi.fn(),
        movePlayerLeft: vi.fn(),
        movePlayerRight: vi.fn(),
        requestPlayerJump: vi.fn(),
        setPlayerMoveInput: vi.fn(),
        isPlayerGravityActive: vi.fn(() => false),
    };
});

vi.mock("../services/DataBus", () => {
    return {
        dataBus: {
            movePlayerUp: dataBusMocks.movePlayerUp,
            movePlayerDown: dataBusMocks.movePlayerDown,
            movePlayerLeft: dataBusMocks.movePlayerLeft,
            movePlayerRight: dataBusMocks.movePlayerRight,
            requestPlayerJump: dataBusMocks.requestPlayerJump,
            setPlayerMoveInput: dataBusMocks.setPlayerMoveInput,
            isPlayerGravityActive: dataBusMocks.isPlayerGravityActive,
        },
    };
});

describe("screenController behavior", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        dataBusMocks.isPlayerGravityActive.mockReturnValue(false);
    });

    it("logs compass directions when compass buttons are clicked", () => {
        const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

        render(<CompassDirectionControl />);

        fireEvent.click(screen.getByRole("button", { name: "N" }));
        fireEvent.click(screen.getByRole("button", { name: "S" }));
        fireEvent.click(screen.getByRole("button", { name: "E" }));
        fireEvent.click(screen.getByRole("button", { name: "W" }));

        expect(logSpy).toHaveBeenNthCalledWith(1, "North");
        expect(logSpy).toHaveBeenNthCalledWith(2, "South");
        expect(logSpy).toHaveBeenNthCalledWith(3, "East");
        expect(logSpy).toHaveBeenNthCalledWith(4, "West");

        logSpy.mockRestore();
    });

    it("maps compass directions to player actions in player-actions mode", () => {
        const onMove = vi.fn();

        render(
            <CompassDirectionControl mode="player-actions" onMove={onMove} />,
        );

        fireEvent.click(screen.getByRole("button", { name: "N" }));
        fireEvent.click(screen.getByRole("button", { name: "S" }));
        fireEvent.click(screen.getByRole("button", { name: "E" }));
        fireEvent.click(screen.getByRole("button", { name: "W" }));

        expect(dataBusMocks.movePlayerUp).toHaveBeenCalledTimes(1);
        expect(dataBusMocks.movePlayerDown).toHaveBeenCalledTimes(1);
        expect(dataBusMocks.movePlayerRight).toHaveBeenCalledTimes(1);
        expect(dataBusMocks.movePlayerLeft).toHaveBeenCalledTimes(1);
        expect(onMove).toHaveBeenCalledTimes(4);
    });

    it("uses hold intent for on-screen left/right and click for up/down", () => {
        const onMove = vi.fn();

        render(<OnScreenArrowControl onMove={onMove} />);

        fireEvent.click(screen.getByRole("button", { name: "↑" }));
        fireEvent.click(screen.getByRole("button", { name: "↓" }));
        fireEvent.pointerDown(screen.getByRole("button", { name: "←" }));
        fireEvent.pointerUp(screen.getByRole("button", { name: "←" }));
        fireEvent.pointerDown(screen.getByRole("button", { name: "→" }));
        fireEvent.pointerCancel(screen.getByRole("button", { name: "→" }));

        expect(dataBusMocks.movePlayerUp).toHaveBeenCalledTimes(1);
        expect(dataBusMocks.movePlayerDown).toHaveBeenCalledTimes(1);
        expect(dataBusMocks.movePlayerLeft).toHaveBeenCalledTimes(0);
        expect(dataBusMocks.movePlayerRight).toHaveBeenCalledTimes(0);
        expect(dataBusMocks.setPlayerMoveInput).toHaveBeenCalledWith(-1);
        expect(dataBusMocks.setPlayerMoveInput).toHaveBeenCalledWith(1);
        expect(dataBusMocks.setPlayerMoveInput).toHaveBeenLastCalledWith(0);
        expect(onMove).toHaveBeenCalledTimes(4);
    });

    it("resets on-screen movement intent on window blur", () => {
        render(<OnScreenArrowControl />);

        fireEvent.pointerDown(screen.getByRole("button", { name: "→" }));
        fireEvent.blur(window);

        expect(dataBusMocks.setPlayerMoveInput).toHaveBeenLastCalledWith(0);
    });

    it("uses jump request for on-screen up button when gravity is active", () => {
        dataBusMocks.isPlayerGravityActive.mockReturnValue(true);

        render(<OnScreenArrowControl />);
        fireEvent.click(screen.getByRole("button", { name: "↑" }));

        expect(dataBusMocks.requestPlayerJump).toHaveBeenCalledTimes(1);
        expect(dataBusMocks.movePlayerUp).not.toHaveBeenCalled();
    });

    it("shows pressed visual state while on-screen direction is held", () => {
        render(<OnScreenArrowControl />);

        const rightButton = screen.getByRole("button", { name: "→" });

        fireEvent.pointerDown(rightButton);
        expect(rightButton.className).toContain("is-held");

        fireEvent.pointerUp(rightButton);
        expect(rightButton.className).not.toContain("is-held");
    });

    it("handles up/down keys and smooth left/right intent in ArrowKeyControl", () => {
        const onMove = vi.fn();

        render(<ArrowKeyControl onMove={onMove} />);

        fireEvent.keyDown(window, { key: "ArrowUp" });
        fireEvent.keyDown(window, { key: "ArrowDown" });
        fireEvent.keyDown(window, { key: "ArrowLeft" });
        fireEvent.keyDown(window, { key: "ArrowRight" });
        fireEvent.keyDown(window, { key: "w" });
        fireEvent.keyDown(window, { key: "s" });
        fireEvent.keyDown(window, { key: "a" });
        fireEvent.keyDown(window, { key: "d" });
        fireEvent.keyUp(window, { key: "ArrowRight" });
        fireEvent.keyUp(window, { key: "ArrowLeft" });

        expect(dataBusMocks.movePlayerUp).toHaveBeenCalledTimes(2);
        expect(dataBusMocks.movePlayerDown).toHaveBeenCalledTimes(2);
        expect(dataBusMocks.movePlayerLeft).toHaveBeenCalledTimes(0);
        expect(dataBusMocks.movePlayerRight).toHaveBeenCalledTimes(0);
        expect(dataBusMocks.setPlayerMoveInput).toHaveBeenCalled();
        expect(onMove).toHaveBeenCalledTimes(8);
    });

    it("handles Space key jump in ArrowKeyControl", () => {
        const onMove = vi.fn();

        render(<ArrowKeyControl onMove={onMove} />);

        fireEvent.keyDown(window, { key: " ", code: "Space" });

        expect(dataBusMocks.requestPlayerJump).toHaveBeenCalledTimes(1);
        expect(onMove).toHaveBeenCalledTimes(1);
    });

    it("uses jump request for ArrowUp/W when gravity is active", () => {
        dataBusMocks.isPlayerGravityActive.mockReturnValue(true);

        render(<ArrowKeyControl />);

        fireEvent.keyDown(window, { key: "ArrowUp" });
        fireEvent.keyDown(window, { key: "w" });

        expect(dataBusMocks.requestPlayerJump).toHaveBeenCalledTimes(2);
        expect(dataBusMocks.movePlayerUp).not.toHaveBeenCalled();
    });

    it("resets movement intent when window loses focus", () => {
        render(<ArrowKeyControl />);

        fireEvent.keyDown(window, { key: "ArrowRight" });
        fireEvent.blur(window);

        expect(dataBusMocks.setPlayerMoveInput).toHaveBeenLastCalledWith(0);
    });

    it("does not move when ArrowKeyControl is disabled", () => {
        const onMove = vi.fn();

        render(<ArrowKeyControl enabled={false} onMove={onMove} />);

        fireEvent.keyDown(window, { key: "ArrowUp" });
        fireEvent.keyDown(window, { key: "w" });

        expect(dataBusMocks.movePlayerUp).not.toHaveBeenCalled();
        expect(onMove).not.toHaveBeenCalled();
    });

    it("prevents default browser behavior for recognized keys", () => {
        render(<ArrowKeyControl />);

        const event = new KeyboardEvent("keydown", {
            key: "a",
            cancelable: true,
        });

        const prevented = !window.dispatchEvent(event);

        expect(event.defaultPrevented || prevented).toBe(true);
    });

    it("ignores non-mapped keys in ArrowKeyControl", () => {
        const onMove = vi.fn();
        render(<ArrowKeyControl onMove={onMove} />);

        const event = new KeyboardEvent("keydown", {
            key: "x",
            cancelable: true,
        });

        const prevented = !window.dispatchEvent(event);

        expect(event.defaultPrevented || prevented).toBe(false);
        expect(dataBusMocks.movePlayerUp).not.toHaveBeenCalled();
        expect(dataBusMocks.movePlayerDown).not.toHaveBeenCalled();
        expect(dataBusMocks.movePlayerLeft).not.toHaveBeenCalled();
        expect(dataBusMocks.movePlayerRight).not.toHaveBeenCalled();
        expect(dataBusMocks.requestPlayerJump).not.toHaveBeenCalled();
        expect(onMove).not.toHaveBeenCalled();
    });
});
