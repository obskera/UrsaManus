import {
    createPrefabBuilder,
    PREFAB_BLUEPRINT_VERSION,
    type PrefabBlueprint,
    type PrefabRegistry,
} from "@/services/prefabCore";
import {
    createEnemyPrefabPack,
    createObjectPrefabPack,
    createPlayerPrefabPack,
} from "@/services/prefabPacks";
import {
    migratePrefabBlueprint,
    preflightMigratablePrefabBlueprint,
    toCurrentPrefabBlueprint,
} from "@/services/prefabMigration";
import { createDefaultPrefabRegistry } from "@/services/prefabRegistryDefaults";

export const PREFAB_EXAMPLE_MATRIX_VERSION = "um-prefab-example-matrix-v1";

export type PrefabExampleDomain = "player" | "enemy" | "object";

export type PrefabExampleVariant =
    | "minimal"
    | "full-featured"
    | "override-heavy"
    | "migration-legacy";

export type PrefabExampleMigrationDetails = {
    sourceVersion: 0;
    requiresMigration: boolean;
    ok: boolean;
    message: string | null;
};

export type PrefabExampleMatrixEntry = {
    id: string;
    domain: PrefabExampleDomain;
    variant: PrefabExampleVariant;
    label: string;
    blueprint: PrefabBlueprint;
    expectedOutcomes: string[];
    source: {
        service: string;
        uiExample: string;
    };
    migration?: PrefabExampleMigrationDetails;
};

export type PrefabExampleMatrixCatalog = {
    version: typeof PREFAB_EXAMPLE_MATRIX_VERSION;
    entries: PrefabExampleMatrixEntry[];
    listEntries: (options?: {
        domain?: PrefabExampleDomain;
        variant?: PrefabExampleVariant;
    }) => PrefabExampleMatrixEntry[];
    getEntry: (entryId: string) => PrefabExampleMatrixEntry | null;
};

type LegacyPrefabBlueprintV0 = {
    version: 0;
    id: string;
    domain: PrefabExampleDomain;
    modules: Array<{
        id: string;
        config?: Record<string, unknown>;
    }>;
    metadata?: Record<string, unknown>;
};

function createMinimalBlueprint(input: {
    domain: PrefabExampleDomain;
    blueprintId: string;
    registry: PrefabRegistry;
}): PrefabBlueprint {
    const coreModuleIdByDomain: Record<PrefabExampleDomain, string> = {
        player: "player.core",
        enemy: "enemy.core",
        object: "object.core",
    };

    const builder = createPrefabBuilder({
        registry: input.registry,
        domain: input.domain,
        blueprintId: input.blueprintId,
    });
    builder.addModule(coreModuleIdByDomain[input.domain]);
    const blueprint = builder.finalize();
    if (!blueprint) {
        throw new Error(
            `Failed to build minimal prefab blueprint for ${input.domain}.`,
        );
    }

    return blueprint;
}

function createLegacyBlueprintEntry(input: {
    id: string;
    domain: PrefabExampleDomain;
    legacyPayload: LegacyPrefabBlueprintV0;
}): {
    blueprint: PrefabBlueprint;
    migration: PrefabExampleMigrationDetails;
} {
    const preflight = preflightMigratablePrefabBlueprint(input.legacyPayload);
    const migrationResult = migratePrefabBlueprint(input.legacyPayload);
    const migratedBlueprint = toCurrentPrefabBlueprint(migrationResult);

    if (!preflight.ok) {
        throw new Error(
            `Legacy preflight failed for ${input.id}: ${preflight.message ?? "unknown"}`,
        );
    }

    if (!migrationResult.ok || !migratedBlueprint) {
        throw new Error(
            `Legacy migration failed for ${input.id}: ${migrationResult.message ?? "unknown"}`,
        );
    }

    return {
        blueprint: {
            ...migratedBlueprint,
            version: PREFAB_BLUEPRINT_VERSION,
        },
        migration: {
            sourceVersion: 0,
            requiresMigration: preflight.requiresMigration,
            ok: migrationResult.ok,
            message: migrationResult.message,
        },
    };
}

