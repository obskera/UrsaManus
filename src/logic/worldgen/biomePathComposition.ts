export type WorldgenBiomeType = "plains" | "forest" | "desert" | "snow";

export type WorldgenBiomeCell = WorldgenBiomeType | null;

export type WorldgenBiomePaletteRule = {
    floorTileId: number;
    wallTileId: number;
    pathTileId?: number;
};

export type WorldgenBiomePalette = {
    byBiome?: Partial<Record<WorldgenBiomeType, WorldgenBiomePaletteRule>>;
    defaultWallTileId?: number;
};

export type WorldgenPathNode = {
    x: number;
    y: number;
};

export type CreateBiomePathCompositionOptions = {
    tiles: number[][];
    seed: string | number;
    floorTileValue?: number;
    wallTileValue?: number;
    pathTileValue?: number;
    pathStart?: WorldgenPathNode;
    pathEnd?: WorldgenPathNode;
    palette?: WorldgenBiomePalette;
};

export type WorldgenBiomePathCompositionResult = {
    tiles: number[][];
    biomeMap: WorldgenBiomeCell[][];
    spriteTiles: number[][];
    path: WorldgenPathNode[];
};

const DEFAULT_FLOOR_TILE = 0;
const DEFAULT_WALL_TILE = 1;
const DEFAULT_PATH_TILE = 2;

const DEFAULT_BIOME_PALETTE: Record<
    WorldgenBiomeType,
    WorldgenBiomePaletteRule
> = {
    plains: {
        floorTileId: 11,
        wallTileId: 41,
        pathTileId: 21,
    },
    forest: {
        floorTileId: 12,
        wallTileId: 42,
        pathTileId: 22,
    },
    desert: {
        floorTileId: 13,
        wallTileId: 43,
        pathTileId: 23,
    },
    snow: {
        floorTileId: 14,
        wallTileId: 44,
        pathTileId: 24,
    },
};

const BIOMES: WorldgenBiomeType[] = ["plains", "forest", "desert", "snow"];

function hashSeed(seed: string | number) {
    const text = String(seed);
    let hash = 2166136261;

    for (let index = 0; index < text.length; index += 1) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
}

function createSeededRandom(seed: string | number) {
    let state = hashSeed(seed) || 1;

    return () => {
        state = Math.imul(state ^ (state >>> 15), 1 | state);
        state ^= state + Math.imul(state ^ (state >>> 7), 61 | state);
        return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
    };
}

function cloneTiles(tiles: number[][]) {
    return tiles.map((row) => [...row]);
}

function isInBounds(tiles: number[][], node: WorldgenPathNode) {
    return (
        node.y >= 0 &&
        node.y < tiles.length &&
        node.x >= 0 &&
        node.x < (tiles[node.y]?.length ?? 0)
    );
}

function buildBiomeMap(
    tiles: number[][],
    seed: string | number,
    floorTileValue: number,
): WorldgenBiomeCell[][] {
    const random = createSeededRandom(`${seed}:biomes`);

    return tiles.map((row) =>
        row.map((tile) => {
            if (tile !== floorTileValue) {
                return null;
            }

            const index = Math.floor(random() * BIOMES.length);
            return BIOMES[index] ?? BIOMES[0];
        }),
    );
}

function createPath(
    start: WorldgenPathNode,
    end: WorldgenPathNode,
): WorldgenPathNode[] {
    const path: WorldgenPathNode[] = [];
    let x = start.x;
    let y = start.y;

    path.push({ x, y });

    while (x !== end.x) {
        x += x < end.x ? 1 : -1;
        path.push({ x, y });
    }

    while (y !== end.y) {
        y += y < end.y ? 1 : -1;
        path.push({ x, y });
    }

    return path;
}

function paintPath(
    tiles: number[][],
    path: WorldgenPathNode[],
    pathTileValue: number,
) {
    for (const node of path) {
        if (!isInBounds(tiles, node)) {
            continue;
        }

        tiles[node.y][node.x] = pathTileValue;
    }
}

function resolvePaletteRule(
    biome: WorldgenBiomeType | null,
    palette?: WorldgenBiomePalette,
): WorldgenBiomePaletteRule {
    if (biome && palette?.byBiome?.[biome]) {
        return {
            ...DEFAULT_BIOME_PALETTE[biome],
            ...palette.byBiome[biome],
        };
    }

    if (biome) {
        return DEFAULT_BIOME_PALETTE[biome];
    }

    return {
        floorTileId: DEFAULT_BIOME_PALETTE.plains.floorTileId,
        wallTileId:
            palette?.defaultWallTileId ??
            DEFAULT_BIOME_PALETTE.plains.wallTileId,
        pathTileId: DEFAULT_BIOME_PALETTE.plains.pathTileId,
    };
}

function createSpriteTiles(options: {
    tiles: number[][];
    biomeMap: WorldgenBiomeCell[][];
    floorTileValue: number;
    wallTileValue: number;
    pathTileValue: number;
    palette?: WorldgenBiomePalette;
}) {
    const spriteTiles = cloneTiles(options.tiles);

    for (let y = 0; y < options.tiles.length; y += 1) {
        for (let x = 0; x < options.tiles[y].length; x += 1) {
            const tile = options.tiles[y][x];
            const biome = options.biomeMap[y][x];
            const rule = resolvePaletteRule(biome, options.palette);

            if (tile === options.wallTileValue) {
                spriteTiles[y][x] = rule.wallTileId;
                continue;
            }

            if (tile === options.pathTileValue) {
                spriteTiles[y][x] = rule.pathTileId ?? rule.floorTileId;
                continue;
            }

            if (tile === options.floorTileValue) {
                spriteTiles[y][x] = rule.floorTileId;
            }
        }
    }

    return spriteTiles;
}

export function createBiomePathComposition({
    tiles,
    seed,
    floorTileValue = DEFAULT_FLOOR_TILE,
    wallTileValue = DEFAULT_WALL_TILE,
    pathTileValue = DEFAULT_PATH_TILE,
    pathStart,
    pathEnd,
    palette,
}: CreateBiomePathCompositionOptions): WorldgenBiomePathCompositionResult {
    const composedTiles = cloneTiles(tiles);
    const biomeMap = buildBiomeMap(composedTiles, seed, floorTileValue);

    const shouldBuildPath =
        pathStart !== undefined &&
        pathEnd !== undefined &&
        isInBounds(composedTiles, pathStart) &&
        isInBounds(composedTiles, pathEnd);

    const path = shouldBuildPath ? createPath(pathStart, pathEnd) : [];

    if (path.length > 0) {
        paintPath(composedTiles, path, pathTileValue);
    }

    const spriteTiles = createSpriteTiles({
        tiles: composedTiles,
        biomeMap,
        floorTileValue,
        wallTileValue,
        pathTileValue,
        palette,
    });

    return {
        tiles: composedTiles,
        biomeMap,
        spriteTiles,
        path,
    };
}
