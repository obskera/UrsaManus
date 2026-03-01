import {
    createPrefabAttachmentRuntime,
    createPrefabBuilder,
    createPrefabRegistry,
    type PrefabAttachmentReport,
    type PrefabAttachmentRuntime,
    type PrefabBlueprint,
    type PrefabBuilder,
    type PrefabModuleConfig,
    type PrefabRegistry,
} from "@/services/prefabCore";

const ENEMY_DOMAIN = "enemy";
const OBJECT_DOMAIN = "object";
const PLAYER_DOMAIN = "player";

const PLAYER_MODULE_CORE = "player.core";
const PLAYER_MODULE_MOBILITY = "player.mobility";
const PLAYER_MODULE_RESOURCES = "player.resources";
const PLAYER_MODULE_COMBAT = "player.combat";
const PLAYER_MODULE_AIMING = "player.aiming";
const PLAYER_MODULE_STEALTH = "player.stealth";
const PLAYER_MODULE_PARTY = "player.party";

const ENEMY_MODULE_CORE = "enemy.core";
const ENEMY_MODULE_PATHING = "enemy.pathing";
const ENEMY_MODULE_MELEE = "enemy.melee-ability";
const ENEMY_MODULE_RANGED = "enemy.ranged-ability";
const ENEMY_MODULE_PHASE = "enemy.phase-hooks";
const ENEMY_MODULE_SWARM = "enemy.swarm-rush";
const ENEMY_MODULE_SUPPORT = "enemy.support-aura";
const ENEMY_MODULE_GUARD = "enemy.shield-guard";
const ENEMY_MODULE_SNIPER = "enemy.sniper-profile";

const OBJECT_MODULE_CORE = "object.core";
const OBJECT_MODULE_INTERACT = "object.interactable";
const OBJECT_MODULE_LOOT = "object.loot-state";
const OBJECT_MODULE_VENDOR = "object.vendor";
const OBJECT_MODULE_QUEST = "object.quest-board";
const OBJECT_MODULE_SWITCH = "object.switch";
const OBJECT_MODULE_CHECKPOINT = "object.checkpoint";
const OBJECT_MODULE_BREAKABLE = "object.breakable-container";
const OBJECT_MODULE_RESOURCE = "object.resource-node";
const OBJECT_MODULE_CRAFTING = "object.crafting-station";
const OBJECT_MODULE_STASH = "object.bank-stash";
const OBJECT_MODULE_FAST_TRAVEL = "object.fast-travel-point";
const OBJECT_MODULE_TRAP = "object.trap-floor";
const OBJECT_MODULE_SWITCH_NETWORK = "object.switch-network";
const OBJECT_MODULE_LOCKED_DOOR = "object.locked-door";
const OBJECT_MODULE_ESCORT = "object.escort-cart";
const OBJECT_MODULE_ARENA = "object.arena-trigger";
const OBJECT_MODULE_NPC_QUEST_GIVER = "object.npc.quest-giver";
const OBJECT_MODULE_NPC_FOLLOWER = "object.npc.follower-companion";
const OBJECT_MODULE_NPC_MERCHANT = "object.npc.merchant-tiered";
const OBJECT_MODULE_NPC_TRAINER = "object.npc.trainer-skill-tree";
const OBJECT_MODULE_NPC_FACTION = "object.npc.faction-rep-agent";
const OBJECT_MODULE_NPC_AMBIENT = "object.npc.town-ambient";

export type EnemyArchetype =
    | "melee-chaser"
    | "ranged-kiter"
    | "tank-bruiser"
    | "boss-phase"
    | "swarm-rusher"
    | "support-healer"
    | "shield-guard"
    | "sniper-kiter";

export type PlayerArchetype =
    | "arpg-player"
    | "jrpg-party-lead"
    | "survival-crafter"
    | "twin-stick-shooter"
    | "stealth-infiltrator"
    | "platformer-mobility";

export type ObjectArchetype =
    | "loot-chest"
    | "shop-npc"
    | "quest-board"
    | "door-switch"
    | "checkpoint-statue"
    | "breakable-container"
    | "resource-node"
    | "crafting-station"
    | "bank-stash"
    | "fast-travel-point"
    | "trap-floor"
    | "switch-network"
    | "locked-door"
    | "escort-cart"
    | "arena-trigger"
    | "quest-giver"
    | "follower-companion"
    | "merchant-tiered"
    | "trainer-skill-tree"
    | "faction-rep-agent"
    | "town-ambient-npc";

export type EnemyPrefabEntityState = {
    entityId: string;
    archetype: EnemyArchetype;
    modules: Record<string, PrefabModuleConfig>;
};

export type PlayerPrefabEntityState = {
    entityId: string;
    archetype: PlayerArchetype;
    modules: Record<string, PrefabModuleConfig>;
};

export type ObjectPrefabEntityState = {
    entityId: string;
    archetype: ObjectArchetype;
    modules: Record<string, PrefabModuleConfig>;
    state: {
        opened?: boolean;
        used?: boolean;
        completed?: boolean;
    };
};

export type EnemyPrefabContext = {
    enemyPrefabsByEntityId?: Record<string, EnemyPrefabEntityState>;
};

export type PlayerPrefabContext = {
    playerPrefabsByEntityId?: Record<string, PlayerPrefabEntityState>;
};

export type ObjectPrefabContext = {
    objectPrefabsByEntityId?: Record<string, ObjectPrefabEntityState>;
};

export type EnemyPrefabPack = {
    registry: PrefabRegistry;
    builder: PrefabBuilder;
    blueprint: PrefabBlueprint;
    attachmentRuntime: PrefabAttachmentRuntime;
    attachEnemy: (
        entityId: string,
        context?: EnemyPrefabContext,
    ) => PrefabAttachmentReport;
    detachEnemy: (
        entityId: string,
        context?: EnemyPrefabContext,
    ) => PrefabAttachmentReport;
};

