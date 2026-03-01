import { describe, expect, it } from "vitest";
import { createPrefabStarterWizardService } from "@/services/prefabStarterWizard";

describe("prefabStarterWizard", () => {
    it("lists archetypes and presets", () => {
        const wizard = createPrefabStarterWizardService();
        expect(wizard.listArchetypes()).toEqual(["player", "enemy", "object"]);
        expect(wizard.listPresets("player").map((preset) => preset.id)).toEqual(
            ["player:rpg-starter"],
        );
        expect(wizard.listPresets("enemy").map((preset) => preset.id)).toEqual([
            "enemy:melee-chaser",
            "enemy:ranged-kiter",
            "enemy:tank-bruiser",
            "enemy:boss-phase",
            "enemy:swarm-rusher",
            "enemy:support-healer",
            "enemy:shield-guard",
            "enemy:sniper-kiter",
        ]);
        expect(wizard.listPresets("object").map((preset) => preset.id)).toEqual(
            [
                "object:loot-chest",
                "object:shop-npc",
                "object:quest-board",
                "object:door-switch",
                "object:checkpoint-statue",
                "object:breakable-container",
                "object:resource-node",
                "object:crafting-station",
                "object:bank-stash",
                "object:fast-travel-point",
                "object:trap-floor",
                "object:switch-network",
                "object:locked-door",
                "object:escort-cart",
                "object:arena-trigger",
                "object:quest-giver",
                "object:follower-companion",
                "object:merchant-tiered",
                "object:trainer-skill-tree",
                "object:faction-rep-agent",
                "object:town-ambient-npc",
            ],
        );
    });

    it("builds blueprint from known preset with integration snippet", () => {
        const wizard = createPrefabStarterWizardService();
        const result = wizard.buildFromPreset({
            presetId: "enemy:sniper-kiter",
            blueprintId: "sniper-alpha",
        });

        expect(result.ok).toBe(true);
        expect(result.blueprint.id).toBe("sniper-alpha");
        expect(result.blueprint.domain).toBe("enemy");
        expect(
            result.blueprint.modules.map((module) => module.moduleId),
        ).toEqual([
            "enemy.core",
            "enemy.pathing",
            "enemy.ranged-ability",
            "enemy.sniper-profile",
        ]);
        expect(result.integrationSnippet).toContain(
            "createPrefabAttachmentRuntime",
        );
    });

    it("builds blueprint from module selection and surfaces composition issues", () => {
        const wizard = createPrefabStarterWizardService();
        const result = wizard.buildFromSelection({
            archetype: "enemy",
            blueprintId: "bad-enemy",
            moduleIds: ["enemy.melee-ability"],
        });

        expect(result.ok).toBe(false);
        expect(result.issues.some((issue) => issue.includes("requires"))).toBe(
            true,
        );
    });

    it("returns a clear issue for unknown preset", () => {
        const wizard = createPrefabStarterWizardService();
        const invalid = wizard.buildFromPreset({
            presetId: "enemy:unknown" as unknown as "player:rpg-starter",
            blueprintId: "valid-2",
        });
        expect(invalid.ok).toBe(false);
        expect(
            invalid.issues.some((issue) => issue.includes("Unknown preset")),
        ).toBe(true);
    });

    it("recommends and quick-fixes missing dependencies for selection", () => {
        const wizard = createPrefabStarterWizardService();

        const recommendations = wizard.recommendModulesForSelection({
            archetype: "enemy",
            moduleIds: ["enemy.melee-ability"],
        });

        expect(
            recommendations.requiredRecommendations.map(
                (entry) => entry.moduleId,
            ),
        ).toEqual(["enemy.core"]);

        const quickFix = wizard.applyModuleQuickFix({
            archetype: "enemy",
            moduleIds: ["enemy.melee-ability"],
        });
        expect(quickFix.addedRequiredModuleIds).toEqual(["enemy.core"]);
        expect(quickFix.moduleIds).toEqual([
            "enemy.core",
            "enemy.melee-ability",
        ]);
    });
});
