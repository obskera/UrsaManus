import { describe, expect, it } from "vitest";
import {
    generateSpritePack,
    serializeSpritePackMetadata,
} from "@/services/spritePackGenerator";

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

        const categories = new Set(pack.metadata.assets.map((asset) => asset.category));

        expect(categories.has("character")).toBe(true);
        expect(categories.has("enemy")).toBe(true);
        expect(categories.has("wall")).toBe(true);
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
