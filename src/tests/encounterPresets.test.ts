import { afterEach, describe, expect, it } from "vitest";
import { signalBus } from "@/services/signalBus";
import {
    ENCOUNTER_PRESET_CHANGED_SIGNAL,
    ENCOUNTER_PRESET_IMPORTED_SIGNAL,
    ENCOUNTER_PRESET_INVALID_SIGNAL,
    ENCOUNTER_PRESET_PAYLOAD_VERSION,
    createEncounterPresetService,
} from "@/services/encounterPresets";

describe("encounter preset service", () => {
    afterEach(() => {
        signalBus.clear();
    });

    it("registers reusable spawn/objective/reward bundles and resolves templates", () => {
        const service = createEncounterPresetService();

        expect(
            service.registerSpawnPack({
                id: "bandits:small",
                units: [
                    {
                        id: "bandit-grunt",
                        tag: "enemy",
                        count: 3,
                    },
                ],
            }).ok,
        ).toBe(true);

        expect(
            service.registerObjectiveBundle({
                id: "obj:defeat-wave",
                objectives: [
                    {
                        id: "defeat-all",
                        label: "Defeat all enemies",
                        targetCount: 3,
                    },
                ],
            }).ok,
        ).toBe(true);

        expect(
            service.registerRewardBundle({
                id: "reward:starter",
                rewards: [
                    {
                        rewardBundleId: "bundle:starter-loot",
                        quantity: 1,
                    },
                ],
            }).ok,
        ).toBe(true);

        const registered = service.registerTemplate({
            id: "encounter:bandit-ambush",
            spawnPackIds: ["bandits:small"],
            objectiveBundleIds: ["obj:defeat-wave"],
            rewardBundleIds: ["reward:starter"],
            metadata: {
                biome: "forest",
            },
        });

        expect(registered.ok).toBe(true);

        const resolved = service.resolveTemplate("encounter:bandit-ambush");
        expect(resolved).toMatchObject({
            id: "encounter:bandit-ambush",
            spawnPacks: [{ id: "bandits:small" }],
            objectiveBundles: [{ id: "obj:defeat-wave" }],
            rewardBundles: [{ id: "reward:starter" }],
            metadata: { biome: "forest" },
        });
    });

    it("blocks template registration when references are missing", () => {
        const service = createEncounterPresetService();

        const result = service.registerTemplate({
            id: "encounter:invalid",
            spawnPackIds: ["missing-spawn"],
            objectiveBundleIds: ["missing-objective"],
            rewardBundleIds: ["missing-reward"],
        });

        expect(result.ok).toBe(false);
        expect(result.code).toBe("missing-reference");
    });

    it("exports and imports versioned preset payloads", () => {
        const source = createEncounterPresetService();
        source.registerSpawnPack({
            id: "spawn:camp",
            units: [
                {
                    id: "enemy-scout",
                    tag: "enemy",
                    count: 2,
                },
            ],
        });
        source.registerObjectiveBundle({
            id: "obj:clear-camp",
            objectives: [
                {
                    id: "clear",
                    label: "Clear the camp",
                },
            ],
        });
        source.registerRewardBundle({
            id: "reward:camp",
            rewards: [{ rewardBundleId: "bundle:camp-loot" }],
        });
        source.registerTemplate({
            id: "encounter:camp",
            spawnPackIds: ["spawn:camp"],
            objectiveBundleIds: ["obj:clear-camp"],
            rewardBundleIds: ["reward:camp"],
        });

        const raw = source.exportPayload({ pretty: true });
        const parsed = JSON.parse(raw) as { version: string };
        expect(parsed.version).toBe(ENCOUNTER_PRESET_PAYLOAD_VERSION);

        const target = createEncounterPresetService();
        const imported = target.importPayload(raw);
        expect(imported.ok).toBe(true);

        const snapshot = target.getSnapshot();
        expect(snapshot.templateCount).toBe(1);
        expect(snapshot.spawnPackCount).toBe(1);
        expect(snapshot.objectiveBundleCount).toBe(1);
        expect(snapshot.rewardBundleCount).toBe(1);
    });

    it("emits changed/imported/invalid lifecycle signals", () => {
        const events: string[] = [];

        signalBus.on(ENCOUNTER_PRESET_CHANGED_SIGNAL, () => {
            events.push("changed");
        });
        signalBus.on(ENCOUNTER_PRESET_IMPORTED_SIGNAL, () => {
            events.push("imported");
        });
        signalBus.on(ENCOUNTER_PRESET_INVALID_SIGNAL, () => {
            events.push("invalid");
        });

        const service = createEncounterPresetService();
        service.registerSpawnPack({
            id: "spawn:a",
            units: [{ id: "enemy-a", tag: "enemy", count: 1 }],
        });
        service.registerObjectiveBundle({
            id: "obj:a",
            objectives: [{ id: "o1", label: "Do thing" }],
        });
        service.registerRewardBundle({
            id: "reward:a",
            rewards: [{ rewardBundleId: "bundle:a" }],
        });
        service.registerTemplate({
            id: "encounter:a",
            spawnPackIds: ["spawn:a"],
            objectiveBundleIds: ["obj:a"],
            rewardBundleIds: ["reward:a"],
        });

        service.registerTemplate({
            id: "encounter:bad",
            spawnPackIds: ["missing"],
            objectiveBundleIds: ["obj:a"],
            rewardBundleIds: ["reward:a"],
        });

        const raw = service.exportPayload();
        const imported = createEncounterPresetService();
        imported.importPayload(raw);

        expect(events).toContain("changed");
        expect(events).toContain("invalid");
        expect(events).toContain("imported");
    });
});
