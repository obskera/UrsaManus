import { afterEach, describe, expect, it } from "vitest";
import { signalBus } from "@/services/signalBus";
import { createCheckpointRespawnService } from "@/services/checkpointRespawn";
import { createInteractionPromptService } from "@/services/interactionPrompt";
import {
    OBJECTIVE_STATUS_CHANGED_SIGNAL,
    createObjectiveTrackerService,
} from "@/services/objectiveTracker";
import { createWaveSpawnerService } from "@/services/waveSpawner";

describe("prefab systems", () => {
    afterEach(() => {
        signalBus.clear();
    });

    it("runs checkpoint activate/export/import/respawn flow", () => {
        const checkpoints = createCheckpointRespawnService();
        checkpoints.registerCheckpoint({
            id: "cp-a",
            x: 10,
            y: 20,
            transition: "fade",
            audioCue: "respawn",
        });
        checkpoints.registerCheckpoint({ id: "cp-b", x: 50, y: 70 });
        checkpoints.activateCheckpoint("cp-b");

        const respawn = checkpoints.respawn();
        expect(respawn).toEqual({ checkpointId: "cp-b", x: 50, y: 70 });

        const snapshot = checkpoints.exportSnapshot();
        const restored = createCheckpointRespawnService();
        expect(restored.importSnapshot(snapshot)).toBe(true);
        expect(restored.getActiveCheckpoint()?.id).toBe("cp-b");
    });

    it("spawns wave requests with cadence/maxActive and marks completion", () => {
        const waves = createWaveSpawnerService();
        expect(
            waves.startWave({
                id: "wave-1",
                count: 4,
                cadenceMs: 100,
                maxActive: 2,
                tags: ["undead"],
                difficultyScalar: 1.25,
            }),
        ).toBe(true);

        const first = waves.update(100, 0);
        expect(first).toHaveLength(1);
        expect(first[0].spawnIndex).toBe(1);

        const blocked = waves.update(400, 2);
        expect(blocked).toHaveLength(0);

        const resumed = waves.update(200, 1);
        expect(resumed).toHaveLength(1);
        waves.completeSpawned(4);
        expect(waves.getState().completedCount).toBe(4);
    });

    it("tracks objective state transitions and emits status signals", () => {
        const statuses: string[] = [];
        signalBus.on(
            OBJECTIVE_STATUS_CHANGED_SIGNAL,
            (event: { objectiveId: string; status: string }) => {
                statuses.push(`${event.objectiveId}:${event.status}`);
            },
        );

        const objectives = createObjectiveTrackerService();
        expect(
            objectives.registerObjective({ id: "obj-1", label: "Find key" }),
        ).toBe(true);
        expect(objectives.transitionObjective("obj-1", "active")).toBe(true);
        expect(objectives.transitionObjective("obj-1", "completed")).toBe(true);
        expect(
            objectives
                .listObjectives("completed")
                .map((objective) => objective.id),
        ).toEqual(["obj-1"]);
        expect(statuses).toEqual(["obj-1:active", "obj-1:completed"]);
    });

    it("gates interaction prompt by proximity and cooldown", () => {
        const prompt = createInteractionPromptService({
            id: "door",
            label: "Open Door",
            actionLabel: "E",
            radius: 2,
            cooldownMs: 500,
        });

        prompt.updateDistance(5);
        expect(prompt.getState().visible).toBe(false);
        expect(prompt.trigger()).toBe(false);

        prompt.updateDistance(1.5);
        expect(prompt.getState().canInteract).toBe(true);
        expect(prompt.trigger()).toBe(true);
        expect(prompt.getState().canInteract).toBe(false);

        prompt.update(500);
        expect(prompt.getState().canInteract).toBe(true);
    });
});
