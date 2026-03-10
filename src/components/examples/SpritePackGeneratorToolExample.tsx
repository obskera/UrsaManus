import { useEffect, useMemo, useRef, useState } from "react";
import { exportBrowserJsonFile } from "@/services/browserJsonFile";
import {
    generateSpritePack,
    renderSpritePackToCanvas,
    serializeSpritePackMetadata,
    type GeneratedSpritePack,
    type SpritePackPalettePreset,
    type SpritePackPixelSize,
} from "@/services/spritePackGenerator";

export type SpritePackGeneratorToolExampleProps = {
    title?: string;
};

const TOOL_GENRE = "dungeon" as const;
const PIXEL_SIZES: SpritePackPixelSize[] = [8, 16, 32, 64];
const PALETTE_PRESETS: SpritePackPalettePreset[] = [
    "default",
    "classic-nes",
    "snes-fantasy",
    "gameboy",
];

type SheetFrameEntry = GeneratedSpritePack["frames"][number];
type AtlasClip =
    GeneratedSpritePack["metadata"]["spriteAtlasDefinition"]["clips"][number];

function getClipFirstFrame(clip: AtlasClip): readonly [number, number] | null {
    if ("frames" in clip) {
        return clip.frames[0] ?? null;
    }

    return clip.range.from;
}

function drawFrameToCanvas(
    context: CanvasRenderingContext2D,
    frameEntry: SheetFrameEntry,
    tileSize: number,
    offsetTileX: number,
    offsetTileY: number,
): void {
    const originX = offsetTileX * tileSize;
    const originY = offsetTileY * tileSize;

    for (let y = 0; y < tileSize; y += 1) {
        for (let x = 0; x < tileSize; x += 1) {
            const pixelIndex = y * tileSize + x;
            const colorIndex = frameEntry.frame.pixels[pixelIndex] ?? 0;
            const color =
                frameEntry.frame.palette[colorIndex] ?? "rgba(0,0,0,0)";
            if (color === "rgba(0,0,0,0)") {
                continue;
            }

            context.fillStyle = color;
            context.fillRect(originX + x, originY + y, 1, 1);
        }
    }
}

function getAssetFirstFrame(
    pack: GeneratedSpritePack,
    assetBase: string,
): SheetFrameEntry | null {
    const frameLookup = new Map<string, SheetFrameEntry>(
        pack.frames.map((entry) => [`${entry.tileX},${entry.tileY}`, entry]),
    );

    const clip = pack.metadata.spriteAtlasDefinition.clips.find((entry) => {
        const [assetId, animation] = entry.name.split(":");
        return (
            Boolean(assetId && assetId.startsWith(`${assetBase}-v`)) &&
            animation === "idle"
        );
    });

    const tile = clip ? getClipFirstFrame(clip) : null;
    if (!tile) {
        return null;
    }

    return frameLookup.get(`${tile[0]},${tile[1]}`) ?? null;
}

function getAssetFrames(
    pack: GeneratedSpritePack,
    assetBase: string,
    maxCount = Number.POSITIVE_INFINITY,
): SheetFrameEntry[] {
    const frameLookup = new Map<string, SheetFrameEntry>(
        pack.frames.map((entry) => [`${entry.tileX},${entry.tileY}`, entry]),
    );

    const clips = pack.metadata.spriteAtlasDefinition.clips.filter((entry) => {
        const [assetId, animation] = entry.name.split(":");
        return (
            Boolean(assetId && assetId.startsWith(`${assetBase}-v`)) &&
            animation === "idle"
        );
    });

    const results: SheetFrameEntry[] = [];
    const seen = new Set<string>();

    for (const clip of clips) {
        const tile = getClipFirstFrame(clip);
        if (!tile) {
            continue;
        }

        const key = `${tile[0]},${tile[1]}`;
        if (seen.has(key)) {
            continue;
        }

        const frame = frameLookup.get(key);
        if (!frame) {
            continue;
        }

        results.push(frame);
        seen.add(key);

        if (results.length >= maxCount) {
            break;
        }
    }

    return results;
}

