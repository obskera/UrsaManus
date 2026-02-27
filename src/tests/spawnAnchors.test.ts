import { describe, expect, it } from "vitest";
import { generateSeededRoomMap, generateSpawnAnchors } from "@/logic/worldgen";

describe("generateSpawnAnchors", () => {
    const roomMap = generateSeededRoomMap({
        width: 36,
        height: 24,
        seed: "spawn-room-map",
        roomCount: 9,
        roomMinSize: 4,
        roomMaxSize: 8,
    });

    it("returns stable anchor output for same seed and room set", () => {
        const first = generateSpawnAnchors({
            rooms: roomMap.rooms,
            seed: "spawn-seed",
            enemyCount: 3,
            itemCount: 2,
        });

        const second = generateSpawnAnchors({
            rooms: roomMap.rooms,
            seed: "spawn-seed",
            enemyCount: 3,
            itemCount: 2,
        });

        expect(first).toEqual(second);
    });

    it("keeps player and objective in distinct rooms by default", () => {
        const anchors = generateSpawnAnchors({
            rooms: roomMap.rooms,
            seed: "distinct-start-objective",
        });

        expect(anchors.playerStart.roomIndex).not.toBe(
            anchors.objective.roomIndex,
        );
    });

    it("supports sprite-tile marker ids for anchor categories", () => {
        const anchors = generateSpawnAnchors({
            rooms: roomMap.rooms,
            seed: "tile-id-markers",
            enemyCount: 2,
            itemCount: 1,
            tileIds: {
                playerStart: 501,
                objective: 502,
                enemy: 503,
                item: 504,
            },
        });

        expect(anchors.playerStart.tileId).toBe(501);
        expect(anchors.objective.tileId).toBe(502);
        for (const enemy of anchors.enemySpawns) {
            expect(enemy.tileId).toBe(503);
        }
        for (const item of anchors.itemSpawns) {
            expect(item.tileId).toBe(504);
        }
    });

    it("throws when rooms are empty", () => {
        expect(() =>
            generateSpawnAnchors({
                rooms: [],
                seed: "bad",
            }),
        ).toThrow(/rooms must include at least one room/i);
    });
});
