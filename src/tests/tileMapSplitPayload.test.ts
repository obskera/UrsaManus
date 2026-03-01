import { describe, expect, it } from "vitest";
import {
    assembleTileMapPayload,
    splitTileMapPayload,
} from "@/services/tileMapSplitPayload";
import type { TileMapPlacementPayload } from "@/services/tileMapPlacement";

describe("tileMapSplitPayload", () => {
    it("round-trips split/assemble without semantic drift", () => {
        const payload: TileMapPlacementPayload = {
            version: "um-tilemap-v1",
            map: {
                width: 2,
                height: 2,
            },
            selectedLayerId: "base",
            layers: [
                {
                    id: "base",
                    name: "Base",
                    visible: true,
                    locked: false,
                    tiles: [1, 0, 0, 2],
                },
                {
                    id: "collision",
                    name: "Collision",
                    visible: true,
                    locked: true,
                    tiles: [0, 4, 0, 4],
                },
            ],
            collisionProfile: {
                solidLayerIds: ["collision"],
                solidLayerNameContains: ["collision", "solid", "blocker"],
                solidTileIds: [4],
                fallbackToVisibleNonZero: false,
            },
            overlays: [
                {
                    id: "objective-1",
                    name: "Objective",
                    type: "object",
                    tag: "objective",
                    x: 1,
                    y: 1,
                    roomIndex: 0,
                    tileId: 11,
                },
            ],
        };

        const split = splitTileMapPayload(payload);
        const assembled = assembleTileMapPayload(split);

        expect(assembled).toEqual(payload);
    });
});
