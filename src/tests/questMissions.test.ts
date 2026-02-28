import { afterEach, describe, expect, it } from "vitest";
import { signalBus } from "@/services/signalBus";
import {
    QUEST_MISSION_COMPLETED_SIGNAL,
    QUEST_MISSION_FAILED_SIGNAL,
    QUEST_MISSION_PROGRESS_SIGNAL,
    createQuestMissionService,
} from "@/services/questMissions";

describe("quest mission service", () => {
    afterEach(() => {
        signalBus.clear();
    });

    it("registers missions, activates roots, and progresses objective graph", () => {
        const events: string[] = [];
        signalBus.on(
            QUEST_MISSION_PROGRESS_SIGNAL,
            (event: { objectiveId?: string }) => {
                events.push(event.objectiveId ?? "mission");
            },
        );

        const service = createQuestMissionService({ now: () => 10 });

        const registered = service.registerMission({
            id: "quest-alpha",
            title: "Quest Alpha",
            objectives: [
                { id: "a", label: "Start", nextObjectiveIds: ["b"] },
                { id: "b", label: "Middle", nextObjectiveIds: ["c"] },
                { id: "c", label: "End" },
            ],
        });
        expect(registered).toBe(true);

        expect(service.activateMission("quest-alpha")).toBe(true);

        const activated = service.getMission("quest-alpha");
        expect(activated?.status).toBe("active");
        expect(activated?.objectives.a.status).toBe("active");
        expect(activated?.objectives.b.status).toBe("pending");

        expect(service.completeObjective("quest-alpha", "a")).toBe(true);

        const afterA = service.getMission("quest-alpha");
        expect(afterA?.objectives.a.status).toBe("completed");
        expect(afterA?.objectives.b.status).toBe("active");

        expect(service.setObjectiveProgress("quest-alpha", "b", 0.4)).toBe(
            true,
        );
        expect(service.completeObjective("quest-alpha", "b")).toBe(true);
        expect(service.completeObjective("quest-alpha", "c")).toBe(true);

        const completed = service.getMission("quest-alpha");
        expect(completed?.status).toBe("completed");
        expect(events).toEqual(["mission", "a", "b", "b", "c"]);
    });

    it("emits completion signal and applies reward hooks", () => {
        const rewardCalls: string[] = [];
        const completions: string[] = [];

        signalBus.on(
            QUEST_MISSION_COMPLETED_SIGNAL,
            (event: { missionId: string }) => {
                completions.push(event.missionId);
            },
        );

        const service = createQuestMissionService({
            rewardHandlers: {
                xp: (context) => {
                    rewardCalls.push(
                        `${context.missionId}:${context.objectiveId ?? "mission"}:xp`,
                    );
                },
                gold: (context) => {
                    rewardCalls.push(
                        `${context.missionId}:${context.objectiveId ?? "mission"}:gold`,
                    );
                },
            },
        });

        service.registerMission({
            id: "quest-reward",
            title: "Reward",
            objectives: [
                {
                    id: "o1",
                    label: "Obj",
                    rewards: [{ id: "xp" }],
                },
            ],
            rewards: [{ id: "gold" }],
        });

        service.activateMission("quest-reward");
        service.completeObjective("quest-reward", "o1");

        expect(completions).toEqual(["quest-reward"]);
        expect(rewardCalls).toEqual([
            "quest-reward:o1:xp",
            "quest-reward:mission:gold",
        ]);
    });

    it("supports mission failure and failed signal emission", () => {
        const failed: string[] = [];
        signalBus.on(
            QUEST_MISSION_FAILED_SIGNAL,
            (event: { missionId: string }) => {
                failed.push(event.missionId);
            },
        );

        const service = createQuestMissionService({ now: () => 77 });
        service.registerMission({
            id: "quest-fail",
            title: "Fail",
            objectives: [{ id: "o1", label: "Obj" }],
        });

        service.activateMission("quest-fail");
        expect(service.setMissionFailed("quest-fail", "player-dead")).toBe(
            true,
        );

        const mission = service.getMission("quest-fail");
        expect(mission?.status).toBe("failed");
        expect(mission?.failedAtMs).toBe(77);
        expect(failed).toEqual(["quest-fail"]);

        expect(service.completeObjective("quest-fail", "o1")).toBe(false);
    });

    it("rejects malformed definitions and filters listing by status", () => {
        const service = createQuestMissionService();

        expect(
            service.registerMission({
                id: "",
                title: "bad",
                objectives: [{ id: "a", label: "A" }],
            }),
        ).toBe(false);

        expect(
            service.registerMission({
                id: "dup",
                title: "dup",
                objectives: [
                    { id: "a", label: "A" },
                    { id: "a", label: "B" },
                ],
            }),
        ).toBe(false);

        service.registerMission({
            id: "pending",
            title: "pending",
            objectives: [{ id: "a", label: "A" }],
        });
        service.registerMission({
            id: "active",
            title: "active",
            objectives: [{ id: "a", label: "A" }],
        });

        service.activateMission("active");

        expect(
            service.listMissions("pending").map((mission) => mission.id),
        ).toEqual(["pending"]);
        expect(
            service.listMissions("active").map((mission) => mission.id),
        ).toEqual(["active"]);

        expect(service.unregisterMission("pending")).toBe(true);
        expect(service.getMission("pending")).toBeNull();
    });
});
