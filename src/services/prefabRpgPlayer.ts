import {
    type AbilityCooldownEffectsService,
    createAbilityCooldownEffectsService,
    type AbilityDefinition,
} from "@/services/abilityCooldownEffects";
import {
    createCheckpointRespawnService,
    type CheckpointRespawnService,
} from "@/services/checkpointRespawn";
import {
    createEquipmentStatsService,
    type EquipmentItem,
    type EquipmentStatsService,
    type StatBlock,
} from "@/services/equipmentStats";
import {
    createHotbarService,
    type HotbarService,
    type HotbarBinding,
} from "@/services/hotbar";
import {
    createInteractionPromptService,
    type InteractionPromptService,
} from "@/services/interactionPrompt";
import {
    createInventoryService,
    type InventoryItemDefinition,
    type InventoryService,
} from "@/services/inventoryCore";
import {
    createObjectiveTrackerService,
    type ObjectiveTrackerService,
} from "@/services/objectiveTracker";
import {
    createPrefabAttachmentRuntime,
    createPrefabBuilder,
    createPrefabRegistry,
    type PrefabAttachRequest,
    type PrefabAttachmentReport,
    type PrefabAttachmentRuntime,
    type PrefabBlueprint,
    type PrefabBuilder,
    type PrefabRegistry,
} from "@/services/prefabCore";

const RPG_PLAYER_BLUEPRINT_ID = "rpg-player";
const RPG_PLAYER_DOMAIN = "player";

const RPG_MODULE_STATS = "rpg.stats-equipment";
const RPG_MODULE_INVENTORY = "rpg.inventory-hotbar";
const RPG_MODULE_ABILITIES = "rpg.abilities";
const RPG_MODULE_WORLD = "rpg.world-hooks";

type RpgStatsConfig = {
    baseStats?: Partial<StatBlock>;
    starterEquipment?: EquipmentItem[];
};

type RpgInventoryStarterItem = {
    definition: InventoryItemDefinition;
    quantity: number;
};

type RpgInventoryConfig = {
    containerId?: string;
    inventoryCapacity?: number;
    hotbarSlotCount?: number;
    starterItems?: RpgInventoryStarterItem[];
    starterBindings?: Array<{
        index: number;
        binding: HotbarBinding;
    }>;
};

type RpgAbilityConfig = {
    resources?: Record<string, number>;
    abilities?: AbilityDefinition[];
};

type RpgWorldConfig = {
    interactionPrompt?: {
        label?: string;
        actionLabel?: string;
        radius?: number;
        cooldownMs?: number;
    };
    initialObjective?: {
        id: string;
        label: string;
    };
    initialCheckpoint?: {
        id?: string;
        x?: number;
        y?: number;
    };
};

export type RpgPlayerPrefabContext = {
    equipmentStatsService?: EquipmentStatsService;
    inventoryService?: InventoryService;
    hotbarService?: HotbarService;
    abilityService?: AbilityCooldownEffectsService;
    checkpointService?: CheckpointRespawnService;
    objectiveService?: ObjectiveTrackerService;
    interactionPromptsByEntityId?: Record<string, InteractionPromptService>;
};

export type RpgPlayerPrefabOptions = {
    blueprintId?: string;
    registry?: PrefabRegistry;
    moduleOverrides?: {
        [RPG_MODULE_STATS]?: RpgStatsConfig;
        [RPG_MODULE_INVENTORY]?: RpgInventoryConfig;
        [RPG_MODULE_ABILITIES]?: RpgAbilityConfig;
        [RPG_MODULE_WORLD]?: RpgWorldConfig;
    };
    emit?: <TPayload>(signal: string, payload: TPayload) => void;
};

export type RpgPlayerPrefabPreset = {
    registry: PrefabRegistry;
    builder: PrefabBuilder;
    blueprint: PrefabBlueprint;
    attachmentRuntime: PrefabAttachmentRuntime;
    attachPlayer: (
        entityId: string,
        context?: RpgPlayerPrefabContext,
    ) => PrefabAttachmentReport;
    detachPlayer: (
        entityId: string,
        context?: RpgPlayerPrefabContext,
    ) => PrefabAttachmentReport;
};

function toObject(value: unknown): Record<string, unknown> {
    if (typeof value === "object" && value !== null) {
        return value as Record<string, unknown>;
    }

    return {};
}

