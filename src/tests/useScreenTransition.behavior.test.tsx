import { useEffect } from "react";
import { act, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signalBus } from "@/services/SignalBus";
import {
    playScreenTransition,
    useScreenTransition,
} from "@/components/effects/screenTransition";

let latestTransition: ReturnType<typeof useScreenTransition> | null = null;

type TestGlobals = {
    requestAnimationFrame: typeof requestAnimationFrame;
    cancelAnimationFrame: typeof cancelAnimationFrame;
};

const testGlobals = globalThis as unknown as TestGlobals;

function Probe() {
    const transition = useScreenTransition(64, 64);

    useEffect(() => {
        latestTransition = transition;
    }, [transition]);

    return null;
}

describe("useScreenTransition behavior", () => {
    const origRaf = testGlobals.requestAnimationFrame;
    const origCancel = testGlobals.cancelAnimationFrame;

    beforeEach(() => {
        signalBus.clear();
        latestTransition = null;

        const rafMap = new Map<number, number>();
        let nextId = 1;
        let now = 0;

        testGlobals.requestAnimationFrame = (cb: FrameRequestCallback) => {
            const id = nextId++;
            const timeoutId = setTimeout(() => {
                now += 16;
                cb(now);
            }, 0) as unknown as number;
            rafMap.set(id, timeoutId);
            return id;
        };

        testGlobals.cancelAnimationFrame = (id: number) => {
            const timeoutId = rafMap.get(id);
            if (timeoutId) clearTimeout(timeoutId);
            rafMap.delete(id);
        };
    });

    afterEach(() => {
        signalBus.clear();
        testGlobals.requestAnimationFrame = origRaf;
        testGlobals.cancelAnimationFrame = origCancel;
        vi.restoreAllMocks();
    });

    it("starts inactive", () => {
        render(<Probe />);
        expect(latestTransition?.active).toBe(false);
        expect(latestTransition?.cells).toHaveLength(0);
    });

    it("activates, runs callbacks, and completes", async () => {
        const onCovered = vi.fn();
        const onComplete = vi.fn();

        render(<Probe />);

        act(() => {
            playScreenTransition({
                color: "#123456",
                from: "top-left",
                durationMs: 80,
                stepMs: 0,
                boxSize: 8,
                onCovered,
                onComplete,
            });
        });

        await waitFor(() => {
            expect(latestTransition?.active).toBe(true);
            expect(latestTransition?.boxSize).toBe(8);
            expect(latestTransition?.color).toBe("#123456");
            expect((latestTransition?.cells.length ?? 0) > 0).toBe(true);
        });

        await waitFor(() => {
            expect(onCovered).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
            expect(onComplete).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
            expect(latestTransition?.active).toBe(false);
        });
    });

    it("supports venetian blinds variant", async () => {
        render(<Probe />);

        act(() => {
            playScreenTransition({
                color: "#000",
                from: "top-left",
                variant: "venetian-blinds",
                venetianOrientation: "horizontal",
                durationMs: 80,
                stepMs: 8,
                boxSize: 8,
            });
        });

        await waitFor(() => {
            expect(latestTransition?.active).toBe(true);
            expect((latestTransition?.cells.length ?? 0) > 0).toBe(true);
        });
    });

    it("supports mosaic dissolve variant", async () => {
        render(<Probe />);

        act(() => {
            playScreenTransition({
                color: "#333",
                from: "top-left",
                variant: "mosaic-dissolve",
                mosaicSeed: 42,
                durationMs: 80,
                boxSize: 8,
            });
        });

        await waitFor(() => {
            expect(latestTransition?.active).toBe(true);
            expect((latestTransition?.cells.length ?? 0) > 0).toBe(true);
        });
    });

    it("supports iris variant", async () => {
        render(<Probe />);

        act(() => {
            playScreenTransition({
                color: "#666",
                from: "top-left",
                variant: "iris",
                irisOrigin: "center",
                durationMs: 80,
                boxSize: 8,
            });
        });

        await waitFor(() => {
            expect(latestTransition?.active).toBe(true);
            expect((latestTransition?.cells.length ?? 0) > 0).toBe(true);
        });
    });

    it("supports directional push variant", async () => {
        render(<Probe />);

        act(() => {
            playScreenTransition({
                color: "#111",
                from: "top-left",
                variant: "directional-push",
                pushFrom: "right",
                durationMs: 80,
                boxSize: 8,
            });
        });

        await waitFor(() => {
            expect(latestTransition?.active).toBe(true);
            expect((latestTransition?.cells.length ?? 0) > 0).toBe(true);
        });
    });
});