export type PlayerPrefabPack = {
    registry: PrefabRegistry;
    builder: PrefabBuilder;
    blueprint: PrefabBlueprint;
    attachmentRuntime: PrefabAttachmentRuntime;
    attachPlayer: (
        entityId: string,
        context?: PlayerPrefabContext,
    ) => PrefabAttachmentReport;
    detachPlayer: (
        entityId: string,
        context?: PlayerPrefabContext,
    ) => PrefabAttachmentReport;
};

export type ObjectPrefabPack = {
    registry: PrefabRegistry;
    builder: PrefabBuilder;
    blueprint: PrefabBlueprint;
    attachmentRuntime: PrefabAttachmentRuntime;
    attachObject: (
        entityId: string,
        context?: ObjectPrefabContext,
    ) => PrefabAttachmentReport;
    detachObject: (
        entityId: string,
        context?: ObjectPrefabContext,
    ) => PrefabAttachmentReport;
};

type EnemyPackBlueprintConfig = {
    blueprintId?: string;
    registry?: PrefabRegistry;
    emit?: <TPayload>(signal: string, payload: TPayload) => void;
    overrides?: Record<string, PrefabModuleConfig>;
};

type PlayerPackBlueprintConfig = {
    blueprintId?: string;
    registry?: PrefabRegistry;
    emit?: <TPayload>(signal: string, payload: TPayload) => void;
    overrides?: Record<string, PrefabModuleConfig>;
};

type ObjectPackBlueprintConfig = {
    blueprintId?: string;
    registry?: PrefabRegistry;
    emit?: <TPayload>(signal: string, payload: TPayload) => void;
    overrides?: Record<string, PrefabModuleConfig>;
};

function toEnemyContext(context?: EnemyPrefabContext): EnemyPrefabContext {
    return context ?? {};
}

function toPlayerContext(context?: PlayerPrefabContext): PlayerPrefabContext {
    return context ?? {};
}

function toObjectContext(context?: ObjectPrefabContext): ObjectPrefabContext {
    return context ?? {};
}

function toObject(value: unknown): Record<string, unknown> {
    if (typeof value === "object" && value !== null) {
        return value as Record<string, unknown>;
    }

    return {};
}

function ensureEnemyStore(context?: EnemyPrefabContext) {
    const typed = toEnemyContext(context);
    if (!typed.enemyPrefabsByEntityId) {
        typed.enemyPrefabsByEntityId = {};
    }

    return typed.enemyPrefabsByEntityId;
}

function ensurePlayerStore(context?: PlayerPrefabContext) {
    const typed = toPlayerContext(context);
    if (!typed.playerPrefabsByEntityId) {
        typed.playerPrefabsByEntityId = {};
    }

    return typed.playerPrefabsByEntityId;
}

function ensureObjectStore(context?: ObjectPrefabContext) {
    const typed = toObjectContext(context);
    if (!typed.objectPrefabsByEntityId) {
        typed.objectPrefabsByEntityId = {};
    }

    return typed.objectPrefabsByEntityId;
}

