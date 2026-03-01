import {
    createEnemyPrefabPack,
    createObjectPrefabPack,
    createPlayerPrefabPack,
    type EnemyArchetype,
    type ObjectArchetype,
    type PlayerArchetype,
} from "@/services/prefabPacks";
import { createDefaultPrefabRegistry } from "@/services/prefabRegistryDefaults";
import type { PrefabModuleConfig, PrefabRegistry } from "@/services/prefabCore";

export const PREFAB_ENCOUNTER_BUNDLE_VERSION = "um-prefab-encounter-bundle-v1";

export type PrefabEncounterDomain = "player" | "enemy" | "object";

export type PrefabEncounterSpawn = {
    id: string;
    domain: PrefabEncounterDomain;
    archetype: string;
    count?: number;
    overrides?: Record<string, PrefabModuleConfig>;
};

export type PrefabEncounterBundle = {
    version: typeof PREFAB_ENCOUNTER_BUNDLE_VERSION;
    id: string;
    label: string;
    spawns: PrefabEncounterSpawn[];
    metadata?: Record<string, unknown>;
};

export type PrefabEncounterSimulationReport = {
    ok: boolean;
    bundleId: string;
    entitiesSimulated: number;
    moduleAttachments: number;
    issues: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function normalizeId(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

function toSpawnCount(value: unknown): number {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return 1;
    }

    return Math.max(1, Math.min(24, Math.floor(value)));
}

function isPlayerArchetype(value: string): value is PlayerArchetype {
    return [
        "arpg-player",
        "jrpg-party-lead",
        "survival-crafter",
        "twin-stick-shooter",
        "stealth-infiltrator",
        "platformer-mobility",
    ].includes(value);
}

function isEnemyArchetype(value: string): value is EnemyArchetype {
    return [
        "melee-chaser",
        "ranged-kiter",
        "tank-bruiser",
        "boss-phase",
        "swarm-rusher",
        "support-healer",
        "shield-guard",
        "sniper-kiter",
    ].includes(value);
}

function isObjectArchetype(value: string): value is ObjectArchetype {
    return [
        "loot-chest",
        "shop-npc",
        "quest-board",
        "door-switch",
        "checkpoint-statue",
        "breakable-container",
        "resource-node",
        "crafting-station",
        "bank-stash",
        "fast-travel-point",
        "trap-floor",
        "switch-network",
        "locked-door",
        "escort-cart",
        "arena-trigger",
        "quest-giver",
        "follower-companion",
        "merchant-tiered",
        "trainer-skill-tree",
        "faction-rep-agent",
        "town-ambient-npc",
    ].includes(value);
}

export function parsePrefabEncounterBundle(
    raw: string,
): { ok: true; value: PrefabEncounterBundle } | { ok: false; message: string } {
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return {
            ok: false,
            message: "Invalid encounter bundle JSON.",
        };
    }

    if (!isRecord(parsed)) {
        return {
            ok: false,
            message: "Invalid encounter bundle payload.",
        };
    }

    if (parsed.version !== PREFAB_ENCOUNTER_BUNDLE_VERSION) {
        return {
            ok: false,
            message: `Invalid encounter bundle version; expected ${PREFAB_ENCOUNTER_BUNDLE_VERSION}.`,
        };
    }

    const id = normalizeId(parsed.id);
    const label = normalizeId(parsed.label);
    if (!id || !label) {
        return {
            ok: false,
            message: "Encounter bundle requires non-empty id and label.",
        };
    }

    if (!Array.isArray(parsed.spawns) || parsed.spawns.length <= 0) {
        return {
            ok: false,
            message: "Encounter bundle requires at least one spawn entry.",
        };
    }

    const spawns: PrefabEncounterSpawn[] = [];
    for (let index = 0; index < parsed.spawns.length; index += 1) {
        const entry = parsed.spawns[index];
        if (!isRecord(entry)) {
            return {
                ok: false,
                message: `Invalid spawn entry at index ${index}.`,
            };
        }

        const spawnId = normalizeId(entry.id);
        const domain = normalizeId(entry.domain) as PrefabEncounterDomain;
        const archetype = normalizeId(entry.archetype);
        if (!spawnId || !domain || !archetype) {
            return {
                ok: false,
                message: `Spawn entry at index ${index} is missing id/domain/archetype.`,
            };
        }

        if (!["player", "enemy", "object"].includes(domain)) {
            return {
                ok: false,
                message: `Invalid spawn domain "${domain}" at index ${index}.`,
            };
        }

        spawns.push({
            id: spawnId,
            domain,
            archetype,
            count: toSpawnCount(entry.count),
            ...(isRecord(entry.overrides)
                ? {
                      overrides: entry.overrides as Record<
                          string,
                          PrefabModuleConfig
                      >,
                  }
                : {}),
        });
    }

    return {
        ok: true,
        value: {
            version: PREFAB_ENCOUNTER_BUNDLE_VERSION,
            id,
            label,
            spawns,
            ...(isRecord(parsed.metadata)
                ? { metadata: parsed.metadata as Record<string, unknown> }
                : {}),
        },
    };
}

