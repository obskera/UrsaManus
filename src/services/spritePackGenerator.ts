import type {
    SpriteAtlasDefinition,
    SpriteClipLoopMode,
    SpriteTileFrame,
} from "@/logic/entity/spriteAnimationAtlas";

export const SPRITE_PACK_VERSION = "um-sprite-pack-v1" as const;

export type SpritePackPixelSize = 8 | 16 | 32 | 64;

export type SpritePackGenre =
    | "top-down"
    | "dungeon"
    | "sidescroller"
    | "rpg";

export type SpritePackAnimation = "idle" | "move" | "atk" | "def" | "hurt";

export type SpritePackPalettePreset =
    | "default"
    | "classic-nes"
    | "snes-fantasy"
    | "gameboy";

export type SpritePackAssetCategory =
    | "character"
    | "enemy"
    | "wall"
    | "decoration"
    | "interactable";

export type SpritePackGenerateOptions = {
    seed: string;
    genre: SpritePackGenre;
    pixelSize: SpritePackPixelSize;
    palettePreset?: SpritePackPalettePreset;
    paletteOverrides?: Partial<Omit<SpritePackBasePalette, "transparent">>;
};

export type SpritePackBasePalette = {
    transparent: string;
    outline: string;
    skin: string;
    clothA: string;
    clothB: string;
    armor: string;
    accent: string;
    enemyA: string;
    enemyB: string;
    wall: string;
    deco: string;
    wood: string;
    metal: string;
};

type PixelFrame = {
    size: number;
    palette: string[];
    pixels: Uint8Array;
};

type GeneratedFrameRecord = {
    assetId: string;
    category: SpritePackAssetCategory;
    animation: SpritePackAnimation;
    frameIndex: number;
    fps: number;
    loop: SpriteClipLoopMode;
    frame: PixelFrame;
};

export type SpritePackClipMetadata = {
    name: string;
    animation: SpritePackAnimation;
    fps: number;
    loop: SpriteClipLoopMode;
    frames: SpriteTileFrame[];
};

export type SpritePackAssetMetadata = {
    assetId: string;
    category: SpritePackAssetCategory;
    clips: SpritePackClipMetadata[];
};

export type SpritePackMetadata = {
    version: typeof SPRITE_PACK_VERSION;
    seed: string;
    genre: SpritePackGenre;
    pixelSize: SpritePackPixelSize;
    sheet: {
        widthTiles: number;
        heightTiles: number;
        widthPx: number;
        heightPx: number;
        fileName: string;
    };
    palette: {
        preset: SpritePackPalettePreset;
        resolved: SpritePackBasePalette;
    };
    assets: SpritePackAssetMetadata[];
    spriteAtlasDefinition: SpriteAtlasDefinition;
};

export type GeneratedSpritePack = {
    metadata: SpritePackMetadata;
    frames: Array<{
        tileX: number;
        tileY: number;
        frame: PixelFrame;
    }>;
};

const CHARACTER_CLASSES = ["knight", "wizard", "rogue", "cleric"] as const;
const ENEMY_TYPES = ["slime", "goblin", "skeleton", "bat"] as const;

const ASSET_ANIMATION_FRAMES: Record<SpritePackAnimation, number> = {
    idle: 2,
    move: 4,
    atk: 3,
    def: 2,
    hurt: 2,
};

const ASSET_ANIMATION_FPS: Record<SpritePackAnimation, number> = {
    idle: 4,
    move: 8,
    atk: 10,
    def: 6,
    hurt: 12,
};

const ASSET_ANIMATION_LOOP: Record<SpritePackAnimation, SpriteClipLoopMode> = {
    idle: "loop",
    move: "loop",
    atk: "once",
    def: "loop",
    hurt: "once",
};

const BASE_PALETTE: SpritePackBasePalette = {
    transparent: "rgba(0,0,0,0)",
    outline: "#121212",
    skin: "#f2c79d",
    clothA: "#5e81ac",
    clothB: "#88c0d0",
    armor: "#9aa3b2",
    accent: "#e5c07b",
    enemyA: "#a3be8c",
    enemyB: "#bf616a",
    wall: "#6b7280",
    deco: "#7c9d5d",
    wood: "#8b5a2b",
    metal: "#c0c7d1",
} as const;

