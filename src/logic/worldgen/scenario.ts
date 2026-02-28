import {
    generateSeededRoomMap,
    type SeededRoomMapOptions,
    type SeededRoomMapResult,
} from "./seededRoomMap";
import {
    createBiomePathComposition,
    type CreateBiomePathCompositionOptions,
    type WorldgenBiomePathCompositionResult,
} from "./biomePathComposition";
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
    composition?: Omit<
        CreateBiomePathCompositionOptions,
        "tiles" | "seed" | "pathStart" | "pathEnd"
    > & {
        enabled?: boolean;
        seed?: string | number;
        connectStartToObjective?: boolean;
    };
};

export type WorldgenScenarioResult = {
    map: SeededRoomMapResult;
    anchors: GenerateSpawnAnchorsResult;
    worldAnchors: WorldSpawnAnchorsResult;
    composition: WorldgenBiomePathCompositionResult | null;
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
    composition,
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

    let compositionResult: WorldgenBiomePathCompositionResult | null = null;

    if (composition?.enabled) {
        const shouldConnect = composition.connectStartToObjective ?? true;
        compositionResult = createBiomePathComposition({
            tiles: map.tiles,
            seed: composition.seed ?? `${mapOptions.seed}:composition`,
            floorTileValue: composition.floorTileValue,
            wallTileValue: composition.wallTileValue,
            pathTileValue: composition.pathTileValue,
            palette: composition.palette,
            pathStart: shouldConnect
                ? {
                      x: anchors.playerStart.x,
                      y: anchors.playerStart.y,
                  }
                : undefined,
            pathEnd: shouldConnect
                ? {
                      x: anchors.objective.x,
                      y: anchors.objective.y,
                  }
                : undefined,
        });

        map.tiles = compositionResult.tiles;
    }

    return {
        map,
        anchors,
        worldAnchors,
        composition: compositionResult,
    };
}
