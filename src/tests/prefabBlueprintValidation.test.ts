import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultPrefabRegistry } from "@/services/prefabRegistryDefaults";
import {
    validatePrefabBlueprint,
    validatePrefabBlueprintCatalog,
} from "@/services/prefabBlueprintValidation";

async function readBlueprint(relativePath: string): Promise<string> {
    const filePath = path.resolve(globalThis.process.cwd(), relativePath);
    return readFile(filePath, "utf-8");
}

describe("prefabBlueprintValidation", () => {
    it("validates shipped starter blueprints with default registry", async () => {
        const registry = createDefaultPrefabRegistry();
        const samples = await Promise.all([
            readBlueprint("src/prefabs/blueprints/player.rpg.starter.json"),
            readBlueprint(
                "src/prefabs/blueprints/enemy.melee-chaser.starter.json",
            ),
            readBlueprint(
                "src/prefabs/blueprints/object.loot-chest.starter.json",
            ),
        ]);

        for (const sample of samples) {
            const result = validatePrefabBlueprint(sample, { registry });
            expect(result.ok).toBe(true);
            expect(result.issues).toEqual([]);
        }
    });

    it("flags unknown modules and composition issues", () => {
        const registry = createDefaultPrefabRegistry();
        const raw = JSON.stringify({
            version: "um-prefab-blueprint-v1",
            id: "bad-enemy",
            domain: "enemy",
            modules: [
                {
                    moduleId: "enemy.melee-ability",
                    config: {},
                },
                {
                    moduleId: "enemy.unknown-module",
                    config: {},
                },
            ],
        });

        const result = validatePrefabBlueprint(raw, { registry });
        expect(result.ok).toBe(false);
        expect(result.issues.map((issue) => issue.code)).toContain(
            "unknown-module",
        );
        expect(result.issues.map((issue) => issue.code)).toContain(
            "module-composition",
        );
    });

    it("flags duplicate blueprint IDs in catalog validation", () => {
        const registry = createDefaultPrefabRegistry();
        const sameIdBlueprint = JSON.stringify({
            version: "um-prefab-blueprint-v1",
            id: "dupe-id",
            domain: "player",
            modules: [
                {
                    moduleId: "rpg.stats-equipment",
                    config: {},
                },
            ],
        });

        const report = validatePrefabBlueprintCatalog(
            [
                {
                    filePath: "a.json",
                    raw: sameIdBlueprint,
                },
                {
                    filePath: "b.json",
                    raw: sameIdBlueprint,
                },
            ],
            { registry },
        );

        expect(report.ok).toBe(false);
        expect(report.filesChecked).toBe(2);
        expect(report.filesFailed).toBe(1);
        expect(
            report.results[1].result.issues.map((issue) => issue.code),
        ).toContain("duplicate-blueprint-id");
    });
});
