import { describe, expect, it } from "vitest";
import {
    spawnAnchorToWorld,
    spawnAnchorsToWorld,
    tileToWorldPosition,
} from "@/logic/worldgen";

describe("tileToWorldPosition", () => {
    it("converts tile coordinates to top-left world coordinates", () => {
        const position = tileToWorldPosition(3, 2, {
            tileWidth: 16,
            tileHeight: 12,
            originX: 8,
            originY: 4,
            anchor: "top-left",
        });

        expect(position).toEqual({ x: 56, y: 28 });
    });

    it("supports center-anchor conversion", () => {
        const position = tileToWorldPosition(1, 1, {
            tileWidth: 10,
            tileHeight: 6,
            anchor: "center",
        });

        expect(position).toEqual({ x: 15, y: 9 });
    });

    it("throws for invalid dimensions or non-integer tile coords", () => {
        expect(() =>
            tileToWorldPosition(1.2, 0, {
                tileWidth: 16,
            }),
        ).toThrow(/integer tile coordinate/i);

        expect(() =>
            tileToWorldPosition(1, 0, {
                tileWidth: 0,
            }),
        ).toThrow(/tileWidth must be a positive number/i);
    });
});

describe("spawnAnchorToWorld", () => {
    it("preserves anchor metadata and adds world coordinates", () => {
        const anchor = {
            x: 7,
            y: 5,
            roomIndex: 2,
            tileId: 503,
        };

        const worldAnchor = spawnAnchorToWorld(anchor, {
            tileWidth: 16,
            tileHeight: 16,
            originX: 32,
            originY: 16,
            anchor: "center",
        });

        expect(worldAnchor).toEqual({
            ...anchor,
            worldX: 152,
            worldY: 104,
        });
    });
});

describe("spawnAnchorsToWorld", () => {
    it("converts full anchor payload in one call", () => {
        const anchors = {
            playerStart: { x: 2, y: 3, roomIndex: 0, tileId: 601 },
            objective: { x: 8, y: 4, roomIndex: 1, tileId: 602 },
            enemySpawns: [
                { x: 6, y: 9, roomIndex: 2, tileId: 603 },
                { x: 10, y: 2, roomIndex: 3, tileId: 603 },
            ],
            itemSpawns: [{ x: 7, y: 7, roomIndex: 4, tileId: 604 }],
        };

        const worldAnchors = spawnAnchorsToWorld(anchors, {
            tileWidth: 16,
            tileHeight: 16,
            originX: 0,
            originY: 0,
            anchor: "center",
        });

        expect(worldAnchors.playerStart.worldX).toBe(40);
        expect(worldAnchors.playerStart.worldY).toBe(56);
        expect(worldAnchors.objective.worldX).toBe(136);
        expect(worldAnchors.objective.worldY).toBe(72);
        expect(worldAnchors.enemySpawns[0].worldX).toBe(104);
        expect(worldAnchors.enemySpawns[0].worldY).toBe(152);
        expect(worldAnchors.itemSpawns[0].worldX).toBe(120);
        expect(worldAnchors.itemSpawns[0].worldY).toBe(120);
        expect(worldAnchors.enemySpawns[0].tileId).toBe(603);
    });
});
