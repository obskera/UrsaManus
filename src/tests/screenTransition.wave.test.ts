import { describe, expect, it } from "vitest";
import { getTransitionWaveIndex } from "@/components/effects/screenTransition";

describe("getTransitionWaveIndex", () => {
    it("starts earliest at top-left for top-left transitions", () => {
        expect(getTransitionWaveIndex(0, 0, 3, 3, "top-left")).toBe(0);
        expect(getTransitionWaveIndex(2, 2, 3, 3, "top-left")).toBe(4);
    });

    it("starts earliest at top-right for top-right transitions", () => {
        expect(getTransitionWaveIndex(2, 0, 3, 3, "top-right")).toBe(0);
        expect(getTransitionWaveIndex(0, 2, 3, 3, "top-right")).toBe(4);
    });

    it("starts earliest at bottom-left for bottom-left transitions", () => {
        expect(getTransitionWaveIndex(0, 2, 3, 3, "bottom-left")).toBe(0);
        expect(getTransitionWaveIndex(2, 0, 3, 3, "bottom-left")).toBe(4);
    });

    it("starts earliest at bottom-right for bottom-right transitions", () => {
        expect(getTransitionWaveIndex(2, 2, 3, 3, "bottom-right")).toBe(0);
        expect(getTransitionWaveIndex(0, 0, 3, 3, "bottom-right")).toBe(4);
    });
});
