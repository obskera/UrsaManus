import { useEffect } from "react";
import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signalBus } from "@/services/signalBus";
import { emitParticles } from "@/components/effects/particleEmitter";
import { useParticleEmitter } from "@/components/effects/particleEmitter/useParticleEmitter";

let latestRef: ReturnType<typeof useParticleEmitter>["particlesRef"] | null =
    null;

type TestGlobals = {
    requestAnimationFrame: typeof requestAnimationFrame;
    cancelAnimationFrame: typeof cancelAnimationFrame;
};

const testGlobals = globalThis as unknown as TestGlobals;

function Probe({
    onReady,
}: {
    onReady: (
        ref: ReturnType<typeof useParticleEmitter>["particlesRef"],
    ) => void;
}) {
    const { particlesRef } = useParticleEmitter(120, 80);

    useEffect(() => {
        onReady(particlesRef);
    }, [onReady, particlesRef]);

    return null;
}

describe("useParticleEmitter behavior", () => {
    const origRaf = testGlobals.requestAnimationFrame;
    const origCancel = testGlobals.cancelAnimationFrame;

    beforeEach(() => {
        signalBus.clear();
        latestRef = null;

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

    it("spawns particles on emit signal", async () => {
        render(
            <Probe
                onReady={(ref) => {
                    latestRef = ref;
                }}
            />,
        );

        emitParticles({
            amount: 6,
            location: { x: 20, y: 20 },
            direction: {
                angleDeg: 0,
                speed: 0,
            },
            emissionShape: "point",
            lifeMs: 500,
            color: "#fff",
        });

        await waitFor(() => {
            expect(latestRef?.current.length).toBe(6);
        });
    });

    it("removes expired particles over time", async () => {
        render(
            <Probe
                onReady={(ref) => {
                    latestRef = ref;
                }}
            />,
        );

        emitParticles({
            amount: 4,
            location: { x: 30, y: 30 },
            direction: {
                angleDeg: 0,
                speed: 0,
            },
            emissionShape: "point",
            lifeMs: 40,
            color: "#0ff",
        });

        await waitFor(() => {
            expect((latestRef?.current.length ?? 0) > 0).toBe(true);
        });

        await waitFor(() => {
            expect(latestRef?.current.length).toBe(0);
        });
    });

    it("cancels raf loop on unmount", async () => {
        const cancelSpy = vi.spyOn(testGlobals, "cancelAnimationFrame");

        const { unmount } = render(
            <Probe
                onReady={(ref) => {
                    latestRef = ref;
                }}
            />,
        );

        await waitFor(() => {
            expect(latestRef).not.toBeNull();
        });

        unmount();

        expect(cancelSpy).toHaveBeenCalled();
    });
});