const PALETTE_PRESETS: Record<
    SpritePackPalettePreset,
    Partial<Omit<SpritePackBasePalette, "transparent">>
> = {
    default: {},
    "classic-nes": {
        outline: "#0f380f",
        skin: "#f8d8a8",
        clothA: "#2048a0",
        clothB: "#70a4ff",
        armor: "#adb4bd",
        accent: "#f8b800",
        enemyA: "#58a858",
        enemyB: "#d05050",
        wall: "#6c6c6c",
        deco: "#58a858",
        wood: "#8f563b",
        metal: "#d0d8de",
    },
    "snes-fantasy": {
        outline: "#1c1b2a",
        skin: "#f4cfa8",
        clothA: "#5f60d8",
        clothB: "#88b1ff",
        armor: "#8f9db0",
        accent: "#ffd166",
        enemyA: "#7fcf6a",
        enemyB: "#c24f5d",
        wall: "#6f728d",
        deco: "#6db680",
        wood: "#9a6d3a",
        metal: "#cfd6e5",
    },
    gameboy: {
        outline: "#0f380f",
        skin: "#9bbc0f",
        clothA: "#8bac0f",
        clothB: "#306230",
        armor: "#8bac0f",
        accent: "#9bbc0f",
        enemyA: "#8bac0f",
        enemyB: "#306230",
        wall: "#306230",
        deco: "#8bac0f",
        wood: "#306230",
        metal: "#8bac0f",
    },
};

function resolveBasePalette(
    preset: SpritePackPalettePreset,
    overrides: Partial<Omit<SpritePackBasePalette, "transparent">> | undefined,
): SpritePackBasePalette {
    const presetPatch = PALETTE_PRESETS[preset] ?? {};

    return {
        ...BASE_PALETTE,
        ...presetPatch,
        ...overrides,
    };
}

function hashSeed(seed: string): number {
    let hash = 2166136261;
    for (let index = 0; index < seed.length; index += 1) {
        hash ^= seed.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
}

function createRng(seed: string): () => number {
    let state = hashSeed(seed) || 0x6d2b79f5;

    return () => {
        state += 0x6d2b79f5;
        let step = Math.imul(state ^ (state >>> 15), 1 | state);
        step ^= step + Math.imul(step ^ (step >>> 7), 61 | step);
        return ((step ^ (step >>> 14)) >>> 0) / 4294967296;
    };
}

function pickOne<T>(rng: () => number, values: readonly T[]): T {
    const index = Math.floor(rng() * values.length);
    return values[Math.min(values.length - 1, Math.max(0, index))];
}

function shuffleWithRng<T>(rng: () => number, values: readonly T[]): T[] {
    const clone = [...values];

    for (let index = clone.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(rng() * (index + 1));
        const current = clone[index];
        clone[index] = clone[swapIndex] as T;
        clone[swapIndex] = current as T;
    }

    return clone;
}

function createFrame(size: number, palette: string[]): PixelFrame {
    return {
        size,
        palette,
        pixels: new Uint8Array(size * size),
    };
}

function setPixel(frame: PixelFrame, x: number, y: number, colorIndex: number): void {
    if (x < 0 || y < 0 || x >= frame.size || y >= frame.size) {
        return;
    }

    frame.pixels[y * frame.size + x] = colorIndex;
}

function fillRect(
    frame: PixelFrame,
    startX: number,
    startY: number,
    width: number,
    height: number,
    colorIndex: number,
): void {
    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            setPixel(frame, startX + x, startY + y, colorIndex);
        }
    }
}

function drawOutlineRect(
    frame: PixelFrame,
    startX: number,
    startY: number,
    width: number,
    height: number,
    colorIndex: number,
): void {
    for (let x = 0; x < width; x += 1) {
        setPixel(frame, startX + x, startY, colorIndex);
        setPixel(frame, startX + x, startY + height - 1, colorIndex);
    }

    for (let y = 0; y < height; y += 1) {
        setPixel(frame, startX, startY + y, colorIndex);
        setPixel(frame, startX + width - 1, startY + y, colorIndex);
    }
}

