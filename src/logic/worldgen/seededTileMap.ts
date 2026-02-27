export type SeededTileMapOptions = {
    width: number;
    height: number;
    seed: string | number;
    fillProbability?: number;
    borderSolid?: boolean;
    solidTileValue?: number;
    emptyTileValue?: number;
};

export type SeededTileMapResult = {
    width: number;
    height: number;
    tiles: number[][];
    solidCount: number;
    emptyCount: number;
};

type RandomFn = () => number;

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

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

export function generateSeededTileMap({
    width,
    height,
    seed,
    fillProbability = 0.36,
    borderSolid = true,
    solidTileValue = 1,
    emptyTileValue = 0,
}: SeededTileMapOptions): SeededTileMapResult {
    assertDimensions(width, height);

    const random = createSeededRandom(seed);
    const threshold = clamp(fillProbability, 0, 1);

    let solidCount = 0;
    let emptyCount = 0;

    const tiles = Array.from({ length: height }, (_, rowIndex) => {
        return Array.from({ length: width }, (_, columnIndex) => {
            const isBorder =
                rowIndex === 0 ||
                columnIndex === 0 ||
                rowIndex === height - 1 ||
                columnIndex === width - 1;

            const isSolid = (borderSolid && isBorder) || random() < threshold;

            if (isSolid) {
                solidCount += 1;
                return solidTileValue;
            }

            emptyCount += 1;
            return emptyTileValue;
        });
    });

    return {
        width,
        height,
        tiles,
        solidCount,
        emptyCount,
    };
}