function toFinite(value: unknown, fallback = 0): number {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return fallback;
    }

    return value;
}

function toPositiveInt(value: unknown, fallback: number): number {
    const resolved = toFinite(value, fallback);
    return Math.max(1, Math.floor(resolved));
}

function toContextStore(
    context?: RpgPlayerPrefabContext,
): RpgPlayerPrefabContext {
    return context ?? {};
}

function registerRpgPlayerModules(registry: PrefabRegistry): void {
    registry.registerModule({
        id: RPG_MODULE_STATS,
        domain: RPG_PLAYER_DOMAIN,
        defaults: {
            baseStats: {
                maxHealth: 120,
                attackPower: 12,
                defense: 10,
                moveSpeed: 100,
                critChance: 0.05,
            },
            starterEquipment: [],
        },
        attach: ({ entityId, config, context }) => {
            const typed = toContextStore(context as RpgPlayerPrefabContext);
            const equipmentStatsService =
                typed.equipmentStatsService ?? createEquipmentStatsService();
            typed.equipmentStatsService = equipmentStatsService;

            const normalized = toObject(config) as RpgStatsConfig;
            equipmentStatsService.registerEntity(
                entityId,
                normalized.baseStats ?? {},
            );

            for (const item of normalized.starterEquipment ?? []) {
                equipmentStatsService.equipItem(entityId, item);
            }

            return {
                equipmentStatsService,
            };
        },
        detach: ({ entityId, runtime }) => {
            const typedRuntime = runtime as {
                equipmentStatsService: EquipmentStatsService;
            };
            typedRuntime.equipmentStatsService.unregisterEntity(entityId);
        },
    });

    registry.registerModule({
        id: RPG_MODULE_INVENTORY,
        domain: RPG_PLAYER_DOMAIN,
        defaults: {
            containerId: "backpack",
            inventoryCapacity: 24,
            hotbarSlotCount: 10,
            starterItems: [],
            starterBindings: [],
        },
        attach: ({ config, context }) => {
            const typed = toContextStore(context as RpgPlayerPrefabContext);
            const inventoryService =
                typed.inventoryService ?? createInventoryService();
            const hotbarService =
                typed.hotbarService ??
                createHotbarService({
                    slotCount: toPositiveInt(
                        toObject(config).hotbarSlotCount,
                        10,
                    ),
                });

            typed.inventoryService = inventoryService;
            typed.hotbarService = hotbarService;

            const normalized = toObject(config) as RpgInventoryConfig;
            const containerId = String(
                normalized.containerId ?? "backpack",
            ).trim();

            inventoryService.registerContainer({
                id: containerId || "backpack",
                capacity: toPositiveInt(normalized.inventoryCapacity, 24),
            });

            for (const starterItem of normalized.starterItems ?? []) {
                inventoryService.registerItem(starterItem.definition);
                inventoryService.addItem(
                    containerId || "backpack",
                    starterItem.definition.id,
                    Math.max(0, Math.floor(starterItem.quantity)),
                );
            }

            for (const binding of normalized.starterBindings ?? []) {
                hotbarService.bindSlot(binding.index, binding.binding);
            }

            return {
                inventoryService,
                hotbarService,
                containerId: containerId || "backpack",
            };
        },
    });

    registry.registerModule({
        id: RPG_MODULE_ABILITIES,
        domain: RPG_PLAYER_DOMAIN,
        defaults: {
            resources: {
                mana: 100,
                stamina: 100,
            },
            abilities: [],
        },
        attach: ({ config, context }) => {
            const typed = toContextStore(context as RpgPlayerPrefabContext);
            const abilityService =
                typed.abilityService ?? createAbilityCooldownEffectsService();
            typed.abilityService = abilityService;

            const normalized = toObject(config) as RpgAbilityConfig;
            const resources = toObject(normalized.resources);
            for (const key of Object.keys(resources)) {
                abilityService.setResource(key, toFinite(resources[key], 0));
            }

            for (const ability of normalized.abilities ?? []) {
                abilityService.registerAbility(ability);
            }

            return {
                abilityService,
            };
        },
    });

    registry.registerModule({
        id: RPG_MODULE_WORLD,
        domain: RPG_PLAYER_DOMAIN,
        defaults: {
            interactionPrompt: {
                label: "Interact",
                actionLabel: "E",
                radius: 2,
                cooldownMs: 0,
            },
            initialObjective: null,
            initialCheckpoint: {
                id: "spawn",
                x: 0,
                y: 0,
            },
        },
        attach: ({ entityId, config, context }) => {
            const typed = toContextStore(context as RpgPlayerPrefabContext);

            const checkpointService =
                typed.checkpointService ?? createCheckpointRespawnService();
            const objectiveService =
                typed.objectiveService ?? createObjectiveTrackerService();
            typed.checkpointService = checkpointService;
            typed.objectiveService = objectiveService;

            if (!typed.interactionPromptsByEntityId) {
                typed.interactionPromptsByEntityId = {};
            }

            const normalized = toObject(config) as RpgWorldConfig;
            const promptConfig = toObject(normalized.interactionPrompt);
            const prompt = createInteractionPromptService({
                id: `${entityId}:interact`,
                label:
                    String(promptConfig.label ?? "Interact").trim() ||
                    "Interact",
                actionLabel:
                    String(promptConfig.actionLabel ?? "E").trim() || "E",
                radius: Math.max(0, toFinite(promptConfig.radius, 2)),
                cooldownMs: Math.max(
                    0,
                    Math.floor(toFinite(promptConfig.cooldownMs, 0)),
                ),
            });
            typed.interactionPromptsByEntityId[entityId] = prompt;

            if (normalized.initialObjective) {
                objectiveService.registerObjective({
                    id: normalized.initialObjective.id,
                    label: normalized.initialObjective.label,
                    status: "active",
                });
            }

            if (normalized.initialCheckpoint) {
                checkpointService.registerCheckpoint({
                    id: normalized.initialCheckpoint.id?.trim() || "spawn",
                    x: toFinite(normalized.initialCheckpoint.x, 0),
                    y: toFinite(normalized.initialCheckpoint.y, 0),
                });
            }

            return {
                objectiveService,
                checkpointService,
            };
        },
        detach: ({ entityId, context }) => {
            const typed = toContextStore(context as RpgPlayerPrefabContext);
            if (typed.interactionPromptsByEntityId) {
                delete typed.interactionPromptsByEntityId[entityId];
            }
        },
    });
}