function registerEnemyModules(registry: PrefabRegistry): void {
    registry.registerModule({
        id: ENEMY_MODULE_CORE,
        domain: ENEMY_DOMAIN,
        defaults: {
            health: 100,
            speed: 90,
            damage: 8,
            reward: {
                xp: 12,
                gold: 5,
            },
        },
        attach: ({ entityId, config, context }) => {
            const store = ensureEnemyStore(context as EnemyPrefabContext);
            const next = store[entityId] ?? {
                entityId,
                archetype: "melee-chaser" as EnemyArchetype,
                modules: {},
            };
            next.modules[ENEMY_MODULE_CORE] = toObject(config);
            store[entityId] = next;
            return next;
        },
        detach: ({ entityId, context }) => {
            const store = ensureEnemyStore(context as EnemyPrefabContext);
            const runtime = store[entityId];
            if (!runtime) {
                return;
            }

            delete runtime.modules[ENEMY_MODULE_CORE];
            if (Object.keys(runtime.modules).length <= 0) {
                delete store[entityId];
            }
        },
    });

    registry.registerModule({
        id: ENEMY_MODULE_PATHING,
        domain: ENEMY_DOMAIN,
        dependencies: [ENEMY_MODULE_CORE],
        defaults: {
            behavior: "chase",
            preferredDistance: 1,
            leashDistance: 10,
        },
        attach: ({ entityId, config, context }) => {
            const store = ensureEnemyStore(context as EnemyPrefabContext);
            const next = store[entityId] ?? {
                entityId,
                archetype: "melee-chaser" as EnemyArchetype,
                modules: {},
            };
            next.modules[ENEMY_MODULE_PATHING] = toObject(config);
            store[entityId] = next;
            return next;
        },
    });

    registry.registerModule({
        id: ENEMY_MODULE_MELEE,
        domain: ENEMY_DOMAIN,
        dependencies: [ENEMY_MODULE_CORE],
        conflicts: [ENEMY_MODULE_RANGED],
        defaults: {
            cadenceMs: 850,
            range: 1,
            abilityId: "enemy-melee",
        },
        attach: ({ entityId, config, context }) => {
            const store = ensureEnemyStore(context as EnemyPrefabContext);
            const next = store[entityId] ?? {
                entityId,
                archetype: "melee-chaser" as EnemyArchetype,
                modules: {},
            };
            next.modules[ENEMY_MODULE_MELEE] = toObject(config);
            store[entityId] = next;
            return next;
        },
    });

    registry.registerModule({
        id: ENEMY_MODULE_RANGED,
        domain: ENEMY_DOMAIN,
        dependencies: [ENEMY_MODULE_CORE],
        conflicts: [ENEMY_MODULE_MELEE],
        defaults: {
            cadenceMs: 1200,
            range: 8,
            abilityId: "enemy-shot",
        },
        attach: ({ entityId, config, context }) => {
            const store = ensureEnemyStore(context as EnemyPrefabContext);
            const next = store[entityId] ?? {
                entityId,
                archetype: "ranged-kiter" as EnemyArchetype,
                modules: {},
            };
            next.modules[ENEMY_MODULE_RANGED] = toObject(config);
            store[entityId] = next;
            return next;
        },
    });

    registry.registerModule({
        id: ENEMY_MODULE_PHASE,
        domain: ENEMY_DOMAIN,
        dependencies: [ENEMY_MODULE_CORE],
        defaults: {
            phases: [
                {
                    id: "phase-1",
                    hpThreshold: 1,
                },
                {
                    id: "phase-2",
                    hpThreshold: 0.45,
                },
            ],
        },
        attach: ({ entityId, config, context }) => {
            const store = ensureEnemyStore(context as EnemyPrefabContext);
            const next = store[entityId] ?? {
                entityId,
                archetype: "boss-phase" as EnemyArchetype,
                modules: {},
            };
            next.modules[ENEMY_MODULE_PHASE] = toObject(config);
            store[entityId] = next;
            return next;
        },
    });

    registry.registerModule({
        id: ENEMY_MODULE_SWARM,
        domain: ENEMY_DOMAIN,
        dependencies: [ENEMY_MODULE_CORE, ENEMY_MODULE_MELEE],
        conflicts: [ENEMY_MODULE_RANGED],
        defaults: {
            burstCount: 3,
            burstCadenceMs: 300,
            regroupDelayMs: 900,
        },
        attach: ({ entityId, config, context }) => {
            const store = ensureEnemyStore(context as EnemyPrefabContext);
            const next = store[entityId] ?? {
                entityId,
                archetype: "swarm-rusher" as EnemyArchetype,
                modules: {},
            };
            next.modules[ENEMY_MODULE_SWARM] = toObject(config);
            store[entityId] = next;
            return next;
        },
    });

    registry.registerModule({
        id: ENEMY_MODULE_SUPPORT,
        domain: ENEMY_DOMAIN,
        dependencies: [ENEMY_MODULE_CORE],
        defaults: {
            auraRadius: 7,
            healCadenceMs: 2200,
            prioritizeLowestHp: true,
        },
        attach: ({ entityId, config, context }) => {
            const store = ensureEnemyStore(context as EnemyPrefabContext);
            const next = store[entityId] ?? {
                entityId,
                archetype: "support-healer" as EnemyArchetype,
                modules: {},
            };
            next.modules[ENEMY_MODULE_SUPPORT] = toObject(config);
            store[entityId] = next;
            return next;
        },
    });

    registry.registerModule({
        id: ENEMY_MODULE_GUARD,
        domain: ENEMY_DOMAIN,
        dependencies: [ENEMY_MODULE_CORE, ENEMY_MODULE_MELEE],
        conflicts: [ENEMY_MODULE_RANGED],
        defaults: {
            blockArcDeg: 140,
            blockWindowMs: 900,
            counterCadenceMs: 1600,
        },
        attach: ({ entityId, config, context }) => {
            const store = ensureEnemyStore(context as EnemyPrefabContext);
            const next = store[entityId] ?? {
                entityId,
                archetype: "shield-guard" as EnemyArchetype,
                modules: {},
            };
            next.modules[ENEMY_MODULE_GUARD] = toObject(config);
            store[entityId] = next;
            return next;
        },
    });

    registry.registerModule({
        id: ENEMY_MODULE_SNIPER,
        domain: ENEMY_DOMAIN,
        dependencies: [ENEMY_MODULE_CORE, ENEMY_MODULE_RANGED],
        conflicts: [ENEMY_MODULE_MELEE],
        defaults: {
            preferredDistance: 11,
            aimChargeMs: 650,
            retreatThreshold: 0.35,
        },
        attach: ({ entityId, config, context }) => {
            const store = ensureEnemyStore(context as EnemyPrefabContext);
            const next = store[entityId] ?? {
                entityId,
                archetype: "sniper-kiter" as EnemyArchetype,
                modules: {},
            };
            next.modules[ENEMY_MODULE_SNIPER] = toObject(config);
            store[entityId] = next;
            return next;
        },
    });
}

