import { describe, expect, it } from "vitest";
import { generateSeededRoomMap } from "@/logic/worldgen";

describe("generateSeededRoomMap", () => {
    it("returns stable output for same seed and config", () => {
        const first = generateSeededRoomMap({
            width: 32,
            height: 20,
            seed: "rooms-alpha",
            roomCount: 6,
            roomMinSize: 3,
            roomMaxSize: 6,
        });

        const second = generateSeededRoomMap({
            width: 32,
            height: 20,
            seed: "rooms-alpha",
            roomCount: 6,
            roomMinSize: 3,
            roomMaxSize: 6,
        });

        expect(first).toEqual(second);
    });

    it("changes room layout when seed changes", () => {
        const first = generateSeededRoomMap({
            width: 28,
            height: 18,
            seed: "seed-1",
        });
        const second = generateSeededRoomMap({
            width: 28,
            height: 18,
            seed: "seed-2",
        });

        expect(first.tiles).not.toEqual(second.tiles);
    });

    it("supports sprite-tile-style ids for wall/floor/corridor", () => {
        const map = generateSeededRoomMap({
            width: 24,
            height: 16,
            seed: "tile-ids",
            wallTileValue: 11,
            roomFloorTileValue: 22,
            corridorTileValue: 33,
            roomCount: 5,
        });

        const allValues = new Set(map.tiles.flat());

        expect(allValues.has(11)).toBe(true);
        expect(allValues.has(22)).toBe(true);
        expect(allValues.has(33)).toBe(true);
        expect(map.rooms.length).toBeGreaterThan(0);
    });

    it("keeps borders solid when borderSolid is enabled", () => {
        const map = generateSeededRoomMap({
            width: 20,
            height: 12,
            seed: 77,
            wallTileValue: 9,
            borderSolid: true,
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
});
