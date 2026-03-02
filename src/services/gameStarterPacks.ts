import {
    PREFAB_ENCOUNTER_BUNDLE_VERSION,
    simulatePrefabEncounterBundle,
    type PrefabEncounterBundle,
    type PrefabEncounterSimulationReport,
} from "@/services/prefabEncounterBundles";
import type { PrefabRegistry } from "@/services/prefabCore";

export type GameStarterPackTier = "P1" | "P2";

export type GameStarterPackId =
    | "combat-encounter-pack"
    | "top-down-shooter-pack"
    | "tower-defense-pack"
    | "quest-starter-pack"
    | "dialogue-social-pack"
    | "loot-economy-pack"
    | "roguelite-run-pack"
    | "survival-pack"
    | "puzzle-interaction-pack"
    | "traversal-pack"
    | "mobile-controls-pack";

export type GameStarterPack = {
    id: GameStarterPackId;
    label: string;
    tier: GameStarterPackTier;
    description: string;
    docs: {
        quickStart: string;
        cheatsheet: string;
    };
    doneCriteria: string[];
    bundle: PrefabEncounterBundle;
};

function createBundle(
    id: string,
    label: string,
    spawns: PrefabEncounterBundle["spawns"],
    metadata?: Record<string, unknown>,
): PrefabEncounterBundle {
    return {
        version: PREFAB_ENCOUNTER_BUNDLE_VERSION,
        id,
        label,
        spawns,
        ...(metadata ? { metadata } : {}),
    };
}

