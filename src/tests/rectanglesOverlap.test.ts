import { rectanglesOverlap } from "../logic/collision/rectanglesOverlap";
import { describe, expect, it } from "vitest";

describe("rectanglesOverlap", () => {
    it("returns true when rectangles overlap", () => {
        const a = { x: 0, y: 0, width: 10, height: 10 };
        const b = { x: 5, y: 5, width: 10, height: 10 };

        expect(rectanglesOverlap(a, b)).toBe(true);
    });

    it("returns false when rectangles are separated", () => {
        const a = { x: 0, y: 0, width: 10, height: 10 };
        const b = { x: 20, y: 20, width: 5, height: 5 };

        expect(rectanglesOverlap(a, b)).toBe(false);
    });

    it("returns false when touching edges but not overlapping", () => {
        const a = { x: 0, y: 0, width: 10, height: 10 };
        const b = { x: 10, y: 0, width: 5, height: 5 };

        expect(rectanglesOverlap(a, b)).toBe(false);
    });
});
