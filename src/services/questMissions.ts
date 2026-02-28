import { signalBus } from "@/services/signalBus";

export type QuestMissionStatus = "pending" | "active" | "completed" | "failed";

export type QuestReward = {
    id: string;
    payload?: Record<string, unknown>;
};

export type QuestObjectiveDefinition = {
    id: string;
    label: string;
    nextObjectiveIds?: string[];
    rewards?: QuestReward[];
};

export type QuestMissionDefinition = {
    id: string;
    title: string;
    objectives: QuestObjectiveDefinition[];
    startObjectiveIds?: string[];
    rewards?: QuestReward[];
};

export type QuestObjectiveRuntime = {
    id: string;
    label: string;
    status: QuestMissionStatus;
    nextObjectiveIds: string[];
    progress: number;
    rewards: QuestReward[];
};

export type QuestMissionRuntime = {
    id: string;
    title: string;
    status: QuestMissionStatus;
    objectives: Record<string, QuestObjectiveRuntime>;
    startObjectiveIds: string[];
    rewards: QuestReward[];
    activatedAtMs: number | null;
    completedAtMs: number | null;
    failedAtMs: number | null;
};

export type QuestRewardContext = {
    missionId: string;
    objectiveId?: string;
    reward: QuestReward;
    atMs: number;
};

export type QuestRewardHandler = (context: QuestRewardContext) => void;

export type QuestMissionService = {
    registerMission: (definition: QuestMissionDefinition) => boolean;
    unregisterMission: (missionId: string) => boolean;
    activateMission: (missionId: string) => boolean;
    setMissionFailed: (missionId: string, reason?: string) => boolean;
    completeObjective: (
        missionId: string,
        objectiveId: string,
        options?: {
            progress?: number;
        },
    ) => boolean;
    setObjectiveProgress: (
        missionId: string,
        objectiveId: string,
        progress: number,
    ) => boolean;
    getMission: (missionId: string) => QuestMissionRuntime | null;
    listMissions: (status?: QuestMissionStatus) => QuestMissionRuntime[];
    setRewardHandler: (rewardId: string, handler: QuestRewardHandler) => void;
};

export const QUEST_MISSION_PROGRESS_SIGNAL = "quest:mission:progress";
export const QUEST_MISSION_COMPLETED_SIGNAL = "quest:mission:completed";
export const QUEST_MISSION_FAILED_SIGNAL = "quest:mission:failed";

function normalizeNow(now: () => number): number {
    const value = now();
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, value);
}

function normalizeProgress(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.min(1, Math.max(0, value));
}

function cloneMissionRuntime(
    runtime: QuestMissionRuntime,
): QuestMissionRuntime {
    const objectives: Record<string, QuestObjectiveRuntime> = {};
    for (const [id, objective] of Object.entries(runtime.objectives)) {
        objectives[id] = {
            ...objective,
            nextObjectiveIds: [...objective.nextObjectiveIds],
            rewards: objective.rewards.map((reward) => ({
                id: reward.id,
                ...(reward.payload ? { payload: { ...reward.payload } } : {}),
            })),
        };
    }

    return {
        ...runtime,
        objectives,
        startObjectiveIds: [...runtime.startObjectiveIds],
        rewards: runtime.rewards.map((reward) => ({
            id: reward.id,
            ...(reward.payload ? { payload: { ...reward.payload } } : {}),
        })),
    };
}

function inferStartObjectives(
    objectives: QuestObjectiveDefinition[],
): string[] {
    const referenced = new Set<string>();
    for (const objective of objectives) {
        for (const nextId of objective.nextObjectiveIds ?? []) {
            referenced.add(nextId);
        }
    }

    return objectives
        .map((objective) => objective.id)
        .filter((objectiveId) => !referenced.has(objectiveId));
}

