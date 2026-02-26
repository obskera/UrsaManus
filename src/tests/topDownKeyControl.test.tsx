import { fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TopDownKeyControl from "@/components/screenController/topDownKeyControl";

let frameCallbacks: FrameRequestCallback[] = [];

const dataBusMocks = vi.hoisted(() => {
    return {
        movePlayerBy: vi.fn(() => true),
    };
});

vi.mock("@/services/DataBus", () => {
    return {
        dataBus: {
            movePlayerBy: dataBusMocks.movePlayerBy,
        },
    };
});

describe("TopDownKeyControl", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        frameCallbacks = [];
        vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
            frameCallbacks.push(cb);
            return frameCallbacks.length;
        });
        vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    });

    it("moves player on held direction keys", () => {
        const onMove = vi.fn();
        render(<TopDownKeyControl onMove={onMove} />);

        fireEvent.keyDown(window, { key: "ArrowRight" });
        fireEvent.keyDown(window, { key: "ArrowDown" });

        const frame = frameCallbacks[frameCallbacks.length - 1];
        frame?.(performance.now() + 16);

        expect(dataBusMocks.movePlayerBy).toHaveBeenCalled();
        expect(onMove).toHaveBeenCalled();
    });

    it("stops moving when control is disabled", () => {
        render(<TopDownKeyControl enabled={false} />);
        fireEvent.keyDown(window, { key: "ArrowRight" });

        expect(dataBusMocks.movePlayerBy).not.toHaveBeenCalled();
    });

    it("supports 4-way mode by suppressing diagonal y movement", () => {
        render(<TopDownKeyControl allowDiagonal={false} speedPxPerSec={120} />);

        fireEvent.keyDown(window, { key: "ArrowRight" });
        fireEvent.keyDown(window, { key: "ArrowDown" });

        const frame = frameCallbacks[frameCallbacks.length - 1];
        frame?.(performance.now() + 16);

        const [dx, dy] = dataBusMocks.movePlayerBy.mock.calls.at(-1) as [
            number,
            number,
        ];
        expect(dx).toBeGreaterThan(0);
        expect(dy).toBe(0);
    });

    it("normalizes 8-way diagonal movement", () => {
        render(<TopDownKeyControl allowDiagonal speedPxPerSec={120} />);

        fireEvent.keyDown(window, { key: "ArrowLeft" });
        fireEvent.keyDown(window, { key: "ArrowUp" });

        const frame = frameCallbacks[frameCallbacks.length - 1];
        frame?.(performance.now() + 16);

        const [dx, dy] = dataBusMocks.movePlayerBy.mock.calls.at(-1) as [
            number,
            number,
        ];
        expect(dx).toBeLessThan(0);
        expect(dy).toBeLessThan(0);
        expect(Math.abs(dx)).toBeGreaterThan(0);
        expect(Math.abs(dy)).toBeGreaterThan(0);
    });

    it("does not call onMove when movePlayerBy reports no movement", () => {
        dataBusMocks.movePlayerBy.mockReturnValue(false);
        const onMove = vi.fn();

        render(<TopDownKeyControl onMove={onMove} />);
        fireEvent.keyDown(window, { key: "ArrowRight" });

        const frame = frameCallbacks[frameCallbacks.length - 1];
        frame?.(performance.now() + 16);

        expect(dataBusMocks.movePlayerBy).toHaveBeenCalled();
        expect(onMove).not.toHaveBeenCalled();
    });

    it("ignores non-mapped keys", () => {
        render(<TopDownKeyControl />);

        fireEvent.keyDown(window, { key: "x" });

        const frame = frameCallbacks[frameCallbacks.length - 1];
        frame?.(performance.now() + 16);

        expect(dataBusMocks.movePlayerBy).not.toHaveBeenCalled();
    });

    it("resets held input on blur and visibility hidden", () => {
        render(<TopDownKeyControl />);

        fireEvent.keyDown(window, { key: "ArrowRight" });
        fireEvent.blur(window);
        let frame = frameCallbacks[frameCallbacks.length - 1];
        frame?.(performance.now() + 16);
        expect(dataBusMocks.movePlayerBy).not.toHaveBeenCalled();

        fireEvent.keyDown(window, { key: "ArrowRight" });
        Object.defineProperty(document, "visibilityState", {
            configurable: true,
            value: "hidden",
        });
        fireEvent(document, new Event("visibilitychange"));
        frame = frameCallbacks[frameCallbacks.length - 1];
        frame?.(performance.now() + 16);
        expect(dataBusMocks.movePlayerBy).not.toHaveBeenCalled();
    });
});
