import { describe, expect, it } from "vitest";
import { createWorldgenScenario } from "@/logic/worldgen";

describe("createWorldgenScenario", () => {
    it("returns deterministic map, anchors, and world anchors for same config", () => {
        const first = createWorldgenScenario({
            map: {
                width: 40,
                height: 24,
                seed: "scenario-alpha",
                roomCount: 9,
                roomMinSize: 4,
                roomMaxSize: 8,
            },
            spawns: {
                enemyCount: 4,
                itemCount: 3,
                tileIds: {
                    playerStart: 701,
                    objective: 702,
                    enemy: 703,
                    item: 704,
                },
            },
            world: {
                tileWidth: 16,
                tileHeight: 16,
                anchor: "center",
            },
        });

        const second = createWorldgenScenario({
            map: {
                width: 40,
                height: 24,
                seed: "scenario-alpha",
                roomCount: 9,
                roomMinSize: 4,
                roomMaxSize: 8,
            },
            spawns: {
                enemyCount: 4,
                itemCount: 3,
                tileIds: {
                    playerStart: 701,
                    objective: 702,
                    enemy: 703,
                    item: 704,
                },
            },
            world: {
                tileWidth: 16,
                tileHeight: 16,
                anchor: "center",
            },
        });

        expect(first).toEqual(second);
    });

    it("supports independent spawn seed override", () => {
        const baseOptions = {
            map: {
                width: 34,
                height: 20,
                seed: "shared-map",
            },
            world: {
                tileWidth: 8,
                tileHeight: 8,
                anchor: "center" as const,
            },
        };

        const first = createWorldgenScenario({
            ...baseOptions,
            spawns: { seed: "spawn-a" },
        });
        const second = createWorldgenScenario({
            ...baseOptions,
            spawns: { seed: "spawn-b" },
        });

        expect(first.map.tiles).toEqual(second.map.tiles);
        expect(first.anchors).not.toEqual(second.anchors);
    });

    it("provides world-space coordinates using default world config", () => {
        const scenario = createWorldgenScenario({
            map: {
                width: 28,
                height: 18,
                seed: "default-world-config",
            },
        });

        const { playerStart } = scenario.worldAnchors;

        expect(playerStart.worldX % 8).toBe(0);
        expect(playerStart.worldY % 8).toBe(0);
        expect(playerStart.worldX).toBeGreaterThan(0);
        expect(playerStart.worldY).toBeGreaterThan(0);
    });

    it("supports biome/path composition overlay for generated runs", () => {
        const scenario = createWorldgenScenario({
            map: {
                width: 30,
                height: 20,
                seed: "scenario-composition",
                roomCount: 8,
            },
            composition: {
                enabled: true,
                pathTileValue: 9,
                connectStartToObjective: true,
            },
        });

        expect(scenario.composition).not.toBeNull();
        expect(scenario.composition?.path.length ?? 0).toBeGreaterThan(1);

        const start = scenario.anchors.playerStart;
        const end = scenario.anchors.objective;

        expect(scenario.map.tiles[start.y][start.x]).toBe(9);
        expect(scenario.map.tiles[end.y][end.x]).toBe(9);
    });
});
