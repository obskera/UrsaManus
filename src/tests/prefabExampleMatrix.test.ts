import { describe, expect, it } from "vitest";
import {
    createPrefabExampleMatrixCatalog,
    PREFAB_EXAMPLE_MATRIX_VERSION,
    type PrefabExampleDomain,
    type PrefabExampleVariant,
} from "@/services/prefabExampleMatrix";
import { PREFAB_BLUEPRINT_VERSION } from "@/services/prefabCore";

const DOMAINS: PrefabExampleDomain[] = ["player", "enemy", "object"];
const VARIANTS: PrefabExampleVariant[] = [
    "minimal",
    "full-featured",
    "override-heavy",
    "migration-legacy",
];

describe("prefabExampleMatrix", () => {
    it("builds a complete matrix for each major prefab domain and variant", () => {
        const catalog = createPrefabExampleMatrixCatalog();

        expect(catalog.version).toBe(PREFAB_EXAMPLE_MATRIX_VERSION);
        expect(catalog.entries).toHaveLength(DOMAINS.length * VARIANTS.length);

        for (const domain of DOMAINS) {
            const domainEntries = catalog.listEntries({ domain });

            expect(domainEntries).toHaveLength(VARIANTS.length);
            expect(domainEntries.map((entry) => entry.variant).sort()).toEqual(
                [...VARIANTS].sort(),
            );

            for (const entry of domainEntries) {
                expect(entry.blueprint.version).toBe(PREFAB_BLUEPRINT_VERSION);
                expect(entry.blueprint.domain).toBe(domain);
                expect(entry.blueprint.modules.length).toBeGreaterThan(0);
                expect(entry.expectedOutcomes.length).toBeGreaterThanOrEqual(2);
            }
        }
    });

    it("marks migration/legacy entries as migrated from v0 payloads", () => {
        const catalog = createPrefabExampleMatrixCatalog();

        for (const domain of DOMAINS) {
            const entry = catalog.listEntries({
                domain,
                variant: "migration-legacy",
            })[0];

            expect(entry).toBeDefined();
            expect(entry.migration).toBeDefined();
            expect(entry.migration?.sourceVersion).toBe(0);
            expect(entry.migration?.requiresMigration).toBe(true);
            expect(entry.migration?.ok).toBe(true);
        }
    });

    it("returns null for unknown entry IDs", () => {
        const catalog = createPrefabExampleMatrixCatalog();

        expect(catalog.getEntry("unknown-entry")).toBeNull();
        expect(catalog.getEntry("   ")).toBeNull();
    });
});