export function createQuestMissionService(options?: {
    now?: () => number;
    emit?: <TPayload>(signal: string, payload: TPayload) => void;
    rewardHandlers?: Record<string, QuestRewardHandler>;
}): QuestMissionService {
    const now = options?.now ?? (() => Date.now());
    const emit =
        options?.emit ??
        (<TPayload>(signal: string, payload: TPayload) => {
            signalBus.emit(signal, payload);
        });

    const rewardHandlers = new Map<string, QuestRewardHandler>(
        Object.entries(options?.rewardHandlers ?? {}),
    );
    const missionsById = new Map<string, QuestMissionRuntime>();

    const emitProgress = (
        mission: QuestMissionRuntime,
        objectiveId?: string,
    ) => {
        emit(QUEST_MISSION_PROGRESS_SIGNAL, {
            missionId: mission.id,
            missionStatus: mission.status,
            objectiveId,
            atMs: normalizeNow(now),
        });
    };

    const applyRewards = (
        mission: QuestMissionRuntime,
        rewards: QuestReward[],
        objectiveId?: string,
    ) => {
        if (rewards.length === 0) {
            return;
        }

        const atMs = normalizeNow(now);
        for (const reward of rewards) {
            const handler = rewardHandlers.get(reward.id);
            if (!handler) {
                continue;
            }

            try {
                handler({
                    missionId: mission.id,
                    ...(objectiveId ? { objectiveId } : {}),
                    reward,
                    atMs,
                });
            } catch {
                continue;
            }
        }
    };

    const getMission = (missionId: string) => {
        const normalized = missionId.trim();
        if (!normalized) {
            return null;
        }

        const mission = missionsById.get(normalized);
        return mission ? cloneMissionRuntime(mission) : null;
    };

    const listMissions = (status?: QuestMissionStatus) => {
        const missions = Array.from(missionsById.values())
            .filter((mission) => (status ? mission.status === status : true))
            .sort((left, right) => left.id.localeCompare(right.id))
            .map((mission) => cloneMissionRuntime(mission));

        return missions;
    };

    const setRewardHandler = (
        rewardId: string,
        handler: QuestRewardHandler,
    ) => {
        const normalized = rewardId.trim();
        if (!normalized) {
            return;
        }

        rewardHandlers.set(normalized, handler);
    };

    const registerMission = (definition: QuestMissionDefinition) => {
        const id = definition.id.trim();
        if (!id) {
            return false;
        }

        if (definition.objectives.length === 0) {
            return false;
        }

        const objectiveIds = new Set<string>();
        const objectives: Record<string, QuestObjectiveRuntime> = {};

        for (const objectiveDefinition of definition.objectives) {
            const objectiveId = objectiveDefinition.id.trim();
            if (!objectiveId || objectiveIds.has(objectiveId)) {
                return false;
            }

            objectiveIds.add(objectiveId);
            objectives[objectiveId] = {
                id: objectiveId,
                label: objectiveDefinition.label.trim() || objectiveId,
                status: "pending",
                nextObjectiveIds: (
                    objectiveDefinition.nextObjectiveIds ?? []
                ).map((nextId) => nextId.trim()),
                progress: 0,
                rewards: (objectiveDefinition.rewards ?? []).map((reward) => ({
                    id: reward.id.trim(),
                    ...(reward.payload
                        ? { payload: { ...reward.payload } }
                        : {}),
                })),
            };
        }

        for (const objective of Object.values(objectives)) {
            if (
                objective.nextObjectiveIds.some(
                    (nextId) => !objectiveIds.has(nextId),
                )
            ) {
                return false;
            }
        }

        const startObjectiveIds =
            definition.startObjectiveIds &&
            definition.startObjectiveIds.length > 0
                ? definition.startObjectiveIds.map((objectiveId) =>
                      objectiveId.trim(),
                  )
                : inferStartObjectives(definition.objectives);

        if (
            startObjectiveIds.length === 0 ||
            startObjectiveIds.some((idValue) => !objectiveIds.has(idValue))
        ) {
            return false;
        }

        missionsById.set(id, {
            id,
            title: definition.title.trim() || id,
            status: "pending",
            objectives,
            startObjectiveIds,
            rewards: (definition.rewards ?? []).map((reward) => ({
                id: reward.id.trim(),
                ...(reward.payload ? { payload: { ...reward.payload } } : {}),
            })),
            activatedAtMs: null,
            completedAtMs: null,
            failedAtMs: null,
        });

        return true;
    };

    const unregisterMission = (missionId: string) => {
        const normalized = missionId.trim();
        if (!normalized) {
            return false;
        }

        return missionsById.delete(normalized);
    };

    const activateMission = (missionId: string) => {
        const normalized = missionId.trim();
        if (!normalized) {
            return false;
        }

        const mission = missionsById.get(normalized);
        if (!mission || mission.status !== "pending") {
            return false;
        }

        mission.status = "active";
        mission.activatedAtMs = normalizeNow(now);

        for (const objectiveId of mission.startObjectiveIds) {
            const objective = mission.objectives[objectiveId];
            if (!objective || objective.status !== "pending") {
                continue;
            }

            objective.status = "active";
            objective.progress = Math.max(objective.progress, 0);
        }

        emitProgress(mission);
        return true;
    };

    const maybeCompleteMission = (mission: QuestMissionRuntime) => {
        if (mission.status !== "active") {
            return;
        }

        const allCompleted = Object.values(mission.objectives).every(
            (objective) => objective.status === "completed",
        );

        if (!allCompleted) {
            return;
        }

        mission.status = "completed";
        mission.completedAtMs = normalizeNow(now);
        applyRewards(mission, mission.rewards);
        emit(QUEST_MISSION_COMPLETED_SIGNAL, {
            missionId: mission.id,
            atMs: mission.completedAtMs,
        });
    };

    const setObjectiveProgress = (
        missionId: string,
        objectiveId: string,
        progress: number,
    ) => {
        const mission = missionsById.get(missionId.trim());
        if (!mission || mission.status !== "active") {
            return false;
        }

        const objective = mission.objectives[objectiveId.trim()];
        if (!objective || objective.status !== "active") {
            return false;
        }

        objective.progress = normalizeProgress(progress);
        emitProgress(mission, objective.id);
        return true;
    };

    const completeObjective = (
        missionId: string,
        objectiveId: string,
        completeOptions?: {
            progress?: number;
        },
    ) => {
        const mission = missionsById.get(missionId.trim());
        if (!mission || mission.status !== "active") {
            return false;
        }

        const objective = mission.objectives[objectiveId.trim()];
        if (!objective || objective.status !== "active") {
            return false;
        }

        objective.status = "completed";
        objective.progress = normalizeProgress(completeOptions?.progress ?? 1);

        for (const nextObjectiveId of objective.nextObjectiveIds) {
            const nextObjective = mission.objectives[nextObjectiveId];
            if (!nextObjective || nextObjective.status !== "pending") {
                continue;
            }

            nextObjective.status = "active";
            nextObjective.progress = Math.max(nextObjective.progress, 0);
        }

        applyRewards(mission, objective.rewards, objective.id);
        emitProgress(mission, objective.id);

        maybeCompleteMission(mission);
        return true;
    };

    const setMissionFailed = (missionId: string, reason?: string) => {
        const mission = missionsById.get(missionId.trim());
        if (
            !mission ||
            mission.status === "completed" ||
            mission.status === "failed"
        ) {
            return false;
        }

        mission.status = "failed";
        mission.failedAtMs = normalizeNow(now);

        for (const objective of Object.values(mission.objectives)) {
            if (objective.status === "active") {
                objective.status = "failed";
            }
        }

        emit(QUEST_MISSION_FAILED_SIGNAL, {
            missionId: mission.id,
            reason,
            atMs: mission.failedAtMs,
        });
        emitProgress(mission);

        return true;
    };

    return {
        registerMission,
        unregisterMission,
        activateMission,
        setMissionFailed,
        completeObjective,
        setObjectiveProgress,
        getMission,
        listMissions,
        setRewardHandler,
    };
}

export const questMissions = createQuestMissionService();
