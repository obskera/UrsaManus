import { afterEach, describe, expect, it } from "vitest";
import { signalBus } from "@/services/signalBus";
import {
    WORLD_ENTITY_IMPORTED_SIGNAL,
    WORLD_ENTITY_INVALID_SIGNAL,
    WORLD_ENTITY_PLACEMENT_CHANGED_SIGNAL,
    WORLD_ENTITY_SELECTED_SIGNAL,
    WORLD_ENTITY_PLACEMENT_PAYLOAD_VERSION,
    createWorldEntityPlacementService,
} from "@/services/worldEntityPlacement";

describe("world entity placement service", () => {
    afterEach(() => {
        signalBus.clear();
    });

    it("places entities with grid snap and bounds validation", () => {
        const service = createWorldEntityPlacementService();
        service.setWorldBounds({ width: 64, height: 64 });
        service.setGridOptions({ enabled: true, size: 16 });

        const placed = service.placeEntity({
            id: "npc-1",
            name: "NPC 1",
            type: "enemy",
            tag: "enemy",
            x: 11,
            y: 26,
        });
        expect(placed.ok).toBe(true);

        const snapshot = service.getSnapshot();
        expect(snapshot.entities[0].position).toEqual({ x: 16, y: 32 });

        const outOfBounds = service.placeEntity({
            id: "npc-2",
            name: "NPC 2",
            type: "enemy",
            tag: "enemy",
            x: 300,
            y: 10,
        });
        expect(outOfBounds.ok).toBe(false);
        expect(outOfBounds.code).toBe("out-of-bounds");
    });

    it("supports select/drag(move)/duplicate/delete workflows", () => {
        const service = createWorldEntityPlacementService();
        service.setWorldBounds({ width: 256, height: 256 });

        service.placeEntity({
            id: "enemy-a",
            name: "Enemy A",
            type: "enemy",
            tag: "enemy",
            x: 20,
            y: 20,
        });

        expect(service.selectEntity("enemy-a")).toBe(true);
        expect(service.moveSelected(40, 44).ok).toBe(true);

        const duplicated = service.duplicateSelected({
            offsetX: 16,
            offsetY: 0,
            idSuffix: "dupe",
        });
        expect(duplicated.ok).toBe(true);

        const snapshot = service.getSnapshot();
        expect(snapshot.entityCount).toBe(2);
        expect(snapshot.entities.map((entity) => entity.id)).toEqual([
            "enemy-a",
            "enemy-a:dupe",
        ]);

        expect(service.deleteEntity("enemy-a")).toBe(true);
        expect(service.getSnapshot().entityCount).toBe(1);
    });

    it("exports/imports placement JSON for level bootstrap payloads", () => {
        const service = createWorldEntityPlacementService();
        service.setWorldBounds({ width: 128, height: 96 });
        service.setGridOptions({ enabled: false, size: 8 });

        service.placeEntity({
            id: "item-1",
            name: "Item 1",
            type: "object",
            tag: "item",
            x: 30,
            y: 50,
            roomIndex: 2,
            tileId: 701,
        });

        const raw = service.exportPayload({ pretty: true });
        const parsed = JSON.parse(raw) as {
            version: string;
            entities: Array<{ id: string }>;
        };

        expect(parsed.version).toBe(WORLD_ENTITY_PLACEMENT_PAYLOAD_VERSION);
        expect(parsed.entities.map((entity) => entity.id)).toEqual(["item-1"]);

        const imported = createWorldEntityPlacementService();
        const importResult = imported.importPayload(raw);
        expect(importResult.ok).toBe(true);

        const importedSnapshot = imported.getSnapshot();
        expect(importedSnapshot.entityCount).toBe(1);
        expect(importedSnapshot.entities[0].roomIndex).toBe(2);
        expect(importedSnapshot.entities[0].tileId).toBe(701);
    });

    it("emits placement/selection/import/invalid lifecycle signals", () => {
        const events: string[] = [];

        signalBus.on(WORLD_ENTITY_PLACEMENT_CHANGED_SIGNAL, () => {
            events.push("changed");
        });
        signalBus.on(
            WORLD_ENTITY_SELECTED_SIGNAL,
            (event: { entityId: string | null }) => {
                events.push(`selected:${event.entityId ?? "none"}`);
            },
        );
        signalBus.on(WORLD_ENTITY_IMPORTED_SIGNAL, () => {
            events.push("imported");
        });
        signalBus.on(WORLD_ENTITY_INVALID_SIGNAL, () => {
            events.push("invalid");
        });

        const service = createWorldEntityPlacementService();
        service.setWorldBounds({ width: 32, height: 32 });
        service.placeEntity({
            id: "a",
            name: "A",
            type: "object",
            tag: "item",
            x: 8,
            y: 8,
        });
        service.selectEntity("a");
        service.placeEntity({
            id: "bad",
            name: "Bad",
            type: "object",
            tag: "item",
            x: 100,
            y: 100,
        });

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