const PACKS: GameStarterPack[] = [
    {
        id: "combat-encounter-pack",
        label: "Combat Encounter Pack",
        tier: "P1",
        description:
            "Wave spawner + elite/boss-ready enemy set with objective-ready object hooks.",
        docs: {
            quickStart: "docs/tutorials/GAME_BUILDING_TUTORIAL.md",
            cheatsheet: "docs/prefabs/CHEATSHEET.md",
        },
        doneCriteria: [
            "Encounter bundle simulates with no attach failures.",
            "Includes at least one player, wave enemy role, and arena/objective object.",
            "Copy/paste snippet documented in prefab cheatsheet.",
        ],
        bundle: createBundle("combat-encounter-pack", "Combat Encounter Pack", [
            {
                id: "player",
                domain: "player",
                archetype: "arpg-player",
            },
            {
                id: "wave",
                domain: "enemy",
                archetype: "swarm-rusher",
                count: 5,
            },
            {
                id: "elite",
                domain: "enemy",
                archetype: "shield-guard",
            },
            {
                id: "boss",
                domain: "enemy",
                archetype: "boss-phase",
            },
            {
                id: "arena",
                domain: "object",
                archetype: "arena-trigger",
            },
        ]),
    },
    {
        id: "top-down-shooter-pack",
        label: "Top-Down Shooter Pack",
        tier: "P1",
        description:
            "Twin-stick player with ranged enemies and destructible combat props.",
        docs: {
            quickStart: "docs/tutorials/GAME_BUILDING_TUTORIAL.md",
            cheatsheet: "docs/input/CHEATSHEET.md",
        },
        doneCriteria: [
            "Twin-stick player archetype included.",
            "Includes ranged enemy pressure role.",
            "Includes destructible/interactable combat object.",
        ],
        bundle: createBundle("top-down-shooter-pack", "Top-Down Shooter Pack", [
            {
                id: "player",
                domain: "player",
                archetype: "twin-stick-shooter",
            },
            {
                id: "ranged-wave",
                domain: "enemy",
                archetype: "ranged-kiter",
                count: 4,
            },
            {
                id: "sniper",
                domain: "enemy",
                archetype: "sniper-kiter",
            },
            {
                id: "crates",
                domain: "object",
                archetype: "breakable-container",
                count: 3,
            },
        ]),
    },
    {
        id: "tower-defense-pack",
        label: "Tower Defense Pack",
        tier: "P2",
        description:
            "Path-lane style defensive setup with trap-floor and networked switch controls.",
        docs: {
            quickStart: "docs/tutorials/GAME_BUILDING_WORKFLOW_CHEATSHEET.md",
            cheatsheet: "docs/prefabs/CHEATSHEET.md",
        },
        doneCriteria: [
            "Simulates lane enemy waves.",
            "Includes trap and switch-network objects.",
            "Includes baseline player/controller archetype.",
        ],
        bundle: createBundle("tower-defense-pack", "Tower Defense Pack", [
            {
                id: "player",
                domain: "player",
                archetype: "jrpg-party-lead",
            },
            {
                id: "lane-wave",
                domain: "enemy",
                archetype: "swarm-rusher",
                count: 6,
            },
            {
                id: "bruiser",
                domain: "enemy",
                archetype: "tank-bruiser",
                count: 2,
            },
            {
                id: "traps",
                domain: "object",
                archetype: "trap-floor",
                count: 3,
            },
            {
                id: "switch-net",
                domain: "object",
                archetype: "switch-network",
            },
        ]),
    },
    {
        id: "quest-starter-pack",
        label: "Quest Starter Pack",
        tier: "P1",
        description:
            "Quest giver + quest board + checkpoint + reward chest baseline loop.",
        docs: {
            quickStart: "docs/tutorials/GAME_BUILDING_TUTORIAL.md",
            cheatsheet: "docs/prefabs/CHEATSHEET.md",
        },
        doneCriteria: [
            "Contains quest giver and quest board objects.",
            "Contains reward object for completion flow.",
            "Contains checkpoint for progression continuity.",
        ],
        bundle: createBundle("quest-starter-pack", "Quest Starter Pack", [
            {
                id: "player",
                domain: "player",
                archetype: "arpg-player",
            },
            {
                id: "quest-giver",
                domain: "object",
                archetype: "quest-giver",
            },
            {
                id: "quest-board",
                domain: "object",
                archetype: "quest-board",
            },
            {
                id: "checkpoint",
                domain: "object",
                archetype: "checkpoint-statue",
            },
            {
                id: "reward-chest",
                domain: "object",
                archetype: "loot-chest",
            },
        ]),
    },
    {
        id: "dialogue-social-pack",
        label: "Dialogue + Social Pack",
        tier: "P2",
        description:
            "Town social loop with merchant, ambient NPCs, and faction representative.",
        docs: {
            quickStart: "docs/tutorials/GAME_BUILDING_WORKFLOW_CHEATSHEET.md",
            cheatsheet: "docs/prefabs/CHEATSHEET.md",
        },
        doneCriteria: [
            "Includes merchant-tiered and ambient NPC archetypes.",
            "Includes faction-rep social NPC archetype.",
            "Simulates attach/detach with no failures.",
        ],
        bundle: createBundle("dialogue-social-pack", "Dialogue + Social Pack", [
            {
                id: "player",
                domain: "player",
                archetype: "jrpg-party-lead",
            },
            {
                id: "merchant",
                domain: "object",
                archetype: "merchant-tiered",
            },
            {
                id: "ambient",
                domain: "object",
                archetype: "town-ambient-npc",
                count: 3,
            },
            {
                id: "faction",
                domain: "object",
                archetype: "faction-rep-agent",
            },
        ]),
    },
    {
        id: "loot-economy-pack",
        label: "Loot + Economy Pack",
        tier: "P1",
        description:
            "Resource node, loot chest, vendor, and bank stash loop starter.",
        docs: {
            quickStart: "docs/tutorials/GAME_BUILDING_TUTORIAL.md",
            cheatsheet: "docs/prefabs/CHEATSHEET.md",
        },
        doneCriteria: [
            "Includes chest and resource node archetypes.",
            "Includes vendor and stash archetypes.",
            "Simulation report has zero issues.",
        ],
        bundle: createBundle("loot-economy-pack", "Loot + Economy Pack", [
            {
                id: "player",
                domain: "player",
                archetype: "survival-crafter",
            },
            {
                id: "resource",
                domain: "object",
                archetype: "resource-node",
                count: 3,
            },
            {
                id: "chest",
                domain: "object",
                archetype: "loot-chest",
                count: 2,
            },
            {
                id: "vendor",
                domain: "object",
                archetype: "merchant-tiered",
            },
            {
                id: "stash",
                domain: "object",
                archetype: "bank-stash",
            },
        ]),
    },
    {
        id: "roguelite-run-pack",
        label: "Roguelite Run Pack",
        tier: "P2",
        description:
            "Run loop baseline with room combat progression and run-end objective checkpoint.",
        docs: {
            quickStart: "docs/tutorials/GAME_BUILDING_WORKFLOW_CHEATSHEET.md",
            cheatsheet: "docs/prefabs/CHEATSHEET.md",
        },
        doneCriteria: [
            "Includes player, room enemy waves, and boss transition enemy.",
            "Includes checkpoint/objective object hooks.",
            "Supports simulation with no module attach failures.",
        ],
        bundle: createBundle("roguelite-run-pack", "Roguelite Run Pack", [
            {
                id: "player",
                domain: "player",
                archetype: "arpg-player",
            },
            {
                id: "room-wave",
                domain: "enemy",
                archetype: "melee-chaser",
                count: 5,
            },
            {
                id: "elite",
                domain: "enemy",
                archetype: "support-healer",
            },
            {
                id: "boss",
                domain: "enemy",
                archetype: "boss-phase",
            },
            {
                id: "checkpoint",
                domain: "object",
                archetype: "checkpoint-statue",
            },
            {
                id: "reward",
                domain: "object",
                archetype: "loot-chest",
            },
        ]),
    },
    {
        id: "survival-pack",
        label: "Survival Pack",
        tier: "P1",
        description:
            "Gather/craft loop with survival-crafter player and world resource props.",
        docs: {
            quickStart: "docs/tutorials/GAME_BUILDING_TUTORIAL.md",
            cheatsheet: "docs/prefabs/CHEATSHEET.md",
        },
        doneCriteria: [
            "Includes survival-crafter player archetype.",
            "Includes resource-node and crafting-station objects.",
            "Includes hazard/trap interaction object.",
        ],
        bundle: createBundle("survival-pack", "Survival Pack", [
            {
                id: "player",
                domain: "player",
                archetype: "survival-crafter",
            },
            {
                id: "resource",
                domain: "object",
                archetype: "resource-node",
                count: 4,
            },
            {
                id: "craft",
                domain: "object",
                archetype: "crafting-station",
            },
            {
                id: "hazard",
                domain: "object",
                archetype: "trap-floor",
                count: 2,
            },
        ]),
    },
    {
        id: "puzzle-interaction-pack",
        label: "Puzzle + Interaction Pack",
        tier: "P1",
        description:
            "Switch/door/trigger puzzle chain starter with deterministic interaction wiring.",
        docs: {
            quickStart: "docs/tutorials/GAME_BUILDING_WORKFLOW_CHEATSHEET.md",
            cheatsheet: "docs/prefabs/CHEATSHEET.md",
        },
        doneCriteria: [
            "Includes switch, switch-network, and locked-door objects.",
            "Includes player controller archetype.",
            "Simulation report is clean.",
        ],
        bundle: createBundle(
            "puzzle-interaction-pack",
            "Puzzle + Interaction Pack",
            [
                {
                    id: "player",
                    domain: "player",
                    archetype: "platformer-mobility",
                },
                {
                    id: "switch-a",
                    domain: "object",
                    archetype: "door-switch",
                },
                {
                    id: "network",
                    domain: "object",
                    archetype: "switch-network",
                },
                {
                    id: "locked-door",
                    domain: "object",
                    archetype: "locked-door",
                },
            ],
        ),
    },
    {
        id: "traversal-pack",
        label: "Traversal Pack",
        tier: "P2",
        description:
            "Traversal-focused starter around mobility profile, checkpoints, and route controls.",
        docs: {
            quickStart: "docs/tutorials/GAME_BUILDING_WORKFLOW_CHEATSHEET.md",
            cheatsheet: "docs/prefabs/CHEATSHEET.md",
        },
        doneCriteria: [
            "Includes mobility-focused player archetype.",
            "Includes fast travel and checkpoint traversal anchors.",
            "Includes escort route interaction object.",
        ],
        bundle: createBundle("traversal-pack", "Traversal Pack", [
            {
                id: "player",
                domain: "player",
                archetype: "platformer-mobility",
            },
            {
                id: "checkpoint",
                domain: "object",
                archetype: "checkpoint-statue",
            },
            {
                id: "fast-travel",
                domain: "object",
                archetype: "fast-travel-point",
            },
            {
                id: "escort",
                domain: "object",
                archetype: "escort-cart",
            },
        ]),
    },
    {
        id: "mobile-controls-pack",
        label: "Mobile Controls Pack",
        tier: "P1",
        description:
            "Virtual stick + action-button focused starter with mobile-friendly player profile.",
        docs: {
            quickStart: "docs/input/CHEATSHEET.md",
            cheatsheet: "docs/tutorials/GAME_BUILDING_WORKFLOW_CHEATSHEET.md",
        },
        doneCriteria: [
            "Includes twin-stick player archetype for directional + action controls.",
            "Includes interactable objects for touch action flows.",
            "Input cheatsheet includes virtual control stick integration snippet.",
        ],
        bundle: createBundle("mobile-controls-pack", "Mobile Controls Pack", [
            {
                id: "player",
                domain: "player",
                archetype: "twin-stick-shooter",
            },
            {
                id: "interact",
                domain: "object",
                archetype: "quest-board",
            },
            {
                id: "loot",
                domain: "object",
                archetype: "loot-chest",
            },
        ]),
    },
];