export function simulatePrefabEncounterBundle(
    bundle: PrefabEncounterBundle,
    options?: {
        registry?: PrefabRegistry;
    },
): PrefabEncounterSimulationReport {
    const registry = options?.registry ?? createDefaultPrefabRegistry();
    const issues: string[] = [];

    let entitiesSimulated = 0;
    let moduleAttachments = 0;

    for (const spawn of bundle.spawns) {
        const count = toSpawnCount(spawn.count);
        for (let index = 0; index < count; index += 1) {
            const entityId = count > 1 ? `${spawn.id}-${index + 1}` : spawn.id;

            if (spawn.domain === "player") {
                if (!isPlayerArchetype(spawn.archetype)) {
                    issues.push(
                        `${entityId}: invalid player archetype "${spawn.archetype}".`,
                    );
                    continue;
                }

                const pack = createPlayerPrefabPack(spawn.archetype, {
                    registry,
                    overrides: spawn.overrides,
                });
                const report = pack.attachPlayer(entityId, {});
                moduleAttachments += report.attached.length;
                if (report.failed.length > 0) {
                    issues.push(
                        `${entityId}: player attach failed for ${report.failed.map((entry) => entry.moduleId).join(", ")}.`,
                    );
                }
                pack.detachPlayer(entityId, {});
                entitiesSimulated += 1;
                continue;
            }

            if (spawn.domain === "enemy") {
                if (!isEnemyArchetype(spawn.archetype)) {
                    issues.push(
                        `${entityId}: invalid enemy archetype "${spawn.archetype}".`,
                    );
                    continue;
                }

                const pack = createEnemyPrefabPack(spawn.archetype, {
                    registry,
                    overrides: spawn.overrides,
                });
                const report = pack.attachEnemy(entityId, {});
                moduleAttachments += report.attached.length;
                if (report.failed.length > 0) {
                    issues.push(
                        `${entityId}: enemy attach failed for ${report.failed.map((entry) => entry.moduleId).join(", ")}.`,
                    );
                }
                pack.detachEnemy(entityId, {});
                entitiesSimulated += 1;
                continue;
            }

            if (!isObjectArchetype(spawn.archetype)) {
                issues.push(
                    `${entityId}: invalid object archetype "${spawn.archetype}".`,
                );
                continue;
            }

            const pack = createObjectPrefabPack(spawn.archetype, {
                registry,
                overrides: spawn.overrides,
            });
            const report = pack.attachObject(entityId, {});
            moduleAttachments += report.attached.length;
            if (report.failed.length > 0) {
                issues.push(
                    `${entityId}: object attach failed for ${report.failed.map((entry) => entry.moduleId).join(", ")}.`,
                );
            }
            pack.detachObject(entityId, {});
            entitiesSimulated += 1;
        }
    }

    return {
        ok: issues.length <= 0,
        bundleId: bundle.id,
        entitiesSimulated,
        moduleAttachments,
        issues,
    };
}

