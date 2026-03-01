import { describe, expect, it } from "vitest";
import {
    migratePrefabBlueprint,
    preflightMigratablePrefabBlueprint,
    toCurrentPrefabBlueprint,
} from "@/services/prefabMigration";

describe("prefabMigration", () => {
    it("accepts current v1 prefab payloads", () => {
        const result = migratePrefabBlueprint({
            version: "um-prefab-blueprint-v1",
            id: "player-main",
            domain: "player",
            modules: [
                {
                    moduleId: "rpg.stats-equipment",
                    config: {},
                },
            ],
        });

        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }

        expect(result.appliedVersions).toEqual([]);
        expect(toCurrentPrefabBlueprint(result)?.version).toBe(
            "um-prefab-blueprint-v1",
        );
    });

    it("migrates legacy v0 payloads with module id alias", () => {
        const result = migratePrefabBlueprint({
            id: "enemy-main",
            domain: "enemy",
            modules: [
                {
                    id: "enemy.core",
                    config: {
                        health: 200,
                    },
                },
            ],
        });

        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }

        expect(result.appliedVersions).toEqual([1]);
        expect(toCurrentPrefabBlueprint(result)).toEqual({
            version: "um-prefab-blueprint-v1",
            id: "enemy-main",
            domain: "enemy",
            modules: [
                {
                    moduleId: "enemy.core",
                    config: {
                        health: 200,
                    },
                },
            ],
        });
    });

    it("reports migration-needed preflight and rejects invalid payloads", () => {
        const legacyPreflight = preflightMigratablePrefabBlueprint({
            id: "obj",
            domain: "object",
            modules: [],
        });
        expect(legacyPreflight.ok).toBe(true);
        expect(legacyPreflight.requiresMigration).toBe(true);

        const invalid = migratePrefabBlueprint({
            version: "um-prefab-blueprint-v1",
            id: "",
            domain: "object",
            modules: [],
        });
        expect(invalid.ok).toBe(false);
    });
});
