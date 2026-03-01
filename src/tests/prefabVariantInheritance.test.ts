import { describe, expect, it } from "vitest";
import {
    createPrefabRegistry,
    importPrefabBlueprint,
} from "@/services/prefabCore";
import {
    exportResolvedPrefabVariantBlueprint,
    resolvePrefabVariantBlueprint,
    type PrefabVariantBlueprint,
} from "@/services/prefabVariantInheritance";

function createBlueprint(input: {
    id: string;
    domain: string;
    modules: Array<{ moduleId: string; config: Record<string, unknown> }>;
    extendsId?: string;
    inherits?: string[];
}): PrefabVariantBlueprint {
    return {
        version: "um-prefab-blueprint-v1",
        id: input.id,
        domain: input.domain,
        modules: input.modules,
        ...(input.extendsId ? { extendsId: input.extendsId } : {}),
        ...(input.inherits ? { inherits: input.inherits } : {}),
    };
}

describe("prefabVariantInheritance", () => {
    it("resolves extends/inherits with override traceability", () => {
        const blueprints = [
            createBlueprint({
                id: "player-base",
                domain: "player",
                modules: [
                    {
                        moduleId: "player.core",
                        config: {
                            maxHealth: 100,
                            moveSpeed: 90,
                        },
                    },
                ],
            }),
            createBlueprint({
                id: "player-addon",
                domain: "player",
                modules: [
                    {
                        moduleId: "player.mobility",
                        config: {
                            dash: true,
                        },
                    },
                ],
            }),
            createBlueprint({
                id: "player-elite",
                domain: "player",
                extendsId: "player-base",
                inherits: ["player-addon"],
                modules: [
                    {
                        moduleId: "player.core",
                        config: {
                            maxHealth: 140,
                        },
                    },
                    {
                        moduleId: "player.combat",
                        config: {
                            comboWindowMs: 380,
                        },
                    },
                ],
            }),
        ];

        const result = resolvePrefabVariantBlueprint({
            targetId: "player-elite",
            blueprints,
        });

        expect(result.ok).toBe(true);
        expect(result.issues).toEqual([]);
        expect(result.trace.lineage).toEqual([
            "player-base",
            "player-addon",
            "player-elite",
        ]);
        expect(result.trace.moduleSources["player.core"]).toEqual([
            "player-base",
            "player-elite",
        ]);
        expect(
            result.blueprint?.modules.map((entry) => entry.moduleId),
        ).toEqual(["player.combat", "player.core", "player.mobility"]);
        expect(
            result.blueprint?.modules.find(
                (entry) => entry.moduleId === "player.core",
            )?.config,
        ).toEqual({
            maxHealth: 140,
            moveSpeed: 90,
        });

        const exported = exportResolvedPrefabVariantBlueprint(result);
        expect(typeof exported).toBe("string");
        const imported = importPrefabBlueprint(exported as string);
        expect(imported.ok).toBe(true);
    });

    it("detects deep circular inheritance chains", () => {
        const blueprints = [
            createBlueprint({
                id: "a",
                domain: "player",
                extendsId: "b",
                modules: [{ moduleId: "player.core", config: {} }],
            }),
            createBlueprint({
                id: "b",
                domain: "player",
                extendsId: "c",
                modules: [{ moduleId: "player.mobility", config: {} }],
            }),
            createBlueprint({
                id: "c",
                domain: "player",
                extendsId: "a",
                modules: [{ moduleId: "player.combat", config: {} }],
            }),
        ];

        const result = resolvePrefabVariantBlueprint({
            targetId: "a",
            blueprints,
        });

        expect(result.ok).toBe(false);
        expect(
            result.issues.some(
                (issue) => issue.code === "circular-inheritance",
            ),
        ).toBe(true);
    });

    it("reports domain mismatch across inheritance links", () => {
        const blueprints = [
            createBlueprint({
                id: "enemy-base",
                domain: "enemy",
                modules: [{ moduleId: "enemy.core", config: {} }],
            }),
            createBlueprint({
                id: "player-child",
                domain: "player",
                extendsId: "enemy-base",
                modules: [{ moduleId: "player.core", config: {} }],
            }),
        ];

        const result = resolvePrefabVariantBlueprint({
            targetId: "player-child",
            blueprints,
        });

        expect(result.ok).toBe(false);
        expect(
            result.issues.some((issue) => issue.code === "domain-mismatch"),
        ).toBe(true);
    });

    it("runs module composition checks on flattened output", () => {
        const registry = createPrefabRegistry();
        registry.registerModule({
            id: "enemy.core",
            domain: "enemy",
            attach: () => ({ ok: true }),
        });
        registry.registerModule({
            id: "enemy.melee-ability",
            domain: "enemy",
            conflicts: ["enemy.ranged-ability"],
            dependencies: ["enemy.core"],
            attach: () => ({ ok: true }),
        });
        registry.registerModule({
            id: "enemy.ranged-ability",
            domain: "enemy",
            conflicts: ["enemy.melee-ability"],
            dependencies: ["enemy.core"],
            attach: () => ({ ok: true }),
        });

        const blueprints: PrefabVariantBlueprint[] = [
            createBlueprint({
                id: "enemy-base",
                domain: "enemy",
                modules: [{ moduleId: "enemy.core", config: {} }],
            }),
            createBlueprint({
                id: "enemy-mixed",
                domain: "enemy",
                extendsId: "enemy-base",
                modules: [
                    { moduleId: "enemy.melee-ability", config: {} },
                    { moduleId: "enemy.ranged-ability", config: {} },
                ],
            }),
        ];

        const result = resolvePrefabVariantBlueprint({
            targetId: "enemy-mixed",
            blueprints,
            registry,
        });

        expect(result.ok).toBe(false);
        expect(
            result.issues.some((issue) => issue.code === "module-composition"),
        ).toBe(true);
    });
});
