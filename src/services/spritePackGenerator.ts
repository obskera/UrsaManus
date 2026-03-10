import type {
    SpriteAtlasDefinition,
    SpriteClipLoopMode,
    SpriteTileFrame,
} from "@/logic/entity/spriteAnimationAtlas";

export const SPRITE_PACK_VERSION = "um-sprite-pack-v1" as const;

export type SpritePackPixelSize = 8 | 16 | 32 | 64;

export type SpritePackGenre = "top-down" | "dungeon" | "sidescroller" | "rpg";

export type SpritePackAnimation = "idle" | "move" | "atk" | "def" | "hurt";

export type SpritePackPalettePreset =
    | "default"
    | "classic-nes"
    | "snes-fantasy"
    | "gameboy";

export type SpritePackAssetCategory =
    | "character"
    | "enemy"
    | "floor"
    | "wall"
    | "trap"
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

type SpritePackClassName =
    | "wizard"
    | "knight"
    | "rogue"
    | "cleric"
    | "ranger"
    | "warlock";

type SpritePackEnemyName =
    | "slime"
    | "goblin"
    | "skeleton"
    | "bat"
    | "wisp"
    | "beetle";

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

type CharacterShapeTrait = {
    headScale: number;
    torsoWidth: number;
    shoulderWidth: number;
    robeLength: number;
    legSeparation: number;
    hasCape: boolean;
    hasHelm: boolean;
    hatHeight: number;
    colorShift: number;
};

type EnemyShapeTrait = {
    bodyWidth: number;
    bodyHeight: number;
    hornLength: number;
    wingSpan: number;
    eyeGlow: boolean;
    colorShift: number;
};

type ThemeProfile = {
    classPool: readonly SpritePackClassName[];
    enemyPool: readonly SpritePackEnemyName[];
    classVariantsPerClass: number;
    enemyVariantsPerType: number;
    wallVariants: number;
    floorVariants: number;
    trapVariants: number;
    decorationVariants: number;
    interactableVariants: number;
    themeColorShift: number;
};

type WallTileRole =
    | "top"
    | "bottom"
    | "left"
    | "right"
    | "door-top"
    | "door-bottom"
    | "door-left"
    | "door-right"
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | "solid";

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