export function createPrefabEncounterBundleCatalog(): PrefabEncounterBundle[] {
    return [
        {
            version: PREFAB_ENCOUNTER_BUNDLE_VERSION,
            id: "starter-camp",
            label: "Starter Camp",
            spawns: [
                {
                    id: "player-main",
                    domain: "player",
                    archetype: "arpg-player",
                },
                {
                    id: "enemy-rushers",
                    domain: "enemy",
                    archetype: "melee-chaser",
                    count: 2,
                },
                {
                    id: "camp-loot",
                    domain: "object",
                    archetype: "loot-chest",
                },
                {
                    id: "camp-board",
                    domain: "object",
                    archetype: "quest-giver",
                },
            ],
        },
        {
            version: PREFAB_ENCOUNTER_BUNDLE_VERSION,
            id: "dungeon-room-loop",
            label: "Dungeon Room Loop",
            spawns: [
                {
                    id: "player-main",
                    domain: "player",
                    archetype: "arpg-player",
                },
                {
                    id: "guard-line",
                    domain: "enemy",
                    archetype: "shield-guard",
                    count: 2,
                },
                {
                    id: "sniper-line",
                    domain: "enemy",
                    archetype: "sniper-kiter",
                },
                {
                    id: "room-switch-net",
                    domain: "object",
                    archetype: "switch-network",
                },
                {
                    id: "room-locked-door",
                    domain: "object",
                    archetype: "locked-door",
                },
            ],
        },
        {
            version: PREFAB_ENCOUNTER_BUNDLE_VERSION,
            id: "boss-antechamber",
            label: "Boss Antechamber",
            spawns: [
                {
                    id: "party-lead",
                    domain: "player",
                    archetype: "jrpg-party-lead",
                },
                { id: "boss-core", domain: "enemy", archetype: "boss-phase" },
                {
                    id: "support-core",
                    domain: "enemy",
                    archetype: "support-healer",
                },
                {
                    id: "checkpoint-core",
                    domain: "object",
                    archetype: "checkpoint-statue",
                },
            ],
        },
        {
            version: PREFAB_ENCOUNTER_BUNDLE_VERSION,
            id: "survival-wave-field",
            label: "Survival Wave Field",
            spawns: [
                {
                    id: "survivor",
                    domain: "player",
                    archetype: "survival-crafter",
                },
                {
                    id: "wave-rushers",
                    domain: "enemy",
                    archetype: "swarm-rusher",
                    count: 3,
                },
                {
                    id: "resource-a",
                    domain: "object",
                    archetype: "resource-node",
                    count: 2,
                },
                { id: "field-trap", domain: "object", archetype: "trap-floor" },
            ],
        },
        {
            version: PREFAB_ENCOUNTER_BUNDLE_VERSION,
            id: "town-social-hub",
            label: "Town Social Hub",
            spawns: [
                {
                    id: "party-lead",
                    domain: "player",
                    archetype: "jrpg-party-lead",
                },
                {
                    id: "npc-merchant",
                    domain: "object",
                    archetype: "merchant-tiered",
                },
                {
                    id: "npc-trainer",
                    domain: "object",
                    archetype: "trainer-skill-tree",
                },
                {
                    id: "npc-faction",
                    domain: "object",
                    archetype: "faction-rep-agent",
                },
                {
                    id: "npc-ambient",
                    domain: "object",
                    archetype: "town-ambient-npc",
                    count: 2,
                },
            ],
        },
    ];
}

export function toPrefabEncounterBundleJson(
    bundle: PrefabEncounterBundle,
    options?: { pretty?: boolean },
): string {
    return JSON.stringify(bundle, null, options?.pretty === false ? 0 : 4);
}
