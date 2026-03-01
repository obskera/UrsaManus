import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    applyTileMapRuntimeBootstrap,
    resolveTileMapRuntimeBootstrap,
} from "@/services/tileMapRuntimeBootstrap";
import {
    TOOL_RECOVERY_SNAPSHOT_VERSION,
    buildToolRecoveryStorageKey,
} from "@/services/toolRecoverySnapshot";

describe("tileMapRuntimeBootstrap", () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    it("resolves world bootstrap dimensions from tilemap recovery snapshot", () => {
        const tilemapPayload = {
            version: "um-tilemap-v1",
            map: {
                width: 4,
                height: 3,
            },
            selectedLayerId: "collision",
            overlays: [
                {
                    id: "objective-1",
                    name: "Objective",
                    type: "object",
                    tag: "objective",
                    x: 1,
                    y: 2,
                    roomIndex: 0,
                    tileId: 18,
                },
            ],
            layers: [
                {
                    id: "base",
                    name: "Base",
                    visible: true,
                    tiles: [1, 0, 0, 0, 0, 2, 0, 0, 0, 0, 3, 0],
                },
                {
                    id: "collision",
                    name: "Collision",
                    visible: false,
                    tiles: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
                },
            ],
        };

        window.localStorage.setItem(
            buildToolRecoveryStorageKey("tilemap"),
            JSON.stringify({
                version: TOOL_RECOVERY_SNAPSHOT_VERSION,
                toolKey: "tilemap",
                savedAt: "2026-03-01T00:00:00.000Z",
                payloadRaw: JSON.stringify(tilemapPayload),
            }),
        );

        const result = resolveTileMapRuntimeBootstrap({
            tileSize: 16,
            collisionProfile: {
                solidLayerNameContains: ["collision"],
                solidTileIds: [4],
                fallbackToVisibleNonZero: false,
            },
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.payload.map).toEqual({ width: 4, height: 3 });
            expect(result.payload.world).toEqual({ width: 64, height: 48 });
            expect(result.payload.layerCount).toBe(2);
            expect(result.payload.filledTileCount).toBe(15);
            expect(result.payload.solidTiles).toEqual([
                { x: 0, y: 0, tileId: 4 },
                { x: 1, y: 0, tileId: 4 },
                { x: 2, y: 0, tileId: 4 },
                { x: 3, y: 0, tileId: 4 },
                { x: 0, y: 1, tileId: 4 },
                { x: 1, y: 1, tileId: 4 },
                { x: 2, y: 1, tileId: 4 },
                { x: 3, y: 1, tileId: 4 },
                { x: 0, y: 2, tileId: 4 },
                { x: 1, y: 2, tileId: 4 },
                { x: 2, y: 2, tileId: 4 },
                { x: 3, y: 2, tileId: 4 },
            ]);
            expect(result.payload.overlays).toEqual([
                {
                    id: "objective-1",
                    name: "Objective",
                    type: "object",
                    tag: "objective",
                    x: 1,
                    y: 2,
                    roomIndex: 0,
                    tileId: 18,
                },
            ]);
        }
    });

    it("supports visible non-zero fallback when enabled", () => {
        const tilemapPayload = {
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
                    tiles: [1, 0, 0, 2],
                },
            ],
            overlays: [],
        };

        window.localStorage.setItem(
            buildToolRecoveryStorageKey("tilemap"),
            JSON.stringify({
                version: TOOL_RECOVERY_SNAPSHOT_VERSION,
                toolKey: "tilemap",
                savedAt: "2026-03-01T00:00:00.000Z",
                payloadRaw: JSON.stringify(tilemapPayload),
            }),
        );

        const result = resolveTileMapRuntimeBootstrap({
            collisionProfile: {
                solidLayerNameContains: ["collision"],
                fallbackToVisibleNonZero: true,
            },
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.payload.solidTiles).toEqual([
                { x: 0, y: 0, tileId: 1 },
                { x: 1, y: 1, tileId: 2 },
            ]);
        }
    });

    it("uses authored collision profile from payload when override is omitted", () => {
        const tilemapPayload = {
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
                    tiles: [1, 0, 0, 2],
                },
                {
                    id: "walls",
                    name: "Collision Walls",
                    visible: true,
                    tiles: [0, 3, 4, 0],
                },
            ],
            overlays: [
                {
                    id: "enemy-spot",
                    name: "Enemy Spot",
                    type: "enemy",
                    tag: "enemy",
                    x: 0,
                    y: 1,
                    roomIndex: 0,
                },
            ],
            collisionProfile: {
                solidLayerIds: ["walls"],
                solidLayerNameContains: [],
                solidTileIds: [3],
                fallbackToVisibleNonZero: false,
            },
        };

        window.localStorage.setItem(
            buildToolRecoveryStorageKey("tilemap"),
            JSON.stringify({
                version: TOOL_RECOVERY_SNAPSHOT_VERSION,
                toolKey: "tilemap",
                savedAt: "2026-03-01T00:00:00.000Z",
                payloadRaw: JSON.stringify(tilemapPayload),
            }),
        );

        const result = resolveTileMapRuntimeBootstrap();

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.payload.solidTiles).toEqual([
                { x: 1, y: 0, tileId: 3 },
            ]);
            expect(result.payload.overlays).toEqual([
                {
                    id: "enemy-spot",
                    name: "Enemy Spot",
                    type: "enemy",
                    tag: "enemy",
                    x: 0,
                    y: 1,
                    roomIndex: 0,
                },
            ]);
        }
    });

    it("returns missing when no recovery snapshot exists", () => {
        const result = resolveTileMapRuntimeBootstrap();

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.missing).toBe(true);
        }
    });

    it("applies runtime bootstrap to target world settings", () => {
        const updaterCalls: Array<unknown> = [];
        const target = {
            setWorldSize: vi.fn(),
            setWorldBoundsEnabled: vi.fn(),
            setState: vi.fn((updater) => {
                updaterCalls.push(updater);
            }),
        };

        applyTileMapRuntimeBootstrap(target, {
            source: "tilemap-recovery",
            map: { width: 4, height: 3 },
            world: { width: 64, height: 48 },
            tileSize: 16,
            layerCount: 1,
            filledTileCount: 3,
            solidTiles: [
                { x: 0, y: 0, tileId: 1 },
                { x: 3, y: 2, tileId: 9 },
            ],
            overlays: [
                {
                    id: "enemy-1",
                    name: "Enemy 1",
                    type: "enemy",
                    tag: "enemy",
                    x: 1,
                    y: 1,
                    roomIndex: 0,
                    tileId: 22,
                },
            ],
        });

        expect(target.setWorldSize).toHaveBeenCalledWith(64, 48);
        expect(target.setWorldBoundsEnabled).toHaveBeenCalledWith(true);
        expect(target.setState).toHaveBeenCalledTimes(1);

        const updater = updaterCalls[0] as (prev: {
            entitiesById: Record<string, unknown>;
        }) => {
            entitiesById: Record<string, unknown>;
        };
        const nextState = updater({
            entitiesById: {
                "tilemap-obstacle:stale": {
                    id: "tilemap-obstacle:stale",
                },
                player: { id: "player" },
            },
        });

        expect(
            nextState.entitiesById["tilemap-obstacle:stale"],
        ).toBeUndefined();
        expect(nextState.entitiesById.player).toEqual({ id: "player" });
        expect(nextState.entitiesById["tilemap-obstacle:0:0"]).toBeDefined();
        expect(nextState.entitiesById["tilemap-obstacle:3:2"]).toBeDefined();
        expect(nextState.entitiesById["tilemap-overlay:enemy-1"]).toBeDefined();
    });
});
