import { afterEach, describe, expect, it } from "vitest";
import { signalBus } from "@/services/signalBus";
import {
    TILE_MAP_PLACEMENT_CHANGED_SIGNAL,
    TILE_MAP_PLACEMENT_IMPORTED_SIGNAL,
    TILE_MAP_PLACEMENT_INVALID_SIGNAL,
    TILE_MAP_PLACEMENT_PAYLOAD_VERSION,
    TILE_MAP_PLACEMENT_SELECTED_LAYER_SIGNAL,
    createTileMapPlacementService,
} from "@/services/tileMapPlacement";

describe("tile map placement service", () => {
    afterEach(() => {
        signalBus.clear();
    });

    it("supports layered tile placement and erase workflows", () => {
        const service = createTileMapPlacementService();
        service.setMapBounds({ width: 4, height: 3 });

        const addLayerResult = service.addLayer({
            id: "collision",
            name: "Collision",
            select: true,
        });
        expect(addLayerResult.ok).toBe(true);

        expect(service.placeTile(1, 1, 7).ok).toBe(true);
        expect(service.getTileAt(1, 1)).toBe(7);

        expect(service.eraseTile(1, 1).ok).toBe(true);
        expect(service.getTileAt(1, 1)).toBe(0);

        expect(service.setLayerVisibility("collision", false)).toBe(true);

        const snapshot = service.getSnapshot();
        expect(snapshot.layerCount).toBe(2);
        expect(snapshot.layers.map((layer) => layer.id)).toEqual([
            "base",
            "collision",
        ]);
        expect(snapshot.layers[1].visible).toBe(false);
    });

    it("supports overlay entity authoring in map coordinates", () => {
        const service = createTileMapPlacementService();
        service.setMapBounds({ width: 4, height: 3 });

        const added = service.addOverlayEntity({
            id: "spawn-1",
            name: "Spawn Point",
            type: "object",
            tag: "objective",
            x: 2,
            y: 1,
            roomIndex: 0,
            tileId: 7,
        });

        expect(added.ok).toBe(true);
        const snapshot = service.getSnapshot();
        expect(snapshot.overlays).toEqual([
            {
                id: "spawn-1",
                name: "Spawn Point",
                type: "object",
                tag: "objective",
                x: 2,
                y: 1,
                roomIndex: 0,
                tileId: 7,
            },
        ]);

        expect(service.removeOverlayEntity("spawn-1")).toBe(true);
        expect(service.getSnapshot().overlays).toEqual([]);
    });

    it("supports lock, reorder, duplicate, and merge layer workflows", () => {
        const service = createTileMapPlacementService();
        service.setMapBounds({ width: 3, height: 2 });

        expect(service.addLayer({ id: "mid" }).ok).toBe(true);
        expect(service.addLayer({ id: "top", select: true }).ok).toBe(true);

        expect(service.setLayerLocked("top", true)).toBe(true);
        const lockedEdit = service.placeTile(0, 0, 3, "top");
        expect(lockedEdit.ok).toBe(false);
        expect(lockedEdit.code).toBe("layer-locked");

        expect(service.setLayerLocked("top", false)).toBe(true);
        expect(service.placeTile(1, 1, 8, "top").ok).toBe(true);

        expect(service.moveLayer("top", "up")).toBe(true);
        expect(service.moveLayer("top", "up")).toBe(true);

        expect(service.duplicateLayer("top", "top-copy").ok).toBe(true);

        expect(service.placeTile(0, 0, 5, "top-copy").ok).toBe(true);
        expect(
            service.mergeLayerInto("top-copy", "base", { removeSource: true })
                .ok,
        ).toBe(true);

        const snapshot = service.getSnapshot();
        expect(snapshot.layers.map((layer) => layer.id)).not.toContain(
            "top-copy",
        );
        expect(service.getTileAt(0, 0, "base")).toBe(5);
    });

    it("returns validation failures for out-of-bounds and invalid tile ids", () => {
        const service = createTileMapPlacementService();
        service.setMapBounds({ width: 2, height: 2 });

        const outOfBounds = service.placeTile(3, 0, 1);
        expect(outOfBounds.ok).toBe(false);
        expect(outOfBounds.code).toBe("out-of-bounds");

        const invalidTile = service.placeTile(0, 0, -1);
        expect(invalidTile.ok).toBe(false);
        expect(invalidTile.code).toBe("invalid-tile-id");

        expect(service.removeLayer("base")).toBe(false);
    });

    it("exports and imports deterministic payloads", () => {
        const service = createTileMapPlacementService();
        service.setMapBounds({ width: 3, height: 2 });
        service.placeTile(0, 0, 1);
        service.placeTile(2, 1, 9);
        service.addLayer({ id: "decor", select: true });
        service.placeTile(1, 1, 4);
        service.addOverlayEntity({
            name: "Quest Marker",
            type: "object",
            tag: "objective",
            x: 2,
            y: 0,
            roomIndex: 1,
            tileId: 12,
        });
        service.setCollisionProfile({
            solidLayerIds: ["decor"],
            solidLayerNameContains: ["collision", "walls"],
            solidTileIds: [4, 9],
            fallbackToVisibleNonZero: false,
        });

        const raw = service.exportPayload({ pretty: true });
        const payload = JSON.parse(raw) as {
            version: string;
            layers: Array<{ id: string; tiles: number[] }>;
            map: { width: number; height: number };
            overlays?: Array<{
                id: string;
                name: string;
                type: string;
                tag: string;
                x: number;
                y: number;
                roomIndex: number;
                tileId?: number;
            }>;
            collisionProfile?: {
                solidLayerIds?: string[];
                solidLayerNameContains?: string[];
                solidTileIds?: number[];
                fallbackToVisibleNonZero?: boolean;
            };
        };

        expect(payload.version).toBe(TILE_MAP_PLACEMENT_PAYLOAD_VERSION);
        expect(payload.map).toEqual({ width: 3, height: 2 });
        expect(payload.layers.map((layer) => layer.id)).toEqual([
            "base",
            "decor",
        ]);
        expect(payload.overlays).toEqual([
            {
                id: "overlay:0",
                name: "Quest Marker",
                type: "object",
                tag: "objective",
                x: 2,
                y: 0,
                roomIndex: 1,
                tileId: 12,
            },
        ]);
        expect(payload.collisionProfile).toEqual({
            solidLayerIds: ["decor"],
            solidLayerNameContains: ["collision", "walls"],
            solidTileIds: [4, 9],
            fallbackToVisibleNonZero: false,
        });

        const imported = createTileMapPlacementService();
        const result = imported.importPayload(raw);
        expect(result.ok).toBe(true);

        const snapshot = imported.getSnapshot();
        expect(snapshot.map).toEqual({ width: 3, height: 2 });
        expect(snapshot.layers.map((layer) => layer.id)).toEqual([
            "base",
            "decor",
        ]);
        expect(snapshot.overlays).toEqual([
            {
                id: "overlay:0",
                name: "Quest Marker",
                type: "object",
                tag: "objective",
                x: 2,
                y: 0,
                roomIndex: 1,
                tileId: 12,
            },
        ]);
        expect(snapshot.collisionProfile).toEqual({
            solidLayerIds: ["decor"],
            solidLayerNameContains: ["collision", "walls"],
            solidTileIds: [4, 9],
            fallbackToVisibleNonZero: false,
        });
        expect(imported.getTileAt(2, 1, "base")).toBe(9);
        expect(imported.getTileAt(1, 1, "decor")).toBe(4);
    });

    it("emits changed/selected/imported/invalid signals", () => {
        const events: string[] = [];

        signalBus.on(TILE_MAP_PLACEMENT_CHANGED_SIGNAL, () => {
            events.push("changed");
        });
        signalBus.on(
            TILE_MAP_PLACEMENT_SELECTED_LAYER_SIGNAL,
            (event: { layerId: string | null }) => {
                events.push(`selected:${event.layerId ?? "none"}`);
            },
        );
        signalBus.on(TILE_MAP_PLACEMENT_IMPORTED_SIGNAL, () => {
            events.push("imported");
        });
        signalBus.on(TILE_MAP_PLACEMENT_INVALID_SIGNAL, () => {
            events.push("invalid");
        });

        const service = createTileMapPlacementService();
        service.addLayer({ id: "foreground", select: true });
        service.placeTile(100, 100, 1);
        const payload = service.exportPayload();
        service.importPayload(payload);

        expect(events).toContain("changed");
        expect(events.some((event) => event.startsWith("selected:"))).toBe(
            true,
        );
        expect(events).toContain("invalid");
        expect(events).toContain("imported");
    });
});