function createCharacterPalette(
    className: string,
    basePalette: SpritePackBasePalette,
): string[] {
    if (className === "wizard") {
        return [
            basePalette.transparent,
            basePalette.outline,
            basePalette.skin,
            "#3f51b5",
            "#8ea6ff",
            basePalette.accent,
        ];
    }

    if (className === "knight") {
        return [
            basePalette.transparent,
            basePalette.outline,
            basePalette.skin,
            "#8b95a5",
            "#c4cad6",
            basePalette.accent,
        ];
    }

    if (className === "rogue") {
        return [
            basePalette.transparent,
            basePalette.outline,
            basePalette.skin,
            "#3f4f4f",
            "#5f7d6f",
            basePalette.accent,
        ];
    }

    return [
        basePalette.transparent,
        basePalette.outline,
        basePalette.skin,
        basePalette.clothA,
        basePalette.clothB,
        basePalette.accent,
    ];
}

function createEnemyPalette(
    enemyType: string,
    basePalette: SpritePackBasePalette,
): string[] {
    if (enemyType === "slime") {
        return [
            basePalette.transparent,
            basePalette.outline,
            "#5fbf6f",
            "#8be29a",
            "#d1ffe0",
        ];
    }

    if (enemyType === "skeleton") {
        return [
            basePalette.transparent,
            basePalette.outline,
            "#d9d9d1",
            "#f4f4ec",
            basePalette.wood,
        ];
    }

    if (enemyType === "bat") {
        return [
            basePalette.transparent,
            basePalette.outline,
            "#7a5ea8",
            "#a78bd6",
            "#d7c7f2",
        ];
    }

    return [
        basePalette.transparent,
        basePalette.outline,
        basePalette.enemyA,
        basePalette.enemyB,
        basePalette.accent,
    ];
}

function drawHumanoid(
    frame: PixelFrame,
    className: string,
    animation: SpritePackAnimation,
    frameIndex: number,
): void {
    const size = frame.size;
    const centerX = Math.floor(size / 2);
    const bobOffset =
        animation === "move"
            ? frameIndex % 2 === 0
                ? 0
                : 1
            : animation === "idle"
              ? frameIndex % 2
              : 0;

    const headSize = Math.max(2, Math.floor(size * 0.2));
    const torsoHeight = Math.max(3, Math.floor(size * 0.3));
    const legHeight = Math.max(2, Math.floor(size * 0.25));
    const headTop = Math.max(1, Math.floor(size * 0.12) + bobOffset);
    const torsoTop = headTop + headSize;
    const legTop = torsoTop + torsoHeight;

    fillRect(frame, centerX - Math.floor(headSize / 2), headTop, headSize, headSize, 2);
    drawOutlineRect(
        frame,
        centerX - Math.floor(headSize / 2),
        headTop,
        headSize,
        headSize,
        1,
    );

    fillRect(frame, centerX - 2, torsoTop, 4, torsoHeight, 3);
    fillRect(frame, centerX - 3, torsoTop + 1, 1, Math.max(2, torsoHeight - 1), 3);
    fillRect(frame, centerX + 2, torsoTop + 1, 1, Math.max(2, torsoHeight - 1), 3);

    if (className === "knight") {
        fillRect(frame, centerX - 2, torsoTop + 1, 4, 2, 4);
    }

    if (className === "wizard") {
        fillRect(frame, centerX - 2, Math.max(0, headTop - 2), 4, 2, 5);
        setPixel(frame, centerX, Math.max(0, headTop - 3), 5);
    }

    const leftLegShift =
        animation === "move" ? (frameIndex % 2 === 0 ? -1 : 0) : 0;
    const rightLegShift =
        animation === "move" ? (frameIndex % 2 === 0 ? 0 : 1) : 0;

    fillRect(frame, centerX - 2 + leftLegShift, legTop, 1, legHeight, 4);
    fillRect(frame, centerX + 1 + rightLegShift, legTop, 1, legHeight, 4);

    if (animation === "atk") {
        fillRect(frame, centerX + 3, torsoTop + 1, 2, 1, 5);
    }

    if (animation === "def") {
        fillRect(frame, centerX - 5, torsoTop + 1, 2, 3, 5);
    }

    if (animation === "hurt") {
        fillRect(frame, centerX - 2, torsoTop + 1, 4, 2, 5);
    }

    for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
            const color = frame.pixels[y * size + x];
            if (color !== 0) {
                if (x > 0 && frame.pixels[y * size + (x - 1)] === 0) {
                    setPixel(frame, x - 1, y, 1);
                }
                if (x < size - 1 && frame.pixels[y * size + (x + 1)] === 0) {
                    setPixel(frame, x + 1, y, 1);
                }
                if (y > 0 && frame.pixels[(y - 1) * size + x] === 0) {
                    setPixel(frame, x, y - 1, 1);
                }
                if (y < size - 1 && frame.pixels[(y + 1) * size + x] === 0) {
                    setPixel(frame, x, y + 1, 1);
                }
            }
        }
    }
}

