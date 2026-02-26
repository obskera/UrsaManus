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
        render(<TopDownKeyControl />);

        fireEvent.keyDown(window, { key: "ArrowRight" });
        fireEvent.keyDown(window, { key: "ArrowDown" });

        const frame = frameCallbacks[frameCallbacks.length - 1];
        frame?.(performance.now() + 16);

        expect(dataBusMocks.movePlayerBy).toHaveBeenCalled();
    });

    it("stops moving when control is disabled", () => {
        render(<TopDownKeyControl enabled={false} />);
        fireEvent.keyDown(window, { key: "ArrowRight" });

        expect(dataBusMocks.movePlayerBy).not.toHaveBeenCalled();
    });
});
