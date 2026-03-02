import { useEffect, useMemo, useRef, useState } from "react";
import { exportBrowserJsonFile } from "@/services/browserJsonFile";
import {
    generateSpritePack,
    renderSpritePackToCanvas,
    serializeSpritePackMetadata,
    type GeneratedSpritePack,
    type SpritePackGenre,
    type SpritePackPalettePreset,
    type SpritePackPixelSize,
} from "@/services/spritePackGenerator";

export type SpritePackGeneratorToolExampleProps = {
    title?: string;
};

const GENRES: SpritePackGenre[] = ["top-down", "dungeon", "sidescroller", "rpg"];
const PIXEL_SIZES: SpritePackPixelSize[] = [8, 16, 32, 64];
const PALETTE_PRESETS: SpritePackPalettePreset[] = [
    "default",
    "classic-nes",
    "snes-fantasy",
    "gameboy",
];

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

    const [seed, setSeed] = useState("ursa-seed");
    const [genre, setGenre] = useState<SpritePackGenre>("rpg");
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

        const categoryCounts = pack.metadata.assets.reduce<Record<string, number>>(
            (accumulator, asset) => {
                accumulator[asset.category] = (accumulator[asset.category] ?? 0) + 1;
                return accumulator;
            },
            {},
        );

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
    }, [pack]);

    const runGenerate = () => {
        const normalizedSeed = seed.trim() || "ursa-seed";
        const nextPack = generateSpritePack({
            seed: normalizedSeed,
            genre,
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
            `Generated ${nextPack.metadata.assets.length} assets and ${nextPack.frames.length} frames (${pixelSize}px, ${genre}).`,
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
        <section className="ToolExampleCard" aria-label="Sprite pack generator tool">
            <header className="ToolExampleHeader">
                <h3>{title}</h3>
                <p>
                    Generates deterministic 8/16/32/64px sprite packs for
                    characters, enemies, walls, decorations, and interactables,
                    then exports a PNG sheet plus engine-ready JSON atlas metadata.
                </p>
            </header>

            <div className="ToolExampleActions" role="group" aria-label="Sprite pack controls">
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
                    Genre
                    <select
                        value={genre}
                        onChange={(event) => {
                            setGenre(event.target.value as SpritePackGenre);
                        }}
                    >
                        {GENRES.map((entry) => (
                            <option key={entry} value={entry}>
                                {entry}
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    Pixel size
                    <select
                        value={pixelSize}
                        onChange={(event) => {
                            setPixelSize(Number(event.target.value) as SpritePackPixelSize);
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

                <button type="button" className="DebugToggle" onClick={runGenerate}>
                    Generate sprite pack
                </button>
                <button type="button" className="DebugToggle" onClick={exportPng}>
                    Export spritesheet PNG
                </button>
                <button type="button" className="DebugToggle" onClick={exportMetadata}>
                    Export atlas JSON
                </button>
            </div>

            <p className="ToolExampleStatus" role="status">
                {status}
            </p>

            {summary ? (
                <div className="ToolExampleActions" aria-label="Sprite pack summary">
                    <p>
                        Assets: <strong>{summary.totalAssets}</strong> | Clips: <strong>{summary.totalClips}</strong> | Frames: <strong>{summary.totalFrames}</strong>
                    </p>
                    <p>
                        Categories: {Object.entries(summary.categoryCounts)
                            .map(([category, count]) => `${category} ${count}`)
                            .join(", ")}
                    </p>
                    <p>
                        Sheet: {pack?.metadata.sheet.widthPx}x{pack?.metadata.sheet.heightPx} px ({pack?.metadata.sheet.widthTiles}x{pack?.metadata.sheet.heightTiles} tiles)
                    </p>
                    <p>
                        Palette: {pack?.metadata.palette.preset}
                    </p>
                </div>
            ) : null}

            <div className="ToolExamplePreview" aria-label="Sprite pack preview">
                <canvas
                    ref={canvasRef}
                    style={{
                        imageRendering: "pixelated",
                        width: pack ? Math.min(960, pack.metadata.sheet.widthPx * 2) : 480,
                        height: pack ? Math.min(640, pack.metadata.sheet.heightPx * 2) : 240,
                        border: "1px solid rgba(255,255,255,0.2)",
                        background: "rgba(0,0,0,0.2)",
                    }}
                />
            </div>
        </section>
    );
};

export default SpritePackGeneratorToolExample;
