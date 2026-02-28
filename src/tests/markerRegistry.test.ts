import { afterEach, describe, expect, it, vi } from "vitest";
import { signalBus } from "@/services/signalBus";
import {
    MARKER_REGISTRY_CHANGED_SIGNAL,
    createMarkerRegistry,
} from "@/services/markerRegistry";

type MarkerContext = {
    questActive: boolean;
    playerCanInteract: boolean;
};

describe("marker registry", () => {
    afterEach(() => {
        signalBus.clear();
    });

    it("stores, updates, removes, and snapshots markers", () => {
        const registry = createMarkerRegistry<MarkerContext>();

        registry.setMarker({
            id: "obj-main",
            category: "objective",
            label: "Main Objective",
            priority: 7,
        });

        expect(registry.getSnapshot().total).toBe(1);
        expect(registry.getMarker("obj-main")?.priority).toBe(7);

        registry.setMarker({
            id: "obj-main",
            category: "objective",
            label: "Updated Objective",
            priority: 11,
        });

        expect(registry.getMarker("obj-main")?.label).toBe("Updated Objective");
        expect(registry.getMarker("obj-main")?.priority).toBe(11);

        expect(registry.removeMarker("obj-main")).toBe(true);
        expect(registry.removeMarker("obj-main")).toBe(false);
        expect(registry.getSnapshot().total).toBe(0);
    });

    it("filters by channel and visibility predicate", () => {
        const registry = createMarkerRegistry<MarkerContext>();

        registry.setMarkers([
            {
                id: "poi-vendor",
                category: "poi",
                label: "Vendor",
                priority: 3,
                visibility: {
                    channels: ["map", "minimap"],
                },
            },
            {
                id: "prompt-door",
                category: "interaction",
                label: "Open Door",
                priority: 9,
                visibility: {
                    channels: ["interaction-prompt"],
                    predicate: (ctx) => ctx.playerCanInteract,
                },
            },
            {
                id: "quest-main",
                category: "objective",
                label: "Find Relic",
                priority: 8,
                visibility: {
                    channels: ["objective-tracker", "map"],
                    predicate: (ctx) => ctx.questActive,
                },
            },
        ]);

        const mapMarkers = registry.resolveMarkers({
            channel: "map",
            context: {
                questActive: true,
                playerCanInteract: false,
            },
        });
        expect(mapMarkers.map((entry) => entry.id)).toEqual([
            "quest-main",
            "poi-vendor",
        ]);

        const interactionPromptMarkers = registry.resolveMarkers({
            channel: "interaction-prompt",
            context: {
                questActive: true,
                playerCanInteract: false,
            },
        });
        expect(interactionPromptMarkers).toEqual([]);

        const interactionPromptReady = registry.resolveMarkers({
            channel: "interaction-prompt",
            context: {
                questActive: true,
                playerCanInteract: true,
            },
        });
        expect(interactionPromptReady.map((entry) => entry.id)).toEqual([
            "prompt-door",
        ]);
    });

    it("applies stack-group priority winner selection", () => {
        const registry = createMarkerRegistry<MarkerContext>();

        registry.setMarkers([
            {
                id: "stack-low",
                category: "poi",
                label: "POI Low",
                priority: 2,
                stackGroup: "poi-cluster",
            },
            {
                id: "stack-high",
                category: "poi",
                label: "POI High",
                priority: 9,
                stackGroup: "poi-cluster",
            },
            {
                id: "objective",
                category: "objective",
                label: "Main",
                priority: 10,
            },
        ]);

        const resolved = registry.resolveMarkers();
        expect(resolved.map((entry) => entry.id)).toEqual([
            "objective",
            "stack-high",
        ]);
    });

    it("supports category filters and result limit", () => {
        const registry = createMarkerRegistry<MarkerContext>();

        registry.setMarkers([
            {
                id: "obj-main",
                category: "objective",
                label: "Main",
                priority: 9,
            },
            {
                id: "obj-side",
                category: "objective",
                label: "Side",
                priority: 5,
            },
            {
                id: "poi-camp",
                category: "poi",
                label: "Camp",
                priority: 7,
            },
        ]);

        const objectivesOnly = registry.resolveMarkers({
            categories: ["objective"],
            limit: 1,
        });

        expect(objectivesOnly).toHaveLength(1);
        expect(objectivesOnly[0].id).toBe("obj-main");
    });

    it("emits registry changed signal on mutations", () => {
        const registry = createMarkerRegistry<MarkerContext>();
        const handler = vi.fn();

        signalBus.on(MARKER_REGISTRY_CHANGED_SIGNAL, handler);

        registry.setMarker({
            id: "poi-1",
            category: "poi",
            label: "POI",
        });
        registry.setMarkers([
            {
                id: "obj-1",
                category: "objective",
                label: "Objective",
            },
        ]);
        registry.removeMarker("obj-1");
        registry.clearMarkers();

        expect(handler).toHaveBeenCalledTimes(3);
    });
});