export function createRpgPlayerPrefabPreset(
    options?: RpgPlayerPrefabOptions,
): RpgPlayerPrefabPreset {
    const registry = options?.registry ?? createPrefabRegistry();
    registerRpgPlayerModules(registry);

    const builder = createPrefabBuilder({
        registry,
        domain: RPG_PLAYER_DOMAIN,
        blueprintId: options?.blueprintId?.trim() || RPG_PLAYER_BLUEPRINT_ID,
    });

    const moduleRequests: PrefabAttachRequest[] = [
        {
            moduleId: RPG_MODULE_STATS,
            config: options?.moduleOverrides?.[RPG_MODULE_STATS],
        },
        {
            moduleId: RPG_MODULE_INVENTORY,
            config: options?.moduleOverrides?.[RPG_MODULE_INVENTORY],
        },
        {
            moduleId: RPG_MODULE_ABILITIES,
            config: options?.moduleOverrides?.[RPG_MODULE_ABILITIES],
        },
        {
            moduleId: RPG_MODULE_WORLD,
            config: options?.moduleOverrides?.[RPG_MODULE_WORLD],
        },
    ];

    for (const request of moduleRequests) {
        builder.addModule(request.moduleId, request.config);
    }

    const build = builder.buildBlueprint();
    const attachmentRuntime = createPrefabAttachmentRuntime({
        registry,
        emit: options?.emit,
    });

    return {
        registry,
        builder,
        blueprint: build.blueprint,
        attachmentRuntime,
        attachPlayer: (entityId, context) => {
            return attachmentRuntime.attachPrefabModules(
                entityId,
                build.blueprint.modules.map((module) => ({
                    moduleId: module.moduleId,
                    config: module.config,
                })),
                context as Record<string, unknown>,
            );
        },
        detachPlayer: (entityId, context) => {
            return attachmentRuntime.detachPrefabModules(
                entityId,
                undefined,
                context as Record<string, unknown>,
            );
        },
    };
}
