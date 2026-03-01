export type CheckpointDefinition = {
    id: string;
    x: number;
    y: number;
    transition?: string;
    audioCue?: string;
};

export type CheckpointSnapshot = {
    activeCheckpointId: string | null;
    checkpoints: CheckpointDefinition[];
};

export type CheckpointRespawnResult = {
    checkpointId: string;
    x: number;
    y: number;
    transition?: string;
    audioCue?: string;
};

export type CheckpointRespawnService = {
    registerCheckpoint: (checkpoint: CheckpointDefinition) => boolean;
    activateCheckpoint: (checkpointId: string) => boolean;
    getActiveCheckpoint: () => CheckpointDefinition | null;
    respawn: () => CheckpointRespawnResult | null;
    exportSnapshot: () => CheckpointSnapshot;
    importSnapshot: (snapshot: CheckpointSnapshot) => boolean;
};

export function createCheckpointRespawnService(): CheckpointRespawnService {
    const checkpointsById = new Map<string, CheckpointDefinition>();
    let activeCheckpointId: string | null = null;

    const normalizeCheckpoint = (
        checkpoint: CheckpointDefinition,
    ): CheckpointDefinition | null => {
        const id = checkpoint.id.trim();
        if (
            !id ||
            !Number.isFinite(checkpoint.x) ||
            !Number.isFinite(checkpoint.y)
        ) {
            return null;
        }

        return {
            id,
            x: checkpoint.x,
            y: checkpoint.y,
            ...(checkpoint.transition?.trim()
                ? { transition: checkpoint.transition.trim() }
                : {}),
            ...(checkpoint.audioCue?.trim()
                ? { audioCue: checkpoint.audioCue.trim() }
                : {}),
        };
    };

    return {
        registerCheckpoint: (checkpoint) => {
            const normalized = normalizeCheckpoint(checkpoint);
            if (!normalized) {
                return false;
            }

            checkpointsById.set(normalized.id, normalized);
            if (!activeCheckpointId) {
                activeCheckpointId = normalized.id;
            }

            return true;
        },
        activateCheckpoint: (checkpointId) => {
            const id = checkpointId.trim();
            if (!id || !checkpointsById.has(id)) {
                return false;
            }

            activeCheckpointId = id;
            return true;
        },
        getActiveCheckpoint: () => {
            if (!activeCheckpointId) {
                return null;
            }

            const checkpoint = checkpointsById.get(activeCheckpointId);
            return checkpoint ? { ...checkpoint } : null;
        },
        respawn: () => {
            if (!activeCheckpointId) {
                return null;
            }

            const checkpoint = checkpointsById.get(activeCheckpointId);
            if (!checkpoint) {
                return null;
            }

            return {
                checkpointId: checkpoint.id,
                x: checkpoint.x,
                y: checkpoint.y,
                ...(checkpoint.transition
                    ? { transition: checkpoint.transition }
                    : {}),
                ...(checkpoint.audioCue
                    ? { audioCue: checkpoint.audioCue }
                    : {}),
            };
        },
        exportSnapshot: () => ({
            activeCheckpointId,
            checkpoints: Array.from(checkpointsById.values()).map(
                (checkpoint) => ({
                    ...checkpoint,
                }),
            ),
        }),
        importSnapshot: (snapshot) => {
            if (!snapshot || !Array.isArray(snapshot.checkpoints)) {
                return false;
            }

            checkpointsById.clear();
            activeCheckpointId = null;
            for (const checkpoint of snapshot.checkpoints) {
                const normalized = normalizeCheckpoint(checkpoint);
                if (!normalized) {
                    continue;
                }

                checkpointsById.set(normalized.id, normalized);
            }

            if (
                snapshot.activeCheckpointId &&
                checkpointsById.has(snapshot.activeCheckpointId)
            ) {
                activeCheckpointId = snapshot.activeCheckpointId;
            } else if (checkpointsById.size > 0) {
                activeCheckpointId = Array.from(checkpointsById.keys())[0];
            }

            return true;
        },
    };
}
