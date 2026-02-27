export type SeededRoomMapOptions = {
    width: number;
    height: number;
    seed: string | number;
    roomCount?: number;
    roomMinSize?: number;
    roomMaxSize?: number;
    wallTileValue?: number;
    roomFloorTileValue?: number;
    corridorTileValue?: number;
    borderSolid?: boolean;
};

export type SeededRoom = {
    x: number;
    y: number;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
};

export type SeededRoomMapResult = {
    width: number;
    height: number;
    tiles: number[][];
    rooms: SeededRoom[];
    carvedRoomTiles: number;
    carvedCorridorTiles: number;
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

function assertDimensions(width: number, height: number) {
    if (!Number.isInteger(width) || width <= 0) {
        throw new Error("width must be a positive integer");
    }

    if (!Number.isInteger(height) || height <= 0) {
        throw new Error("height must be a positive integer");
    }
}

function clampInteger(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, Math.floor(value)));
}

function randomInt(random: RandomFn, min: number, max: number) {
    return min + Math.floor(random() * (max - min + 1));
}

function roomsOverlap(a: SeededRoom, b: SeededRoom) {
    return !(
        a.x + a.width <= b.x ||
        b.x + b.width <= a.x ||
        a.y + a.height <= b.y ||
        b.y + b.height <= a.y
    );
}

function carveRoom(
    tiles: number[][],
    room: SeededRoom,
    roomFloorTileValue: number,
) {
    let carved = 0;

    for (let y = room.y; y < room.y + room.height; y += 1) {
        for (let x = room.x; x < room.x + room.width; x += 1) {
            if (tiles[y][x] !== roomFloorTileValue) {
                carved += 1;
            }
            tiles[y][x] = roomFloorTileValue;
        }
    }

    return carved;
}

function carveHorizontalCorridor(
    tiles: number[][],
    y: number,
    fromX: number,
    toX: number,
    corridorTileValue: number,
) {
    let carved = 0;
    const startX = Math.min(fromX, toX);
    const endX = Math.max(fromX, toX);

    for (let x = startX; x <= endX; x += 1) {
        if (tiles[y][x] !== corridorTileValue) {
            carved += 1;
        }
        tiles[y][x] = corridorTileValue;
    }

    return carved;
}

function carveVerticalCorridor(
    tiles: number[][],
    x: number,
    fromY: number,
    toY: number,
    corridorTileValue: number,
) {
    let carved = 0;
    const startY = Math.min(fromY, toY);
    const endY = Math.max(fromY, toY);

    for (let y = startY; y <= endY; y += 1) {
        if (tiles[y][x] !== corridorTileValue) {
            carved += 1;
        }
        tiles[y][x] = corridorTileValue;
    }

    return carved;
}

export function generateSeededRoomMap({
    width,
    height,
    seed,
    roomCount = 8,
    roomMinSize = 3,
    roomMaxSize = 7,
    wallTileValue = 1,
    roomFloorTileValue = 0,
    corridorTileValue = roomFloorTileValue,
    borderSolid = true,
}: SeededRoomMapOptions): SeededRoomMapResult {
    assertDimensions(width, height);

    const random = createSeededRandom(`${seed}:rooms`);
    const boundedRoomCount = clampInteger(roomCount, 1, 80);
    const minRoomSize = clampInteger(roomMinSize, 2, 64);
    const maxRoomSize = clampInteger(
        Math.max(roomMaxSize, minRoomSize),
        minRoomSize,
        64,
    );

    const tiles = Array.from({ length: height }, () =>
        Array.from({ length: width }, () => wallTileValue),
    );

    const rooms: SeededRoom[] = [];
    const maxAttempts = boundedRoomCount * 16;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        if (rooms.length >= boundedRoomCount) {
            break;
        }

        const roomWidth = randomInt(random, minRoomSize, maxRoomSize);
        const roomHeight = randomInt(random, minRoomSize, maxRoomSize);

        if (roomWidth >= width - 2 || roomHeight >= height - 2) {
            continue;
        }

        const minX = borderSolid ? 1 : 0;
        const minY = borderSolid ? 1 : 0;
        const maxX = width - roomWidth - (borderSolid ? 1 : 0);
        const maxY = height - roomHeight - (borderSolid ? 1 : 0);

        if (maxX < minX || maxY < minY) {
            continue;
        }

        const roomX = randomInt(random, minX, maxX);
        const roomY = randomInt(random, minY, maxY);
        const room: SeededRoom = {
            x: roomX,
            y: roomY,
            width: roomWidth,
            height: roomHeight,
            centerX: roomX + Math.floor(roomWidth / 2),
            centerY: roomY + Math.floor(roomHeight / 2),
        };

        const hasOverlap = rooms.some((existingRoom) =>
            roomsOverlap(existingRoom, room),
        );

        if (hasOverlap) {
            continue;
        }

        rooms.push(room);
    }

    let carvedRoomTiles = 0;
    let carvedCorridorTiles = 0;

    for (const room of rooms) {
        carvedRoomTiles += carveRoom(tiles, room, roomFloorTileValue);
    }

    for (let index = 1; index < rooms.length; index += 1) {
        const from = rooms[index - 1];
        const to = rooms[index];

        carvedCorridorTiles += carveHorizontalCorridor(
            tiles,
            from.centerY,
            from.centerX,
            to.centerX,
            corridorTileValue,
        );
        carvedCorridorTiles += carveVerticalCorridor(
            tiles,
            to.centerX,
            from.centerY,
            to.centerY,
            corridorTileValue,
        );
    }

    if (borderSolid) {
        for (let x = 0; x < width; x += 1) {
            tiles[0][x] = wallTileValue;
            tiles[height - 1][x] = wallTileValue;
        }

        for (let y = 0; y < height; y += 1) {
            tiles[y][0] = wallTileValue;
            tiles[y][width - 1] = wallTileValue;
        }
    }

    return {
        width,
        height,
        tiles,
        rooms,
        carvedRoomTiles,
        carvedCorridorTiles,
    };
}