function createPlayerEntries(
    registry: PrefabRegistry,
): PrefabExampleMatrixEntry[] {
    const legacy = createLegacyBlueprintEntry({
        id: "player-migration-legacy",
        domain: "player",
        legacyPayload: {
            version: 0,
            id: "player-migration-legacy",
            domain: "player",
            modules: [
                {
                    id: "player.core",
                    config: {
                        health: 72,
                        speed: 120,
                    },
                },
                {
                    id: "player.resources",
                    config: {
                        staminaMax: 70,
                    },
                },
            ],
            metadata: {
                source: "legacy-v0",
            },
        },
    });

    return [
        {
            id: "player-minimal",
            domain: "player",
            variant: "minimal",
            label: "Player minimal",
            blueprint: createMinimalBlueprint({
                domain: "player",
                blueprintId: "player-minimal",
                registry,
            }),
            expectedOutcomes: [
                "Attaches only player core with no unresolved dependencies.",
                "Provides smallest viable player prefab contract for smoke setup.",
            ],
            source: {
                service: "src/services/prefabExampleMatrix.ts",
                uiExample:
                    "src/components/examples/PrefabExampleMatrixExample.tsx",
            },
        },
        {
            id: "player-full-featured",
            domain: "player",
            variant: "full-featured",
            label: "Player full-featured",
            blueprint: createPlayerPrefabPack("arpg-player", {
                registry,
                blueprintId: "player-full-featured",
            }).blueprint,
            expectedOutcomes: [
                "Shows a complete player module composition suitable for production starter flows.",
                "Exercises inventory/resources/combat modules in one blueprint payload.",
            ],
            source: {
                service: "src/services/prefabExampleMatrix.ts",
                uiExample:
                    "src/components/examples/PrefabExampleMatrixExample.tsx",
            },
        },
        {
            id: "player-override-heavy",
            domain: "player",
            variant: "override-heavy",
            label: "Player override-heavy",
            blueprint: createPlayerPrefabPack("arpg-player", {
                registry,
                blueprintId: "player-override-heavy",
                overrides: {
                    "player.core": {
                        health: 180,
                        speed: 132,
                        collisionRadius: 11,
                    },
                    "player.resources": {
                        healthMax: 180,
                        staminaMax: 110,
                        manaMax: 60,
                    },
                    "player.combat": {
                        baseDamage: 22,
                        attackCadenceMs: 380,
                    },
                },
            }).blueprint,
            expectedOutcomes: [
                "Demonstrates deep config overrides without forking module definitions.",
                "Keeps domain-safe composition while materially changing combat/resource tuning.",
            ],
            source: {
                service: "src/services/prefabExampleMatrix.ts",
                uiExample:
                    "src/components/examples/PrefabExampleMatrixExample.tsx",
            },
        },
        {
            id: "player-migration-legacy",
            domain: "player",
            variant: "migration-legacy",
            label: "Player migration/legacy",
            blueprint: legacy.blueprint,
            expectedOutcomes: [
                "Migrates legacy v0 payload to um-prefab-blueprint-v1 safely.",
                "Produces current blueprint schema with preserved module overrides.",
            ],
            source: {
                service: "src/services/prefabExampleMatrix.ts",
                uiExample:
                    "src/components/examples/PrefabExampleMatrixExample.tsx",
            },
            migration: legacy.migration,
        },
    ];
}

