import { describe, expect, it } from "vitest";
import { generateSeededTileMap } from "@/logic/worldgen";

describe("generateSeededTileMap", () => {
    it("returns stable output for same seed and config", () => {
        const first = generateSeededTileMap({
            width: 12,
            height: 8,
            seed: "alpha-seed",
            fillProbability: 0.4,
            borderSolid: true,
        });

        const second = generateSeededTileMap({
            width: 12,
            height: 8,
            seed: "alpha-seed",
            fillProbability: 0.4,
            borderSolid: true,
        });

        expect(first).toEqual(second);
    });

    it("changes output when seed changes", () => {
        const first = generateSeededTileMap({
            width: 10,
            height: 6,
            seed: "seed-a",
            fillProbability: 0.3,
            borderSolid: false,
        });

        const second = generateSeededTileMap({
            width: 10,
            height: 6,
            seed: "seed-b",
            fillProbability: 0.3,
            borderSolid: false,
        });

        expect(first.tiles).not.toEqual(second.tiles);
    });

    it("enforces solid borders when borderSolid is true", () => {
        const map = generateSeededTileMap({
            width: 7,
            height: 5,
            seed: 42,
            fillProbability: 0,
            borderSolid: true,
            solidTileValue: 9,
            emptyTileValue: 2,
        });

        for (let x = 0; x < map.width; x += 1) {
            expect(map.tiles[0][x]).toBe(9);
            expect(map.tiles[map.height - 1][x]).toBe(9);
        }

        for (let y = 0; y < map.height; y += 1) {
            expect(map.tiles[y][0]).toBe(9);
            expect(map.tiles[y][map.width - 1]).toBe(9);
        }
    });

    it("throws for invalid dimensions", () => {
        expect(() =>
            generateSeededTileMap({ width: 0, height: 4, seed: "x" }),
        ).toThrow(/width must be a positive integer/i);

        expect(() =>
            generateSeededTileMap({ width: 4, height: -1, seed: "x" }),
        ).toThrow(/height must be a positive integer/i);
    });
});
