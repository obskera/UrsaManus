import { signalBus } from "@/services/signalBus";

export type ObjectiveStatus = "pending" | "active" | "completed" | "failed";

export type ObjectiveDefinition = {
    id: string;
    label: string;
    status?: ObjectiveStatus;
};

export type ObjectiveRuntime = {
    id: string;
    label: string;
    status: ObjectiveStatus;
};

export type ObjectiveTrackerService = {
    registerObjective: (definition: ObjectiveDefinition) => boolean;
    removeObjective: (objectiveId: string) => boolean;
    transitionObjective: (
        objectiveId: string,
        status: ObjectiveStatus,
    ) => boolean;
    getObjective: (objectiveId: string) => ObjectiveRuntime | null;
    listObjectives: (status?: ObjectiveStatus) => ObjectiveRuntime[];
};

export const OBJECTIVE_STATUS_CHANGED_SIGNAL = "objective:status:changed";

export function createObjectiveTrackerService(options?: {
    emit?: <TPayload>(signal: string, payload: TPayload) => void;
}): ObjectiveTrackerService {
    const emit =
        options?.emit ??
        (<TPayload>(signal: string, payload: TPayload) => {
            signalBus.emit(signal, payload);
        });

    const objectivesById = new Map<string, ObjectiveRuntime>();

    const cloneObjective = (objective: ObjectiveRuntime): ObjectiveRuntime => ({
        ...objective,
    });

    return {
        registerObjective: (definition) => {
            const id = definition.id.trim();
            if (!id || objectivesById.has(id)) {
                return false;
            }

            objectivesById.set(id, {
                id,
                label: definition.label.trim() || id,
                status: definition.status ?? "pending",
            });

            return true;
        },
        removeObjective: (objectiveId) => {
            const id = objectiveId.trim();
            if (!id) {
                return false;
            }

            return objectivesById.delete(id);
        },
        transitionObjective: (objectiveId, status) => {
            const id = objectiveId.trim();
            const objective = objectivesById.get(id);
            if (!id || !objective || objective.status === status) {
                return false;
            }

            objective.status = status;
            emit(OBJECTIVE_STATUS_CHANGED_SIGNAL, {
                objectiveId: objective.id,
                status,
            });
            return true;
        },
        getObjective: (objectiveId) => {
            const objective = objectivesById.get(objectiveId.trim());
            return objective ? cloneObjective(objective) : null;
        },
        listObjectives: (status) =>
            Array.from(objectivesById.values())
                .filter((objective) =>
                    status ? objective.status === status : true,
                )
                .sort((left, right) => left.id.localeCompare(right.id))
                .map((objective) => cloneObjective(objective)),
    };
}
