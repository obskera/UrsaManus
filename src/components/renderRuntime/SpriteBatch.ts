import {
    applySpritePseudoShaderEffects,
    type SpritePseudoShaderEffect,
} from "@/components/effects";

export type SpriteBatchItem = {
    spriteImageSheet: string;
    spriteSize: number;
    spriteSheetTileWidth: number;
    spriteSheetTileHeight: number;
    characterSpriteTiles: number[][];
    scaler: number;
    position: { x: number; y: number; z?: number };
    fps?: number;
    spriteEffects?: SpritePseudoShaderEffect[];
    collider?: {
        type: "rectangle";
        size: { width: number; height: number };
        offset: { x: number; y: number };
        debugDraw?: boolean;
    };
};

type TilePosition = { x: number; y: number };

export type SpriteSheetLoadResult = {
    imagesByUrl: Map<string, HTMLImageElement>;
    failedUrls: string[];
};

type DrawSpriteBatchOptions = {
    ctx: CanvasRenderingContext2D;
    nowMs: number;
    width: number;
    height: number;
    cameraX: number;
    cameraY: number;
    showDebugOutlines: boolean;
    debugOutlineColor: string;
};

const imageCache = new Map<string, Promise<HTMLImageElement>>();

function hasValidTileShape(value: unknown): value is [number, number] {
    return (
        Array.isArray(value) &&
        value.length === 2 &&
        typeof value[0] === "number" &&
        typeof value[1] === "number" &&
        Number.isFinite(value[0]) &&
        Number.isFinite(value[1])
    );
}

function loadImage(src: string) {
    const existing = imageCache.get(src);
    if (existing) return existing;

    const p = new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();

        img.onload = () => resolve(img);

        img.onerror = () => {
            imageCache.delete(src);
            reject(new Error(`Failed to load image: ${src}`));
        };

        img.src = src;
    });

    imageCache.set(src, p);
    return p;
}

export function getTilePixelPosition(
    tileX: number,
    tileY: number,
    tileSize: number,
    sheetWidthInTiles: number,
    sheetHeightInTiles: number,
): TilePosition {
    if (
        tileX < 0 ||
        tileY < 0 ||
        tileX >= sheetWidthInTiles ||
        tileY >= sheetHeightInTiles
    ) {
        throw new Error("Tile position out of bounds");
    }

    return {
        x: tileX * tileSize,
        y: tileY * tileSize,
    };
}

export async function loadSpriteSheetImages(
    items: SpriteBatchItem[],
): Promise<SpriteSheetLoadResult> {
    const uniqueSheetUrls = Array.from(
        new Set(items.map((it) => it.spriteImageSheet)),
    );

    const loaded = await Promise.allSettled(
        uniqueSheetUrls.map((src) => loadImage(src)),
    );

    const imagesByUrl = new Map<string, HTMLImageElement>();
    const failedUrls: string[] = [];

    for (let i = 0; i < uniqueSheetUrls.length; i++) {
        const result = loaded[i];
        if (result.status === "fulfilled") {
            imagesByUrl.set(uniqueSheetUrls[i], result.value);
            continue;
        }

        failedUrls.push(uniqueSheetUrls[i]);
    }

    return {
        imagesByUrl,
        failedUrls,
    };
}

export class SpriteBatch {
    private readonly items: SpriteBatchItem[];
    private readonly imagesByUrl: Map<string, HTMLImageElement>;
    private readonly animationStartMs: number;

    constructor(
        items: SpriteBatchItem[],
        imagesByUrl: Map<string, HTMLImageElement>,
        animationStartMs: number,
    ) {
        this.items = items;
        this.imagesByUrl = imagesByUrl;
        this.animationStartMs = animationStartMs;
    }

    draw({
        ctx,
        nowMs,
        width,
        height,
        cameraX,
        cameraY,
        showDebugOutlines,
        debugOutlineColor,
    }: DrawSpriteBatchOptions): void {
        for (let i = 0; i < this.items.length; i++) {
            const it = this.items[i];
            const img = this.imagesByUrl.get(it.spriteImageSheet);
            if (!img) continue;

            const tiles = it.characterSpriteTiles;
            if (!tiles || tiles.length === 0) continue;

            const fps = it.fps ?? 8;
            const frameIndex =
                Math.floor(((nowMs - this.animationStartMs) / 1000) * fps) %
                tiles.length;

            const tile = tiles[frameIndex];
            if (!hasValidTileShape(tile)) continue;

            let tilePos: TilePosition;
            try {
                tilePos = getTilePixelPosition(
                    tile[0],
                    tile[1],
                    it.spriteSize,
                    it.spriteSheetTileWidth,
                    it.spriteSheetTileHeight,
                );
            } catch {
                continue;
            }

            const drawWidth = it.spriteSize * it.scaler;
            const drawHeight = it.spriteSize * it.scaler;
            const worldX = it.position.x;
            const worldY = it.position.y;
            const isOutsideViewport =
                worldX + drawWidth < cameraX ||
                worldX > cameraX + width ||
                worldY + drawHeight < cameraY ||
                worldY > cameraY + height;

            if (isOutsideViewport) continue;

            const dx = worldX - cameraX;
            const dy = worldY - cameraY;

            ctx.drawImage(
                img,
                tilePos.x,
                tilePos.y,
                it.spriteSize,
                it.spriteSize,
                dx,
                dy,
                drawWidth,
                drawHeight,
            );

            if (it.spriteEffects && it.spriteEffects.length > 0) {
                applySpritePseudoShaderEffects({
                    ctx,
                    nowMs,
                    effects: it.spriteEffects,
                    destination: {
                        x: dx,
                        y: dy,
                        width: drawWidth,
                        height: drawHeight,
                    },
                    drawImageArgs: {
                        image: img,
                        sx: tilePos.x,
                        sy: tilePos.y,
                        sw: it.spriteSize,
                        sh: it.spriteSize,
                        dx,
                        dy,
                        dw: drawWidth,
                        dh: drawHeight,
                    },
                });
            }

            if (showDebugOutlines && it.collider?.debugDraw) {
                const scale = it.scaler;
                const cx = dx + it.collider.offset.x * scale;
                const cy = dy + it.collider.offset.y * scale;

                ctx.strokeStyle = debugOutlineColor;
                ctx.lineWidth = 1;
                ctx.strokeRect(
                    cx,
                    cy,
                    it.collider.size.width * scale,
                    it.collider.size.height * scale,
                );
            }
        }
    }
}
