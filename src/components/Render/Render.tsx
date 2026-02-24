import { useEffect, useRef } from "react";
import "./Render.css";
export interface RenderableItem {
    spriteImageSheet: string;
    spriteSize: number;
    spriteSheetTileWidth: number;
    spriteSheetTileHeight: number;
    characterSpriteTiles: number[][];
    scaler: number;
    position: { x: number; y: number };
    fps?: number;

    collider?: {
        type: "rectangle";
        size: { width: number; height: number };
        offset: { x: number; y: number };
        debugDraw?: boolean;
    };
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
                const uniqueSheetUrls = Array.from(
                    new Set(items.map((it) => it.spriteImageSheet)),
                );

                const loaded = await Promise.all(
                    uniqueSheetUrls.map((src) => loadImage(src)),
                );
                if (cancelled) return;

                const imagesByUrl = new Map<string, HTMLImageElement>();
                for (let i = 0; i < uniqueSheetUrls.length; i++) {
                    imagesByUrl.set(uniqueSheetUrls[i], loaded[i]);
                }

                const start = performance.now();

                const tick = (now: number) => {
                    if (cancelled) return;

                    context.clearRect(0, 0, width, height);

                    for (let i = 0; i < items.length; i++) {
                        const it = items[i];
                        const img = imagesByUrl.get(it.spriteImageSheet);
                        if (!img) continue;

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

                        const dx = it.position.x;
                        const dy = it.position.y;

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

                        if (it.collider?.debugDraw) {
                            const scale = it.scaler;

                            const cx = dx + it.collider.offset.x * scale;
                            const cy = dy + it.collider.offset.y * scale;

                            context.strokeStyle = "red";
                            context.lineWidth = 1;
                            context.strokeRect(
                                cx,
                                cy,
                                it.collider.size.width * scale,
                                it.collider.size.height * scale,
                            );
                        }
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