const THEME_BY_GENRE: Record<SpritePackGenre, ThemeProfile> = {
    rpg: {
        classPool: ["wizard", "knight", "rogue", "cleric", "ranger"],
        enemyPool: ["slime", "goblin", "skeleton", "bat", "wisp"],
        classVariantsPerClass: 2,
        enemyVariantsPerType: 2,
        wallVariants: 10,
        floorVariants: 12,
        trapVariants: 8,
        decorationVariants: 10,
        interactableVariants: 8,
        themeColorShift: 6,
    },
    dungeon: {
        classPool: ["knight", "rogue", "cleric", "warlock"],
        enemyPool: ["skeleton", "goblin", "bat", "wisp", "beetle"],
        classVariantsPerClass: 2,
        enemyVariantsPerType: 3,
        wallVariants: 14,
        floorVariants: 16,
        trapVariants: 14,
        decorationVariants: 10,
        interactableVariants: 9,
        themeColorShift: -4,
    },
    "top-down": {
        classPool: ["ranger", "rogue", "knight", "wizard"],
        enemyPool: ["slime", "goblin", "beetle", "wisp"],
        classVariantsPerClass: 2,
        enemyVariantsPerType: 2,
        wallVariants: 8,
        floorVariants: 10,
        trapVariants: 6,
        decorationVariants: 9,
        interactableVariants: 7,
        themeColorShift: 2,
    },
    sidescroller: {
        classPool: ["knight", "ranger", "rogue", "warlock"],
        enemyPool: ["slime", "bat", "beetle", "goblin"],
        classVariantsPerClass: 2,
        enemyVariantsPerType: 2,
        wallVariants: 12,
        floorVariants: 10,
        trapVariants: 9,
        decorationVariants: 8,
        interactableVariants: 8,
        themeColorShift: 10,
    },
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

function randomInt(rng: () => number, min: number, max: number): number {
    return Math.floor(rng() * (max - min + 1)) + min;
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

function clampColor(value: number): number {
    return Math.max(0, Math.min(255, Math.round(value)));
}

function parseHexColor(
    hex: string,
): { r: number; g: number; b: number } | null {
    const normalized = hex.trim().toLowerCase();
    const match = /^#([0-9a-f]{6})$/i.exec(normalized);
    if (!match) {
        return null;
    }

    const value = match[1] ?? "000000";
    return {
        r: Number.parseInt(value.slice(0, 2), 16),
        g: Number.parseInt(value.slice(2, 4), 16),
        b: Number.parseInt(value.slice(4, 6), 16),
    };
}

function rgbToHex(r: number, g: number, b: number): string {
    return `#${clampColor(r).toString(16).padStart(2, "0")}${clampColor(g)
        .toString(16)
        .padStart(2, "0")}${clampColor(b).toString(16).padStart(2, "0")}`;
}

function adjustHexColor(hex: string, delta: number): string {
    const rgb = parseHexColor(hex);
    if (!rgb) {
        return hex;
    }

    return rgbToHex(rgb.r + delta, rgb.g + delta, rgb.b + delta);
}

function createFrame(size: number, palette: string[]): PixelFrame {
    return {
        size,
        palette,
        pixels: new Uint8Array(size * size),
    };
}

function setPixel(
    frame: PixelFrame,
    x: number,
    y: number,
    colorIndex: number,
): void {
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

function addAutoOutline(frame: PixelFrame): void {
    const size = frame.size;
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

function createCharacterPalette(
    className: SpritePackClassName,
    basePalette: SpritePackBasePalette,
    shape: CharacterShapeTrait,
    themeColorShift: number,
): string[] {
    const shift = shape.colorShift + themeColorShift;
    const tunedClothA = adjustHexColor(basePalette.clothA, shift);
    const tunedClothB = adjustHexColor(basePalette.clothB, shift * 0.7);
    const tunedAccent = adjustHexColor(basePalette.accent, shift * 0.9);

    if (className === "wizard") {
        return [
            basePalette.transparent,
            basePalette.outline,
            basePalette.skin,
            adjustHexColor("#3f51b5", shift),
            adjustHexColor("#8ea6ff", shift * 0.6),
            tunedAccent,
        ];
    }

    if (className === "knight") {
        return [
            basePalette.transparent,
            basePalette.outline,
            basePalette.skin,
            adjustHexColor("#8b95a5", shift * 0.4),
            adjustHexColor("#c4cad6", shift * 0.35),
            tunedAccent,
        ];
    }

    if (className === "rogue") {
        return [
            basePalette.transparent,
            basePalette.outline,
            basePalette.skin,
            adjustHexColor("#3f4f4f", shift),
            adjustHexColor("#5f7d6f", shift * 0.7),
            tunedAccent,
        ];
    }

    if (className === "cleric") {
        return [
            basePalette.transparent,
            basePalette.outline,
            basePalette.skin,
            adjustHexColor("#d7d7d2", shift * 0.3),
            adjustHexColor("#b8b8ae", shift * 0.25),
            tunedAccent,
        ];
    }

    if (className === "ranger") {
        return [
            basePalette.transparent,
            basePalette.outline,
            basePalette.skin,
            adjustHexColor("#557a46", shift),
            adjustHexColor("#8fa864", shift * 0.8),
            tunedAccent,
        ];
    }

    if (className === "warlock") {
        return [
            basePalette.transparent,
            basePalette.outline,
            basePalette.skin,
            adjustHexColor("#5d3b84", shift),
            adjustHexColor("#8b68ba", shift * 0.8),
            tunedAccent,
        ];
    }

    return [
        basePalette.transparent,
        basePalette.outline,
        basePalette.skin,
        tunedClothA,
        tunedClothB,
        tunedAccent,
    ];
}

function createEnemyPalette(
    enemyType: SpritePackEnemyName,
    basePalette: SpritePackBasePalette,
    shape: EnemyShapeTrait,
    themeColorShift: number,
): string[] {
    const shift = shape.colorShift + themeColorShift;
    if (enemyType === "slime") {
        return [
            basePalette.transparent,
            basePalette.outline,
            adjustHexColor("#5fbf6f", shift),
            adjustHexColor("#8be29a", shift * 0.9),
            adjustHexColor("#d1ffe0", shift * 0.4),
        ];
    }

    if (enemyType === "skeleton") {
        return [
            basePalette.transparent,
            basePalette.outline,
            adjustHexColor("#d9d9d1", shift * 0.4),
            adjustHexColor("#f4f4ec", shift * 0.25),
            basePalette.wood,
        ];
    }

    if (enemyType === "bat") {
        return [
            basePalette.transparent,
            basePalette.outline,
            adjustHexColor("#7a5ea8", shift),
            adjustHexColor("#a78bd6", shift * 0.7),
            adjustHexColor("#d7c7f2", shift * 0.3),
        ];
    }

    if (enemyType === "wisp") {
        return [
            basePalette.transparent,
            basePalette.outline,
            adjustHexColor("#7ad6ff", shift),
            adjustHexColor("#b7f0ff", shift * 0.5),
            adjustHexColor(basePalette.accent, shift),
        ];
    }

    if (enemyType === "beetle") {
        return [
            basePalette.transparent,
            basePalette.outline,
            adjustHexColor("#3a5f2f", shift),
            adjustHexColor("#6d8f53", shift * 0.6),
            adjustHexColor(basePalette.metal, shift * 0.35),
        ];
    }

    return [
        basePalette.transparent,
        basePalette.outline,
        adjustHexColor(basePalette.enemyA, shift),
        adjustHexColor(basePalette.enemyB, shift * 0.8),
        adjustHexColor(basePalette.accent, shift * 0.5),
    ];
}

function createCharacterShapeTrait(rng: () => number): CharacterShapeTrait {
    return {
        headScale: randomInt(rng, -1, 2),
        torsoWidth: randomInt(rng, 3, 5),
        shoulderWidth: randomInt(rng, 1, 3),
        robeLength: randomInt(rng, 0, 3),
        legSeparation: randomInt(rng, 1, 3),
        hasCape: rng() > 0.45,
        hasHelm: rng() > 0.5,
        hatHeight: randomInt(rng, 1, 3),
        colorShift: randomInt(rng, -20, 20),
    };
}

function createEnemyShapeTrait(rng: () => number): EnemyShapeTrait {
    return {
        bodyWidth: randomInt(rng, 4, 8),
        bodyHeight: randomInt(rng, 3, 7),
        hornLength: randomInt(rng, 0, 3),
        wingSpan: randomInt(rng, 2, 5),
        eyeGlow: rng() > 0.45,
        colorShift: randomInt(rng, -20, 20),
    };
}

function drawHumanoid(
    frame: PixelFrame,
    className: SpritePackClassName,
    animation: SpritePackAnimation,
    frameIndex: number,
    shape: CharacterShapeTrait,
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

    const headSize = Math.max(2, Math.floor(size * 0.2) + shape.headScale);
    const torsoHeight = Math.max(3, Math.floor(size * 0.25) + shape.robeLength);
    const torsoWidth = shape.torsoWidth;
    const legHeight = Math.max(2, Math.floor(size * 0.25));
    const headTop = Math.max(1, Math.floor(size * 0.12) + bobOffset);
    const torsoTop = headTop + headSize;
    const legTop = torsoTop + torsoHeight;

    fillRect(
        frame,
        centerX - Math.floor(headSize / 2),
        headTop,
        headSize,
        headSize,
        2,
    );

    fillRect(
        frame,
        centerX - Math.floor(torsoWidth / 2),
        torsoTop,
        torsoWidth,
        torsoHeight,
        3,
    );

    fillRect(
        frame,
        centerX - Math.floor(torsoWidth / 2) - shape.shoulderWidth,
        torsoTop + 1,
        shape.shoulderWidth,
        Math.max(2, torsoHeight - 1),
        3,
    );

    fillRect(
        frame,
        centerX + Math.floor(torsoWidth / 2),
        torsoTop + 1,
        shape.shoulderWidth,
        Math.max(2, torsoHeight - 1),
        3,
    );

    if (className === "knight") {
        fillRect(frame, centerX - 2, torsoTop + 1, 4, 2, 4);
    }

    if (className === "wizard") {
        fillRect(
            frame,
            centerX - 2,
            Math.max(0, headTop - shape.hatHeight),
            4,
            2,
            5,
        );
        setPixel(frame, centerX, Math.max(0, headTop - shape.hatHeight - 1), 5);
    }

    if ((className === "rogue" || className === "warlock") && shape.hasCape) {
        fillRect(frame, centerX - 3, torsoTop + 1, 1, torsoHeight + 1, 4);
        fillRect(frame, centerX + 2, torsoTop + 1, 1, torsoHeight + 1, 4);
    }

    if (className === "knight" && shape.hasHelm) {
        fillRect(frame, centerX - 2, headTop, 4, 1, 4);
    }

    const leftLegShift =
        animation === "move" ? (frameIndex % 2 === 0 ? -1 : 0) : 0;
    const rightLegShift =
        animation === "move" ? (frameIndex % 2 === 0 ? 0 : 1) : 0;

    fillRect(
        frame,
        centerX - shape.legSeparation + leftLegShift,
        legTop,
        1,
        legHeight,
        4,
    );

    fillRect(
        frame,
        centerX + shape.legSeparation - 1 + rightLegShift,
        legTop,
        1,
        legHeight,
        4,
    );

    if (animation === "atk") {
        fillRect(frame, centerX + 3, torsoTop + 1, 2, 1, 5);
    }

    if (animation === "def") {
        fillRect(frame, centerX - 5, torsoTop + 1, 2, 3, 5);
    }

    if (animation === "hurt") {
        fillRect(frame, centerX - 2, torsoTop + 1, 4, 2, 5);
    }

    addAutoOutline(frame);
}

function drawEnemy(
    frame: PixelFrame,
    enemyType: SpritePackEnemyName,
    animation: SpritePackAnimation,
    frameIndex: number,
    shape: EnemyShapeTrait,
): void {
    const size = frame.size;
    const centerX = Math.floor(size / 2);
    const centerY = Math.floor(size / 2);

    if (enemyType === "slime") {
        const wobble = frameIndex % 2 === 0 ? 0 : 1;
        fillRect(
            frame,
            centerX - Math.floor(shape.bodyWidth / 2),
            centerY - 1,
            shape.bodyWidth,
            Math.max(2, Math.floor(size * 0.22)) +
                shape.bodyHeight -
                2 +
                wobble,
            2,
        );
        fillRect(frame, centerX - 2, centerY - 2, 4, 1, 3);
        if (animation === "atk") {
            setPixel(
                frame,
                centerX + Math.floor(shape.bodyWidth / 2) + 1,
                centerY - 1,
                4,
            );
        }
    } else if (enemyType === "bat") {
        const wingOffset =
            animation === "move" ? (frameIndex % 2 === 0 ? -1 : 1) : 0;
        fillRect(frame, centerX - 1, centerY - 1, 2, 3, 2);
        fillRect(
            frame,
            centerX - shape.wingSpan,
            centerY - 1 + wingOffset,
            3,
            2,
            3,
        );
        fillRect(
            frame,
            centerX + shape.wingSpan - 2,
            centerY - 1 - wingOffset,
            3,
            2,
            3,
        );
    } else if (enemyType === "wisp") {
        fillRect(frame, centerX - 2, centerY - 2, 4, 4, 2);
        setPixel(frame, centerX, centerY - 3, 3);
        setPixel(frame, centerX - 2, centerY + 2, 3);
        setPixel(frame, centerX + 2, centerY + 2, 3);
    } else if (enemyType === "beetle") {
        fillRect(frame, centerX - 3, centerY - 2, 6, 4, 2);
        fillRect(frame, centerX - 1, centerY - 3, 2, 1, 3);
        fillRect(frame, centerX - 4, centerY - 1, 1, 2, 3);
        fillRect(frame, centerX + 3, centerY - 1, 1, 2, 3);
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

    if (shape.hornLength > 0 && enemyType !== "wisp") {
        fillRect(frame, centerX - 1, centerY - 4, 1, shape.hornLength, 4);
        fillRect(frame, centerX + 1, centerY - 4, 1, shape.hornLength, 4);
    }

    if (shape.eyeGlow) {
        setPixel(frame, centerX - 1, centerY - 1, 4);
        setPixel(frame, centerX + 1, centerY - 1, 4);
    }

    addAutoOutline(frame);
}

function drawWall(
    frame: PixelFrame,
    role: WallTileRole,
    variant: number,
): void {
    const size = frame.size;

    if (role === "solid") {
        for (let y = 0; y < size; y += 1) {
            for (let x = 0; x < size; x += 1) {
                if ((x + y + variant) % 3 !== 0) {
                    setPixel(frame, x, y, 2);
                }
            }
        }
        for (let y = 1; y < size; y += 3) {
            const offset = (y + variant) % 4;
            fillRect(frame, offset, y, Math.max(1, size - offset), 1, 3);
        }
        if (variant % 2 === 0) {
            for (let x = 1; x < size - 1; x += 4) {
                setPixel(frame, x, Math.floor(size * 0.55), 4);
            }
        }
        drawOutlineRect(frame, 0, 0, size, size, 1);
        return;
    }

    const band = Math.max(2, Math.floor(size * 0.35));
    const isDoorTop = role === "door-top";
    const isDoorBottom = role === "door-bottom";
    const isDoorLeft = role === "door-left";
    const isDoorRight = role === "door-right";
    const hasTop =
        role === "top" ||
        role === "top-left" ||
        role === "top-right" ||
        isDoorTop;
    const hasBottom =
        role === "bottom" ||
        role === "bottom-left" ||
        role === "bottom-right" ||
        isDoorBottom;
    const hasLeft =
        role === "left" ||
        role === "top-left" ||
        role === "bottom-left" ||
        isDoorLeft;
    const hasRight =
        role === "right" ||
        role === "top-right" ||
        role === "bottom-right" ||
        isDoorRight;

    if (hasTop) {
        fillRect(frame, 0, 0, size, band, 2);
        fillRect(frame, 0, band, size, 1, 1);
        for (let x = variant % 2; x < size; x += 3) {
            setPixel(frame, x, Math.max(0, band - 2), 3);
        }
    }

    if (hasBottom) {
        fillRect(frame, 0, size - band, size, band, 2);
        fillRect(frame, 0, size - band, size, 1, 1);
        for (let x = 1 + (variant % 2); x < size; x += 3) {
            setPixel(frame, x, Math.min(size - 1, size - band + 1), 3);
        }
    }

    if (hasLeft) {
        fillRect(frame, 0, 0, band, size, 2);
        fillRect(frame, band, 0, 1, size, 1);
        for (let y = 1 + (variant % 2); y < size; y += 3) {
            setPixel(frame, Math.max(0, band - 2), y, 3);
        }
    }

    if (hasRight) {
        fillRect(frame, size - band, 0, band, size, 2);
        fillRect(frame, size - band, 0, 1, size, 1);
        for (let y = variant % 2; y < size; y += 3) {
            setPixel(frame, Math.min(size - 1, size - band + 1), y, 3);
        }
    }

    const doorSpan = Math.max(2, Math.floor(size * 0.35));
    const doorStart = Math.floor((size - doorSpan) / 2);
    if (isDoorTop) {
        fillRect(frame, doorStart, 0, doorSpan, band, 3);
        drawOutlineRect(frame, doorStart, 0, doorSpan, Math.max(2, band), 1);
    }

    if (isDoorBottom) {
        fillRect(frame, doorStart, size - band, doorSpan, band, 3);
        drawOutlineRect(
            frame,
            doorStart,
            Math.max(0, size - band),
            doorSpan,
            Math.max(2, band),
            1,
        );
    }

    if (isDoorLeft) {
        fillRect(frame, 0, doorStart, band, doorSpan, 3);
        drawOutlineRect(frame, 0, doorStart, Math.max(2, band), doorSpan, 1);
    }

    if (isDoorRight) {
        fillRect(frame, size - band, doorStart, band, doorSpan, 3);
        drawOutlineRect(
            frame,
            Math.max(0, size - band),
            doorStart,
            Math.max(2, band),
            doorSpan,
            1,
        );
    }
}

function drawFloor(frame: PixelFrame, variant: number): void {
    const size = frame.size;

    const style = variant % 5;
    const inset = size >= 8 ? 1 : 0;
    const span = Math.max(1, size - inset * 2);
    fillRect(frame, inset, inset, span, span, 2);

    const detailCount = Math.max(2, Math.floor(size / 6));
    if (style === 0) {
        for (let index = 0; index < detailCount; index += 1) {
            const x = inset + ((index * 4 + variant) % span);
            const y = inset + ((index * 6 + variant) % span);
            setPixel(frame, x, y, 3);
        }
        return;
    }

    if (style === 1) {
        for (let index = 0; index < detailCount; index += 1) {
            const y = inset + ((index * 3 + variant) % span);
            const x = inset + ((variant + index) % 2 === 0 ? 1 : span - 2);
            setPixel(
                frame,
                Math.max(inset, Math.min(inset + span - 1, x)),
                y,
                3,
            );
        }
        return;
    }

    if (style === 2) {
        for (let index = 0; index < detailCount; index += 1) {
            const x = inset + ((index * 3 + variant) % span);
            const y = inset + ((variant + index * 2) % span);
            if ((x + y) % 3 === 0) {
                setPixel(frame, x, y, 3);
            }
        }
        return;
    }

    if (style === 3) {
        for (let index = 0; index < detailCount; index += 1) {
            const x = inset + ((index * 5 + variant) % span);
            const y = inset + span - 1 - ((index * 4 + variant) % span);
            setPixel(frame, x, y, 3);
        }
        return;
    }

    for (let index = 0; index < detailCount; index += 1) {
        const x = inset + ((index * 2 + variant) % span);
        const y = inset + ((index * 2 + variant * 2) % span);
        if (index % 2 === 0) {
            setPixel(frame, x, y, 3);
        }
    }
}

function drawTrap(
    frame: PixelFrame,
    variant: number,
    frameIndex: number,
): void {
    const size = frame.size;
    for (let x = 0; x < size; x += 2) {
        setPixel(frame, x, size - 1, 2);
    }

    if (variant % 3 === 0) {
        const spikeHeight =
            frameIndex % 2 === 0
                ? Math.floor(size * 0.35)
                : Math.floor(size * 0.5);
        for (let x = 1; x < size - 1; x += 3) {
            fillRect(frame, x, size - 1 - spikeHeight, 1, spikeHeight, 4);
        }
    } else if (variant % 3 === 1) {
        const pulse = frameIndex % 2 === 0 ? 3 : 4;
        fillRect(
            frame,
            Math.floor(size * 0.25),
            Math.floor(size * 0.25),
            Math.floor(size * 0.5),
            Math.floor(size * 0.5),
            pulse,
        );
    } else {
        const barY =
            frameIndex % 2 === 0
                ? Math.floor(size * 0.35)
                : Math.floor(size * 0.55);
        fillRect(frame, 1, barY, size - 2, 2, 4);
    }

    drawOutlineRect(frame, 0, 0, size, size, 1);
}

function drawDecoration(frame: PixelFrame, variant: number): void {
    const size = frame.size;
    const centerX = Math.floor(size / 2);
    if (variant % 3 === 0) {
        fillRect(
            frame,
            centerX - 1,
            1,
            2,
            Math.max(2, Math.floor(size * 0.5)),
            2,
        );
        fillRect(frame, centerX - 3, Math.floor(size * 0.45), 6, 2, 3);
        fillRect(frame, centerX - 2, Math.floor(size * 0.65), 4, 2, 4);
    } else if (variant % 3 === 1) {
        fillRect(
            frame,
            Math.max(1, centerX - 2),
            1,
            4,
            Math.max(2, Math.floor(size * 0.7)),
            2,
        );
        fillRect(frame, centerX - 3, Math.floor(size * 0.25), 6, 2, 3);
    } else {
        fillRect(frame, centerX - 2, Math.floor(size * 0.5), 4, 4, 3);
        fillRect(frame, centerX - 1, Math.floor(size * 0.2), 2, 4, 2);
        setPixel(frame, centerX, Math.floor(size * 0.15), 4);
    }

    drawOutlineRect(
        frame,
        1,
        1,
        Math.max(4, size - 2),
        Math.max(4, size - 2),
        1,
    );
}

function drawTorch(
    frame: PixelFrame,
    frameIndex: number,
    variant: number,
): void {
    const size = frame.size;
    const centerX = Math.floor(size / 2);
    const poleTop = Math.max(1, Math.floor(size * 0.3));

    const floorInset = size >= 8 ? 1 : 0;
    const floorSpan = Math.max(1, size - floorInset * 2);
    fillRect(frame, floorInset, floorInset, floorSpan, floorSpan, 2);
    for (let index = 0; index < Math.max(2, Math.floor(size / 6)); index += 1) {
        const x = floorInset + ((index * 3 + variant) % floorSpan);
        const y = floorInset + ((index * 5 + variant) % floorSpan);
        setPixel(frame, x, y, 3);
    }

    fillRect(
        frame,
        centerX - 1,
        poleTop,
        2,
        Math.max(3, size - poleTop - 2),
        4,
    );
    fillRect(frame, centerX - 2, poleTop - 1, 4, 1, 3);

    const flameWidth = frameIndex % 2 === 0 ? 3 : 4;
    const flameColor = frameIndex % 2 === 0 ? 3 : 5;
    const flameOffset = variant % 2 === 0 ? 0 : -1;
    fillRect(
        frame,
        centerX - Math.floor(flameWidth / 2),
        Math.max(0, poleTop - 3 + flameOffset),
        flameWidth,
        2,
        flameColor,
    );
    setPixel(frame, centerX, Math.max(0, poleTop - 4 + flameOffset), 5);

    addAutoOutline(frame);
}

function drawInteractable(
    frame: PixelFrame,
    variant: number,
    frameIndex: number,
): void {
    const size = frame.size;
    const style = variant % 4;

    if (style === 0) {
        const chestTop = Math.floor(size * 0.45);
        fillRect(
            frame,
            2,
            chestTop,
            Math.max(4, size - 4),
            Math.max(3, Math.floor(size * 0.35)),
            2,
        );
        fillRect(
            frame,
            2,
            chestTop - 2,
            Math.max(4, size - 4),
            2,
            frameIndex === 0 ? 3 : 4,
        );
        setPixel(frame, Math.floor(size / 2), chestTop + 1, 5);
    } else if (style === 1) {
        fillRect(
            frame,
            Math.floor(size * 0.35),
            1,
            Math.floor(size * 0.3),
            Math.floor(size * 0.7),
            2,
        );
        fillRect(
            frame,
            Math.floor(size * 0.25),
            Math.floor(size * 0.35),
            Math.floor(size * 0.5),
            2,
            frameIndex === 0 ? 3 : 4,
        );
    } else if (style === 2) {
        fillRect(
            frame,
            Math.floor(size * 0.2),
            Math.floor(size * 0.6),
            Math.floor(size * 0.6),
            Math.floor(size * 0.3),
            2,
        );
        fillRect(
            frame,
            Math.floor(size * 0.3),
            Math.floor(size * 0.45),
            Math.floor(size * 0.4),
            2,
            frameIndex === 0 ? 3 : 4,
        );
    } else {
        fillRect(
            frame,
            Math.floor(size * 0.4),
            Math.floor(size * 0.2),
            2,
            Math.floor(size * 0.6),
            2,
        );
        fillRect(
            frame,
            Math.floor(size * 0.25),
            Math.floor(size * 0.65),
            Math.floor(size * 0.5),
            2,
            3,
        );
        if (frameIndex % 2 === 1) {
            setPixel(frame, Math.floor(size * 0.5), Math.floor(size * 0.12), 4);
        }
    }

    drawOutlineRect(
        frame,
        1,
        1,
        Math.max(6, size - 2),
        Math.max(5, Math.floor(size * 0.4)),
        1,
    );
}

function buildCharacterFrames(
    records: GeneratedFrameRecord[],
    className: SpritePackClassName,
    pixelSize: SpritePackPixelSize,
    variantIndex: number,
    shape: CharacterShapeTrait,
    basePalette: SpritePackBasePalette,
    themeColorShift: number,
): void {
    const palette = createCharacterPalette(
        className,
        basePalette,
        shape,
        themeColorShift,
    );
    const assetId = `character/${className}-v${variantIndex + 1}`;

    (Object.keys(ASSET_ANIMATION_FRAMES) as SpritePackAnimation[]).forEach(
        (animation) => {
            const frameCount = ASSET_ANIMATION_FRAMES[animation];
            for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
                const frame = createFrame(pixelSize, palette);
                drawHumanoid(frame, className, animation, frameIndex, shape);
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
        },
    );
}

function buildEnemyFrames(
    records: GeneratedFrameRecord[],
    enemyType: SpritePackEnemyName,
    pixelSize: SpritePackPixelSize,
    variantIndex: number,
    shape: EnemyShapeTrait,
    basePalette: SpritePackBasePalette,
    themeColorShift: number,
): void {
    const palette = createEnemyPalette(
        enemyType,
        basePalette,
        shape,
        themeColorShift,
    );
    const assetId = `enemy/${enemyType}-v${variantIndex + 1}`;

    (Object.keys(ASSET_ANIMATION_FRAMES) as SpritePackAnimation[]).forEach(
        (animation) => {
            const frameCount = ASSET_ANIMATION_FRAMES[animation];
            for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
                const frame = createFrame(pixelSize, palette);
                drawEnemy(frame, enemyType, animation, frameIndex, shape);
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
        },
    );
}

function buildEnvironmentFrames(
    records: GeneratedFrameRecord[],
    rng: () => number,
    pixelSize: SpritePackPixelSize,
    profile: ThemeProfile,
    basePalette: SpritePackBasePalette,
): void {
    const wallPalette = [
        basePalette.transparent,
        basePalette.outline,
        basePalette.wall,
        basePalette.metal,
        adjustHexColor(basePalette.wall, randomInt(rng, -20, 20)),
    ];

    const wallRoles: WallTileRole[] = [
        "top",
        "bottom",
        "left",
        "right",
        "door-top",
        "door-bottom",
        "door-left",
        "door-right",
        "top-left",
        "top-right",
        "bottom-left",
        "bottom-right",
        "solid",
    ];
    const wallVariantsPerRole = Math.max(
        1,
        Math.ceil(profile.wallVariants / wallRoles.length),
    );

    wallRoles.forEach((role) => {
        for (let variant = 0; variant < wallVariantsPerRole; variant += 1) {
            const frame = createFrame(pixelSize, wallPalette);
            drawWall(frame, role, variant + randomInt(rng, 0, 3));
            records.push({
                assetId: `wall/${role}-v${variant + 1}`,
                category: "wall",
                animation: "idle",
                frameIndex: 0,
                fps: 1,
                loop: "loop",
                frame,
            });
        }
    });

    const floorPalette = [
        basePalette.transparent,
        basePalette.outline,
        adjustHexColor(basePalette.wall, -18),
        adjustHexColor(basePalette.wall, 12),
    ];

    for (let variant = 0; variant < profile.floorVariants; variant += 1) {
        const frame = createFrame(pixelSize, floorPalette);
        drawFloor(frame, variant + randomInt(rng, 0, 3));
        records.push({
            assetId: `floor/ground-v${variant + 1}`,
            category: "floor",
            animation: "idle",
            frameIndex: 0,
            fps: 1,
            loop: "loop",
            frame,
        });
    }

    const trapPalette = [
        basePalette.transparent,
        basePalette.outline,
        adjustHexColor(basePalette.metal, -22),
        adjustHexColor(basePalette.accent, 8),
        adjustHexColor(basePalette.enemyB, 4),
    ];

    for (let variant = 0; variant < profile.trapVariants; variant += 1) {
        for (let frameIndex = 0; frameIndex < 2; frameIndex += 1) {
            const frame = createFrame(pixelSize, trapPalette);
            drawTrap(frame, variant, frameIndex);
            records.push({
                assetId: `trap/hazard-v${variant + 1}`,
                category: "trap",
                animation: "idle",
                frameIndex,
                fps: 4,
                loop: "loop",
                frame,
            });
        }
    }

    const decoPalette = [
        basePalette.transparent,
        basePalette.outline,
        basePalette.deco,
        basePalette.clothB,
        basePalette.wood,
    ];

    for (let variant = 0; variant < profile.decorationVariants; variant += 1) {
        const frame = createFrame(pixelSize, decoPalette);
        drawDecoration(frame, variant + randomInt(rng, 0, 5));
        records.push({
            assetId: `decoration/prop-v${variant + 1}`,
            category: "decoration",
            animation: "idle",
            frameIndex: 0,
            fps: 1,
            loop: "loop",
            frame,
        });
    }

    for (let variant = 0; variant < 2; variant += 1) {
        for (let frameIndex = 0; frameIndex < 2; frameIndex += 1) {
            const frame = createFrame(pixelSize, [
                basePalette.transparent,
                basePalette.outline,
                basePalette.wood,
                basePalette.accent,
                basePalette.enemyB,
                adjustHexColor(basePalette.accent, 28),
            ]);
            drawTorch(frame, frameIndex, variant);
            records.push({
                assetId: `decoration/torch-v${variant + 1}`,
                category: "decoration",
                animation: "idle",
                frameIndex,
                fps: 5,
                loop: "loop",
                frame,
            });
        }
    }

    const interactablePalette = [
        basePalette.transparent,
        basePalette.outline,
        basePalette.wood,
        basePalette.accent,
        basePalette.metal,
        basePalette.skin,
    ];

    for (
        let variant = 0;
        variant < profile.interactableVariants;
        variant += 1
    ) {
        for (let frameIndex = 0; frameIndex < 2; frameIndex += 1) {
            const frame = createFrame(pixelSize, interactablePalette);
            drawInteractable(frame, variant, frameIndex);
            records.push({
                assetId: `interactable/object-v${variant + 1}`,
                category: "interactable",
                animation: "idle",
                frameIndex,
                fps: 2,
                loop: "loop",
                frame,
            });
        }
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
    const profile = THEME_BY_GENRE[options.genre];

    const classPool = shuffleWithRng(rng, profile.classPool);
    const enemyPool = shuffleWithRng(rng, profile.enemyPool);

    const classCount = classPool.length * profile.classVariantsPerClass;
    const enemyCount = enemyPool.length * profile.enemyVariantsPerType;

    for (let index = 0; index < classCount; index += 1) {
        const className =
            classPool[index % classPool.length] ??
            pickOne(rng, profile.classPool);
        const shape = createCharacterShapeTrait(rng);
        buildCharacterFrames(
            records,
            className,
            options.pixelSize,
            Math.floor(index / classPool.length),
            shape,
            resolvedPalette,
            profile.themeColorShift,
        );
    }

    for (let index = 0; index < enemyCount; index += 1) {
        const enemyType =
            enemyPool[index % enemyPool.length] ??
            pickOne(rng, profile.enemyPool);
        const shape = createEnemyShapeTrait(rng);
        buildEnemyFrames(
            records,
            enemyType,
            options.pixelSize,
            Math.floor(index / enemyPool.length),
            shape,
            resolvedPalette,
            profile.themeColorShift,
        );
    }

    buildEnvironmentFrames(
        records,
        rng,
        options.pixelSize,
        profile,
        resolvedPalette,
    );

    const widthTiles = Math.max(
        8,
        Math.min(24, Math.ceil(Math.sqrt(records.length))),
    );
    const heightTiles = Math.max(1, Math.ceil(records.length / widthTiles));

    const frames = records.map((record, index) => ({
        tileX: index % widthTiles,
        tileY: Math.floor(index / widthTiles),
        frame: record.frame,
    }));

    const clipMap = new Map<string, SpritePackClipMetadata>();
    const assetMap = new Map<string, SpritePackAssetMetadata>();

    records.forEach((record, index) => {
        const tile: SpriteTileFrame = [
            index % widthTiles,
            Math.floor(index / widthTiles),
        ];
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
        throw new Error(
            "Could not acquire canvas context for sprite pack render.",
        );
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
