import { useEffect, useRef } from "react";

export interface RenderableItem {
    spriteImageSheet: string;
    spriteSize: number;
    spriteSheetTileWidth: number;
    spriteSheetTileHeight: number;
    characterSpriteTiles: number[][];
    scaler: number;
    position: { x: number; y: number };
    fps?: number;
}

export interface RenderProps {
    items: RenderableItem[];
    width?: number;
    height?: number;
}

type TilePosition = { x: number; y: number };

function getTilePixelPosition(
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

const imageCache = new Map<string, Promise<HTMLImageElement>>();

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

const Render = ({ items, width = 300, height = 300 }: RenderProps) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        context.imageSmoothingEnabled = false;

        let cancelled = false;
        let raf = 0;

        (async () => {
            try {
                const sheetUrls = items.map((it) => it.spriteImageSheet);
                console.log("Render loading sheets:", sheetUrls);

                const imgs = await Promise.all(
                    sheetUrls.map((src) => loadImage(src)),
                );
                if (cancelled) return;

                const start = performance.now();

                const tick = (now: number) => {
                    if (cancelled) return;

                    context.clearRect(0, 0, width, height);

                    for (let i = 0; i < items.length; i++) {
                        const it = items[i];
                        const img = imgs[i];

                        const tiles = it.characterSpriteTiles;
                        if (!tiles || tiles.length === 0) continue;

                        const fps = it.fps ?? 8;
                        const frame =
                            Math.floor(((now - start) / 1000) * fps) %
                            tiles.length;

                        const tile = tiles[frame];
                        const tilePos = getTilePixelPosition(
                            tile[0],
                            tile[1],
                            it.spriteSize,
                            it.spriteSheetTileWidth,
                            it.spriteSheetTileHeight,
                        );

                        const dx = it.position?.x ?? 0;
                        const dy = it.position?.y ?? 0;

                        context.drawImage(
                            img,
                            tilePos.x,
                            tilePos.y,
                            it.spriteSize,
                            it.spriteSize,
                            dx,
                            dy,
                            it.spriteSize * it.scaler,
                            it.spriteSize * it.scaler,
                        );
                    }

                    raf = requestAnimationFrame(tick);
                };

                raf = requestAnimationFrame(tick);
            } catch (err) {
                console.error(err);
            }
        })();

        return () => {
            cancelled = true;
            if (raf) cancelAnimationFrame(raf);
        };
    }, [items, width, height]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            style={{ outline: "3px solid red", imageRendering: "pixelated" }}
        />
    );
};

export default Render;
