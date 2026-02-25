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
    };
});

vi.mock("../services/DataBus", () => {
    return {
        dataBus: {
            movePlayerUp: dataBusMocks.movePlayerUp,
            movePlayerDown: dataBusMocks.movePlayerDown,
            movePlayerLeft: dataBusMocks.movePlayerLeft,
            movePlayerRight: dataBusMocks.movePlayerRight,
        },
    };
});

describe("screenController behavior", () => {
    beforeEach(() => {
        vi.clearAllMocks();
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

    it("moves player and triggers onMove for on-screen arrow buttons", () => {
        const onMove = vi.fn();

        render(<OnScreenArrowControl onMove={onMove} />);

        fireEvent.click(screen.getByRole("button", { name: "↑" }));
        fireEvent.click(screen.getByRole("button", { name: "↓" }));
        fireEvent.click(screen.getByRole("button", { name: "←" }));
        fireEvent.click(screen.getByRole("button", { name: "→" }));

        expect(dataBusMocks.movePlayerUp).toHaveBeenCalledTimes(1);
        expect(dataBusMocks.movePlayerDown).toHaveBeenCalledTimes(1);
        expect(dataBusMocks.movePlayerLeft).toHaveBeenCalledTimes(1);
        expect(dataBusMocks.movePlayerRight).toHaveBeenCalledTimes(1);
        expect(onMove).toHaveBeenCalledTimes(4);
    });

    it("handles Arrow keys and WASD in ArrowKeyControl", () => {
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

        expect(dataBusMocks.movePlayerUp).toHaveBeenCalledTimes(2);
        expect(dataBusMocks.movePlayerDown).toHaveBeenCalledTimes(2);
        expect(dataBusMocks.movePlayerLeft).toHaveBeenCalledTimes(2);
        expect(dataBusMocks.movePlayerRight).toHaveBeenCalledTimes(2);
        expect(onMove).toHaveBeenCalledTimes(8);
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
        expect(onMove).not.toHaveBeenCalled();
    });
});