function renderAssembledDungeonPreview(
    pack: GeneratedSpritePack,
    canvas: HTMLCanvasElement,
): void {
    const tileSize = pack.metadata.pixelSize;
    const columns = 14;
    const rows = 10;

    canvas.width = columns * tileSize;
    canvas.height = rows * tileSize;

    const context = canvas.getContext("2d");
    if (!context) {
        return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);

    const floorVariants = getAssetFrames(pack, "floor/ground", 12);
    const wallTop = getAssetFirstFrame(pack, "wall/top");
    const wallBottom = getAssetFirstFrame(pack, "wall/bottom");
    const wallLeft = getAssetFirstFrame(pack, "wall/left");
    const wallRight = getAssetFirstFrame(pack, "wall/right");
    const wallTopLeft = getAssetFirstFrame(pack, "wall/top-left");
    const wallTopRight = getAssetFirstFrame(pack, "wall/top-right");
    const wallBottomLeft = getAssetFirstFrame(pack, "wall/bottom-left");
    const wallBottomRight = getAssetFirstFrame(pack, "wall/bottom-right");
    const doorTop = getAssetFirstFrame(pack, "wall/door-top");
    const doorBottom = getAssetFirstFrame(pack, "wall/door-bottom");
    const doorLeft = getAssetFirstFrame(pack, "wall/door-left");
    const doorRight = getAssetFirstFrame(pack, "wall/door-right");
    const torch = getAssetFirstFrame(pack, "decoration/torch");
    const prop = getAssetFirstFrame(pack, "decoration/prop");
    const item = getAssetFirstFrame(pack, "interactable/object");

    for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < columns; x += 1) {
            if (floorVariants.length > 0) {
                const floor =
                    floorVariants[
                        (x * 7 + y * 11 + ((x + y) % 3)) % floorVariants.length
                    ];
                if (floor) {
                    drawFrameToCanvas(context, floor, tileSize, x, y);
                }
            }
        }
    }

    const middleX = Math.floor(columns / 2);
    const middleY = Math.floor(rows / 2);

    if (wallTopLeft) drawFrameToCanvas(context, wallTopLeft, tileSize, 0, 0);
    if (wallTopRight) {
        drawFrameToCanvas(context, wallTopRight, tileSize, columns - 1, 0);
    }
    if (wallBottomLeft) {
        drawFrameToCanvas(context, wallBottomLeft, tileSize, 0, rows - 1);
    }
    if (wallBottomRight) {
        drawFrameToCanvas(
            context,
            wallBottomRight,
            tileSize,
            columns - 1,
            rows - 1,
        );
    }

    for (let x = 1; x < columns - 1; x += 1) {
        const topTile = x === middleX ? (doorTop ?? wallTop) : wallTop;
        const bottomTile =
            x === middleX ? (doorBottom ?? wallBottom) : wallBottom;
        if (topTile) {
            drawFrameToCanvas(context, topTile, tileSize, x, 0);
        }
        if (bottomTile) {
            drawFrameToCanvas(context, bottomTile, tileSize, x, rows - 1);
        }
    }

    for (let y = 1; y < rows - 1; y += 1) {
        const leftTile = y === middleY ? (doorLeft ?? wallLeft) : wallLeft;
        const rightTile = y === middleY ? (doorRight ?? wallRight) : wallRight;
        if (leftTile) {
            drawFrameToCanvas(context, leftTile, tileSize, 0, y);
        }
        if (rightTile) {
            drawFrameToCanvas(context, rightTile, tileSize, columns - 1, y);
        }
    }

    if (torch) {
        drawFrameToCanvas(context, torch, tileSize, 2, 1);
        drawFrameToCanvas(context, torch, tileSize, columns - 3, 1);
    }

    if (prop) {
        drawFrameToCanvas(context, prop, tileSize, 3, rows - 3);
        drawFrameToCanvas(context, prop, tileSize, columns - 4, rows - 3);
    }

    if (item) {
        drawFrameToCanvas(context, item, tileSize, middleX, middleY);
        drawFrameToCanvas(context, item, tileSize, middleX - 2, middleY + 1);
    }
}

async function exportCanvasAsPng(
    canvas: HTMLCanvasElement,
    fileName: string,
): Promise<
    | {
          ok: true;
      }
    | {
          ok: false;
          message: string;
      }
> {
    if (
        typeof window === "undefined" ||
        typeof document === "undefined" ||
        !window.URL ||
        typeof window.URL.createObjectURL !== "function"
    ) {
        return {
            ok: false,
            message: "PNG export unavailable in this environment.",
        };
    }

    const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((resolvedBlob) => {
            resolve(resolvedBlob);
        }, "image/png");
    });

    if (!blob) {
        return {
            ok: false,
            message: "PNG export failed: could not serialize the canvas image.",
        };
    }

    const objectUrl = window.URL.createObjectURL(blob);

    try {
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = fileName;
        anchor.style.display = "none";
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
    } finally {
        window.URL.revokeObjectURL(objectUrl);
    }

    return {
        ok: true,
    };
}