function registerPlayerModules(registry: PrefabRegistry): void {
    registry.registerModule({
        id: PLAYER_MODULE_CORE,
        domain: PLAYER_DOMAIN,
        defaults: {
            maxHealth: 120,
            attackPower: 12,
            defense: 10,
            moveSpeed: 100,
        },
        attach: ({ entityId, config, context }) => {
            const store = ensurePlayerStore(context as PlayerPrefabContext);
            const next = store[entityId] ?? {
                entityId,
                archetype: "arpg-player" as PlayerArchetype,
                modules: {},
            };
            next.modules[PLAYER_MODULE_CORE] = toObject(config);
            store[entityId] = next;
            return next;
        },
    });

    registry.registerModule({
        id: PLAYER_MODULE_MOBILITY,
        domain: PLAYER_DOMAIN,
        dependencies: [PLAYER_MODULE_CORE],
        defaults: {
            dash: true,
            coyoteTimeMs: 80,
            wallJump: false,
            dodgeFramesMs: 140,
        },
        attach: ({ entityId, config, context }) => {
            const store = ensurePlayerStore(context as PlayerPrefabContext);
            const next = store[entityId] ?? {
                entityId,
                archetype: "platformer-mobility" as PlayerArchetype,
                modules: {},
            };
            next.modules[PLAYER_MODULE_MOBILITY] = toObject(config);
            store[entityId] = next;
            return next;
        },
    });

    registry.registerModule({
        id: PLAYER_MODULE_RESOURCES,
        domain: PLAYER_DOMAIN,
        dependencies: [PLAYER_MODULE_CORE],
        defaults: {
            stamina: 100,
            mana: 100,
            hunger: null,
            thirst: null,
        },
        attach: ({ entityId, config, context }) => {
            const store = ensurePlayerStore(context as PlayerPrefabContext);
            const next = store[entityId] ?? {
                entityId,
                archetype: "survival-crafter" as PlayerArchetype,
                modules: {},
            };
            next.modules[PLAYER_MODULE_RESOURCES] = toObject(config);
            store[entityId] = next;
            return next;
        },
    });

    registry.registerModule({
        id: PLAYER_MODULE_COMBAT,
        domain: PLAYER_DOMAIN,
        dependencies: [PLAYER_MODULE_CORE],
        defaults: {
            weaponSet: "starter",
            recoilScale: 1,
            comboWindowMs: 420,
        },
        attach: ({ entityId, config, context }) => {
            const store = ensurePlayerStore(context as PlayerPrefabContext);
            const next = store[entityId] ?? {
                entityId,
                archetype: "arpg-player" as PlayerArchetype,
                modules: {},
            };
            next.modules[PLAYER_MODULE_COMBAT] = toObject(config);
            store[entityId] = next;
            return next;
        },
    });

    registry.registerModule({
        id: PLAYER_MODULE_AIMING,
        domain: PLAYER_DOMAIN,
        dependencies: [PLAYER_MODULE_CORE, PLAYER_MODULE_COMBAT],
        defaults: {
            twinStickAim: true,
            lockOn: false,
            spreadDeg: 5,
        },
        attach: ({ entityId, config, context }) => {
            const store = ensurePlayerStore(context as PlayerPrefabContext);
            const next = store[entityId] ?? {
                entityId,
                archetype: "twin-stick-shooter" as PlayerArchetype,
                modules: {},
            };
            next.modules[PLAYER_MODULE_AIMING] = toObject(config);
            store[entityId] = next;
            return next;
        },
    });

    registry.registerModule({
        id: PLAYER_MODULE_STEALTH,
        domain: PLAYER_DOMAIN,
        dependencies: [PLAYER_MODULE_CORE],
        defaults: {
            visibilityMeter: true,
            noiseMeter: true,
            takedownEnabled: true,
        },
        attach: ({ entityId, config, context }) => {
            const store = ensurePlayerStore(context as PlayerPrefabContext);
            const next = store[entityId] ?? {
                entityId,
                archetype: "stealth-infiltrator" as PlayerArchetype,
                modules: {},
            };
            next.modules[PLAYER_MODULE_STEALTH] = toObject(config);
            store[entityId] = next;
            return next;
        },
    });

    registry.registerModule({
        id: PLAYER_MODULE_PARTY,
        domain: PLAYER_DOMAIN,
        dependencies: [PLAYER_MODULE_CORE],
        defaults: {
            partyCommands: true,
            turnOrderHooks: true,
            statusResistPreset: "balanced",
        },
        attach: ({ entityId, config, context }) => {
            const store = ensurePlayerStore(context as PlayerPrefabContext);
            const next = store[entityId] ?? {
                entityId,
                archetype: "jrpg-party-lead" as PlayerArchetype,
                modules: {},
            };
            next.modules[PLAYER_MODULE_PARTY] = toObject(config);
            store[entityId] = next;
            return next;
        },
    });
}

