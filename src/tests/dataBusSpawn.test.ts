import { describe, expect, it } from "vitest";
import {
    createDataBusSpawnPayloadRecord,
    createDataBusSpawnPayloads,
    createWorldgenScenario,
} from "@/logic/worldgen";

describe("createDataBusSpawnPayloads", () => {
    const scenario = createWorldgenScenario({
        map: {
            width: 36,
            height: 24,
            seed: "spawn-adapter-map",
            roomCount: 8,
        },
        spawns: {
            enemyCount: 3,
            itemCount: 2,
            tileIds: {
                playerStart: 801,
                objective: 802,
                enemy: 803,
                item: 804,
            },
        },
        world: {
            tileWidth: 16,
            tileHeight: 16,
            anchor: "center",
        },
    });

    it("creates deterministic ordered payloads with ids and tags", () => {
        const payloads = createDataBusSpawnPayloads({
            anchors: scenario.worldAnchors,
            idPrefix: "test",
            namePrefix: "demo",
        });

        expect(payloads[0].tag).toBe("player-start");
        expect(payloads[0].id).toBe("test:player_start:0");
        expect(payloads[1].tag).toBe("objective");
        expect(payloads.filter((p) => p.tag === "enemy")).toHaveLength(3);
        expect(payloads.filter((p) => p.tag === "item")).toHaveLength(2);
    });

    it("allows type overrides for downstream DataBus usage", () => {
        const payloads = createDataBusSpawnPayloads({
            anchors: scenario.worldAnchors,
            typeMap: {
                enemy: "object",
                item: "enemy",
            },
        });

        const enemyPayload = payloads.find((p) => p.tag === "enemy");
        const itemPayload = payloads.find((p) => p.tag === "item");

        expect(enemyPayload?.type).toBe("object");
        expect(itemPayload?.type).toBe("enemy");
    });

    it("can return a keyed record for id-based merges", () => {
        const record = createDataBusSpawnPayloadRecord({
            anchors: scenario.worldAnchors,
            idPrefix: "rec",
        });

        expect(record["rec:player_start:0"].tag).toBe("player-start");
        expect(Object.keys(record).length).toBe(
            2 +
                scenario.worldAnchors.enemySpawns.length +
                scenario.worldAnchors.itemSpawns.length,
        );
    });
});
