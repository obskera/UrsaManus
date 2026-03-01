import {
    createPrefabBuilder,
    type PrefabBlueprint,
    type PrefabBuilder,
    type PrefabModuleConfig,
    type PrefabRegistry,
} from "@/services/prefabCore";
import {
    createPrefabDependencyAdvisorService,
    type PrefabDependencyAdvisorReport,
    type PrefabDependencyQuickFixResult,
} from "@/services/prefabDependencyAdvisor";
import { createDefaultPrefabRegistry } from "@/services/prefabRegistryDefaults";

export type PrefabStarterArchetype = "player" | "enemy" | "object";

export type PrefabStarterPresetId =
    | "player:rpg-starter"
    | "enemy:melee-chaser"
    | "enemy:ranged-kiter"
    | "enemy:tank-bruiser"
    | "enemy:boss-phase"
    | "enemy:swarm-rusher"
    | "enemy:support-healer"
    | "enemy:shield-guard"
    | "enemy:sniper-kiter"
    | "object:loot-chest"
    | "object:shop-npc"
    | "object:quest-board"
    | "object:door-switch"
    | "object:checkpoint-statue"
    | "object:breakable-container"
    | "object:resource-node"
    | "object:crafting-station"
    | "object:bank-stash"
    | "object:fast-travel-point"
    | "object:trap-floor"
    | "object:switch-network"
    | "object:locked-door"
    | "object:escort-cart"
    | "object:arena-trigger"
    | "object:quest-giver"
    | "object:follower-companion"
    | "object:merchant-tiered"
    | "object:trainer-skill-tree"
    | "object:faction-rep-agent"
    | "object:town-ambient-npc";

export type PrefabStarterPreset = {
    id: PrefabStarterPresetId;
    archetype: PrefabStarterArchetype;
    label: string;
    moduleIds: string[];
};

export type PrefabStarterBuildResult = {
    ok: boolean;
    blueprint: PrefabBlueprint;
    issues: string[];
    integrationSnippet: string;
};

