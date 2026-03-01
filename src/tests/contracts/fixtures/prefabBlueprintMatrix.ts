import type { PrefabAttachRequest } from "@/services/prefabCore";

export type PrefabBlueprintFixture = {
    id: string;
    domain: "player" | "enemy" | "object";
    entityId: string;
    requests: PrefabAttachRequest[];
    expectedModuleIds: string[];
};

export const PREFAB_BLUEPRINT_FIXTURE_MATRIX: PrefabBlueprintFixture[] = [
    {
        id: "player-arpg-pack-matrix",
        domain: "player",
        entityId: "fixture-player-pack",
        requests: [
            { moduleId: "player.core" },
            { moduleId: "player.resources" },
            { moduleId: "player.mobility" },
            { moduleId: "player.combat" },
        ],
        expectedModuleIds: [
            "player.combat",
            "player.core",
            "player.mobility",
            "player.resources",
        ],
    },
    {
        id: "player-rpg-matrix",
        domain: "player",
        entityId: "fixture-player",
        requests: [
            { moduleId: "rpg.stats-equipment" },
            { moduleId: "rpg.inventory-hotbar" },
            { moduleId: "rpg.abilities" },
            { moduleId: "rpg.world-hooks" },
        ],
        expectedModuleIds: [
            "rpg.abilities",
            "rpg.inventory-hotbar",
            "rpg.stats-equipment",
            "rpg.world-hooks",
        ],
    },
    {
        id: "enemy-melee-matrix",
        domain: "enemy",
        entityId: "fixture-enemy",
        requests: [
            { moduleId: "enemy.core" },
            { moduleId: "enemy.pathing" },
            { moduleId: "enemy.melee-ability" },
        ],
        expectedModuleIds: [
            "enemy.core",
            "enemy.melee-ability",
            "enemy.pathing",
        ],
    },
    {
        id: "enemy-sniper-matrix",
        domain: "enemy",
        entityId: "fixture-enemy-sniper",
        requests: [
            { moduleId: "enemy.core" },
            { moduleId: "enemy.pathing" },
            { moduleId: "enemy.ranged-ability" },
            { moduleId: "enemy.sniper-profile" },
        ],
        expectedModuleIds: [
            "enemy.core",
            "enemy.pathing",
            "enemy.ranged-ability",
            "enemy.sniper-profile",
        ],
    },
    {
        id: "object-loot-matrix",
        domain: "object",
        entityId: "fixture-object",
        requests: [
            { moduleId: "object.core" },
            { moduleId: "object.interactable" },
            { moduleId: "object.loot-state" },
        ],
        expectedModuleIds: [
            "object.core",
            "object.interactable",
            "object.loot-state",
        ],
    },
    {
        id: "object-fast-travel-matrix",
        domain: "object",
        entityId: "fixture-object-fast-travel",
        requests: [
            { moduleId: "object.core" },
            { moduleId: "object.interactable" },
            { moduleId: "object.fast-travel-point" },
        ],
        expectedModuleIds: [
            "object.core",
            "object.fast-travel-point",
            "object.interactable",
        ],
    },
    {
        id: "object-merchant-npc-matrix",
        domain: "object",
        entityId: "fixture-object-merchant-npc",
        requests: [
            { moduleId: "object.core" },
            { moduleId: "object.interactable" },
            { moduleId: "object.vendor" },
            { moduleId: "object.npc.merchant-tiered" },
        ],
        expectedModuleIds: [
            "object.core",
            "object.interactable",
            "object.npc.merchant-tiered",
            "object.vendor",
        ],
    },
];