const PACKS_BY_ID = new Map(PACKS.map((pack) => [pack.id, pack]));

function clonePack(pack: GameStarterPack): GameStarterPack {
    return {
        ...pack,
        docs: {
            ...pack.docs,
        },
        doneCriteria: [...pack.doneCriteria],
        bundle: {
            ...pack.bundle,
            spawns: pack.bundle.spawns.map((spawn) => ({
                ...spawn,
                ...(spawn.overrides
                    ? { overrides: { ...spawn.overrides } }
                    : {}),
            })),
            ...(pack.bundle.metadata
                ? { metadata: { ...pack.bundle.metadata } }
                : {}),
        },
    };
}

export function listGameStarterPacks(): GameStarterPack[] {
    return PACKS.map((pack) => clonePack(pack));
}

export function getGameStarterPack(
    id: GameStarterPackId,
): GameStarterPack | null {
    const pack = PACKS_BY_ID.get(id);
    if (!pack) {
        return null;
    }

    return clonePack(pack);
}

export function simulateGameStarterPack(
    id: GameStarterPackId,
    options?: {
        registry?: PrefabRegistry;
    },
): PrefabEncounterSimulationReport {
    const pack = PACKS_BY_ID.get(id);
    if (!pack) {
        return {
            ok: false,
            bundleId: id,
            entitiesSimulated: 0,
            moduleAttachments: 0,
            issues: [`Unknown game starter pack: ${id}`],
        };
    }

    return simulatePrefabEncounterBundle(pack.bundle, options);
}
