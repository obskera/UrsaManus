import { describe, expect, it } from "vitest";
import {
    createBiomePathComposition,
    generateSeededRoomMap,
} from "@/logic/worldgen";

describe("worldgen biome/path composition", () => {
    it("produces deterministic biome and sprite tiles for same seed", () => {
        const map = generateSeededRoomMap({
            width: 28,
            height: 18,
            seed: "composition-seed",
            roomCount: 6,
        });

        const first = createBiomePathComposition({
            tiles: map.tiles,
            seed: "composition-seed",
        });
        const second = createBiomePathComposition({
            tiles: map.tiles,
            seed: "composition-seed",
        });

        expect(first).toEqual(second);
    });

    it("connects start and end with a deterministic carved path", () => {
        const map = generateSeededRoomMap({
            width: 24,
            height: 16,
            seed: "path-seed",
            roomCount: 5,
        });

        const result = createBiomePathComposition({
            tiles: map.tiles,
            seed: "path-seed",
            pathTileValue: 9,
            pathStart: { x: 3, y: 3 },
            pathEnd: { x: 8, y: 7 },
        });

        expect(result.path.length).toBeGreaterThan(1);
        expect(result.path[0]).toEqual({ x: 3, y: 3 });
        expect(result.path[result.path.length - 1]).toEqual({ x: 8, y: 7 });
        expect(result.tiles[3][3]).toBe(9);
        expect(result.tiles[7][8]).toBe(9);
    });
});
