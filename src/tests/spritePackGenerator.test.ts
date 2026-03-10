import { describe, expect, it } from "vitest";
import {
    generateSpritePack,
    serializeSpritePackMetadata,
    type GeneratedSpritePack,
} from "../services/spritePackGenerator";

type AtlasClip =
    GeneratedSpritePack["metadata"]["spriteAtlasDefinition"]["clips"][number];

function expandClipFrames(
    clip: AtlasClip,
): readonly (readonly [number, number])[] {
    if ("frames" in clip) {
        return clip.frames;
    }

    const [fromX, fromY] = clip.range.from;
    const [toX, toY] = clip.range.to;
    const xStep = fromX <= toX ? 1 : -1;
    const yStep = fromY <= toY ? 1 : -1;
    const frames: Array<readonly [number, number]> = [];

    for (let y = fromY; y !== toY + yStep; y += yStep) {
        for (let x = fromX; x !== toX + xStep; x += xStep) {
            frames.push([x, y]);
        }
    }

    return frames;
}

describe("spritePackGenerator", () => {
    it("generates deterministic metadata for the same seed and options", () => {
        const first = generateSpritePack({
            seed: "alpha-seed",
            genre: "rpg",
            pixelSize: 16,
        });
        const second = generateSpritePack({
            seed: "alpha-seed",
            genre: "rpg",
            pixelSize: 16,
        });

        expect(serializeSpritePackMetadata(first)).toBe(
            serializeSpritePackMetadata(second),
        );
        expect(first.frames.length).toBe(second.frames.length);
    });

    it("includes core categories and animation clips in output metadata", () => {
        const pack = generateSpritePack({
            seed: "beta-seed",
            genre: "dungeon",
            pixelSize: 32,
        });

        const categories = new Set(
            pack.metadata.assets.map((asset) => asset.category),
        );

        expect(categories.has("character")).toBe(true);
        expect(categories.has("enemy")).toBe(true);
        expect(categories.has("floor")).toBe(true);
        expect(categories.has("wall")).toBe(true);
        expect(categories.has("trap")).toBe(true);
        expect(categories.has("decoration")).toBe(true);
        expect(categories.has("interactable")).toBe(true);

        const clipNames = pack.metadata.spriteAtlasDefinition.clips.map(
            (clip) => clip.name,
        );

        expect(clipNames.some((name) => name.includes(":idle"))).toBe(true);
        expect(clipNames.some((name) => name.includes(":move"))).toBe(true);
        expect(clipNames.some((name) => name.includes(":atk"))).toBe(true);
        expect(clipNames.some((name) => name.includes(":def"))).toBe(true);
        expect(clipNames.some((name) => name.includes(":hurt"))).toBe(true);
    });

    it("generates expanded environment tile families", () => {
        const pack = generateSpritePack({
            seed: "env-density",
            genre: "dungeon",
            pixelSize: 16,
        });

        const wallCount = pack.metadata.assets.filter((asset) =>
            asset.assetId.startsWith("wall/"),
        ).length;
        const floorCount = pack.metadata.assets.filter((asset) =>
            asset.assetId.startsWith("floor/"),
        ).length;
        const trapCount = pack.metadata.assets.filter((asset) =>
            asset.assetId.startsWith("trap/"),
        ).length;

        expect(wallCount).toBeGreaterThanOrEqual(10);
        expect(floorCount).toBeGreaterThanOrEqual(12);
        expect(trapCount).toBeGreaterThanOrEqual(10);

        const wallIds = pack.metadata.assets
            .filter((asset) => asset.category === "wall")
            .map((asset) => asset.assetId);

        expect(wallIds.some((id) => id.startsWith("wall/top-"))).toBe(true);
        expect(wallIds.some((id) => id.startsWith("wall/bottom-"))).toBe(true);
        expect(wallIds.some((id) => id.startsWith("wall/left-"))).toBe(true);
        expect(wallIds.some((id) => id.startsWith("wall/right-"))).toBe(true);
        expect(wallIds.some((id) => id.startsWith("wall/door-top-"))).toBe(
            true,
        );
        expect(wallIds.some((id) => id.startsWith("wall/door-bottom-"))).toBe(
            true,
        );
        expect(wallIds.some((id) => id.startsWith("wall/door-left-"))).toBe(
            true,
        );
        expect(wallIds.some((id) => id.startsWith("wall/door-right-"))).toBe(
            true,
        );
        expect(wallIds.some((id) => id.startsWith("wall/top-left-"))).toBe(
            true,
        );
        expect(wallIds.some((id) => id.startsWith("wall/top-right-"))).toBe(
            true,
        );
        expect(wallIds.some((id) => id.startsWith("wall/bottom-left-"))).toBe(
            true,
        );
        expect(wallIds.some((id) => id.startsWith("wall/bottom-right-"))).toBe(
            true,
        );
        expect(wallIds.some((id) => id.startsWith("wall/solid-"))).toBe(true);

        const torchIds = pack.metadata.assets
            .filter((asset) => asset.category === "decoration")
            .map((asset) => asset.assetId)
            .filter((id) => id.startsWith("decoration/torch-"));
        expect(torchIds.length).toBeGreaterThan(0);
    });

    it("keeps character, enemy, and item tiles transparent", () => {
        const pack = generateSpritePack({
            seed: "transparency-check",
            genre: "dungeon",
            pixelSize: 16,
        });

        const clipLookup = new Map(
            pack.frames.map((entry) => [
                `${entry.tileX},${entry.tileY}`,
                entry,
            ]),
        );

        const categoriesToCheck = new Set([
            "character",
            "enemy",
            "interactable",
        ]);
        const clipNames = pack.metadata.spriteAtlasDefinition.clips
            .filter((clip) => {
                const assetId = clip.name.split(":")[0] ?? "";
                const asset = pack.metadata.assets.find(
                    (entry) => entry.assetId === assetId,
                );
                return asset ? categoriesToCheck.has(asset.category) : false;
            })
            .slice(0, 24);

        const hasTransparency = clipNames.every((clip) =>
            expandClipFrames(clip).every(([tileX, tileY]) => {
                const frame = clipLookup.get(`${tileX},${tileY}`)?.frame;
                if (!frame) {
                    return false;
                }

                return frame.pixels.some((pixel) => pixel === 0);
            }),
        );

        expect(hasTransparency).toBe(true);
    });

    it("keeps all generated tiles transparent-backed", () => {
        const pack = generateSpritePack({
            seed: "all-transparent",
            genre: "dungeon",
            pixelSize: 16,
        });

        const everyFrameHasTransparency = pack.frames.every((entry) =>
            entry.frame.pixels.some((pixel) => pixel === 0),
        );

        expect(everyFrameHasTransparency).toBe(true);
    });

    it("keeps rpg class silhouettes varied with knight and wizard variants", () => {
        const pack = generateSpritePack({
            seed: "class-variety",
            genre: "rpg",
            pixelSize: 16,
        });

        const characterIds = pack.metadata.assets
            .filter((asset) => asset.category === "character")
            .map((asset) => asset.assetId);

        const knightVariants = characterIds.filter((id) =>
            id.startsWith("character/knight-"),
        );
        const wizardVariants = characterIds.filter((id) =>
            id.startsWith("character/wizard-"),
        );

        expect(knightVariants.length).toBeGreaterThan(0);
        expect(wizardVariants.length).toBeGreaterThan(0);

        const uniqueCharacterCount = new Set(characterIds).size;
        expect(uniqueCharacterCount).toBeGreaterThanOrEqual(8);
    });

    it("changes output when seed changes", () => {
        const first = generateSpritePack({
            seed: "seed-one",
            genre: "top-down",
            pixelSize: 16,
        });
        const second = generateSpritePack({
            seed: "seed-two",
            genre: "top-down",
            pixelSize: 16,
        });

        expect(serializeSpritePackMetadata(first)).not.toBe(
            serializeSpritePackMetadata(second),
        );
    });

    it("applies palette presets and custom overrides in metadata", () => {
        const presetPack = generateSpritePack({
            seed: "palette-seed",
            genre: "rpg",
            pixelSize: 16,
            palettePreset: "gameboy",
        });

        expect(presetPack.metadata.palette.preset).toBe("gameboy");
        expect(presetPack.metadata.palette.resolved.outline).toBe("#0f380f");

        const customPack = generateSpritePack({
            seed: "palette-seed",
            genre: "rpg",
            pixelSize: 16,
            palettePreset: "default",
            paletteOverrides: {
                clothA: "#123456",
                accent: "#fedcba",
            },
        });

        expect(customPack.metadata.palette.resolved.clothA).toBe("#123456");
        expect(customPack.metadata.palette.resolved.accent).toBe("#fedcba");
    });
});