const PRESETS: PrefabStarterPreset[] = [
    {
        id: "player:rpg-starter",
        archetype: "player",
        label: "RPG Player Starter",
        moduleIds: [
            "rpg.abilities",
            "rpg.inventory-hotbar",
            "rpg.stats-equipment",
            "rpg.world-hooks",
        ],
    },
    {
        id: "enemy:melee-chaser",
        archetype: "enemy",
        label: "Enemy Melee Chaser",
        moduleIds: ["enemy.core", "enemy.melee-ability", "enemy.pathing"],
    },
    {
        id: "enemy:ranged-kiter",
        archetype: "enemy",
        label: "Enemy Ranged Kiter",
        moduleIds: ["enemy.core", "enemy.pathing", "enemy.ranged-ability"],
    },
    {
        id: "enemy:tank-bruiser",
        archetype: "enemy",
        label: "Enemy Tank Bruiser",
        moduleIds: ["enemy.core", "enemy.melee-ability", "enemy.pathing"],
    },
    {
        id: "enemy:boss-phase",
        archetype: "enemy",
        label: "Enemy Boss Phase",
        moduleIds: [
            "enemy.core",
            "enemy.melee-ability",
            "enemy.pathing",
            "enemy.phase-hooks",
        ],
    },
    {
        id: "enemy:swarm-rusher",
        archetype: "enemy",
        label: "Enemy Swarm Rusher",
        moduleIds: [
            "enemy.core",
            "enemy.melee-ability",
            "enemy.pathing",
            "enemy.swarm-rush",
        ],
    },
    {
        id: "enemy:support-healer",
        archetype: "enemy",
        label: "Enemy Support Healer",
        moduleIds: ["enemy.core", "enemy.pathing", "enemy.support-aura"],
    },
    {
        id: "enemy:shield-guard",
        archetype: "enemy",
        label: "Enemy Shield Guard",
        moduleIds: [
            "enemy.core",
            "enemy.melee-ability",
            "enemy.pathing",
            "enemy.shield-guard",
        ],
    },
    {
        id: "enemy:sniper-kiter",
        archetype: "enemy",
        label: "Enemy Sniper Kiter",
        moduleIds: [
            "enemy.core",
            "enemy.pathing",
            "enemy.ranged-ability",
            "enemy.sniper-profile",
        ],
    },
    {
        id: "object:loot-chest",
        archetype: "object",
        label: "Object Loot Chest",
        moduleIds: ["object.core", "object.interactable", "object.loot-state"],
    },
    {
        id: "object:shop-npc",
        archetype: "object",
        label: "Object Shop NPC",
        moduleIds: ["object.core", "object.interactable", "object.vendor"],
    },
    {
        id: "object:quest-board",
        archetype: "object",
        label: "Object Quest Board",
        moduleIds: ["object.core", "object.interactable", "object.quest-board"],
    },
    {
        id: "object:door-switch",
        archetype: "object",
        label: "Object Door Switch",
        moduleIds: ["object.core", "object.interactable", "object.switch"],
    },
    {
        id: "object:checkpoint-statue",
        archetype: "object",
        label: "Object Checkpoint Statue",
        moduleIds: ["object.core", "object.interactable", "object.checkpoint"],
    },
    {
        id: "object:breakable-container",
        archetype: "object",
        label: "Object Breakable Container",
        moduleIds: [
            "object.breakable-container",
            "object.core",
            "object.interactable",
        ],
    },
    {
        id: "object:resource-node",
        archetype: "object",
        label: "Object Resource Node",
        moduleIds: [
            "object.core",
            "object.interactable",
            "object.resource-node",
        ],
    },
    {
        id: "object:crafting-station",
        archetype: "object",
        label: "Object Crafting Station",
        moduleIds: [
            "object.core",
            "object.crafting-station",
            "object.interactable",
        ],
    },
    {
        id: "object:bank-stash",
        archetype: "object",
        label: "Object Bank Stash",
        moduleIds: ["object.bank-stash", "object.core", "object.interactable"],
    },
    {
        id: "object:fast-travel-point",
        archetype: "object",
        label: "Object Fast Travel Point",
        moduleIds: [
            "object.core",
            "object.fast-travel-point",
            "object.interactable",
        ],
    },
    {
        id: "object:trap-floor",
        archetype: "object",
        label: "Object Trap Floor",
        moduleIds: ["object.core", "object.interactable", "object.trap-floor"],
    },
    {
        id: "object:switch-network",
        archetype: "object",
        label: "Object Switch Network",
        moduleIds: [
            "object.core",
            "object.interactable",
            "object.switch",
            "object.switch-network",
        ],
    },
    {
        id: "object:locked-door",
        archetype: "object",
        label: "Object Locked Door",
        moduleIds: [
            "object.core",
            "object.interactable",
            "object.locked-door",
            "object.switch",
        ],
    },
    {
        id: "object:escort-cart",
        archetype: "object",
        label: "Object Escort Cart",
        moduleIds: ["object.core", "object.escort-cart", "object.interactable"],
    },
    {
        id: "object:arena-trigger",
        archetype: "object",
        label: "Object Arena Trigger",
        moduleIds: [
            "object.arena-trigger",
            "object.core",
            "object.interactable",
        ],
    },
    {
        id: "object:quest-giver",
        archetype: "object",
        label: "Object Quest Giver",
        moduleIds: [
            "object.core",
            "object.interactable",
            "object.npc.quest-giver",
            "object.quest-board",
        ],
    },
    {
        id: "object:follower-companion",
        archetype: "object",
        label: "Object Follower Companion",
        moduleIds: [
            "object.core",
            "object.interactable",
            "object.npc.follower-companion",
        ],
    },
    {
        id: "object:merchant-tiered",
        archetype: "object",
        label: "Object Merchant Tiered",
        moduleIds: [
            "object.core",
            "object.interactable",
            "object.npc.merchant-tiered",
            "object.vendor",
        ],
    },
    {
        id: "object:trainer-skill-tree",
        archetype: "object",
        label: "Object Trainer Skill Tree",
        moduleIds: [
            "object.core",
            "object.interactable",
            "object.npc.trainer-skill-tree",
        ],
    },
    {
        id: "object:faction-rep-agent",
        archetype: "object",
        label: "Object Faction Rep Agent",
        moduleIds: [
            "object.core",
            "object.interactable",
            "object.npc.faction-rep-agent",
        ],
    },
    {
        id: "object:town-ambient-npc",
        archetype: "object",
        label: "Object Town Ambient NPC",
        moduleIds: [
            "object.core",
            "object.interactable",
            "object.npc.town-ambient",
        ],
    },
];

function getDomain(archetype: PrefabStarterArchetype): string {
    return archetype;
}

function toBuilder(options: {
    registry: PrefabRegistry;
    archetype: PrefabStarterArchetype;
    blueprintId: string;
}): PrefabBuilder {
    return createPrefabBuilder({
        registry: options.registry,
        domain: getDomain(options.archetype),
        blueprintId: options.blueprintId,
    });
}

function toSnippetFromBlueprint(
    presetOrSelection: string,
    blueprint: PrefabBlueprint,
): string {
    const modules = blueprint.modules.map((module) => module.moduleId);
    const moduleList = JSON.stringify(modules, null, 2);

    return [
        'import { createPrefabAttachmentRuntime } from "@/services/prefabCore";',
        'import { createDefaultPrefabRegistry } from "@/services/prefabRegistryDefaults";',
        "",
        "const prefabRegistry = createDefaultPrefabRegistry();",
        "const prefabRuntime = createPrefabAttachmentRuntime({ registry: prefabRegistry });",
        "",
        `const moduleIds = ${moduleList} as const;`,
        "const prefabRequests = moduleIds.map((moduleId) => ({ moduleId }));",
        `const report = prefabRuntime.attachPrefabModules("entity-id", prefabRequests, {}); // ${presetOrSelection}`,
        "",
        "if (report.failed.length > 0) {",
        "  console.error(report.failed);",
        "}",
    ].join("\n");
}

