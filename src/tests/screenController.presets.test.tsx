import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SideScrollerControls from "@/components/screenController/SideScrollerControls";
import TopDownControls from "@/components/screenController/TopDownControls";

vi.mock("@/components/screenController/screenController", () => ({
    default: ({
        className,
        children,
    }: {
        className?: string;
        children?: React.ReactNode;
    }) => (
        <div data-testid="screen-controller" data-classname={className}>
            {children}
        </div>
    ),
}));

vi.mock("@/components/screenController/ScreenControlGroup", () => ({
    default: ({
        className,
        children,
    }: {
        className?: string;
        children?: React.ReactNode;
    }) => (
        <section data-testid="screen-control-group" data-classname={className}>
            {children}
        </section>
    ),
}));

vi.mock("@/components/screenController/arrowKeyControl", () => ({
    default: ({ onMove }: { onMove?: () => void }) => (
        <div
            data-testid="arrow-key-control"
            data-has-on-move={Boolean(onMove)}
        />
    ),
}));

vi.mock("@/components/screenController/onScreenArrowControl", () => ({
    default: ({ onMove }: { onMove?: () => void }) => (
        <div
            data-testid="on-screen-arrow-control"
            data-has-on-move={Boolean(onMove)}
        />
    ),
}));

vi.mock("@/components/screenController/compassDirectionControl", () => ({
    default: ({ mode, onMove }: { mode?: string; onMove?: () => void }) => (
        <div
            data-testid="compass-direction-control"
            data-mode={mode}
            data-has-on-move={Boolean(onMove)}
        />
    ),
}));

vi.mock("@/components/screenController/topDownKeyControl", () => ({
    default: ({
        onMove,
        allowDiagonal,
        speedPxPerSec,
    }: {
        onMove?: () => void;
        allowDiagonal?: boolean;
        speedPxPerSec?: number;
    }) => (
        <div
            data-testid="topdown-key-control"
            data-has-on-move={Boolean(onMove)}
            data-allow-diagonal={String(allowDiagonal)}
            data-speed={String(speedPxPerSec)}
        />
    ),
}));

vi.mock("@/components/screenController/topDownOnScreenControl", () => ({
    default: ({
        onMove,
        allowDiagonal,
        speedPxPerSec,
    }: {
        onMove?: () => void;
        allowDiagonal?: boolean;
        speedPxPerSec?: number;
    }) => (
        <div
            data-testid="topdown-on-screen-control"
            data-has-on-move={Boolean(onMove)}
            data-allow-diagonal={String(allowDiagonal)}
            data-speed={String(speedPxPerSec)}
        />
    ),
}));

describe("screen controller presets", () => {
    it("composes SideScrollerControls with expected groups and player-action mode", () => {
        const onMove = vi.fn();

        render(<SideScrollerControls onMove={onMove} />);

        expect(screen.getByTestId("screen-controller")).toHaveAttribute(
            "data-classname",
            "snes-layout",
        );
        expect(screen.getByTestId("arrow-key-control")).toHaveAttribute(
            "data-has-on-move",
            "true",
        );
        expect(screen.getByTestId("on-screen-arrow-control")).toHaveAttribute(
            "data-has-on-move",
            "true",
        );

        const groups = screen.getAllByTestId("screen-control-group");
        expect(groups[0]).toHaveAttribute("data-classname", "dpad-group");
        expect(groups[1]).toHaveAttribute(
            "data-classname",
            "face-button-group",
        );

        expect(screen.getByTestId("compass-direction-control")).toHaveAttribute(
            "data-mode",
            "player-actions",
        );
    });

    it("uses TopDownControls defaults and forwards custom options", () => {
        const onMove = vi.fn();
        const { rerender } = render(<TopDownControls onMove={onMove} />);

        expect(screen.getByTestId("screen-controller")).toHaveAttribute(
            "data-classname",
            "snes-layout",
        );
        expect(screen.getByTestId("topdown-key-control")).toHaveAttribute(
            "data-allow-diagonal",
            "true",
        );
        expect(screen.getByTestId("topdown-key-control")).toHaveAttribute(
            "data-speed",
            "220",
        );
        expect(screen.getByTestId("topdown-on-screen-control")).toHaveAttribute(
            "data-allow-diagonal",
            "true",
        );
        expect(screen.getByTestId("topdown-on-screen-control")).toHaveAttribute(
            "data-speed",
            "220",
        );

        rerender(
            <TopDownControls
                onMove={onMove}
                allowDiagonal={false}
                speedPxPerSec={300}
            />,
        );

        expect(screen.getByTestId("topdown-key-control")).toHaveAttribute(
            "data-allow-diagonal",
            "false",
        );
        expect(screen.getByTestId("topdown-key-control")).toHaveAttribute(
            "data-speed",
            "300",
        );
        expect(screen.getByTestId("topdown-on-screen-control")).toHaveAttribute(
            "data-allow-diagonal",
            "false",
        );
        expect(screen.getByTestId("topdown-on-screen-control")).toHaveAttribute(
            "data-speed",
            "300",
        );
    });
});