function registerObjectModules(registry: PrefabRegistry): void {
    registry.registerModule({
        id: OBJECT_MODULE_CORE,
        domain: OBJECT_DOMAIN,
        defaults: {
            markerCategory: "world-object",
            persistent: true,
        },
        attach: ({ entityId, config, context }) => {
            const store = ensureObjectStore(context as ObjectPrefabContext);
            const next = store[entityId] ?? {
                entityId,
                archetype: "loot-chest" as ObjectArchetype,
                modules: {},
                state: {},
            };
            next.modules[OBJECT_MODULE_CORE] = toObject(config);
            store[entityId] = next;
            return next;
        },
    });

    registry.registerModule({
        id: OBJECT_MODULE_INTERACT,
        domain: OBJECT_DOMAIN,
        dependencies: [OBJECT_MODULE_CORE],
        defaults: {
            actionLabel: "E",
            radius: 2,
            cooldownMs: 0,
        },
        attach: ({ entityId, config, context }) => {
            const store = ensureObjectStore(context as ObjectPrefabContext);
            const next = store[entityId] ?? {
                entityId,
                archetype: "loot-chest" as ObjectArchetype,
                modules: {},
                state: {},
            };
            next.modules[OBJECT_MODULE_INTERACT] = toObject(config);
            store[entityId] = next;
            return next;
        },
    });

    registry.registerModule({
        id: OBJECT_MODULE_LOOT,
        domain: OBJECT_DOMAIN,
        dependencies: [OBJECT_MODULE_INTERACT],
        defaults: {
            once: true,
            dropTableId: "starter-loot",
        },
        attach: ({ entityId, config, context }) => {
            const store = ensureObjectStore(context as ObjectPrefabContext);
            const next = store[entityId] ?? {
                entityId,
                archetype: "loot-chest" as ObjectArchetype,
                modules: {},
                state: {},
            };
            next.modules[OBJECT_MODULE_LOOT] = toObject(config);
            next.state.opened = false;
            store[entityId] = next;
            return next;
        },
    });

    registry.registerModule({
        id: OBJECT_MODULE_VENDOR,
        domain: OBJECT_DOMAIN,
        dependencies: [OBJECT_MODULE_INTERACT],
        defaults: {
            shopId: "starter-shop",
            restockEveryMs: 60000,
        },
        attach: ({ entityId, config, context }) => {
            const store = ensureObjectStore(context as ObjectPrefabContext);
            const next = store[entityId] ?? {
                entityId,
                archetype: "shop-npc" as ObjectArchetype,
                modules: {},
                state: {},
            };
            next.modules[OBJECT_MODULE_VENDOR] = toObject(config);
            next.state.used = false;
            store[entityId] = next;
            return next;
        },
    });

    registry.registerModule({
        id: OBJECT_MODULE_QUEST,
        domain: OBJECT_DOMAIN,
        dependencies: [OBJECT_MODULE_INTERACT],
        defaults: {
            questPoolId: "starter-quests",
        },
        attach: ({ entityId, config, context }) => {
            const store = ensureObjectStore(context as ObjectPrefabContext);
            const next = store[entityId] ?? {
                entityId,
                archetype: "quest-board" as ObjectArchetype,
                modules: {},
                state: {},
            };
            next.modules[OBJECT_MODULE_QUEST] = toObject(config);
            next.state.used = false;
            store[entityId] = next;
            return next;
        },
    });

    registry.registerModule({
        id: OBJECT_MODULE_SWITCH,
        domain: OBJECT_DOMAIN,
        dependencies: [OBJECT_MODULE_INTERACT],
        defaults: {
            targetId: "door-a",
            initialState: "closed",
        },
        attach: ({ entityId, config, context }) => {
            const store = ensureObjectStore(context as ObjectPrefabContext);
            const next = store[entityId] ?? {
                entityId,
                archetype: "door-switch" as ObjectArchetype,
                modules: {},
                state: {},
            };
            next.modules[OBJECT_MODULE_SWITCH] = toObject(config);
            next.state.used = false;
            store[entityId] = next;
            return next;
        },
    });

    registry.registerModule({
        id: OBJECT_MODULE_CHECKPOINT,
        domain: OBJECT_DOMAIN,
        dependencies: [OBJECT_MODULE_INTERACT],
        defaults: {
            checkpointId: "checkpoint-a",
            restoreHealthPercent: 1,
        },
        attach: ({ entityId, config, context }) => {
            const store = ensureObjectStore(context as ObjectPrefabContext);
            const next = store[entityId] ?? {
                entityId,
                archetype: "checkpoint-statue" as ObjectArchetype,
                modules: {},
                state: {},
            };
            next.modules[OBJECT_MODULE_CHECKPOINT] = toObject(config);
            next.state.completed = false;
            store[entityId] = next;
            return next;
        },
    });

    registry.registerModule({
        id: OBJECT_MODULE_BREAKABLE,
        domain: OBJECT_DOMAIN,
        dependencies: [OBJECT_MODULE_CORE],
        defaults: {
            hp: 40,
            respawnMs: 0,
            dropTableId: "breakable-starter",
        },
        attach: ({ entityId, config, context }) => {
            const store = ensureObjectStore(context as ObjectPrefabContext);
            const next = store[entityId] ?? {
                entityId,
                archetype: "breakable-container" as ObjectArchetype,
                modules: {},
                state: {},
            };
            next.modules[OBJECT_MODULE_BREAKABLE] = toObject(config);
            next.state.used = false;
            store[entityId] = next;
            return next;
        },
    });

    registry.registerModule({
        id: OBJECT_MODULE_RESOURCE,
        domain: OBJECT_DOMAIN,
        dependencies: [OBJECT_MODULE_INTERACT],
        defaults: {
            resourceType: "wood",
            gatherTimeMs: 900,
            nodeCapacity: 5,
        },
        attach: ({ entityId, config, context }) => {
            const store = ensureObjectStore(context as ObjectPrefabContext);
            const next = store[entityId] ?? {
                entityId,
                archetype: "resource-node" as ObjectArchetype,
                modules: {},
                state: {},
            };
            next.modules[OBJECT_MODULE_RESOURCE] = toObject(config);
            next.state.used = false;
            store[entityId] = next;
            return next;
        },
    });

    registry.registerModule({
        id: OBJECT_MODULE_CRAFTING,
        domain: OBJECT_DOMAIN,
        dependencies: [OBJECT_MODULE_INTERACT],
        defaults: {
            stationId: "crafting-basic",
            recipePoolId: "starter-recipes",
            queueSize: 2,
        },
        attach: ({ entityId, config, context }) => {
            const store = ensureObjectStore(context as ObjectPrefabContext);
            const next = store[entityId] ?? {
                entityId,
                archetype: "crafting-station" as ObjectArchetype,
                modules: {},
                state: {},
            };
            next.modules[OBJECT_MODULE_CRAFTING] = toObject(config);
            next.state.used = false;
            store[entityId] = next;
            return next;
        },
    });

    registry.registerModule({
        id: OBJECT_MODULE_STASH,
        domain: OBJECT_DOMAIN,
        dependencies: [OBJECT_MODULE_INTERACT],
        defaults: {
            stashId: "town-bank-a",
            slots: 60,
            sharedAcrossParty: true,
        },
        attach: ({ entityId, config, context }) => {
            const store = ensureObjectStore(context as ObjectPrefabContext);
            const next = store[entityId] ?? {
                entityId,
                archetype: "bank-stash" as ObjectArchetype,
                modules: {},
                state: {},
            };
            next.modules[OBJECT_MODULE_STASH] = toObject(config);
            next.state.opened = false;
            store[entityId] = next;
            return next;
        },
    });

    registry.registerModule({
        id: OBJECT_MODULE_FAST_TRAVEL,
        domain: OBJECT_DOMAIN,
        dependencies: [OBJECT_MODULE_INTERACT],
        defaults: {
            destinationId: "town-hub",
            discoveredByDefault: false,
            castTimeMs: 600,
        },
        attach: ({ entityId, config, context }) => {
            const store = ensureObjectStore(context as ObjectPrefabContext);
            const next = store[entityId] ?? {
                entityId,
                archetype: "fast-travel-point" as ObjectArchetype,
                modules: {},
                state: {},
            };
            next.modules[OBJECT_MODULE_FAST_TRAVEL] = toObject(config);
            next.state.completed = false;
            store[entityId] = next;
            return next;
        },
    });

    registry.registerModule({
        id: OBJECT_MODULE_TRAP,
        domain: OBJECT_DOMAIN,
        dependencies: [OBJECT_MODULE_CORE],
        defaults: {
            triggerRadius: 1.5,
            damage: 15,
            resetMs: 2500,
        },
        attach: ({ entityId, config, context }) => {
            const store = ensureObjectStore(context as ObjectPrefabContext);
            const next = store[entityId] ?? {
                entityId,
                archetype: "trap-floor" as ObjectArchetype,
                modules: {},
                state: {},
            };
            next.modules[OBJECT_MODULE_TRAP] = toObject(config);
            next.state.used = false;
            store[entityId] = next;
            return next;
        },
    });

    registry.registerModule({
        id: OBJECT_MODULE_SWITCH_NETWORK,
        domain: OBJECT_DOMAIN,
        dependencies: [OBJECT_MODULE_SWITCH],
        defaults: {
            networkId: "switch-net-a",
            quorum: 2,
            resetOnFail: true,
        },
        attach: ({ entityId, config, context }) => {
            const store = ensureObjectStore(context as ObjectPrefabContext);
            const next = store[entityId] ?? {
                entityId,
                archetype: "switch-network" as ObjectArchetype,
                modules: {},
                state: {},
            };
            next.modules[OBJECT_MODULE_SWITCH_NETWORK] = toObject(config);
            next.state.used = false;
            store[entityId] = next;
            return next;
        },
    });

    registry.registerModule({
        id: OBJECT_MODULE_LOCKED_DOOR,
        domain: OBJECT_DOMAIN,
        dependencies: [OBJECT_MODULE_SWITCH],
        defaults: {
            requiredKeyId: "key-bronze",
            startsLocked: true,
            autoCloseMs: 0,
        },
        attach: ({ entityId, config, context }) => {
            const store = ensureObjectStore(context as ObjectPrefabContext);
            const next = store[entityId] ?? {
                entityId,
                archetype: "locked-door" as ObjectArchetype,
                modules: {},
                state: {},
            };
            next.modules[OBJECT_MODULE_LOCKED_DOOR] = toObject(config);
            next.state.opened = false;
            store[entityId] = next;
            return next;
        },
    });

    registry.registerModule({
        id: OBJECT_MODULE_ESCORT,
        domain: OBJECT_DOMAIN,
        dependencies: [OBJECT_MODULE_CORE],
        defaults: {
            routeId: "escort-route-a",
            cartHp: 300,
            failOnStopMs: 8000,
        },
        attach: ({ entityId, config, context }) => {
            const store = ensureObjectStore(context as ObjectPrefabContext);
            const next = store[entityId] ?? {
                entityId,
                archetype: "escort-cart" as ObjectArchetype,
                modules: {},
                state: {},
            };
            next.modules[OBJECT_MODULE_ESCORT] = toObject(config);
            next.state.completed = false;
            store[entityId] = next;
            return next;
        },
    });

    registry.registerModule({
        id: OBJECT_MODULE_ARENA,
        domain: OBJECT_DOMAIN,
        dependencies: [OBJECT_MODULE_INTERACT],
        defaults: {
            encounterId: "arena-starter",
            warmupMs: 1200,
            lockExits: true,
        },
        attach: ({ entityId, config, context }) => {
            const store = ensureObjectStore(context as ObjectPrefabContext);
            const next = store[entityId] ?? {
                entityId,
                archetype: "arena-trigger" as ObjectArchetype,
                modules: {},
                state: {},
            };
            next.modules[OBJECT_MODULE_ARENA] = toObject(config);
            next.state.completed = false;
            store[entityId] = next;
            return next;
        },
    });

    registry.registerModule({
        id: OBJECT_MODULE_NPC_QUEST_GIVER,
        domain: OBJECT_DOMAIN,
        dependencies: [OBJECT_MODULE_QUEST],
        defaults: {
            dialogueId: "npc-quest-giver-a",
            autoOfferOnInteract: true,
            rewardTier: "starter",
        },
        attach: ({ entityId, config, context }) => {
            const store = ensureObjectStore(context as ObjectPrefabContext);
            const next = store[entityId] ?? {
                entityId,
                archetype: "quest-giver" as ObjectArchetype,
                modules: {},
                state: {},
            };
            next.modules[OBJECT_MODULE_NPC_QUEST_GIVER] = toObject(config);
            next.state.used = false;
            store[entityId] = next;
            return next;
        },
    });

    registry.registerModule({
        id: OBJECT_MODULE_NPC_FOLLOWER,
        domain: OBJECT_DOMAIN,
        dependencies: [OBJECT_MODULE_INTERACT],
        defaults: {
            followerId: "companion-a",
            joinOnInteract: true,
            leashDistance: 6,
        },
        attach: ({ entityId, config, context }) => {
            const store = ensureObjectStore(context as ObjectPrefabContext);
            const next = store[entityId] ?? {
                entityId,
                archetype: "follower-companion" as ObjectArchetype,
                modules: {},
                state: {},
            };
            next.modules[OBJECT_MODULE_NPC_FOLLOWER] = toObject(config);
            next.state.used = false;
            store[entityId] = next;
            return next;
        },
    });

    registry.registerModule({
        id: OBJECT_MODULE_NPC_MERCHANT,
        domain: OBJECT_DOMAIN,
        dependencies: [OBJECT_MODULE_VENDOR],
        defaults: {
            merchantTier: 1,
            reputationDiscountCurve: "linear",
            stockPreset: "starter",
        },
        attach: ({ entityId, config, context }) => {
            const store = ensureObjectStore(context as ObjectPrefabContext);
            const next = store[entityId] ?? {
                entityId,
                archetype: "merchant-tiered" as ObjectArchetype,
                modules: {},
                state: {},
            };
            next.modules[OBJECT_MODULE_NPC_MERCHANT] = toObject(config);
            next.state.used = false;
            store[entityId] = next;
            return next;
        },
    });

    registry.registerModule({
        id: OBJECT_MODULE_NPC_TRAINER,
        domain: OBJECT_DOMAIN,
        dependencies: [OBJECT_MODULE_INTERACT],
        defaults: {
            skillTreeId: "starter-tree",
            unlockCostCurve: "low",
            respecEnabled: false,
        },
        attach: ({ entityId, config, context }) => {
            const store = ensureObjectStore(context as ObjectPrefabContext);
            const next = store[entityId] ?? {
                entityId,
                archetype: "trainer-skill-tree" as ObjectArchetype,
                modules: {},
                state: {},
            };
            next.modules[OBJECT_MODULE_NPC_TRAINER] = toObject(config);
            next.state.used = false;
            store[entityId] = next;
            return next;
        },
    });

    registry.registerModule({
        id: OBJECT_MODULE_NPC_FACTION,
        domain: OBJECT_DOMAIN,
        dependencies: [OBJECT_MODULE_INTERACT],
        defaults: {
            factionId: "settlers",
            repChangePerTurnIn: 5,
            minRepForAccess: 0,
        },
        attach: ({ entityId, config, context }) => {
            const store = ensureObjectStore(context as ObjectPrefabContext);
            const next = store[entityId] ?? {
                entityId,
                archetype: "faction-rep-agent" as ObjectArchetype,
                modules: {},
                state: {},
            };
            next.modules[OBJECT_MODULE_NPC_FACTION] = toObject(config);
            next.state.used = false;
            store[entityId] = next;
            return next;
        },
    });

    registry.registerModule({
        id: OBJECT_MODULE_NPC_AMBIENT,
        domain: OBJECT_DOMAIN,
        dependencies: [OBJECT_MODULE_CORE],
        defaults: {
            ambientScheduleId: "town-day-night-a",
            barksPoolId: "town-common",
            wanderRadius: 4,
        },
        attach: ({ entityId, config, context }) => {
            const store = ensureObjectStore(context as ObjectPrefabContext);
            const next = store[entityId] ?? {
                entityId,
                archetype: "town-ambient-npc" as ObjectArchetype,
                modules: {},
                state: {},
            };
            next.modules[OBJECT_MODULE_NPC_AMBIENT] = toObject(config);
            next.state.used = false;
            store[entityId] = next;
            return next;
        },
    });
}