function toIssueMessages(
    issues: Array<{ message: string }>,
    buildOk: boolean,
    hasModules: boolean,
): string[] {
    const messages = issues.map((issue) => issue.message);
    if (!hasModules) {
        messages.push("No prefab modules were selected.");
    }

    if (!buildOk) {
        messages.push("Blueprint build failed.");
    }

    return Array.from(new Set(messages));
}

export type PrefabStarterWizardService = {
    listArchetypes: () => PrefabStarterArchetype[];
    listPresets: (archetype?: PrefabStarterArchetype) => PrefabStarterPreset[];
    buildFromPreset: (input: {
        presetId: PrefabStarterPresetId;
        blueprintId?: string;
        moduleOverrides?: Record<string, PrefabModuleConfig>;
    }) => PrefabStarterBuildResult;
    buildFromSelection: (input: {
        archetype: PrefabStarterArchetype;
        blueprintId: string;
        moduleIds: string[];
        moduleOverrides?: Record<string, PrefabModuleConfig>;
    }) => PrefabStarterBuildResult;
    recommendModulesForSelection: (input: {
        archetype: PrefabStarterArchetype;
        moduleIds: string[];
    }) => PrefabDependencyAdvisorReport;
    applyModuleQuickFix: (input: {
        archetype: PrefabStarterArchetype;
        moduleIds: string[];
        includeOptional?: boolean;
    }) => PrefabDependencyQuickFixResult;
};

export function createPrefabStarterWizardService(options?: {
    registry?: PrefabRegistry;
}): PrefabStarterWizardService {
    const registry = options?.registry ?? createDefaultPrefabRegistry();
    const optionalModuleIdsByArchetype: Record<
        PrefabStarterArchetype,
        string[]
    > = {
        player: Array.from(
            new Set(
                PRESETS.filter(
                    (preset) => preset.archetype === "player",
                ).flatMap((preset) => preset.moduleIds),
            ),
        ).sort((left, right) => left.localeCompare(right)),
        enemy: Array.from(
            new Set(
                PRESETS.filter(
                    (preset) => preset.archetype === "enemy",
                ).flatMap((preset) => preset.moduleIds),
            ),
        ).sort((left, right) => left.localeCompare(right)),
        object: Array.from(
            new Set(
                PRESETS.filter(
                    (preset) => preset.archetype === "object",
                ).flatMap((preset) => preset.moduleIds),
            ),
        ).sort((left, right) => left.localeCompare(right)),
    };
    const dependencyAdvisor = createPrefabDependencyAdvisorService({
        registry,
        optionalModuleIdsByArchetype,
    });

    const buildWithModules = (input: {
        archetype: PrefabStarterArchetype;
        blueprintId: string;
        moduleIds: string[];
        moduleOverrides?: Record<string, PrefabModuleConfig>;
        label: string;
    }): PrefabStarterBuildResult => {
        const builder = toBuilder({
            registry,
            archetype: input.archetype,
            blueprintId: input.blueprintId,
        });

        for (const moduleId of input.moduleIds) {
            builder.addModule(moduleId, input.moduleOverrides?.[moduleId]);
        }

        const build = builder.buildBlueprint();
        const issues = toIssueMessages(
            build.issues,
            build.ok,
            build.blueprint.modules.length > 0,
        );

        return {
            ok: build.ok,
            blueprint: build.blueprint,
            issues,
            integrationSnippet: toSnippetFromBlueprint(
                input.label,
                build.blueprint,
            ),
        };
    };

    return {
        listArchetypes: () => ["player", "enemy", "object"],
        listPresets: (archetype) =>
            PRESETS.filter((preset) =>
                archetype ? preset.archetype === archetype : true,
            ).map((preset) => ({
                id: preset.id,
                archetype: preset.archetype,
                label: preset.label,
                moduleIds: [...preset.moduleIds],
            })),
        buildFromPreset: ({ presetId, blueprintId, moduleOverrides }) => {
            const preset = PRESETS.find((entry) => entry.id === presetId);
            if (!preset) {
                const fallback = buildWithModules({
                    archetype: "player",
                    blueprintId: blueprintId?.trim() || "invalid-preset",
                    moduleIds: [],
                    label: `preset:${presetId}`,
                });
                return {
                    ...fallback,
                    ok: false,
                    issues: [
                        ...fallback.issues,
                        `Unknown preset "${presetId}".`,
                    ],
                };
            }

            return buildWithModules({
                archetype: preset.archetype,
                blueprintId:
                    blueprintId?.trim() || preset.id.replaceAll(":", "-"),
                moduleIds: preset.moduleIds,
                moduleOverrides,
                label: `preset:${preset.id}`,
            });
        },
        buildFromSelection: ({
            archetype,
            blueprintId,
            moduleIds,
            moduleOverrides,
        }) =>
            buildWithModules({
                archetype,
                blueprintId,
                moduleIds,
                moduleOverrides,
                label: `selection:${archetype}`,
            }),
        recommendModulesForSelection: ({ archetype, moduleIds }) =>
            dependencyAdvisor.recommend({
                archetype,
                moduleIds,
            }),
        applyModuleQuickFix: ({ archetype, moduleIds, includeOptional }) =>
            dependencyAdvisor.applyQuickFix({
                archetype,
                moduleIds,
                includeOptional,
            }),
    };
}
