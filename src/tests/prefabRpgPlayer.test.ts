import { describe, expect, it } from "vitest";
import { createRpgPlayerPrefabPreset } from "@/services/prefabRpgPlayer";

describe("prefabRpgPlayer", () => {
    it("builds a starter RPG player blueprint with expected modules", () => {
        const preset = createRpgPlayerPrefabPreset();
        expect(preset.blueprint.id).toBe("rpg-player");
        expect(preset.blueprint.domain).toBe("player");
        expect(
            preset.blueprint.modules.map((module) => module.moduleId),
        ).toEqual([
            "rpg.abilities",
            "rpg.inventory-hotbar",
            "rpg.stats-equipment",
            "rpg.world-hooks",
        ]);
    });

    it("attaches RPG player modules and wires runtime services", () => {
        const preset = createRpgPlayerPrefabPreset({
            moduleOverrides: {
                "rpg.inventory-hotbar": {
                    containerId: "pack",
                    inventoryCapacity: 8,
                    starterItems: [
                        {
                            definition: {
                                id: "potion",
                                stackable: true,
                                maxStack: 99,
                            },
                            quantity: 3,
                        },
                    ],
                },
                "rpg.abilities": {
                    resources: {
                        mana: 80,
                        stamina: 120,
                    },
                    abilities: [
                        {
                            id: "slash",
                            label: "Slash",
                            kind: "active",
                            cooldownMs: 200,
                        },
                    ],
                },
                "rpg.world-hooks": {
                    initialObjective: {
                        id: "obj-main",
                        label: "Reach the village",
                    },
                },
            },
        });

        const context = {};
        const report = preset.attachPlayer("hero-1", context);
        expect(report.failed).toHaveLength(0);
        expect(report.attached).toHaveLength(4);

        const typedContext = context as {
            equipmentStatsService: {
                getEntitySnapshot: (entityId: string) => unknown;
            };
            inventoryService: {
                getContainer: (containerId: string) => {
                    id: string;
                    slots: Array<{ itemId: string | null; quantity: number }>;
                } | null;
            };
            abilityService: {
                getResource: (key: string) => number;
                getAbility: (abilityId: string) => unknown;
            };
            objectiveService: {
                getObjective: (objectiveId: string) => {
                    id: string;
                    status: string;
                } | null;
            };
            interactionPromptsByEntityId: Record<string, unknown>;
        };

        expect(
            typedContext.equipmentStatsService.getEntitySnapshot("hero-1"),
        ).not.toBeNull();

        const container = typedContext.inventoryService.getContainer("pack");
        expect(container?.id).toBe("pack");
        expect(container?.slots[0]).toEqual({
            itemId: "potion",
            quantity: 3,
        });

        expect(typedContext.abilityService.getResource("mana")).toBe(80);
        expect(typedContext.abilityService.getResource("stamina")).toBe(120);
        expect(typedContext.abilityService.getAbility("slash")).not.toBeNull();

        expect(
            typedContext.objectiveService.getObjective("obj-main")?.status,
        ).toBe("active");
        expect(
            typedContext.interactionPromptsByEntityId["hero-1"],
        ).toBeDefined();
    });

    it("detaches RPG player modules and cleans interaction prompt entry", () => {
        const preset = createRpgPlayerPrefabPreset();
        const context = {
            interactionPromptsByEntityId: {},
        };

        preset.attachPlayer("hero-2", context);
        expect(context.interactionPromptsByEntityId["hero-2"]).toBeDefined();

        const detached = preset.detachPlayer("hero-2", context);
        expect(detached.failed).toHaveLength(0);
        expect(context.interactionPromptsByEntityId["hero-2"]).toBeUndefined();
    });
});