function applyArchetypeSelection(
    builder: PrefabBuilder,
    archetype: EnemyArchetype,
    overrides?: Record<string, PrefabModuleConfig>,
): void {
    const add = (moduleId: string) => {
        builder.addModule(moduleId, overrides?.[moduleId]);
    };

    add(ENEMY_MODULE_CORE);
    add(ENEMY_MODULE_PATHING);

    if (archetype === "melee-chaser") {
        add(ENEMY_MODULE_MELEE);
    }
    if (archetype === "ranged-kiter") {
        add(ENEMY_MODULE_RANGED);
    }
    if (archetype === "tank-bruiser") {
        add(ENEMY_MODULE_MELEE);
    }
    if (archetype === "boss-phase") {
        add(ENEMY_MODULE_MELEE);
        add(ENEMY_MODULE_PHASE);
    }
    if (archetype === "swarm-rusher") {
        add(ENEMY_MODULE_MELEE);
        add(ENEMY_MODULE_SWARM);
    }
    if (archetype === "support-healer") {
        add(ENEMY_MODULE_SUPPORT);
    }
    if (archetype === "shield-guard") {
        add(ENEMY_MODULE_MELEE);
        add(ENEMY_MODULE_GUARD);
    }
    if (archetype === "sniper-kiter") {
        add(ENEMY_MODULE_RANGED);
        add(ENEMY_MODULE_SNIPER);
    }
}

