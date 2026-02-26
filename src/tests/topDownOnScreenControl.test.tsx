import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TopDownOnScreenControl from "@/components/screenController/topDownOnScreenControl";

const dataBusMocks = vi.hoisted(() => ({
    movePlayerBy: vi.fn(),
}));

vi.mock("@/services/DataBus", () => ({
    dataBus: {
        movePlayerBy: dataBusMocks.movePlayerBy,
    },
}));

describe("TopDownOnScreenControl", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("moves in 4-way mode without diagonal y movement", () => {
        let tick: FrameRequestCallback | undefined;
        vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
            tick = cb;
            return 1;
        });
        vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});

        dataBusMocks.movePlayerBy.mockReturnValue(true);
        const onMove = vi.fn();

        render(
            <TopDownOnScreenControl
                onMove={onMove}
                allowDiagonal={false}
                speedPxPerSec={100}
            />,
        );

        fireEvent.pointerDown(screen.getByRole("button", { name: "→" }));
        fireEvent.pointerDown(screen.getByRole("button", { name: "↓" }));

        tick?.(performance.now() + 16);

        expect(dataBusMocks.movePlayerBy).toHaveBeenCalled();
        const [dx, dy] = dataBusMocks.movePlayerBy.mock.calls.at(-1) as [
            number,
            number,
        ];
        expect(dx).toBeGreaterThan(0);
        expect(dy).toBe(0);
        expect(onMove).toHaveBeenCalled();
    });

    it("moves diagonally in 8-way mode with normalized vector", () => {
        let tick: FrameRequestCallback | undefined;
        vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
            tick = cb;
            return 1;
        });
        vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});

        dataBusMocks.movePlayerBy.mockReturnValue(true);

        render(
            <TopDownOnScreenControl allowDiagonal={true} speedPxPerSec={200} />,
        );

        fireEvent.pointerDown(screen.getByRole("button", { name: "←" }));
        fireEvent.pointerDown(screen.getByRole("button", { name: "↑" }));
        tick?.(performance.now() + 16);

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
        let tick: FrameRequestCallback | undefined;
        vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
            tick = cb;
            return 1;
        });
        vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});

        dataBusMocks.movePlayerBy.mockReturnValue(false);
        const onMove = vi.fn();

        render(<TopDownOnScreenControl onMove={onMove} />);

        fireEvent.pointerDown(screen.getByRole("button", { name: "↑" }));
        tick?.(performance.now() + 16);

        expect(dataBusMocks.movePlayerBy).toHaveBeenCalled();
        expect(onMove).not.toHaveBeenCalled();
    });

    it("applies held visual state and resets on blur/visibility", () => {
        render(<TopDownOnScreenControl />);

        const right = screen.getByRole("button", { name: "→" });
        fireEvent.pointerDown(right);
        expect(right.className).toContain("is-held");

        fireEvent.blur(window);
        expect(right.className).not.toContain("is-held");

        fireEvent.pointerDown(right);
        expect(right.className).toContain("is-held");

        Object.defineProperty(document, "visibilityState", {
            configurable: true,
            value: "hidden",
        });
        fireEvent(document, new Event("visibilitychange"));

        expect(right.className).not.toContain("is-held");
    });

    it("does not move when no direction is currently pressed", () => {
        let tick: FrameRequestCallback | undefined;
        vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
            tick = cb;
            return 1;
        });
        vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});

        dataBusMocks.movePlayerBy.mockReturnValue(true);
        render(<TopDownOnScreenControl />);

        tick?.(performance.now() + 16);

        expect(dataBusMocks.movePlayerBy).not.toHaveBeenCalled();
    });

    it("keeps and clears held direction based on remaining pressed inputs", () => {
        render(<TopDownOnScreenControl />);

        const left = screen.getByRole("button", { name: "←" });
        const up = screen.getByRole("button", { name: "↑" });

        fireEvent.pointerDown(left);
        fireEvent.pointerDown(up);
        expect(up.className).toContain("is-held");

        fireEvent.pointerUp(up);
        expect(left.className).toContain("is-held");

        fireEvent.pointerUp(left);
        expect(left.className).not.toContain("is-held");
    });

    it("handles pointer cancel/leave end paths", () => {
        render(<TopDownOnScreenControl />);

        const down = screen.getByRole("button", { name: "↓" });
        const right = screen.getByRole("button", { name: "→" });

        fireEvent.pointerDown(down);
        expect(down.className).toContain("is-held");
        fireEvent.pointerCancel(down);
        expect(down.className).not.toContain("is-held");

        fireEvent.pointerDown(right);
        expect(right.className).toContain("is-held");
        fireEvent.pointerLeave(right);
        expect(right.className).not.toContain("is-held");
    });
});