function drawEnemy(
    frame: PixelFrame,
    enemyType: string,
    animation: SpritePackAnimation,
    frameIndex: number,
): void {
    const size = frame.size;
    const centerX = Math.floor(size / 2);
    const centerY = Math.floor(size / 2);

    if (enemyType === "slime") {
        const wobble = frameIndex % 2 === 0 ? 0 : 1;
        fillRect(
            frame,
            centerX - 3,
            centerY - 1,
            6,
            Math.max(2, Math.floor(size * 0.28)) + wobble,
            2,
        );
        fillRect(frame, centerX - 2, centerY - 2, 4, 1, 3);
        if (animation === "atk") {
            setPixel(frame, centerX + 4, centerY - 1, 4);
        }
    } else if (enemyType === "bat") {
        const wingOffset = animation === "move" ? (frameIndex % 2 === 0 ? -1 : 1) : 0;
        fillRect(frame, centerX - 1, centerY - 1, 2, 3, 2);
        fillRect(frame, centerX - 5, centerY - 1 + wingOffset, 3, 2, 3);
        fillRect(frame, centerX + 2, centerY - 1 - wingOffset, 3, 2, 3);
    } else {
        fillRect(frame, centerX - 2, centerY - 3, 4, 3, 2);
        fillRect(frame, centerX - 2, centerY, 4, 3, 3);
        fillRect(frame, centerX - 1, centerY + 3, 1, 2, 4);
        fillRect(frame, centerX + 1, centerY + 3, 1, 2, 4);
        if (enemyType === "skeleton") {
            setPixel(frame, centerX - 1, centerY - 2, 1);
            setPixel(frame, centerX + 1, centerY - 2, 1);
        }
        if (animation === "atk") {
            fillRect(frame, centerX + 3, centerY, 2, 1, 4);
        }
    }

    if (animation === "hurt") {
        fillRect(frame, centerX - 2, centerY, 4, 1, 4);
    }

    drawOutlineRect(frame, Math.max(0, centerX - 4), Math.max(0, centerY - 4), 8, 8, 1);
}

function drawWall(frame: PixelFrame): void {
    const size = frame.size;
    fillRect(frame, 0, 0, size, size, 2);
    for (let y = 1; y < size; y += 4) {
        fillRect(frame, 0, y, size, 1, 3);
    }
    for (let x = 0; x < size; x += 4) {
        fillRect(frame, x, Math.floor(size / 2), 1, Math.max(1, Math.floor(size / 2)), 3);
    }
    drawOutlineRect(frame, 0, 0, size, size, 1);
}

function drawDecoration(frame: PixelFrame): void {
    const size = frame.size;
    const centerX = Math.floor(size / 2);
    fillRect(frame, centerX - 1, 1, 2, Math.max(2, Math.floor(size * 0.5)), 2);
    fillRect(frame, centerX - 3, Math.floor(size * 0.45), 6, 2, 3);
    fillRect(frame, centerX - 2, Math.floor(size * 0.65), 4, 2, 4);
    drawOutlineRect(frame, centerX - 3, 1, 6, Math.max(4, Math.floor(size * 0.75)), 1);
}

function drawInteractable(frame: PixelFrame, frameIndex: number): void {
    const size = frame.size;
    const chestTop = Math.floor(size * 0.45);
    fillRect(frame, 2, chestTop, Math.max(4, size - 4), Math.max(3, Math.floor(size * 0.35)), 2);
    fillRect(frame, 2, chestTop - 2, Math.max(4, size - 4), 2, frameIndex === 0 ? 3 : 4);
    setPixel(frame, Math.floor(size / 2), chestTop + 1, 5);
    drawOutlineRect(frame, 1, chestTop - 2, Math.max(6, size - 2), Math.max(5, Math.floor(size * 0.4)), 1);
}

