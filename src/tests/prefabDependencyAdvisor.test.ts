import { describe, expect, it } from "vitest";
import { createDefaultPrefabRegistry } from "@/services/prefabRegistryDefaults";
import { createPrefabDependencyAdvisorService } from "@/services/prefabDependencyAdvisor";

describe("prefabDependencyAdvisor", () => {
    it("recommends missing required dependencies with explainability", () => {
        const advisor = createPrefabDependencyAdvisorService({
            registry: createDefaultPrefabRegistry(),
            optionalModuleIdsByArchetype: {
                enemy: ["enemy.pathing", "enemy.ranged-ability"],
            },
        });

        const report = advisor.recommend({
            archetype: "enemy",
            moduleIds: ["enemy.melee-ability"],
        });

        expect(
            report.requiredRecommendations.map((entry) => entry.moduleId),
        ).toEqual(["enemy.core"]);
        expect(
            report.explainability.some((entry) =>
                entry.includes(
                    'enemy.core: Required by "enemy.melee-ability".',
                ),
            ),
        ).toBe(true);
    });

    it("applies quick-fix by injecting required modules", () => {
        const advisor = createPrefabDependencyAdvisorService({
            registry: createDefaultPrefabRegistry(),
            optionalModuleIdsByArchetype: {
                enemy: ["enemy.pathing", "enemy.ranged-ability"],
            },
        });

        const fixed = advisor.applyQuickFix({
            archetype: "enemy",
            moduleIds: ["enemy.melee-ability"],
        });

        expect(fixed.addedRequiredModuleIds).toEqual(["enemy.core"]);
        expect(fixed.moduleIds).toEqual(["enemy.core", "enemy.melee-ability"]);
    });

    it("can include optional modules during quick-fix", () => {
        const advisor = createPrefabDependencyAdvisorService({
            registry: createDefaultPrefabRegistry(),
            optionalModuleIdsByArchetype: {
                enemy: ["enemy.pathing"],
            },
        });

        const fixed = advisor.applyQuickFix({
            archetype: "enemy",
            moduleIds: ["enemy.melee-ability"],
            includeOptional: true,
        });

        expect(fixed.addedRequiredModuleIds).toEqual(["enemy.core"]);
        expect(fixed.addedOptionalModuleIds).toEqual(["enemy.pathing"]);
        expect(fixed.moduleIds).toEqual([
            "enemy.core",
            "enemy.melee-ability",
            "enemy.pathing",
        ]);
    });
});
