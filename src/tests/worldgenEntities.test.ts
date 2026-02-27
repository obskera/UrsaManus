import { describe, expect, it } from "vitest";
import {
    createDataBusSpawnPayloads,
    createWorldgenEntities,
    createWorldgenScenario,
} from "@/logic/worldgen";

describe("createWorldgenEntities", () => {
    const scenario = createWorldgenScenario({
        map: {
            width: 32,
            height: 22,
            seed: "entities-map",
            roomCount: 7,
        },
        spawns: {
            enemyCount: 2,
            itemCount: 1,
        },
        world: {
            tileWidth: 16,
            tileHeight: 16,
            anchor: "center",
        },
    });

    const payloads = createDataBusSpawnPayloads({
        anchors: scenario.worldAnchors,
        idPrefix: "entity",
        namePrefix: "entity",
    });

    it("creates entities and entitiesById records from payloads", () => {
        const result = createWorldgenEntities({ payloads });

        expect(result.entities.length).toBe(payloads.length);
        expect(Object.keys(result.entitiesById).length).toBe(payloads.length);
        expect(result.playerId).toBe("entity:player_start:0");

        const player = result.entitiesById["entity:player_start:0"];
        expect(player.name).toBe("entity_player_start_0");
        expect(player.type).toBe("player");
    });

    it("applies visual overrides by tag and by type", () => {
        const result = createWorldgenEntities({
            payloads,
            defaultVisual: {
                spriteSize: 18,
                scaler: 2,
            },
            byTypeVisual: {
                enemy: {
                    scaler: 6,
                },
            },
            byTagVisual: {
                objective: {
                    characterSpriteTiles: [[1, 1]],
                },
            },
        });

        const enemy = result.entities.find((entity) => entity.type === "enemy");
        const objective = result.entities.find(
            (entity) => entity.name === "entity_objective_0",
        );

        expect(enemy?.scaler).toBe(6);
        expect(enemy?.spriteSize).toBe(18);
        expect(objective?.characterSpriteTiles).toEqual([[1, 1]]);
    });
});
