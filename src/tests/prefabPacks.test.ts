import { describe, expect, it } from "vitest";
import {
    createEnemyPrefabPack,
    createObjectPrefabPack,
    createPlayerPrefabPack,
    type EnemyArchetype,
    type ObjectPrefabContext,
    type ObjectArchetype,
    type PlayerArchetype,
    exportObjectPrefabStateSnapshot,
    importObjectPrefabStateSnapshot,
} from "@/services/prefabPacks";

describe("prefabPacks", () => {
    const enemyExpectations: Record<EnemyArchetype, string[]> = {
        "melee-chaser": ["enemy.core", "enemy.melee-ability", "enemy.pathing"],
        "ranged-kiter": ["enemy.core", "enemy.pathing", "enemy.ranged-ability"],
        "tank-bruiser": ["enemy.core", "enemy.melee-ability", "enemy.pathing"],
        "boss-phase": [
            "enemy.core",
            "enemy.melee-ability",
            "enemy.pathing",
            "enemy.phase-hooks",
        ],
        "swarm-rusher": [
            "enemy.core",
            "enemy.melee-ability",
            "enemy.pathing",
            "enemy.swarm-rush",
        ],
        "support-healer": ["enemy.core", "enemy.pathing", "enemy.support-aura"],
        "shield-guard": [
            "enemy.core",
            "enemy.melee-ability",
            "enemy.pathing",
            "enemy.shield-guard",
        ],
        "sniper-kiter": [
            "enemy.core",
            "enemy.pathing",
            "enemy.ranged-ability",
            "enemy.sniper-profile",
        ],
    };

    const playerExpectations: Record<PlayerArchetype, string[]> = {
        "arpg-player": [
            "player.combat",
            "player.core",
            "player.mobility",
            "player.resources",
        ],
        "jrpg-party-lead": ["player.core", "player.party", "player.resources"],
        "survival-crafter": ["player.core", "player.resources"],
        "twin-stick-shooter": ["player.aiming", "player.combat", "player.core"],
        "stealth-infiltrator": [
            "player.core",
            "player.mobility",
            "player.stealth",
        ],
        "platformer-mobility": ["player.core", "player.mobility"],
    };

    const objectExpectations: Record<ObjectArchetype, string[]> = {
        "loot-chest": [
            "object.core",
            "object.interactable",
            "object.loot-state",
        ],
        "shop-npc": ["object.core", "object.interactable", "object.vendor"],
        "quest-board": [
            "object.core",
            "object.interactable",
            "object.quest-board",
        ],
        "door-switch": ["object.core", "object.interactable", "object.switch"],
        "checkpoint-statue": [
            "object.checkpoint",
            "object.core",
            "object.interactable",
        ],
        "breakable-container": [
            "object.breakable-container",
            "object.core",
            "object.interactable",
        ],
        "resource-node": [
            "object.core",
            "object.interactable",
            "object.resource-node",
        ],
        "crafting-station": [
            "object.core",
            "object.crafting-station",
            "object.interactable",
        ],
        "bank-stash": [
            "object.bank-stash",
            "object.core",
            "object.interactable",
        ],
        "fast-travel-point": [
            "object.core",
            "object.fast-travel-point",
            "object.interactable",
        ],
        "trap-floor": [
            "object.core",
            "object.interactable",
            "object.trap-floor",
        ],
        "switch-network": [
            "object.core",
            "object.interactable",
            "object.switch",
            "object.switch-network",
        ],
        "locked-door": [
            "object.core",
            "object.interactable",
            "object.locked-door",
            "object.switch",
        ],
        "escort-cart": [
            "object.core",
            "object.escort-cart",
            "object.interactable",
        ],
        "arena-trigger": [
            "object.arena-trigger",
            "object.core",
            "object.interactable",
        ],
        "quest-giver": [
            "object.core",
            "object.interactable",
            "object.npc.quest-giver",
            "object.quest-board",
        ],
        "follower-companion": [
            "object.core",
            "object.interactable",
            "object.npc.follower-companion",
        ],
        "merchant-tiered": [
            "object.core",
            "object.interactable",
            "object.npc.merchant-tiered",
            "object.vendor",
        ],
        "trainer-skill-tree": [
            "object.core",
            "object.interactable",
            "object.npc.trainer-skill-tree",
        ],
        "faction-rep-agent": [
            "object.core",
            "object.interactable",
            "object.npc.faction-rep-agent",
        ],
        "town-ambient-npc": [
            "object.core",
            "object.interactable",
            "object.npc.town-ambient",
        ],
    };

    it("creates a melee enemy pack blueprint and attaches to context", () => {
        const pack = createEnemyPrefabPack("melee-chaser");
        expect(pack.blueprint.modules.map((module) => module.moduleId)).toEqual(
            ["enemy.core", "enemy.melee-ability", "enemy.pathing"],
        );

        const context = {};
        const report = pack.attachEnemy("enemy-1", context);
        expect(report.failed).toHaveLength(0);
        expect(report.attached).toHaveLength(3);

        const typedContext = context as {
            enemyPrefabsByEntityId: Record<
                string,
                {
                    archetype: string;
                    modules: Record<string, unknown>;
                }
            >;
        };
        expect(typedContext.enemyPrefabsByEntityId["enemy-1"]?.archetype).toBe(
            "melee-chaser",
        );
        expect(
            Object.keys(typedContext.enemyPrefabsByEntityId["enemy-1"].modules),
        ).toEqual(["enemy.core", "enemy.melee-ability", "enemy.pathing"]);
    });

    it("creates enemy archetype packs with expected modules", () => {
        for (const [archetype, expectedModuleIds] of Object.entries(
            enemyExpectations,
        ) as [EnemyArchetype, string[]][]) {
            const pack = createEnemyPrefabPack(archetype);
            expect(
                pack.blueprint.modules.map((module) => module.moduleId),
            ).toEqual(expectedModuleIds);
        }
    });

    it("attaches and detaches enemy archetype packs", () => {
        for (const [archetype, expectedModuleIds] of Object.entries(
            enemyExpectations,
        ) as [EnemyArchetype, string[]][]) {
            const pack = createEnemyPrefabPack(archetype);
            const context = {};
            const entityId = `enemy-${archetype}`;

            const report = pack.attachEnemy(entityId, context);
            expect(report.failed).toHaveLength(0);
            expect(report.attached).toHaveLength(expectedModuleIds.length);

            const typedContext = context as {
                enemyPrefabsByEntityId: Record<
                    string,
                    {
                        archetype: string;
                        modules: Record<string, unknown>;
                    }
                >;
            };

            expect(
                typedContext.enemyPrefabsByEntityId[entityId]?.archetype,
            ).toBe(archetype);
            expect(
                Object.keys(
                    typedContext.enemyPrefabsByEntityId[entityId].modules,
                ).sort(),
            ).toEqual(expectedModuleIds);

            const detached = pack.detachEnemy(entityId, context);
            expect(detached.failed).toHaveLength(0);
        }
    });

    it("creates loot chest object pack and supports state snapshot export/import", () => {
        const pack = createObjectPrefabPack("loot-chest");
        expect(pack.blueprint.modules.map((module) => module.moduleId)).toEqual(
            ["object.core", "object.interactable", "object.loot-state"],
        );

        const context = {};
        const report = pack.attachObject("chest-a", context);
        expect(report.failed).toHaveLength(0);

        const typedContext = context as ObjectPrefabContext;

        expect(
            typedContext.objectPrefabsByEntityId?.["chest-a"]?.state.opened,
        ).toBe(false);

        const exported = exportObjectPrefabStateSnapshot(typedContext);
        expect(exported["chest-a"]?.entityId).toBe("chest-a");

        const restoredContext: ObjectPrefabContext = {};
        expect(importObjectPrefabStateSnapshot(restoredContext, exported)).toBe(
            true,
        );
        expect(
            restoredContext.objectPrefabsByEntityId?.["chest-a"],
        ).toBeDefined();
    });

    it("detaches object pack modules", () => {
        const pack = createObjectPrefabPack("door-switch");
        const context = {};
        pack.attachObject("door-1", context);

        const detached = pack.detachObject("door-1", context);
        expect(detached.failed).toHaveLength(0);
        expect(detached.attached).toHaveLength(3);
    });

    it("creates object archetype packs with expected modules", () => {
        for (const [archetype, expectedModuleIds] of Object.entries(
            objectExpectations,
        ) as [ObjectArchetype, string[]][]) {
            const pack = createObjectPrefabPack(archetype);
            expect(
                pack.blueprint.modules.map((module) => module.moduleId),
            ).toEqual(expectedModuleIds);
        }
    });

    it("attaches and detaches object archetype packs", () => {
        for (const [archetype, expectedModuleIds] of Object.entries(
            objectExpectations,
        ) as [ObjectArchetype, string[]][]) {
            const pack = createObjectPrefabPack(archetype);
            const context = {};
            const entityId = `object-${archetype}`;

            const report = pack.attachObject(entityId, context);
            expect(report.failed).toHaveLength(0);
            expect(report.attached).toHaveLength(expectedModuleIds.length);

            const typedContext = context as {
                objectPrefabsByEntityId: Record<
                    string,
                    {
                        archetype: string;
                        modules: Record<string, unknown>;
                    }
                >;
            };

            expect(
                typedContext.objectPrefabsByEntityId[entityId]?.archetype,
            ).toBe(archetype);
            expect(
                Object.keys(
                    typedContext.objectPrefabsByEntityId[entityId].modules,
                ).sort(),
            ).toEqual(expectedModuleIds);

            const detached = pack.detachObject(entityId, context);
            expect(detached.failed).toHaveLength(0);
        }
    });

    it("creates player archetype packs with expected modules", () => {
        for (const [archetype, expectedModuleIds] of Object.entries(
            playerExpectations,
        ) as [PlayerArchetype, string[]][]) {
            const pack = createPlayerPrefabPack(archetype);
            expect(
                pack.blueprint.modules.map((module) => module.moduleId),
            ).toEqual(expectedModuleIds);
        }
    });

    it("attaches and detaches player archetype packs", () => {
        for (const [archetype, expectedModuleIds] of Object.entries(
            playerExpectations,
        ) as [PlayerArchetype, string[]][]) {
            const pack = createPlayerPrefabPack(archetype);
            const context = {};
            const entityId = `player-${archetype}`;

            const report = pack.attachPlayer(entityId, context);
            expect(report.failed).toHaveLength(0);
            expect(report.attached).toHaveLength(expectedModuleIds.length);

            const typedContext = context as {
                playerPrefabsByEntityId: Record<
                    string,
                    {
                        archetype: string;
                        modules: Record<string, unknown>;
                    }
                >;
            };

            expect(
                typedContext.playerPrefabsByEntityId[entityId]?.archetype,
            ).toBe(archetype);
            expect(
                Object.keys(
                    typedContext.playerPrefabsByEntityId[entityId].modules,
                ).sort(),
            ).toEqual(expectedModuleIds);

            const detached = pack.detachPlayer(entityId, context);
            expect(detached.failed).toHaveLength(0);
        }
    });
});
