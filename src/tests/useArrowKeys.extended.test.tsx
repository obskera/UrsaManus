import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import useArrowKeys, { type ArrowDirection } from "../logic/useArrowKeys";

function TestComponent({
    cb,
    preventDefault,
    enabled = true,
}: {
    cb: (d: ArrowDirection) => void;
    preventDefault?: boolean;
    enabled?: boolean;
}) {
    useArrowKeys({ onDirection: cb, preventDefault, enabled });
    return null;
}

describe("useArrowKeys additional coverage", () => {
    it("calls preventDefault for arrow keys by default and invokes callback", () => {
        const cb = vi.fn();
        const spy = vi.spyOn(Event.prototype, "preventDefault");

        render(<TestComponent cb={cb} />);

        window.dispatchEvent(
            new KeyboardEvent("keydown", { key: "ArrowRight" }),
        );

        expect(spy).toHaveBeenCalled();
        expect(cb).toHaveBeenCalledWith("right");

        spy.mockRestore();
    });

    it("does not call preventDefault when option is false but still invokes callback", () => {
        const cb = vi.fn();
        const spy = vi.spyOn(Event.prototype, "preventDefault");

        render(<TestComponent cb={cb} preventDefault={false} />);

        window.dispatchEvent(
            new KeyboardEvent("keydown", { key: "ArrowLeft" }),
        );

        expect(spy).not.toHaveBeenCalled();
        expect(cb).toHaveBeenCalledWith("left");

        spy.mockRestore();
    });

    it("ignores non-arrow keys and does not call preventDefault or callback", () => {
        const cb = vi.fn();
        const spy = vi.spyOn(Event.prototype, "preventDefault");

        render(<TestComponent cb={cb} />);

        window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));

        expect(spy).not.toHaveBeenCalled();
        expect(cb).not.toHaveBeenCalled();

        spy.mockRestore();
    });

    it("handles ArrowDown key", () => {
        const cb = vi.fn();
        render(<TestComponent cb={cb} />);

        window.dispatchEvent(
            new KeyboardEvent("keydown", { key: "ArrowDown" }),
        );

        expect(cb).toHaveBeenCalledWith("down");
    });

    it("does not attach listener when enabled is false (effect early return)", () => {
        const addSpy = vi.spyOn(window, "addEventListener");
        render(<TestComponent cb={() => {}} enabled={false} />);
        expect(addSpy).not.toHaveBeenCalledWith(
            "keydown",
            expect.any(Function),
        );
        addSpy.mockRestore();
    });
});
