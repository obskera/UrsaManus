import { describe, expect, it } from "vitest";
import {
    createPrefabBatchTuningService,
    getPrefabBatchTuningPreset,
    type PrefabBatchTuningPresetMode,
} from "@/services/prefabBatchTuning";
import { type PrefabBlueprint } from "@/services/prefabCore";

function createBlueprint(input: {
    id: string;
    domain?: string;
    hp: number;
    damage: number;
    speed: number;
    rewardXp: number;
}): PrefabBlueprint {
    return {
        version: "um-prefab-blueprint-v1",
        id: input.id,
        domain: input.domain ?? "enemy",
        modules: [
            {
                moduleId: "enemy.core",
                config: {
                    health: input.hp,
                    damage: input.damage,
                    speed: input.speed,
                    reward: {
                        xp: input.rewardXp,
                    },
                },
            },
        ],
    };
}

describe("prefabBatchTuning", () => {
    it("exposes all expected difficulty presets", () => {
        const modes: PrefabBatchTuningPresetMode[] = [
            "easy",
            "normal",
            "hard",
            "nightmare",
        ];

        for (const mode of modes) {
            const preset = getPrefabBatchTuningPreset(mode);
            expect(preset.mode).toBe(mode);
            expect(typeof preset.label).toBe("string");
            expect(preset.scalars.hp).toBeGreaterThan(0);
            expect(preset.scalars.damage).toBeGreaterThan(0);
            expect(preset.scalars.speed).toBeGreaterThan(0);
            expect(preset.scalars.reward).toBeGreaterThan(0);
        }
    });

    it("previews scalar changes without mutating current state", () => {
        const service = createPrefabBatchTuningService({
            initialBlueprints: [
                createBlueprint({
                    id: "enemy-a",
                    hp: 100,
                    damage: 10,
                    speed: 90,
                    rewardXp: 12,
                }),
            ],
            now: () => 101,
        });

        const preview = service.previewOverlay({
            mode: "hard",
            scalars: {
                hp: 1.5,
                damage: 1.2,
                speed: 1.1,
                reward: 1.25,
            },
        });

        expect(preview.summary.blueprintsScanned).toBe(1);
        expect(preview.summary.blueprintsChanged).toBe(1);
        expect(preview.summary.scalarChanges).toBe(4);
        expect(preview.changedBlueprintIds).toEqual(["enemy-a"]);

        const untouched = service.getCurrentBlueprints()[0];
        expect(untouched.modules[0].config).toEqual({
            health: 100,
            damage: 10,
            speed: 90,
            reward: {
                xp: 12,
            },
        });
    });

    it("applies overlay, stores snapshot, and supports rollback", () => {
        const service = createPrefabBatchTuningService({
            initialBlueprints: [
                createBlueprint({
                    id: "enemy-a",
                    hp: 100,
                    damage: 10,
                    speed: 90,
                    rewardXp: 12,
                }),
            ],
            now: () => 1234,
        });

        const applied = service.applyOverlay({
            mode: "hard",
            scalars: {
                hp: 1.2,
                damage: 1.1,
                speed: 1.1,
                reward: 1.5,
            },
            snapshotReason: "before-hard-pass",
        });

        expect(applied.ok).toBe(true);
        expect(applied.snapshot.snapshotId).toContain("prefab-tuning-1234");
        expect(applied.snapshot.reason).toBe("before-hard-pass");

        const tuned = service.getCurrentBlueprints()[0];
        expect(tuned.modules[0].config).toEqual({
            health: 120,
            damage: 11,
            speed: 99,
            reward: {
                xp: 18,
            },
        });

        const rollback = service.rollbackToSnapshot(
            applied.snapshot.snapshotId,
        );
        expect(rollback.ok).toBe(true);
        expect(service.getCurrentBlueprints()[0].modules[0].config).toEqual({
            health: 100,
            damage: 10,
            speed: 90,
            reward: {
                xp: 12,
            },
        });
    });

    it("targets only requested blueprint ids", () => {
        const service = createPrefabBatchTuningService({
            initialBlueprints: [
                createBlueprint({
                    id: "enemy-a",
                    hp: 100,
                    damage: 10,
                    speed: 90,
                    rewardXp: 12,
                }),
                createBlueprint({
                    id: "enemy-b",
                    hp: 140,
                    damage: 14,
                    speed: 100,
                    rewardXp: 20,
                }),
            ],
            now: () => 5678,
        });

        const result = service.applyOverlay({
            mode: "easy",
            targetBlueprintIds: ["enemy-b"],
            scalars: {
                hp: 0.5,
                damage: 0.5,
                speed: 0.5,
                reward: 1,
            },
        });

        expect(result.preview.changedBlueprintIds).toEqual(["enemy-b"]);

        const [first, second] = service.getCurrentBlueprints();
        expect(first.modules[0].config).toEqual({
            health: 100,
            damage: 10,
            speed: 90,
            reward: {
                xp: 12,
            },
        });
        expect(second.modules[0].config).toEqual({
            health: 70,
            damage: 7,
            speed: 50,
            reward: {
                xp: 20,
            },
        });
    });
});
