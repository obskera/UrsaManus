import { getTilePixelPosition } from "../components/Render/Render";
import { describe, expect, it } from "vitest";

describe("getTilePixelPosition", () => {
    it("returns pixel position for valid tile coords", () => {
        const pos = getTilePixelPosition(1, 2, 8, 4, 4);
        expect(pos).toEqual({ x: 8, y: 16 });
    });

    it("throws for out of bounds tile coords", () => {
        expect(() => getTilePixelPosition(5, 0, 8, 4, 4)).toThrow(
            /out of bounds/i,
        );
        expect(() => getTilePixelPosition(-1, 0, 8, 4, 4)).toThrow(
            /out of bounds/i,
        );
    });
});