function createEnemyEntries(
    registry: PrefabRegistry,
): PrefabExampleMatrixEntry[] {
    const legacy = createLegacyBlueprintEntry({
        id: "enemy-migration-legacy",
        domain: "enemy",
        legacyPayload: {
            version: 0,
            id: "enemy-migration-legacy",
            domain: "enemy",
            modules: [
                {
                    id: "enemy.core",
                    config: {
                        health: 95,
                        damage: 9,
                    },
                },
                {
                    id: "enemy.pathing",
                    config: {
                        behavior: "patrol",
                        leashDistance: 16,
                    },
                },
            ],
        },
    });

    return [
        {
            id: "enemy-minimal",
            domain: "enemy",
            variant: "minimal",
            label: "Enemy minimal",
            blueprint: createMinimalBlueprint({
                domain: "enemy",
                blueprintId: "enemy-minimal",
                registry,
            }),
            expectedOutcomes: [
                "Supplies compact enemy baseline for encounter bootstrap and CI checks.",
                "Avoids dependency churn while validating attachment lifecycle hooks.",
            ],
            source: {
                service: "src/services/prefabExampleMatrix.ts",
                uiExample:
                    "src/components/examples/PrefabExampleMatrixExample.tsx",
            },
        },
        {
            id: "enemy-full-featured",
            domain: "enemy",
            variant: "full-featured",
            label: "Enemy full-featured",
            blueprint: createEnemyPrefabPack("boss-phase", {
                registry,
                blueprintId: "enemy-full-featured",
            }).blueprint,
            expectedOutcomes: [
                "Covers advanced enemy composition with phase hooks and combat modules.",
                "Provides realistic boss-grade prefab payload for integration tests.",
            ],
            source: {
                service: "src/services/prefabExampleMatrix.ts",
                uiExample:
                    "src/components/examples/PrefabExampleMatrixExample.tsx",
            },
        },
        {
            id: "enemy-override-heavy",
            domain: "enemy",
            variant: "override-heavy",
            label: "Enemy override-heavy",
            blueprint: createEnemyPrefabPack("boss-phase", {
                registry,
                blueprintId: "enemy-override-heavy",
                overrides: {
                    "enemy.core": {
                        health: 420,
                        damage: 30,
                        reward: {
                            xp: 440,
                            gold: 180,
                        },
                    },
                    "enemy.pathing": {
                        behavior: "dive-kite",
                        preferredDistance: 3,
                        leashDistance: 24,
                    },
                    "enemy.phase-hooks": {
                        phases: [
                            {
                                threshold: 0.66,
                                speedMultiplier: 1.2,
                            },
                            {
                                threshold: 0.33,
                                speedMultiplier: 1.45,
                            },
                        ],
                    },
                },
            }).blueprint,
            expectedOutcomes: [
                "Stresses nested overrides including arrays and reward curves.",
                "Verifies override-heavy tuning still resolves valid dependencies.",
            ],
            source: {
                service: "src/services/prefabExampleMatrix.ts",
                uiExample:
                    "src/components/examples/PrefabExampleMatrixExample.tsx",
            },
        },
        {
            id: "enemy-migration-legacy",
            domain: "enemy",
            variant: "migration-legacy",
            label: "Enemy migration/legacy",
            blueprint: legacy.blueprint,
            expectedOutcomes: [
                "Migrates legacy enemy payload to current blueprint schema with stable module IDs.",
                "Keeps authored legacy config semantics through migration conversion.",
            ],
            source: {
                service: "src/services/prefabExampleMatrix.ts",
                uiExample:
                    "src/components/examples/PrefabExampleMatrixExample.tsx",
            },
            migration: legacy.migration,
        },
    ];
}