const SpritePackGeneratorToolExample = ({
    title = "Sprite pack generator tool (MVP)",
}: SpritePackGeneratorToolExampleProps) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const assembledCanvasRef = useRef<HTMLCanvasElement | null>(null);

    const [seed, setSeed] = useState("ursa-seed");
    const [pixelSize, setPixelSize] = useState<SpritePackPixelSize>(16);
    const [palettePreset, setPalettePreset] =
        useState<SpritePackPalettePreset>("default");
    const [customClothPrimary, setCustomClothPrimary] = useState("#5e81ac");
    const [customClothSecondary, setCustomClothSecondary] = useState("#88c0d0");
    const [customAccent, setCustomAccent] = useState("#e5c07b");
    const [customEnemy, setCustomEnemy] = useState("#a3be8c");
    const [customWall, setCustomWall] = useState("#6b7280");
    const [useCustomPalette, setUseCustomPalette] = useState(false);
    const [status, setStatus] = useState(
        "Ready. Generate a pack to preview and export PNG + metadata.",
    );
    const [pack, setPack] = useState<GeneratedSpritePack | null>(null);

    const summary = useMemo(() => {
        if (!pack) {
            return null;
        }

        const categoryCounts = pack.metadata.assets.reduce<
            Record<string, number>
        >((accumulator, asset) => {
            accumulator[asset.category] =
                (accumulator[asset.category] ?? 0) + 1;
            return accumulator;
        }, {});

        return {
            totalAssets: pack.metadata.assets.length,
            totalClips: pack.metadata.spriteAtlasDefinition.clips.length,
            totalFrames: pack.frames.length,
            categoryCounts,
        };
    }, [pack]);

    useEffect(() => {
        if (!pack || !canvasRef.current) {
            return;
        }

        renderSpritePackToCanvas(pack, canvasRef.current);

        if (assembledCanvasRef.current) {
            renderAssembledDungeonPreview(pack, assembledCanvasRef.current);
        }
    }, [pack]);

    const runGenerate = () => {
        const normalizedSeed = seed.trim() || "ursa-seed";
        const nextPack = generateSpritePack({
            seed: normalizedSeed,
            genre: TOOL_GENRE,
            pixelSize,
            palettePreset,
            paletteOverrides: useCustomPalette
                ? {
                      clothA: customClothPrimary,
                      clothB: customClothSecondary,
                      accent: customAccent,
                      enemyA: customEnemy,
                      wall: customWall,
                      deco: customEnemy,
                  }
                : undefined,
        });

        setPack(nextPack);
        setStatus(
            `Generated ${nextPack.metadata.assets.length} assets and ${nextPack.frames.length} frames (${pixelSize}px).`,
        );
    };

    const exportMetadata = () => {
        if (!pack) {
            setStatus("Generate a sprite pack before exporting metadata.");
            return;
        }

        const fileName = `sprite-pack-${pack.metadata.genre}-${pack.metadata.pixelSize}px-${pack.metadata.seed}.json`;
        const result = exportBrowserJsonFile(
            serializeSpritePackMetadata(pack),
            fileName,
        );

        if (!result.ok) {
            setStatus(result.message);
            return;
        }

        setStatus(`Exported metadata: ${fileName}`);
    };

    const exportPng = async () => {
        if (!pack || !canvasRef.current) {
            setStatus("Generate a sprite pack before exporting PNG.");
            return;
        }

        const result = await exportCanvasAsPng(
            canvasRef.current,
            pack.metadata.sheet.fileName,
        );

        if (!result.ok) {
            setStatus(result.message);
            return;
        }

        setStatus(`Exported spritesheet: ${pack.metadata.sheet.fileName}`);
    };

    return (
        <section
            className="ToolExampleCard"
            aria-label="Sprite pack generator tool"
        >
            <header className="ToolExampleHeader">
                <h3>{title}</h3>
                <p>
                    Generates deterministic 8/16/32/64px sprite packs for
                    characters and enemies with seed/theme-driven silhouette and
                    color variation, plus floors, walls, traps, decorations, and
                    interactables, then exports a PNG sheet plus engine-ready
                    JSON atlas metadata.
                </p>
                <p>
                    Disclaimer: This sprite generator is primarily for MVP/demo
                    prototyping and rapid iteration. Expect to refine or replace
                    generated art for production-quality content.
                </p>
            </header>

            <div
                className="ToolExampleActions"
                role="group"
                aria-label="Sprite pack controls"
            >
                <label>
                    Seed
                    <input
                        value={seed}
                        onChange={(event) => {
                            setSeed(event.target.value);
                        }}
                    />
                </label>

                <label>
                    Pixel size
                    <select
                        value={pixelSize}
                        onChange={(event) => {
                            setPixelSize(
                                Number(
                                    event.target.value,
                                ) as SpritePackPixelSize,
                            );
                        }}
                    >
                        {PIXEL_SIZES.map((entry) => (
                            <option key={entry} value={entry}>
                                {entry}px
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    Palette preset
                    <select
                        value={palettePreset}
                        onChange={(event) => {
                            setPalettePreset(
                                event.target.value as SpritePackPalettePreset,
                            );
                        }}
                    >
                        {PALETTE_PRESETS.map((entry) => (
                            <option key={entry} value={entry}>
                                {entry}
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    <input
                        type="checkbox"
                        checked={useCustomPalette}
                        onChange={(event) => {
                            setUseCustomPalette(event.target.checked);
                        }}
                    />
                    Use custom palette overrides
                </label>

                {useCustomPalette ? (
                    <>
                        <label>
                            Cloth primary
                            <input
                                type="color"
                                value={customClothPrimary}
                                onChange={(event) => {
                                    setCustomClothPrimary(event.target.value);
                                }}
                            />
                        </label>
                        <label>
                            Cloth secondary
                            <input
                                type="color"
                                value={customClothSecondary}
                                onChange={(event) => {
                                    setCustomClothSecondary(event.target.value);
                                }}
                            />
                        </label>
                        <label>
                            Accent
                            <input
                                type="color"
                                value={customAccent}
                                onChange={(event) => {
                                    setCustomAccent(event.target.value);
                                }}
                            />
                        </label>
                        <label>
                            Enemy tone
                            <input
                                type="color"
                                value={customEnemy}
                                onChange={(event) => {
                                    setCustomEnemy(event.target.value);
                                }}
                            />
                        </label>
                        <label>
                            Wall tone
                            <input
                                type="color"
                                value={customWall}
                                onChange={(event) => {
                                    setCustomWall(event.target.value);
                                }}
                            />
                        </label>
                    </>
                ) : null}
            </div>

            <div
                className="ToolExampleActions"
                role="group"
                aria-label="Sprite pack actions"
                style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
            >
                <button
                    type="button"
                    className="DebugToggle"
                    onClick={runGenerate}
                >
                    Generate sprite pack
                </button>
                <button
                    type="button"
                    className="DebugToggle"
                    onClick={exportPng}
                >
                    Export spritesheet PNG
                </button>
                <button
                    type="button"
                    className="DebugToggle"
                    onClick={exportMetadata}
                >
                    Export atlas JSON
                </button>
            </div>

            <p className="ToolExampleStatus" role="status">
                {status}
            </p>

            {summary ? (
                <div
                    className="ToolExampleActions"
                    aria-label="Sprite pack summary"
                >
                    <p>
                        Assets: <strong>{summary.totalAssets}</strong> | Clips:{" "}
                        <strong>{summary.totalClips}</strong> | Frames:{" "}
                        <strong>{summary.totalFrames}</strong>
                    </p>
                    <p>
                        Categories:{" "}
                        {Object.entries(summary.categoryCounts)
                            .map(([category, count]) => `${category} ${count}`)
                            .join(", ")}
                    </p>
                    <p>
                        Sheet: {pack?.metadata.sheet.widthPx}x
                        {pack?.metadata.sheet.heightPx} px (
                        {pack?.metadata.sheet.widthTiles}x
                        {pack?.metadata.sheet.heightTiles} tiles)
                    </p>
                    <p>Palette: {pack?.metadata.palette.preset}</p>
                </div>
            ) : null}

            <div
                className="ToolExamplePreview"
                aria-label="Sprite pack preview"
            >
                <p>Spritesheet preview</p>
                <canvas
                    ref={canvasRef}
                    style={{
                        imageRendering: "pixelated",
                        width: pack
                            ? Math.min(960, pack.metadata.sheet.widthPx * 2)
                            : 480,
                        height: pack
                            ? Math.min(640, pack.metadata.sheet.heightPx * 2)
                            : 240,
                        border: "1px solid rgba(255,255,255,0.2)",
                        background: "transparent",
                    }}
                />

                <p>Assembled dungeon preview</p>
                <canvas
                    ref={assembledCanvasRef}
                    style={{
                        imageRendering: "pixelated",
                        width: pack
                            ? Math.min(960, pack.metadata.pixelSize * 14 * 2)
                            : 480,
                        height: pack
                            ? Math.min(640, pack.metadata.pixelSize * 10 * 2)
                            : 240,
                        border: "1px solid rgba(255,255,255,0.2)",
                        background: "transparent",
                    }}
                />
            </div>
        </section>
    );
};

export default SpritePackGeneratorToolExample;
