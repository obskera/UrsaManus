import {
    generateSeededRoomMap,
    type SeededRoomMapOptions,
    type SeededRoomMapResult,
} from "./seededRoomMap";
import {
    generateSpawnAnchors,
    type GenerateSpawnAnchorsOptions,
    type GenerateSpawnAnchorsResult,
} from "./spawnAnchors";
import {
    spawnAnchorsToWorld,
    type TileToWorldOptions,
    type WorldSpawnAnchorsResult,
} from "./tileToWorld";

export type ScenarioSpawnOptions = Omit<
    GenerateSpawnAnchorsOptions,
    "rooms" | "seed"
> & {
    seed?: string | number;
};

export type CreateWorldgenScenarioOptions = {
    map: SeededRoomMapOptions;
    spawns?: ScenarioSpawnOptions;
    world?: TileToWorldOptions;
};

export type WorldgenScenarioResult = {
    map: SeededRoomMapResult;
    anchors: GenerateSpawnAnchorsResult;
    worldAnchors: WorldSpawnAnchorsResult;
};

const DEFAULT_WORLD_OPTIONS: TileToWorldOptions = {
    tileWidth: 16,
    tileHeight: 16,
    originX: 0,
    originY: 0,
    anchor: "center",
};

export function createWorldgenScenario({
    map: mapOptions,
    spawns,
    world,
}: CreateWorldgenScenarioOptions): WorldgenScenarioResult {
    const map = generateSeededRoomMap(mapOptions);
    const anchors = generateSpawnAnchors({
        rooms: map.rooms,
        seed: spawns?.seed ?? `${mapOptions.seed}:spawns`,
        enemyCount: spawns?.enemyCount,
        itemCount: spawns?.itemCount,
        enforceDistinctStartAndObjective:
            spawns?.enforceDistinctStartAndObjective,
        tileIds: spawns?.tileIds,
    });

    const worldOptions = world
        ? {
              ...DEFAULT_WORLD_OPTIONS,
              ...world,
          }
        : DEFAULT_WORLD_OPTIONS;

    const worldAnchors = spawnAnchorsToWorld(anchors, worldOptions);

    return {
        map,
        anchors,
        worldAnchors,
    };
}
