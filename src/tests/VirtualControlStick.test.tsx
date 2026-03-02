import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VirtualControlStick } from "@/components/virtualControlStick";

function mockStickRect(element: HTMLElement) {
    Object.defineProperty(element, "getBoundingClientRect", {
        value: () => ({
            x: 0,
            y: 0,
            left: 0,
            top: 0,
            right: 100,
            bottom: 100,
            width: 100,
            height: 100,
            toJSON: () => ({}),
        }),
    });
}

describe("VirtualControlStick", () => {
    it("emits vector updates during drag and resets on release", () => {
        const onVectorChange = vi.fn();
        const onRelease = vi.fn();

        render(
            <VirtualControlStick
                label="Move stick"
                onVectorChange={onVectorChange}
                onRelease={onRelease}
            />,
        );

        const stick = screen.getByRole("group", { name: "Move stick" });
        mockStickRect(stick);

        fireEvent.pointerDown(stick, {
            pointerId: 1,
            clientX: 80,
            clientY: 50,
        });
        fireEvent.pointerMove(stick, {
            pointerId: 1,
            clientX: 50,
            clientY: 20,
        });
        fireEvent.pointerUp(stick, { pointerId: 1 });

        const firstVector = onVectorChange.mock.calls[0][0] as {
            x: number;
            y: number;
            active: boolean;
        };
        expect(firstVector.x).toBeGreaterThan(0);
        expect(firstVector.active).toBe(true);

        const secondVector = onVectorChange.mock.calls[1][0] as {
            y: number;
        };
        expect(secondVector.y).toBeLessThan(0);

        const lastVector = onVectorChange.mock.calls.at(-1)?.[0] as {
            x: number;
            y: number;
            active: boolean;
        };
        expect(lastVector).toEqual({
            x: 0,
            y: 0,
            magnitude: 0,
            angleRad: 0,
            active: false,
        });
        expect(onRelease).toHaveBeenCalledTimes(1);
    });

    it("supports deadzone and snap-to-cardinal behavior", () => {
        const onVectorChange = vi.fn();

        render(
            <VirtualControlStick
                deadzone={0.3}
                snapToCardinal
                onVectorChange={onVectorChange}
            />,
        );

        const stick = screen.getByRole("group", {
            name: "Virtual control stick",
        });
        mockStickRect(stick);

        fireEvent.pointerDown(stick, {
            pointerId: 2,
            clientX: 58,
            clientY: 54,
        });
        const deadzoneVector = onVectorChange.mock.calls[0][0] as {
            magnitude: number;
        };
        expect(deadzoneVector.magnitude).toBe(0);

        fireEvent.pointerMove(stick, {
            pointerId: 2,
            clientX: 85,
            clientY: 70,
        });
        const snappedVector = onVectorChange.mock.calls[1][0] as {
            x: number;
            y: number;
            magnitude: number;
        };
        expect(snappedVector.magnitude).toBeGreaterThan(0);
        expect(snappedVector.y).toBe(0);
        expect(snappedVector.x).toBeGreaterThan(0);
    });

    it("prevents interaction when disabled", () => {
        const onVectorChange = vi.fn();

        render(
            <VirtualControlStick disabled onVectorChange={onVectorChange} />,
        );

        const stick = screen.getByRole("group", {
            name: "Virtual control stick",
        });
        mockStickRect(stick);

        fireEvent.pointerDown(stick, {
            pointerId: 3,
            clientX: 90,
            clientY: 50,
        });
        fireEvent.pointerMove(stick, {
            pointerId: 3,
            clientX: 70,
            clientY: 20,
        });

        expect(onVectorChange).not.toHaveBeenCalled();
    });

    it("supports full custom render override", () => {
        render(
            <VirtualControlStick
                render={(state) => (
                    <output data-testid="custom-virtual-stick">
                        {state.vector.x},{state.vector.y}
                    </output>
                )}
            />,
        );

        expect(screen.getByTestId("custom-virtual-stick")).toHaveTextContent(
            "0,0",
        );
        expect(
            screen.queryByRole("group", { name: "Virtual control stick" }),
        ).toBeNull();
    });
});
