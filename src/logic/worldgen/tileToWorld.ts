import type {
    GenerateSpawnAnchorsResult,
    SpawnAnchorPoint,
} from "./spawnAnchors";

export type TileAnchor = "top-left" | "center";

export type TileToWorldOptions = {
    tileWidth: number;
    tileHeight?: number;
    originX?: number;
    originY?: number;
    anchor?: TileAnchor;
};

export type WorldPosition = {
    x: number;
    y: number;
};

export type WorldAnchorPoint = SpawnAnchorPoint & {
    worldX: number;
    worldY: number;
};

export type WorldSpawnAnchorsResult = {
    playerStart: WorldAnchorPoint;
    objective: WorldAnchorPoint;
    enemySpawns: WorldAnchorPoint[];
    itemSpawns: WorldAnchorPoint[];
};

function assertPositive(name: string, value: number) {
    if (!Number.isFinite(value) || value <= 0) {
        throw new Error(`${name} must be a positive number`);
    }
}

function assertInteger(name: string, value: number) {
    if (!Number.isInteger(value)) {
        throw new Error(`${name} must be an integer tile coordinate`);
    }
}

export function tileToWorldPosition(
    tileX: number,
    tileY: number,
    {
        tileWidth,
        tileHeight = tileWidth,
        originX = 0,
        originY = 0,
        anchor = "top-left",
    }: TileToWorldOptions,
): WorldPosition {
    assertInteger("tileX", tileX);
    assertInteger("tileY", tileY);
    assertPositive("tileWidth", tileWidth);
    assertPositive("tileHeight", tileHeight);

    const baseX = originX + tileX * tileWidth;
    const baseY = originY + tileY * tileHeight;

    if (anchor === "center") {
        return {
            x: baseX + tileWidth / 2,
            y: baseY + tileHeight / 2,
        };
    }

    return {
        x: baseX,
        y: baseY,
    };
}

export function spawnAnchorToWorld(
    anchorPoint: SpawnAnchorPoint,
    options: TileToWorldOptions,
): WorldAnchorPoint {
    const position = tileToWorldPosition(anchorPoint.x, anchorPoint.y, options);

    return {
        ...anchorPoint,
        worldX: position.x,
        worldY: position.y,
    };
}

export function spawnAnchorsToWorld(
    anchors: GenerateSpawnAnchorsResult,
    options: TileToWorldOptions,
): WorldSpawnAnchorsResult {
    return {
        playerStart: spawnAnchorToWorld(anchors.playerStart, options),
        objective: spawnAnchorToWorld(anchors.objective, options),
        enemySpawns: anchors.enemySpawns.map((anchorPoint) =>
            spawnAnchorToWorld(anchorPoint, options),
        ),
        itemSpawns: anchors.itemSpawns.map((anchorPoint) =>
            spawnAnchorToWorld(anchorPoint, options),
        ),
    };
}
