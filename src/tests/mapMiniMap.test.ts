import { afterEach, describe, expect, it } from "vitest";
import { signalBus } from "@/services/signalBus";
import {
    MAP_DISCOVERY_UPDATED_SIGNAL,
    MAP_PLAYER_UPDATED_SIGNAL,
    MAP_VIEW_CHANGED_SIGNAL,
    createMapMiniMapService,
} from "@/services/mapMiniMap";

describe("map + minimap service", () => {
    afterEach(() => {
        signalBus.clear();
    });

    it("tracks discovery/fog state with world-position helpers", () => {
        const service = createMapMiniMapService();
        service.setWorld({ width: 160, height: 160, tileSize: 16 });

        expect(service.discoverTile(0, 0)).toBe(true);
        expect(service.discoverTile(0, 0)).toBe(false);

        expect(service.discoverAtWorldPosition(17, 17)).toBe(true);
        expect(service.isDiscoveredTile(1, 1)).toBe(true);

        const discovered = service.discoverAroundWorldPosition(32, 32, 1);
        expect(discovered).toBeGreaterThan(0);

        const snapshot = service.getSnapshot();
        expect(snapshot.discoveredTileCount).toBeGreaterThanOrEqual(3);
    });

    it("applies zoom/scale policies and layer visibility", () => {
        const service = createMapMiniMapService();
        service.setZoomPolicy("minimap", {
            min: 0.5,
            max: 2,
            default: 1,
            minimapRadiusPx: 200,
        });

        expect(service.setZoom("minimap", 10)).toBe(2);
        expect(service.setZoom("minimap", 0.1)).toBe(0.5);

        service.setLayerVisibility("map", "npc", false);
        const snapshot = service.getSnapshot();
        expect(snapshot.layerVisibility.map.npc).toBe(false);
        expect(snapshot.zoomByChannel.minimap).toBe(0.5);
    });

    it("resolves map/minimap markers with layer and radius filtering", () => {
        const service = createMapMiniMapService({
            markerResolver: ({ channel }) => [
                {
                    id: "obj-1",
                    category: "objective",
                    label: "Main",
                    position: { x: 120, y: 100 },
                    priority: 10,
                },
                {
                    id: "npc-1",
                    category: "interaction",
                    label: "Vendor",
                    position: { x: 340, y: 100 },
                    priority: 8,
                    metadata: { mapLayer: "npc" },
                },
                {
                    id: "chk-1",
                    category: "navigation",
                    label: "Checkpoint",
                    position: { x: 140, y: 110 },
                    priority: 7,
                },
                ...(channel === "map"
                    ? [
                          {
                              id: "poi-1",
                              category: "poi",
                              label: "POI",
                              position: { x: 260, y: 120 },
                              priority: 6,
                          } as const,
                      ]
                    : []),
            ],
        });

        service.setPlayerPosition(100, 100);
        service.setZoomPolicy("minimap", {
            minimapRadiusPx: 120,
            max: 3,
            min: 0.5,
        });
        service.setZoom("minimap", 1);

        const mapMarkers = service.resolveMarkers({ channel: "map" });
        expect(mapMarkers.map((marker) => marker.id)).toEqual([
            "obj-1",
            "npc-1",
            "chk-1",
            "poi-1",
        ]);

        service.setLayerVisibility("map", "npc", false);
        const mapNoNpc = service.resolveMarkers({ channel: "map" });
        expect(mapNoNpc.map((marker) => marker.id)).toEqual([
            "obj-1",
            "chk-1",
            "poi-1",
        ]);

        const minimapMarkers = service.resolveMarkers({ channel: "minimap" });
        expect(minimapMarkers.map((marker) => marker.id)).toEqual([
            "obj-1",
            "chk-1",
        ]);
    });

    it("emits discovery/player/view lifecycle signals", () => {
        const events: string[] = [];

        signalBus.on(MAP_DISCOVERY_UPDATED_SIGNAL, () => {
            events.push("discovery");
        });
        signalBus.on(MAP_PLAYER_UPDATED_SIGNAL, () => {
            events.push("player");
        });
        signalBus.on(MAP_VIEW_CHANGED_SIGNAL, () => {
            events.push("view");
        });

        const service = createMapMiniMapService();
        service.setPlayerPosition(10, 12);
        service.discoverAtWorldPosition(8, 8);
        service.setLayerVisibility("minimap", "checkpoint", false);

        expect(events).toEqual(["player", "discovery", "view"]);
    });
});
