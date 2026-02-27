import type { SeededRoom } from "./seededRoomMap";

export type SpawnAnchorTileIds = {
    playerStart?: number;
    objective?: number;
    enemy?: number;
    item?: number;
};

export type SpawnAnchorPoint = {
    x: number;
    y: number;
    roomIndex: number;
    tileId?: number;
};

export type GenerateSpawnAnchorsOptions = {
    rooms: SeededRoom[];
    seed: string | number;
    enemyCount?: number;
    itemCount?: number;
    enforceDistinctStartAndObjective?: boolean;
    tileIds?: SpawnAnchorTileIds;
};

export type GenerateSpawnAnchorsResult = {
    playerStart: SpawnAnchorPoint;
    objective: SpawnAnchorPoint;
    enemySpawns: SpawnAnchorPoint[];
    itemSpawns: SpawnAnchorPoint[];
};

type RandomFn = () => number;

function hashSeed(seed: string | number) {
    const text = String(seed);
    let hash = 2166136261;

    for (let index = 0; index < text.length; index += 1) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
}

function createSeededRandom(seed: string | number): RandomFn {
    let state = hashSeed(seed) || 1;

    return () => {
        state = Math.imul(state ^ (state >>> 15), 1 | state);
        state ^= state + Math.imul(state ^ (state >>> 7), 61 | state);
        return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
    };
}

function randomInt(random: RandomFn, min: number, max: number) {
    return min + Math.floor(random() * (max - min + 1));
}

function clampCount(value: number, max: number) {
    return Math.min(max, Math.max(0, Math.floor(value)));
}

function toPoint(
    rooms: SeededRoom[],
    roomIndex: number,
    tileId?: number,
): SpawnAnchorPoint {
    const room = rooms[roomIndex];
    return {
        x: room.centerX,
        y: room.centerY,
        roomIndex,
        tileId,
    };
}

function pickDistinctRoomIndices(
    random: RandomFn,
    roomCount: number,
    count: number,
    excluded: Set<number>,
) {
    const availableIndices: number[] = [];

    for (let index = 0; index < roomCount; index += 1) {
        if (!excluded.has(index)) {
            availableIndices.push(index);
        }
    }

    const picks: number[] = [];
    const maxPicks = clampCount(count, availableIndices.length);

    for (let pick = 0; pick < maxPicks; pick += 1) {
        const chosenPosition = randomInt(
            random,
            0,
            availableIndices.length - 1,
        );
        const [chosenIndex] = availableIndices.splice(chosenPosition, 1);
        picks.push(chosenIndex);
    }

    return picks;
}

export function generateSpawnAnchors({
    rooms,
    seed,
    enemyCount = 3,
    itemCount = 2,
    enforceDistinctStartAndObjective = true,
    tileIds,
}: GenerateSpawnAnchorsOptions): GenerateSpawnAnchorsResult {
    if (rooms.length === 0) {
        throw new Error("rooms must include at least one room");
    }

    const random = createSeededRandom(`${seed}:spawns`);
    const roomCount = rooms.length;
    const playerStartIndex = randomInt(random, 0, roomCount - 1);

    let objectiveIndex = playerStartIndex;
    if (roomCount > 1 && enforceDistinctStartAndObjective) {
        while (objectiveIndex === playerStartIndex) {
            objectiveIndex = randomInt(random, 0, roomCount - 1);
        }
    } else if (roomCount > 1) {
        objectiveIndex = randomInt(random, 0, roomCount - 1);
    }

    const excluded = new Set<number>([playerStartIndex, objectiveIndex]);
    const enemyIndices = pickDistinctRoomIndices(
        random,
        roomCount,
        enemyCount,
        excluded,
    );

    for (const enemyIndex of enemyIndices) {
        excluded.add(enemyIndex);
    }

    const itemIndices = pickDistinctRoomIndices(
        random,
        roomCount,
        itemCount,
        excluded,
    );

    return {
        playerStart: toPoint(rooms, playerStartIndex, tileIds?.playerStart),
        objective: toPoint(rooms, objectiveIndex, tileIds?.objective),
        enemySpawns: enemyIndices.map((index) =>
            toPoint(rooms, index, tileIds?.enemy),
        ),
        itemSpawns: itemIndices.map((index) =>
            toPoint(rooms, index, tileIds?.item),
        ),
    };
}
