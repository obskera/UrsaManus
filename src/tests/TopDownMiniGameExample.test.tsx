import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TopDownMiniGameExample from "@/components/examples/TopDownMiniGameExample";

const mocks = vi.hoisted(() => {
    return {
        getPlayer: vi.fn(),
        setState: vi.fn(),
    };
});

vi.mock("@/services/DataBus", () => {
    return {
        dataBus: {
            getPlayer: mocks.getPlayer,
            setState: mocks.setState,
        },
    };
});

vi.mock("@/components/gameModes", () => {
    return {
        TopDownCanvas: () => <div data-testid="topdown-canvas" />,
    };
});

vi.mock("@/components/screenController", () => {
    return {
        TopDownControls: ({ onMove }: { onMove?: () => void }) => (
            <button
                type="button"
                onClick={() => {
                    onMove?.();
                }}
            >
                Trigger move
            </button>
        ),
    };
});

vi.mock("@/components/hudAnchor", () => {
    return {
        TopDownHUDPreset: ({
            objectivesValue,
            stanceValue,
            interactLabel,
            onInteract,
        }: {
            objectivesValue?: string;
            stanceValue?: string;
            interactLabel?: string;
            onInteract?: () => void;
        }) => (
            <div>
                <p>Objectives: {objectivesValue}</p>
                <p>Stance: {stanceValue}</p>
                <button type="button" onClick={onInteract}>
                    {interactLabel}
                </button>
            </div>
        ),
    };
});

describe("TopDownMiniGameExample", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("completes objectives to reach a win state and supports restart", async () => {
        const user = userEvent.setup();

        mocks.getPlayer
            .mockReturnValueOnce({ position: { x: 20, y: 20 } })
            .mockReturnValueOnce({ position: { x: 240, y: 40 } })
            .mockReturnValueOnce({ position: { x: 200, y: 250 } });

        render(<TopDownMiniGameExample />);

        expect(screen.getByText("Mission status: playing")).toBeInTheDocument();
        expect(screen.getByText("Objectives: 0/3")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Trigger move" }));
        await user.click(screen.getByRole("button", { name: "Trigger move" }));
        await user.click(screen.getByRole("button", { name: "Trigger move" }));

        expect(screen.getByText("Objectives: 3/3")).toBeInTheDocument();
        expect(screen.getByText("Mission status: won")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Restart run" }));

        expect(mocks.setState).toHaveBeenCalledTimes(1);
        expect(screen.getByText("Mission status: playing")).toBeInTheDocument();
        expect(screen.getByText("Objectives: 0/3")).toBeInTheDocument();
        expect(screen.getByText("Run #: 2")).toBeInTheDocument();
    });

    it("enters a lose state when timer expires", () => {
        vi.useFakeTimers();
        render(<TopDownMiniGameExample />);

        act(() => {
            vi.advanceTimersByTime(25_500);
        });

        expect(screen.getByText("Mission status: lost")).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Restart run" }),
        ).toBeInTheDocument();

        vi.useRealTimers();
    });
});
