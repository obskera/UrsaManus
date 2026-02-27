import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SideScrollerMiniGameExample from "@/components/examples/SideScrollerMiniGameExample";

const mocks = vi.hoisted(() => {
    return {
        getPlayer: vi.fn(),
        setState: vi.fn(),
        requestPlayerJump: vi.fn(),
    };
});

vi.mock("@/services/DataBus", () => {
    return {
        dataBus: {
            getPlayer: mocks.getPlayer,
            setState: mocks.setState,
            requestPlayerJump: mocks.requestPlayerJump,
        },
    };
});

vi.mock("@/components/gameModes", () => {
    return {
        SideScrollerCanvas: () => <div data-testid="sidescroller-canvas" />,
    };
});

vi.mock("@/components/screenController", () => {
    return {
        SideScrollerControls: ({ onMove }: { onMove?: () => void }) => (
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
        PlatformerHUDPreset: ({
            coinsValue,
            livesValue,
            jumpLabel,
            onJump,
        }: {
            coinsValue?: string;
            livesValue?: number;
            jumpLabel?: string;
            onJump?: () => void;
        }) => (
            <div>
                <p>Coins: {coinsValue}</p>
                <p>Lives: {livesValue}</p>
                <button type="button" onClick={onJump}>
                    {jumpLabel}
                </button>
            </div>
        ),
    };
});

describe("SideScrollerMiniGameExample", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("collects all chips to win and supports restart", async () => {
        const user = userEvent.setup();

        mocks.getPlayer
            .mockReturnValueOnce({ position: { x: 40, y: 60 } })
            .mockReturnValueOnce({ position: { x: 220, y: 80 } })
            .mockReturnValueOnce({ position: { x: 360, y: 90 } });

        render(<SideScrollerMiniGameExample />);

        expect(screen.getByText("Mission status: playing")).toBeInTheDocument();
        expect(screen.getByText("Coins: 0/3")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Trigger move" }));
        await user.click(screen.getByRole("button", { name: "Trigger move" }));
        await user.click(screen.getByRole("button", { name: "Trigger move" }));

        expect(screen.getByText("Coins: 3/3")).toBeInTheDocument();
        expect(screen.getByText("Mission status: won")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Restart run" }));

        expect(mocks.setState).toHaveBeenCalledTimes(1);
        expect(screen.getByText("Mission status: playing")).toBeInTheDocument();
        expect(screen.getByText("Coins: 0/3")).toBeInTheDocument();
        expect(screen.getByText("Run #: 2")).toBeInTheDocument();
    });

    it("loses after repeated hazard entries", async () => {
        const user = userEvent.setup();

        mocks.getPlayer
            .mockReturnValueOnce({ position: { x: 380, y: 240 } })
            .mockReturnValueOnce({ position: { x: 200, y: 100 } })
            .mockReturnValueOnce({ position: { x: 390, y: 250 } });

        render(<SideScrollerMiniGameExample />);

        await user.click(screen.getByRole("button", { name: "Trigger move" }));
        expect(screen.getByText("Lives: 1")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Trigger move" }));
        expect(screen.getByText("Mission status: playing")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Trigger move" }));
        expect(screen.getByText("Lives: 0")).toBeInTheDocument();
        expect(screen.getByText("Mission status: lost")).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Restart run" }),
        ).toBeInTheDocument();
    });

    it("enters lose state when timer expires", () => {
        vi.useFakeTimers();
        render(<SideScrollerMiniGameExample />);

        act(() => {
            vi.advanceTimersByTime(30_500);
        });

        expect(screen.getByText("Mission status: lost")).toBeInTheDocument();

        vi.useRealTimers();
    });
});