function buildCharacterFrames(
    records: GeneratedFrameRecord[],
    className: string,
    pixelSize: SpritePackPixelSize,
    basePalette: SpritePackBasePalette,
): void {
    const palette = createCharacterPalette(className, basePalette);
    const assetId = `character/${className}`;

    (Object.keys(ASSET_ANIMATION_FRAMES) as SpritePackAnimation[]).forEach((animation) => {
        const frameCount = ASSET_ANIMATION_FRAMES[animation];
        for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
            const frame = createFrame(pixelSize, palette);
            drawHumanoid(frame, className, animation, frameIndex);
            records.push({
                assetId,
                category: "character",
                animation,
                frameIndex,
                fps: ASSET_ANIMATION_FPS[animation],
                loop: ASSET_ANIMATION_LOOP[animation],
                frame,
            });
        }
    });
}

function buildEnemyFrames(
    records: GeneratedFrameRecord[],
    enemyType: string,
    pixelSize: SpritePackPixelSize,
    basePalette: SpritePackBasePalette,
): void {
    const palette = createEnemyPalette(enemyType, basePalette);
    const assetId = `enemy/${enemyType}`;

    (Object.keys(ASSET_ANIMATION_FRAMES) as SpritePackAnimation[]).forEach((animation) => {
        const frameCount = ASSET_ANIMATION_FRAMES[animation];
        for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
            const frame = createFrame(pixelSize, palette);
            drawEnemy(frame, enemyType, animation, frameIndex);
            records.push({
                assetId,
                category: "enemy",
                animation,
                frameIndex,
                fps: ASSET_ANIMATION_FPS[animation],
                loop: ASSET_ANIMATION_LOOP[animation],
                frame,
            });
        }
    });
}

function buildEnvironmentFrames(
    records: GeneratedFrameRecord[],
    pixelSize: SpritePackPixelSize,
    basePalette: SpritePackBasePalette,
): void {
    const wallFrame = createFrame(pixelSize, [
        basePalette.transparent,
        basePalette.outline,
        basePalette.wall,
        basePalette.metal,
    ]);
    drawWall(wallFrame);
    records.push({
        assetId: "wall/stone",
        category: "wall",
        animation: "idle",
        frameIndex: 0,
        fps: 1,
        loop: "loop",
        frame: wallFrame,
    });

    const decoFrame = createFrame(pixelSize, [
        basePalette.transparent,
        basePalette.outline,
        basePalette.deco,
        basePalette.clothB,
        basePalette.wood,
    ]);
    drawDecoration(decoFrame);
    records.push({
        assetId: "decoration/statue",
        category: "decoration",
        animation: "idle",
        frameIndex: 0,
        fps: 1,
        loop: "loop",
        frame: decoFrame,
    });

    for (let frameIndex = 0; frameIndex < 2; frameIndex += 1) {
        const interactableFrame = createFrame(pixelSize, [
            basePalette.transparent,
            basePalette.outline,
            basePalette.wood,
            basePalette.accent,
            basePalette.metal,
            basePalette.skin,
        ]);
        drawInteractable(interactableFrame, frameIndex);
        records.push({
            assetId: "interactable/chest",
            category: "interactable",
            animation: "idle",
            frameIndex,
            fps: 2,
            loop: "once",
            frame: interactableFrame,
        });
    }
}

