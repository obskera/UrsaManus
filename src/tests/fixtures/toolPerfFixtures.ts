import type { TileMapPlacementPayload } from "@/services/tileMapPlacement";

export type BgmPerfFixturePayload = {
    version: "um-bgm-v1";
    name: string;
    bpm: number;
    stepMs: number;
    loop: {
        startStep: number;
        endStep: number;
    };
    palette: Array<{
        id: string;
        file: string;
        gain: number;
    }>;
    sequence: Array<{
        step: number;
        soundId: string;
        lengthSteps: number;
        effect: "none" | "vibrato" | "tremolo" | "bitcrush";
    }>;
};

export const createLargeTilemapPerfFixture = (): TileMapPlacementPayload => {
    const width = 96;
    const height = 96;
    const tileCount = width * height;

    const createLayerTiles = (seed: number): number[] => {
        return Array.from({ length: tileCount }, (_, index) => {
            const value = (index + seed) % 11;
            if (value < 2) {
                return 0;
            }

            return (value % 8) + 1;
        });
    };

    return {
        version: "um-tilemap-v1",
        map: { width, height },
        selectedLayerId: "base",
        layers: [
            {
                id: "base",
                name: "Base",
                visible: true,
                locked: false,
                tiles: createLayerTiles(1),
            },
            {
                id: "decor",
                name: "Decor",
                visible: true,
                locked: false,
                tiles: createLayerTiles(5),
            },
            {
                id: "collision",
                name: "Collision",
                visible: true,
                locked: false,
                tiles: createLayerTiles(9).map((tileId, index) => {
                    return index % 7 === 0 && tileId > 0 ? 4 : 0;
                }),
            },
        ],
        collisionProfile: {
            solidLayerIds: ["collision"],
            solidLayerNameContains: ["collision", "solid", "blocker"],
            solidTileIds: [4],
            fallbackToVisibleNonZero: false,
        },
        overlays: Array.from({ length: 160 }, (_, index) => ({
            id: `overlay-${index}`,
            name: `Overlay ${index}`,
            type: index % 3 === 0 ? "enemy" : "object",
            tag: index % 3 === 0 ? "enemy" : "objective",
            x: index % width,
            y: Math.floor(index / width),
            roomIndex: 0,
            tileId: 12,
        })),
    };
};

export const createLargeBgmPerfFixture = (): BgmPerfFixturePayload => {
    const palette = Array.from({ length: 12 }, (_, index) => ({
        id: `sq${index + 1}`,
        file: `assets/audio/chiptune/sq${(index % 4) + 1}.wav`,
        gain: 0.55 + (index % 4) * 0.1,
    }));

    const sequence: BgmPerfFixturePayload["sequence"] = Array.from(
        { length: 640 },
        (_, index) => ({
            step: index,
            soundId: palette[index % palette.length]?.id ?? "sq1",
            lengthSteps: (index % 3) + 1,
            effect:
                index % 11 === 0
                    ? "bitcrush"
                    : index % 7 === 0
                      ? "tremolo"
                      : index % 5 === 0
                        ? "vibrato"
                        : "none",
        }),
    );

    return {
        version: "um-bgm-v1",
        name: "perf-large-sequence",
        bpm: 144,
        stepMs: 90,
        loop: {
            startStep: 0,
            endStep: 640,
        },
        palette,
        sequence,
    };
};
