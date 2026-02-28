import { describe, expect, it } from "vitest";
import {
    createWorldgenScenePreset,
    createWorldgenScenePresetOptions,
    listWorldgenScenePresets,
} from "@/logic/worldgen";

describe("worldgen scene presets", () => {
    it("lists available scene presets", () => {
        const presets = listWorldgenScenePresets();

        expect(presets.length).toBeGreaterThanOrEqual(3);
        expect(presets.some((preset) => preset.id === "compact-run")).toBe(
            true,
        );
    });

    it("builds merged preset options with overrides", () => {
        const options = createWorldgenScenePresetOptions("compact-run", {
            map: {
                width: 36,
            },
            spawns: {
                enemyCount: 9,
            },
        });

        expect(options.map.width).toBe(36);
        expect(options.spawns?.enemyCount).toBe(9);
        expect(options.composition?.enabled).toBe(true);
    });

    it("creates deterministic scenarios from presets", () => {
        const first = createWorldgenScenePreset("gauntlet-run");
        const second = createWorldgenScenePreset("gauntlet-run");

        expect(first).toEqual(second);
        expect(first.composition).not.toBeNull();
        expect(first.anchors.enemySpawns.length).toBeGreaterThan(0);
    });
});