export function generateSpritePack(
    options: SpritePackGenerateOptions,
): GeneratedSpritePack {
    const palettePreset = options.palettePreset ?? "default";
    const resolvedPalette = resolveBasePalette(
        palettePreset,
        options.paletteOverrides,
    );

    const rng = createRng(
        `${options.seed}:${options.genre}:${options.pixelSize}:${palettePreset}:${JSON.stringify(options.paletteOverrides ?? {})}`,
    );
    const records: GeneratedFrameRecord[] = [];

    const classPool = shuffleWithRng(rng, CHARACTER_CLASSES);
    const enemyPool = shuffleWithRng(rng, ENEMY_TYPES);

    const classCount = options.genre === "rpg" ? 4 : 3;
    const enemyCount = options.genre === "dungeon" ? 4 : 3;

    for (let index = 0; index < classCount; index += 1) {
        const className = classPool[index % classPool.length] ?? pickOne(rng, CHARACTER_CLASSES);
        buildCharacterFrames(records, className, options.pixelSize, resolvedPalette);
    }

    for (let index = 0; index < enemyCount; index += 1) {
        const enemyType = enemyPool[index % enemyPool.length] ?? pickOne(rng, ENEMY_TYPES);
        buildEnemyFrames(records, enemyType, options.pixelSize, resolvedPalette);
    }

    buildEnvironmentFrames(records, options.pixelSize, resolvedPalette);

    const widthTiles = Math.max(8, Math.min(24, Math.ceil(Math.sqrt(records.length))));
    const heightTiles = Math.max(1, Math.ceil(records.length / widthTiles));

    const frames = records.map((record, index) => ({
        tileX: index % widthTiles,
        tileY: Math.floor(index / widthTiles),
        frame: record.frame,
    }));

    const clipMap = new Map<string, SpritePackClipMetadata>();
    const assetMap = new Map<string, SpritePackAssetMetadata>();

    records.forEach((record, index) => {
        const tile: SpriteTileFrame = [index % widthTiles, Math.floor(index / widthTiles)];
        const clipId = `${record.assetId}:${record.animation}`;

        const existingClip = clipMap.get(clipId);
        if (existingClip) {
            existingClip.frames.push(tile);
        } else {
            clipMap.set(clipId, {
                name: clipId,
                animation: record.animation,
                fps: record.fps,
                loop: record.loop,
                frames: [tile],
            });
        }

        const existingAsset = assetMap.get(record.assetId);
        if (!existingAsset) {
            assetMap.set(record.assetId, {
                assetId: record.assetId,
                category: record.category,
                clips: [],
            });
        }
    });

    const clips = [...clipMap.values()].sort((left, right) =>
        left.name.localeCompare(right.name),
    );

    clips.forEach((clip) => {
        const assetId = clip.name.split(":")[0] ?? clip.name;
        const asset = assetMap.get(assetId);
        if (asset) {
            asset.clips.push(clip);
        }
    });

    const fileName = `sprite-pack-${options.genre}-${options.pixelSize}px-${options.seed || "seed"}.png`;

    const metadata: SpritePackMetadata = {
        version: SPRITE_PACK_VERSION,
        seed: options.seed,
        genre: options.genre,
        pixelSize: options.pixelSize,
        palette: {
            preset: palettePreset,
            resolved: resolvedPalette,
        },
        sheet: {
            widthTiles,
            heightTiles,
            widthPx: widthTiles * options.pixelSize,
            heightPx: heightTiles * options.pixelSize,
            fileName,
        },
        assets: [...assetMap.values()].sort((left, right) =>
            left.assetId.localeCompare(right.assetId),
        ),
        spriteAtlasDefinition: {
            spriteSheet: fileName,
            tileWidth: widthTiles,
            tileHeight: heightTiles,
            defaultFps: 8,
            defaultLoop: "loop",
            clips: clips.map((clip) => ({
                name: clip.name,
                fps: clip.fps,
                loop: clip.loop,
                frames: clip.frames,
            })),
        },
    };

    return {
        metadata,
        frames,
    };
}

export function renderSpritePackToCanvas(
    pack: GeneratedSpritePack,
    canvas: HTMLCanvasElement,
): void {
    const { metadata } = pack;
    canvas.width = metadata.sheet.widthPx;
    canvas.height = metadata.sheet.heightPx;

    const context = canvas.getContext("2d");
    if (!context) {
        throw new Error("Could not acquire canvas context for sprite pack render.");
    }

    context.clearRect(0, 0, canvas.width, canvas.height);

    pack.frames.forEach((entry) => {
        const originX = entry.tileX * metadata.pixelSize;
        const originY = entry.tileY * metadata.pixelSize;

        for (let y = 0; y < metadata.pixelSize; y += 1) {
            for (let x = 0; x < metadata.pixelSize; x += 1) {
                const index = y * metadata.pixelSize + x;
                const colorIndex = entry.frame.pixels[index] ?? 0;
                const color =
                    entry.frame.palette[colorIndex] ??
                    metadata.palette.resolved.transparent;
                if (color === metadata.palette.resolved.transparent) {
                    continue;
                }

                context.fillStyle = color;
                context.fillRect(originX + x, originY + y, 1, 1);
            }
        }
    });
}

export function serializeSpritePackMetadata(pack: GeneratedSpritePack): string {
    return JSON.stringify(pack.metadata, null, 2);
}
