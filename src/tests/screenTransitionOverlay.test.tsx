import { act, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { signalBus } from "@/services/signalBus";
import ScreenTransitionOverlay from "@/components/effects/screenTransition/ScreenTransitionOverlay";
import { playScreenTransition } from "@/components/effects/screenTransition";

describe("ScreenTransitionOverlay", () => {
    beforeEach(() => {
        signalBus.clear();
    });

    afterEach(() => {
        signalBus.clear();
    });

    it("renders nothing while transition is inactive", () => {
        const { container } = render(
            <ScreenTransitionOverlay width={64} height={64} />,
        );

        expect(
            container.querySelector(".screen-transition-overlay"),
        ).toBeNull();
    });

    it("renders transition cells when a transition is played", async () => {
        const { container } = render(
            <ScreenTransitionOverlay width={64} height={64} />,
        );

        act(() => {
            playScreenTransition({
                color: "#222",
                from: "top-left",
                durationMs: 200,
                stepMs: 0,
                boxSize: 8,
            });
        });

        await waitFor(() => {
            const overlay = container.querySelector(
                ".screen-transition-overlay",
            );
            expect(overlay).toBeTruthy();
            const cells = container.querySelectorAll(".screen-transition-cell");
            expect(cells.length).toBeGreaterThan(0);
        });
    });
});