function applyObjectArchetypeSelection(
    builder: PrefabBuilder,
    archetype: ObjectArchetype,
    overrides?: Record<string, PrefabModuleConfig>,
): void {
    const add = (moduleId: string) => {
        builder.addModule(moduleId, overrides?.[moduleId]);
    };

    add(OBJECT_MODULE_CORE);
    add(OBJECT_MODULE_INTERACT);

    if (archetype === "loot-chest") {
        add(OBJECT_MODULE_LOOT);
    }
    if (archetype === "shop-npc") {
        add(OBJECT_MODULE_VENDOR);
    }
    if (archetype === "quest-board") {
        add(OBJECT_MODULE_QUEST);
    }
    if (archetype === "door-switch") {
        add(OBJECT_MODULE_SWITCH);
    }
    if (archetype === "checkpoint-statue") {
        add(OBJECT_MODULE_CHECKPOINT);
    }
    if (archetype === "breakable-container") {
        add(OBJECT_MODULE_BREAKABLE);
    }
    if (archetype === "resource-node") {
        add(OBJECT_MODULE_RESOURCE);
    }
    if (archetype === "crafting-station") {
        add(OBJECT_MODULE_CRAFTING);
    }
    if (archetype === "bank-stash") {
        add(OBJECT_MODULE_STASH);
    }
    if (archetype === "fast-travel-point") {
        add(OBJECT_MODULE_FAST_TRAVEL);
    }
    if (archetype === "trap-floor") {
        add(OBJECT_MODULE_TRAP);
    }
    if (archetype === "switch-network") {
        add(OBJECT_MODULE_SWITCH);
        add(OBJECT_MODULE_SWITCH_NETWORK);
    }
    if (archetype === "locked-door") {
        add(OBJECT_MODULE_SWITCH);
        add(OBJECT_MODULE_LOCKED_DOOR);
    }
    if (archetype === "escort-cart") {
        add(OBJECT_MODULE_ESCORT);
    }
    if (archetype === "arena-trigger") {
        add(OBJECT_MODULE_ARENA);
    }
    if (archetype === "quest-giver") {
        add(OBJECT_MODULE_QUEST);
        add(OBJECT_MODULE_NPC_QUEST_GIVER);
    }
    if (archetype === "follower-companion") {
        add(OBJECT_MODULE_NPC_FOLLOWER);
    }
    if (archetype === "merchant-tiered") {
        add(OBJECT_MODULE_VENDOR);
        add(OBJECT_MODULE_NPC_MERCHANT);
    }
    if (archetype === "trainer-skill-tree") {
        add(OBJECT_MODULE_NPC_TRAINER);
    }
    if (archetype === "faction-rep-agent") {
        add(OBJECT_MODULE_NPC_FACTION);
    }
    if (archetype === "town-ambient-npc") {
        add(OBJECT_MODULE_NPC_AMBIENT);
    }
}

