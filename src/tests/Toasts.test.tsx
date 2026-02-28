import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Toasts, type ToastQueueEntry } from "@/components/toasts";

describe("Toasts", () => {
    it("renders stacked toasts with variant state and anchor", () => {
        const toasts: ToastQueueEntry[] = [
            { id: "a", message: "Info toast", variant: "info" },
            { id: "b", message: "Success toast", variant: "success" },
        ];

        render(<Toasts toasts={toasts} anchor="bottom-left" />);

        const region = screen.getByLabelText("Toasts");
        expect(region).toBeInTheDocument();
        expect(region).toHaveAttribute("data-anchor", "bottom-left");

        expect(screen.getByText("Info toast")).toBeInTheDocument();
        const successItem = screen.getByText("Success toast").closest("li");
        expect(successItem).toHaveAttribute("data-variant", "success");
    });

    it("supports manual dismiss callback", () => {
        const onDismiss = vi.fn();

        render(
            <Toasts
                toasts={[
                    {
                        id: "dismiss-me",
                        message: "Dismiss me",
                        variant: "warn",
                    },
                ]}
                onDismiss={onDismiss}
            />,
        );

        fireEvent.click(
            screen.getByRole("button", { name: "Dismiss warn toast" }),
        );

        expect(onDismiss).toHaveBeenCalledWith(
            expect.objectContaining({
                id: "dismiss-me",
                reason: "manual-dismiss",
            }),
        );
    });

    it("supports auto-dismiss callback", () => {
        vi.useFakeTimers();

        const onDismiss = vi.fn();

        render(
            <Toasts
                toasts={[
                    {
                        id: "auto-1",
                        message: "Auto dismiss",
                        variant: "error",
                        autoDismissMs: 120,
                    },
                ]}
                onDismiss={onDismiss}
            />,
        );

        act(() => {
            vi.advanceTimersByTime(130);
        });

        expect(onDismiss).toHaveBeenCalledWith(
            expect.objectContaining({
                id: "auto-1",
                reason: "auto-dismiss",
            }),
        );

        vi.useRealTimers();
    });
});