function createObjectEntries(
    registry: PrefabRegistry,
): PrefabExampleMatrixEntry[] {
    const legacy = createLegacyBlueprintEntry({
        id: "object-migration-legacy",
        domain: "object",
        legacyPayload: {
            version: 0,
            id: "object-migration-legacy",
            domain: "object",
            modules: [
                {
                    id: "object.core",
                    config: {
                        label: "Legacy object",
                    },
                },
                {
                    id: "object.interactable",
                    config: {
                        prompt: "Inspect",
                    },
                },
            ],
        },
    });

    return [
        {
            id: "object-minimal",
            domain: "object",
            variant: "minimal",
            label: "Object minimal",
            blueprint: createMinimalBlueprint({
                domain: "object",
                blueprintId: "object-minimal",
                registry,
            }),
            expectedOutcomes: [
                "Defines minimum object prefab payload for map placement tests.",
                "Serves as baseline for progressive module layering in examples.",
            ],
            source: {
                service: "src/services/prefabExampleMatrix.ts",
                uiExample:
                    "src/components/examples/PrefabExampleMatrixExample.tsx",
            },
        },
        {
            id: "object-full-featured",
            domain: "object",
            variant: "full-featured",
            label: "Object full-featured",
            blueprint: createObjectPrefabPack("quest-giver", {
                registry,
                blueprintId: "object-full-featured",
            }).blueprint,
            expectedOutcomes: [
                "Represents multi-module interactive object workflow (quest + interaction).",
                "Covers practical authored object payload shape for gameplay hubs.",
            ],
            source: {
                service: "src/services/prefabExampleMatrix.ts",
                uiExample:
                    "src/components/examples/PrefabExampleMatrixExample.tsx",
            },
        },
        {
            id: "object-override-heavy",
            domain: "object",
            variant: "override-heavy",
            label: "Object override-heavy",
            blueprint: createObjectPrefabPack("locked-door", {
                registry,
                blueprintId: "object-override-heavy",
                overrides: {
                    "object.core": {
                        label: "Vault Gate",
                        tags: ["dungeon", "critical-path"],
                    },
                    "object.interactable": {
                        prompt: "Use rune key",
                        cooldownMs: 450,
                    },
                    "object.locked-door": {
                        keyId: "rune-key-alpha",
                        consumeOnUse: false,
                        autoCloseMs: 7000,
                    },
                    "object.switch": {
                        switchId: "vault-gate-switch",
                        toggles: ["vault-gate"],
                    },
                },
            }).blueprint,
            expectedOutcomes: [
                "Shows heavy override workflow for interactable and lock-state logic.",
                "Demonstrates stable object composition under high config customization.",
            ],
            source: {
                service: "src/services/prefabExampleMatrix.ts",
                uiExample:
                    "src/components/examples/PrefabExampleMatrixExample.tsx",
            },
        },
        {
            id: "object-migration-legacy",
            domain: "object",
            variant: "migration-legacy",
            label: "Object migration/legacy",
            blueprint: legacy.blueprint,
            expectedOutcomes: [
                "Converts legacy object payloads to current prefab blueprint schema.",
                "Validates migration path for authored interactable data from older tools.",
            ],
            source: {
                service: "src/services/prefabExampleMatrix.ts",
                uiExample:
                    "src/components/examples/PrefabExampleMatrixExample.tsx",
            },
            migration: legacy.migration,
        },
    ];
}

function cloneEntry(entry: PrefabExampleMatrixEntry): PrefabExampleMatrixEntry {
    return {
        ...entry,
        blueprint: {
            ...entry.blueprint,
            modules: entry.blueprint.modules.map((moduleEntry) => ({
                moduleId: moduleEntry.moduleId,
                config: JSON.parse(JSON.stringify(moduleEntry.config)),
            })),
            ...(entry.blueprint.metadata
                ? {
                      metadata: JSON.parse(
                          JSON.stringify(entry.blueprint.metadata),
                      ) as Record<string, unknown>,
                  }
                : {}),
        },
        expectedOutcomes: [...entry.expectedOutcomes],
        source: {
            ...entry.source,
        },
        ...(entry.migration ? { migration: { ...entry.migration } } : {}),
    };
}

export function createPrefabExampleMatrixCatalog(options?: {
    registry?: PrefabRegistry;
}): PrefabExampleMatrixCatalog {
    const registry = options?.registry ?? createDefaultPrefabRegistry();
    const entries = [
        ...createPlayerEntries(registry),
        ...createEnemyEntries(registry),
        ...createObjectEntries(registry),
    ];

    return {
        version: PREFAB_EXAMPLE_MATRIX_VERSION,
        entries: entries.map((entry) => cloneEntry(entry)),
        listEntries: (filters) => {
            return entries
                .filter((entry) => {
                    if (filters?.domain && entry.domain !== filters.domain) {
                        return false;
                    }

                    if (filters?.variant && entry.variant !== filters.variant) {
                        return false;
                    }

                    return true;
                })
                .map((entry) => cloneEntry(entry));
        },
        getEntry: (entryId) => {
            const normalized = entryId.trim();
            if (!normalized) {
                return null;
            }

            const found = entries.find((entry) => entry.id === normalized);
            return found ? cloneEntry(found) : null;
        },
    };
}