function applyPlayerArchetypeSelection(
    builder: PrefabBuilder,
    archetype: PlayerArchetype,
    overrides?: Record<string, PrefabModuleConfig>,
): void {
    const add = (moduleId: string) => {
        builder.addModule(moduleId, overrides?.[moduleId]);
    };

    add(PLAYER_MODULE_CORE);

    if (archetype === "arpg-player") {
        add(PLAYER_MODULE_MOBILITY);
        add(PLAYER_MODULE_RESOURCES);
        add(PLAYER_MODULE_COMBAT);
    }
    if (archetype === "jrpg-party-lead") {
        add(PLAYER_MODULE_RESOURCES);
        add(PLAYER_MODULE_PARTY);
    }
    if (archetype === "survival-crafter") {
        add(PLAYER_MODULE_RESOURCES);
    }
    if (archetype === "twin-stick-shooter") {
        add(PLAYER_MODULE_COMBAT);
        add(PLAYER_MODULE_AIMING);
    }
    if (archetype === "stealth-infiltrator") {
        add(PLAYER_MODULE_STEALTH);
        add(PLAYER_MODULE_MOBILITY);
    }
    if (archetype === "platformer-mobility") {
        add(PLAYER_MODULE_MOBILITY);
    }
}

export function createPlayerPrefabPack(
    archetype: PlayerArchetype,
    options?: PlayerPackBlueprintConfig,
): PlayerPrefabPack {
    const registry = options?.registry ?? createPrefabRegistry();
    registerPlayerModules(registry);

    const builder = createPrefabBuilder({
        registry,
        domain: PLAYER_DOMAIN,
        blueprintId: options?.blueprintId?.trim() || `player-${archetype}`,
    });
    applyPlayerArchetypeSelection(builder, archetype, options?.overrides);

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
            const typed = toPlayerContext(context);
            const report = attachmentRuntime.attachPrefabModules(
                entityId,
                build.blueprint.modules.map((module) => ({
                    moduleId: module.moduleId,
                    config: module.config,
                })),
                typed as Record<string, unknown>,
            );

            const store = ensurePlayerStore(typed);
            const runtime = store[entityId];
            if (runtime) {
                runtime.archetype = archetype;
            }

            return report;
        },
        detachPlayer: (entityId, context) => {
            return attachmentRuntime.detachPrefabModules(
                entityId,
                undefined,
                toPlayerContext(context) as Record<string, unknown>,
            );
        },
    };
}

export function createEnemyPrefabPack(
    archetype: EnemyArchetype,
    options?: EnemyPackBlueprintConfig,
): EnemyPrefabPack {
    const registry = options?.registry ?? createPrefabRegistry();
    registerEnemyModules(registry);

    const builder = createPrefabBuilder({
        registry,
        domain: ENEMY_DOMAIN,
        blueprintId: options?.blueprintId?.trim() || `enemy-${archetype}`,
    });
    applyArchetypeSelection(builder, archetype, options?.overrides);

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
        attachEnemy: (entityId, context) => {
            const typed = toEnemyContext(context);
            const report = attachmentRuntime.attachPrefabModules(
                entityId,
                build.blueprint.modules.map((module) => ({
                    moduleId: module.moduleId,
                    config: module.config,
                })),
                typed as Record<string, unknown>,
            );

            const store = ensureEnemyStore(typed);
            const runtime = store[entityId];
            if (runtime) {
                runtime.archetype = archetype;
            }

            return report;
        },
        detachEnemy: (entityId, context) => {
            return attachmentRuntime.detachPrefabModules(
                entityId,
                undefined,
                toEnemyContext(context) as Record<string, unknown>,
            );
        },
    };
}

export function createObjectPrefabPack(
    archetype: ObjectArchetype,
    options?: ObjectPackBlueprintConfig,
): ObjectPrefabPack {
    const registry = options?.registry ?? createPrefabRegistry();
    registerObjectModules(registry);

    const builder = createPrefabBuilder({
        registry,
        domain: OBJECT_DOMAIN,
        blueprintId: options?.blueprintId?.trim() || `object-${archetype}`,
    });
    applyObjectArchetypeSelection(builder, archetype, options?.overrides);

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
        attachObject: (entityId, context) => {
            const typed = toObjectContext(context);
            const report = attachmentRuntime.attachPrefabModules(
                entityId,
                build.blueprint.modules.map((module) => ({
                    moduleId: module.moduleId,
                    config: module.config,
                })),
                typed as Record<string, unknown>,
            );

            const store = ensureObjectStore(typed);
            const runtime = store[entityId];
            if (runtime) {
                runtime.archetype = archetype;
            }

            return report;
        },
        detachObject: (entityId, context) => {
            return attachmentRuntime.detachPrefabModules(
                entityId,
                undefined,
                toObjectContext(context) as Record<string, unknown>,
            );
        },
    };
}

export function exportObjectPrefabStateSnapshot(
    context: ObjectPrefabContext,
): Record<string, ObjectPrefabEntityState> {
    const source = context.objectPrefabsByEntityId ?? {};
    const snapshot: Record<string, ObjectPrefabEntityState> = {};

    for (const key of Object.keys(source).sort((left, right) =>
        left.localeCompare(right),
    )) {
        const entry = source[key];
        snapshot[key] = {
            entityId: entry.entityId,
            archetype: entry.archetype,
            modules: Object.keys(entry.modules)
                .sort((left, right) => left.localeCompare(right))
                .reduce<Record<string, PrefabModuleConfig>>((acc, moduleId) => {
                    acc[moduleId] = toObject(entry.modules[moduleId]);
                    return acc;
                }, {}),
            state: {
                ...(entry.state.opened !== undefined
                    ? { opened: entry.state.opened }
                    : {}),
                ...(entry.state.used !== undefined
                    ? { used: entry.state.used }
                    : {}),
                ...(entry.state.completed !== undefined
                    ? { completed: entry.state.completed }
                    : {}),
            },
        };
    }

    return snapshot;
}

export function importObjectPrefabStateSnapshot(
    context: ObjectPrefabContext,
    snapshot: Record<string, ObjectPrefabEntityState>,
): boolean {
    if (!snapshot || typeof snapshot !== "object") {
        return false;
    }

    context.objectPrefabsByEntityId = exportObjectPrefabStateSnapshot({
        objectPrefabsByEntityId: snapshot,
    });
    return true;
}
