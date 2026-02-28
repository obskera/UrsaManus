import {
    createWorldgenScenario,
    type CreateWorldgenScenarioOptions,
    type WorldgenScenarioResult,
} from "./scenario";

export type WorldgenScenePresetId =
    | "compact-run"
    | "cavern-run"
    | "gauntlet-run";

type WorldgenScenePresetDefinition = {
    id: WorldgenScenePresetId;
    label: string;
    options: CreateWorldgenScenarioOptions;
};

type WorldgenScenarioOverrides = Omit<
    Partial<CreateWorldgenScenarioOptions>,
    "map" | "spawns" | "world" | "composition"
> & {
    map?: Partial<CreateWorldgenScenarioOptions["map"]>;
    spawns?: Partial<NonNullable<CreateWorldgenScenarioOptions["spawns"]>>;
    world?: Partial<NonNullable<CreateWorldgenScenarioOptions["world"]>>;
    composition?: Partial<
        NonNullable<CreateWorldgenScenarioOptions["composition"]>
    >;
};

const PRESETS: Record<WorldgenScenePresetId, WorldgenScenePresetDefinition> = {
    "compact-run": {
        id: "compact-run",
        label: "Compact Run",
        options: {
            map: {
                width: 32,
                height: 22,
                seed: "compact-run",
                roomCount: 7,
                roomMinSize: 4,
                roomMaxSize: 7,
            },
            spawns: {
                enemyCount: 3,
                itemCount: 2,
            },
            world: {
                tileWidth: 16,
                tileHeight: 16,
                anchor: "center",
            },
            composition: {
                enabled: true,
                pathTileValue: 2,
            },
        },
    },
    "cavern-run": {
        id: "cavern-run",
        label: "Cavern Run",
        options: {
            map: {
                width: 44,
                height: 28,
                seed: "cavern-run",
                roomCount: 10,
                roomMinSize: 4,
                roomMaxSize: 9,
            },
            spawns: {
                enemyCount: 5,
                itemCount: 3,
            },
            world: {
                tileWidth: 16,
                tileHeight: 16,
                anchor: "center",
            },
            composition: {
                enabled: true,
                pathTileValue: 3,
                palette: {
                    byBiome: {
                        forest: {
                            floorTileId: 52,
                            wallTileId: 72,
                            pathTileId: 62,
                        },
                        snow: {
                            floorTileId: 54,
                            wallTileId: 74,
                            pathTileId: 64,
                        },
                    },
                },
            },
        },
    },
    "gauntlet-run": {
        id: "gauntlet-run",
        label: "Gauntlet Run",
        options: {
            map: {
                width: 48,
                height: 24,
                seed: "gauntlet-run",
                roomCount: 12,
                roomMinSize: 3,
                roomMaxSize: 7,
            },
            spawns: {
                enemyCount: 8,
                itemCount: 2,
            },
            world: {
                tileWidth: 16,
                tileHeight: 16,
                anchor: "center",
            },
            composition: {
                enabled: true,
                pathTileValue: 5,
            },
        },
    },
};

function mergeScenarioOptions(
    base: CreateWorldgenScenarioOptions,
    overrides?: WorldgenScenarioOverrides,
): CreateWorldgenScenarioOptions {
    if (!overrides) {
        return {
            ...base,
            map: { ...base.map },
            spawns: base.spawns ? { ...base.spawns } : undefined,
            world: base.world ? { ...base.world } : undefined,
            composition: base.composition ? { ...base.composition } : undefined,
        };
    }

    return {
        ...base,
        ...overrides,
        map: {
            ...base.map,
            ...(overrides.map ?? {}),
        },
        spawns: base.spawns
            ? {
                  ...base.spawns,
                  ...(overrides.spawns ?? {}),
              }
            : undefined,
        world: base.world
            ? {
                  ...base.world,
                  ...(overrides.world ?? {}),
              }
            : undefined,
        composition: base.composition
            ? {
                  ...base.composition,
                  ...(overrides.composition ?? {}),
              }
            : undefined,
    };
}

export function listWorldgenScenePresets(): Array<{
    id: WorldgenScenePresetId;
    label: string;
}> {
    return Object.values(PRESETS).map((preset) => ({
        id: preset.id,
        label: preset.label,
    }));
}

export function createWorldgenScenePresetOptions(
    presetId: WorldgenScenePresetId,
    overrides?: WorldgenScenarioOverrides,
): CreateWorldgenScenarioOptions {
    const preset = PRESETS[presetId];
    return mergeScenarioOptions(preset.options, overrides);
}

export function createWorldgenScenePreset(
    presetId: WorldgenScenePresetId,
    overrides?: WorldgenScenarioOverrides,
): WorldgenScenarioResult {
    return createWorldgenScenario(
        createWorldgenScenePresetOptions(presetId, overrides),
    );
}
