import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import useArrowKeys, { type ArrowDirection } from "../logic/useArrowKeys";

function TestComponent({
    cb,
    enabled = true,
}: {
    cb: (d: ArrowDirection) => void;
    enabled?: boolean;
}) {
    useArrowKeys({ onDirection: cb, enabled });
    return null;
}

describe("useArrowKeys", () => {
    it("calls callback for arrow keys", () => {
        const calls: string[] = [];
        const cb = (d: string) => calls.push(d);

        render(<TestComponent cb={cb} />);

        const ev = new KeyboardEvent("keydown", { key: "ArrowUp" });
        window.dispatchEvent(ev);

        const ev2 = new KeyboardEvent("keydown", { key: "ArrowLeft" });
        window.dispatchEvent(ev2);

        expect(calls).toEqual(["up", "left"]);
    });

    it("does not call when disabled", () => {
        const calls: string[] = [];
        const cb = (d: string) => calls.push(d);

        render(<TestComponent cb={cb} enabled={false} />);

        const ev = new KeyboardEvent("keydown", { key: "ArrowDown" });
        window.dispatchEvent(ev);

        expect(calls).toEqual([]);
    });
});
