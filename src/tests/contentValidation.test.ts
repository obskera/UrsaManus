import { describe, expect, it } from "vitest";
import {
    inferContentDomainFromPath,
    validateAuthoredContent,
} from "@/services/contentValidation";

describe("content validation service", () => {
    it("infers content domains from file paths", () => {
        expect(inferContentDomainFromPath("content/dialogue/intro.json")).toBe(
            "dialogue",
        );
        expect(inferContentDomainFromPath("content/quest/main.json")).toBe(
            "quest",
        );
        expect(inferContentDomainFromPath("content/loot/table.json")).toBe(
            "loot",
        );
        expect(
            inferContentDomainFromPath("content/placement/level-1.json"),
        ).toBe("placement");
        expect(inferContentDomainFromPath("content/misc/readme.txt")).toBe(
            null,
        );
    });

    it("validates dialogue payload references and reports actionable paths", () => {
        const report = validateAuthoredContent(
            "dialogue",
            JSON.stringify({
                version: 1,
                conversations: [
                    {
                        id: "intro",
                        start: "start",
                        nodes: [
                            {
                                id: "start",
                                text: "Hello",
                                next: "missing-node",
                            },
                        ],
                    },
                ],
            }),
        );

        expect(report.ok).toBe(false);
        expect(report.issues).toEqual([
            {
                path: "$.conversations[0].nodes[0].next",
                message: 'Node next id "missing-node" does not exist.',
            },
        ]);
    });

    it("validates quest mission graph payloads", () => {
        const validReport = validateAuthoredContent(
            "quest",
            JSON.stringify({
                version: 1,
                missions: [
                    {
                        id: "quest-alpha",
                        title: "Quest Alpha",
                        objectives: [
                            {
                                id: "start",
                                label: "Start",
                                nextObjectiveIds: ["finish"],
                            },
                            {
                                id: "finish",
                                label: "Finish",
                            },
                        ],
                    },
                ],
            }),
        );

        expect(validReport.ok).toBe(true);
        expect(validReport.issues).toEqual([]);

        const invalidReport = validateAuthoredContent(
            "quest",
            JSON.stringify({
                version: 1,
                missions: [
                    {
                        id: "",
                        title: "Bad",
                        objectives: [],
                    },
                ],
            }),
        );

        expect(invalidReport.ok).toBe(false);
        expect(invalidReport.issues[0]?.path).toBe("$.missions[0].id");
    });

    it("validates loot references across drop tables and bundles", () => {
        const report = validateAuthoredContent(
            "loot",
            JSON.stringify({
                version: 1,
                dropTables: [
                    {
                        id: "encounter-a",
                        rollsMin: 1,
                        rollsMax: 1,
                        entries: [
                            {
                                id: "entry-1",
                                itemId: "potion",
                                weight: 100,
                                affixPoolIds: ["missing-pool"],
                            },
                        ],
                    },
                ],
                rewardBundles: [
                    {
                        id: "bundle-a",
                        dropTables: [
                            {
                                tableId: "missing-table",
                            },
                        ],
                    },
                ],
            }),
        );

        expect(report.ok).toBe(false);
        expect(report.issues).toEqual([
            {
                path: "$.dropTables[0].entries[0].affixPoolIds[0]",
                message: 'Referenced affix pool "missing-pool" is not defined.',
            },
            {
                path: "$.rewardBundles[0].dropTables[0].tableId",
                message:
                    'Referenced drop table "missing-table" is not defined.',
            },
        ]);
    });

    it("validates placement payloads with runtime import checks", () => {
        const valid = validateAuthoredContent(
            "placement",
            JSON.stringify({
                version: "um-placement-v1",
                world: {
                    width: 128,
                    height: 128,
                },
                grid: {
                    enabled: true,
                    size: 16,
                },
                entities: [
                    {
                        id: "e1",
                        name: "Entity",
                        position: {
                            x: 16,
                            y: 16,
                        },
                    },
                ],
            }),
        );

        expect(valid.ok).toBe(true);

        const invalid = validateAuthoredContent(
            "placement",
            JSON.stringify({
                version: "um-placement-v1",
                world: {
                    width: 32,
                    height: 32,
                },
                grid: {
                    enabled: true,
                    size: 16,
                },
                entities: [
                    {
                        id: "e1",
                        name: "Entity",
                        position: {
                            x: 96,
                            y: 96,
                        },
                    },
                ],
            }),
        );

        expect(invalid.ok).toBe(false);
        expect(invalid.issues).toEqual([
            {
                path: "$",
                message: "Placement payload has out-of-bounds entities.",
            },
        ]);
    });
});
