import { afterEach, describe, expect, it } from "vitest";
import { signalBus } from "@/services/signalBus";
import {
    NAVIGATION_FLOW_FIELD_RESOLVED_SIGNAL,
    NAVIGATION_GRID_UPDATED_SIGNAL,
    NAVIGATION_PATH_RESOLVED_SIGNAL,
    createPathfindingNavigationService,
} from "@/services/pathfindingNavigation";

describe("pathfinding navigation service", () => {
    afterEach(() => {
        signalBus.clear();
    });

    it("finds deterministic A* paths through tile-grid corridors", () => {
        const service = createPathfindingNavigationService();
        service.setGrid({
            width: 7,
            height: 5,
            tiles: [
                [1, 1, 1, 1, 1, 1, 1],
                [1, 0, 0, 0, 1, 0, 1],
                [1, 1, 1, 0, 1, 0, 1],
                [1, 0, 0, 0, 0, 0, 1],
                [1, 1, 1, 1, 1, 1, 1],
            ],
        });
        service.setWalkableTileValues([0]);

        const path = service.findPath({ x: 1, y: 1 }, { x: 5, y: 1 });

        expect(path.found).toBe(true);
        expect(path.nodes).toEqual([
            { x: 1, y: 1 },
            { x: 2, y: 1 },
            { x: 3, y: 1 },
            { x: 3, y: 2 },
            { x: 3, y: 3 },
            { x: 4, y: 3 },
            { x: 5, y: 3 },
            { x: 5, y: 2 },
            { x: 5, y: 1 },
        ]);
        expect(path.cost).toBe(8);
    });

    it("supports dynamic blockers and unreachable path results", () => {
        const service = createPathfindingNavigationService();
        service.setGrid({
            width: 5,
            height: 5,
            tiles: [
                [0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0],
            ],
        });

        expect(service.setDynamicBlocker(2, 2, true)).toBe(true);
        expect(service.isWalkable(2, 2)).toBe(false);

        const blocked = service.findPath({ x: 1, y: 2 }, { x: 3, y: 2 });
        expect(blocked.found).toBe(true);
        expect(blocked.nodes.some((node) => node.x === 2 && node.y === 2)).toBe(
            false,
        );

        service.setDynamicBlocker(2, 1, true);
        service.setDynamicBlocker(2, 3, true);
        service.setDynamicBlocker(1, 2, true);
        service.setDynamicBlocker(3, 2, true);

        const unreachable = service.findPath({ x: 0, y: 0 }, { x: 2, y: 2 });
        expect(unreachable.found).toBe(false);

        service.clearDynamicBlockers();
        expect(service.getSnapshot().dynamicBlockedCount).toBe(0);
    });

    it("builds flow fields for navigation-grid steering queries", () => {
        const service = createPathfindingNavigationService();
        service.setGrid({
            width: 6,
            height: 4,
            tiles: [
                [0, 0, 0, 0, 0, 0],
                [0, 1, 1, 1, 1, 0],
                [0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0],
            ],
        });

        const field = service.buildFlowField({ x: 5, y: 0 });
        const next = service.getNextFlowStep(field, { x: 0, y: 0 });
        expect(next).toEqual({ x: 1, y: 0 });

        const aroundWall = service.getNextFlowStep(field, { x: 0, y: 2 });
        expect(aroundWall).not.toBeNull();

        const blocked = service.getNextFlowStep(field, { x: 1, y: 1 });
        expect(blocked).toBeNull();
    });

    it("converts between world-space and tile-space and emits lifecycle signals", () => {
        const service = createPathfindingNavigationService();
        service.setGrid({
            width: 4,
            height: 4,
            tiles: [
                [0, 0, 0, 0],
                [0, 0, 0, 0],
                [0, 0, 0, 0],
                [0, 0, 0, 0],
            ],
        });
        service.setWorldConfig({
            tileWidth: 10,
            tileHeight: 20,
            originX: 5,
            originY: 10,
        });

        const events: string[] = [];
        signalBus.on(NAVIGATION_GRID_UPDATED_SIGNAL, () => {
            events.push("grid");
        });
        signalBus.on(NAVIGATION_PATH_RESOLVED_SIGNAL, () => {
            events.push("path");
        });
        signalBus.on(NAVIGATION_FLOW_FIELD_RESOLVED_SIGNAL, () => {
            events.push("flow");
        });

        expect(service.worldToTile(26, 51)).toEqual({ x: 2, y: 2 });
        expect(service.tileToWorld(2, 2)).toEqual({ x: 30, y: 60 });
        expect(service.tileToWorld(2, 2, "top-left")).toEqual({ x: 25, y: 50 });

        service.setDynamicBlocker(0, 0, true);
        service.findPath({ x: 1, y: 1 }, { x: 3, y: 3 });
        service.buildFlowField({ x: 3, y: 3 });

        expect(events).toContain("grid");
        expect(events).toContain("path");
        expect(events).toContain("flow");
    });
});
