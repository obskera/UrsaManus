import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TextBox } from "@/components/textBox";

describe("TextBox", () => {
    it("renders positioned textbox with optional portrait/icon and max line clamp", () => {
        render(
            <TextBox
                text={"Line 1\nLine 2\nLine 3"}
                x={24}
                y={32}
                width={280}
                maxLines={2}
                revealMode="static"
                portrait={<span data-testid="portrait">P</span>}
                icon={<span data-testid="icon">I</span>}
            />,
        );

        const textBox = screen.getByRole("status");
        expect(textBox).toBeInTheDocument();
        expect(textBox).toHaveStyle({
            left: "24px",
            top: "32px",
            width: "280px",
        });

        expect(screen.getByTestId("portrait")).toBeInTheDocument();
        expect(screen.getByTestId("icon")).toBeInTheDocument();

        expect(
            screen.getByText((_, element) => {
                return element?.textContent === "Line 1\nLine 2";
            }),
        ).toBeInTheDocument();
        expect(screen.queryByText("Line 3")).toBeNull();
    });

    it("reveals text progressively in typewriter mode and emits lifecycle hooks", () => {
        vi.useFakeTimers();

        const onOpen = vi.fn();
        const onUpdate = vi.fn();
        const onClose = vi.fn();

        const { rerender } = render(
            <TextBox
                text="HELLO"
                x={0}
                y={0}
                width={200}
                open={false}
                revealMode="typewriter"
                typewriterCharsPerSecond={10}
                onOpen={onOpen}
                onUpdate={onUpdate}
                onClose={onClose}
            />,
        );

        rerender(
            <TextBox
                text="HELLO"
                x={0}
                y={0}
                width={200}
                open
                revealMode="typewriter"
                typewriterCharsPerSecond={10}
                onOpen={onOpen}
                onUpdate={onUpdate}
                onClose={onClose}
            />,
        );

        expect(onOpen).toHaveBeenCalledTimes(1);

        act(() => {
            vi.advanceTimersByTime(200);
        });

        expect(screen.getByText("H")).toBeInTheDocument();
        expect(onUpdate).toHaveBeenCalled();

        rerender(
            <TextBox
                text="HELLO"
                x={0}
                y={0}
                width={200}
                open={false}
                revealMode="typewriter"
                typewriterCharsPerSecond={10}
                onOpen={onOpen}
                onUpdate={onUpdate}
                onClose={onClose}
            />,
        );

        expect(onClose).toHaveBeenCalledWith(
            expect.objectContaining({ reason: "closed" }),
        );

        vi.useRealTimers();
    });

    it("supports auto-close timers with lifecycle reason", () => {
        vi.useFakeTimers();

        const onClose = vi.fn();

        render(
            <TextBox
                text="Auto-close"
                x={0}
                y={0}
                width={200}
                revealMode="static"
                autoCloseMs={120}
                onClose={onClose}
            />,
        );

        act(() => {
            vi.advanceTimersByTime(150);
        });

        expect(screen.queryByRole("status")).toBeNull();
        expect(onClose).toHaveBeenCalledWith(
            expect.objectContaining({ reason: "auto-close" }),
        );

        vi.useRealTimers();
    });
});
