import { describe, expect, it } from "vitest";
import { validateAssetPipeline } from "@/services/assetValidation";

describe("asset validation service", () => {
    it("accepts valid sprite/audio references including URL-encoded public paths", () => {
        const report = validateAssetPipeline({
            sourceFiles: [
                {
                    filePath: "src/services/save/state.ts",
                    content:
                        'import spriteSheetUrl from "@/assets/spriteSheet.png";\nconst tap = "/beep%201.wav";',
                },
            ],
            assetFiles: [
                {
                    filePath: "src/assets/spriteSheet.png",
                    bytes: 20_000,
                },
                {
                    filePath: "public/beep 1.wav",
                    bytes: 30_000,
                },
            ],
        });

        expect(report.ok).toBe(true);
        expect(report.issues).toEqual([]);
        expect(report.summary.totalAssetBytes).toBe(50_000);
    });

    it("reports missing sprite and audio assets", () => {
        const report = validateAssetPipeline({
            sourceFiles: [
                {
                    filePath: "src/components/gameModes/sceneAudio.ts",
                    content:
                        'import sheet from "@/assets/hero.png";\nconst cue = "/missing.wav";',
                },
            ],
            assetFiles: [],
        });

        expect(report.ok).toBe(false);
        expect(report.issues).toEqual([
            {
                path: "src/components/gameModes/sceneAudio.ts",
                message: 'Missing sprite asset "src/assets/hero.png".',
            },
            {
                path: "src/components/gameModes/sceneAudio.ts",
                message: 'Missing audio asset "public/missing.wav".',
            },
        ]);
    });

    it("enforces per-type and total budgets", () => {
        const report = validateAssetPipeline({
            sourceFiles: [],
            assetFiles: [
                {
                    filePath: "src/assets/spriteSheet.png",
                    bytes: 500,
                },
                {
                    filePath: "public/beep 1.wav",
                    bytes: 700,
                },
                {
                    filePath: "public/atlas/main.atlas",
                    bytes: 200,
                },
            ],
            budgets: {
                maxTotalBytes: 1_000,
                maxSpriteBytes: 400,
                maxAudioBytes: 600,
                maxAtlasBytes: 100,
            },
        });

        expect(report.ok).toBe(false);
        expect(report.issues).toEqual([
            {
                path: "src/assets/spriteSheet.png",
                message: "Sprite asset exceeds budget (500 > 400 bytes).",
            },
            {
                path: "public/beep 1.wav",
                message: "Audio asset exceeds budget (700 > 600 bytes).",
            },
            {
                path: "public/atlas/main.atlas",
                message: "Atlas manifest exceeds budget (200 > 100 bytes).",
            },
            {
                path: "$",
                message: "Total asset bytes exceed budget (1400 > 1000 bytes).",
            },
        ]);
    });

    it("flags atlas workflow mismatch when references exist but manifests are missing", () => {
        const report = validateAssetPipeline({
            sourceFiles: [
                {
                    filePath: "src/logic/entity/spriteAnimationAtlas.ts",
                    content: 'const atlasPath = "/atlases/main.atlas";',
                },
            ],
            assetFiles: [
                {
                    filePath: "src/assets/spriteSheet.png",
                    bytes: 100,
                },
            ],
        });

        expect(report.ok).toBe(false);
        expect(report.issues).toEqual([
            {
                path: "src/logic/entity/spriteAnimationAtlas.ts",
                message: 'Missing atlas asset "public/atlases/main.atlas".',
            },
            {
                path: "$",
                message:
                    "Atlas references were found in source files, but no atlas/pack manifest files were discovered in public/ or src/assets/.",
            },
        ]);
    });
});
