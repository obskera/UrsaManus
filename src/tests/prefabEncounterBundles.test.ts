import { describe, expect, it } from "vitest";
import {
    createPrefabEncounterBundleCatalog,
    parsePrefabEncounterBundle,
    PREFAB_ENCOUNTER_BUNDLE_VERSION,
    simulatePrefabEncounterBundle,
    toPrefabEncounterBundleJson,
} from "@/services/prefabEncounterBundles";

describe("prefabEncounterBundles", () => {
    it("builds default encounter bundle catalog", () => {
        const catalog = createPrefabEncounterBundleCatalog();
        expect(catalog.map((entry) => entry.id)).toEqual([
            "starter-camp",
            "dungeon-room-loop",
            "boss-antechamber",
            "survival-wave-field",
            "town-social-hub",
        ]);
        expect(
            catalog.every(
                (entry) => entry.version === PREFAB_ENCOUNTER_BUNDLE_VERSION,
            ),
        ).toBe(true);
    });

    it("simulates catalog bundles without issues", () => {
        const catalog = createPrefabEncounterBundleCatalog();
        for (const bundle of catalog) {
            const report = simulatePrefabEncounterBundle(bundle);
            expect(report.ok).toBe(true);
            expect(report.issues).toEqual([]);
            expect(report.entitiesSimulated).toBeGreaterThan(0);
            expect(report.moduleAttachments).toBeGreaterThan(0);
        }
    });

    it("round-trips encounter bundle JSON", () => {
        const starter = createPrefabEncounterBundleCatalog()[0];
        const raw = toPrefabEncounterBundleJson(starter);
        const parsed = parsePrefabEncounterBundle(raw);
        expect(parsed.ok).toBe(true);
        if (parsed.ok) {
            expect(parsed.value.id).toBe(starter.id);
            expect(parsed.value.spawns.length).toBe(starter.spawns.length);
        }
    });

    it("reports invalid archetype during simulation", () => {
        const starter = createPrefabEncounterBundleCatalog()[0];
        const bad = {
            ...starter,
            spawns: [
                ...starter.spawns,
                {
                    id: "bad-object",
                    domain: "object" as const,
                    archetype: "not-a-real-archetype",
                },
            ],
        };

        const report = simulatePrefabEncounterBundle(bad);
        expect(report.ok).toBe(false);
        expect(
            report.issues.some((issue) =>
                issue.includes("invalid object archetype"),
            ),
        ).toBe(true);
    });
});
