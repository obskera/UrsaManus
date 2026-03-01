export type WaveSpawnerDefinition = {
    id: string;
    count: number;
    cadenceMs: number;
    maxActive: number;
    tags?: string[];
    difficultyScalar?: number;
};

export type WaveSpawnRequest = {
    waveId: string;
    spawnIndex: number;
    tags: string[];
    difficultyScalar: number;
};

export type WaveSpawnerService = {
    startWave: (definition: WaveSpawnerDefinition) => boolean;
    update: (deltaMs: number, activeCount: number) => WaveSpawnRequest[];
    completeSpawned: (count: number) => void;
    getState: () => {
        activeWaveId: string | null;
        totalToSpawn: number;
        spawnedCount: number;
        completedCount: number;
        pendingCount: number;
        finished: boolean;
    };
};

function normalizeInt(value: number, fallback: number): number {
    if (!Number.isFinite(value)) {
        return fallback;
    }

    return Math.max(0, Math.floor(value));
}

export function createWaveSpawnerService(): WaveSpawnerService {
    let activeWave: {
        id: string;
        count: number;
        cadenceMs: number;
        maxActive: number;
        tags: string[];
        difficultyScalar: number;
    } | null = null;

    let cadenceAccumulatorMs = 0;
    let spawnedCount = 0;
    let completedCount = 0;

    const startWave = (definition: WaveSpawnerDefinition) => {
        const id = definition.id.trim();
        const count = normalizeInt(definition.count, 0);
        const cadenceMs = Math.max(1, normalizeInt(definition.cadenceMs, 1000));
        const maxActive = Math.max(1, normalizeInt(definition.maxActive, 1));

        if (!id || count <= 0) {
            return false;
        }

        activeWave = {
            id,
            count,
            cadenceMs,
            maxActive,
            tags: (definition.tags ?? [])
                .map((tag) => tag.trim())
                .filter(Boolean),
            difficultyScalar: Number.isFinite(definition.difficultyScalar)
                ? Math.max(0, definition.difficultyScalar ?? 1)
                : 1,
        };
        cadenceAccumulatorMs = 0;
        spawnedCount = 0;
        completedCount = 0;
        return true;
    };

    const update = (
        deltaMs: number,
        activeCount: number,
    ): WaveSpawnRequest[] => {
        if (!activeWave) {
            return [];
        }

        const normalizedDelta = normalizeInt(deltaMs, 0);
        const normalizedActiveCount = Math.max(0, normalizeInt(activeCount, 0));
        if (normalizedDelta <= 0) {
            return [];
        }

        cadenceAccumulatorMs += normalizedDelta;
        const requests: WaveSpawnRequest[] = [];
        let projectedActive = normalizedActiveCount;

        while (
            cadenceAccumulatorMs >= activeWave.cadenceMs &&
            spawnedCount < activeWave.count &&
            projectedActive < activeWave.maxActive
        ) {
            cadenceAccumulatorMs -= activeWave.cadenceMs;
            spawnedCount += 1;
            projectedActive += 1;
            requests.push({
                waveId: activeWave.id,
                spawnIndex: spawnedCount,
                tags: [...activeWave.tags],
                difficultyScalar: activeWave.difficultyScalar,
            });
        }

        return requests;
    };

    const completeSpawned = (count: number) => {
        completedCount += Math.max(0, normalizeInt(count, 0));
        if (activeWave) {
            completedCount = Math.min(completedCount, activeWave.count);
        }
    };

    const getState = () => {
        const totalToSpawn = activeWave?.count ?? 0;
        const pendingCount = Math.max(0, totalToSpawn - spawnedCount);
        const finished = Boolean(
            activeWave &&
            spawnedCount >= totalToSpawn &&
            completedCount >= totalToSpawn,
        );

        return {
            activeWaveId: activeWave?.id ?? null,
            totalToSpawn,
            spawnedCount,
            completedCount,
            pendingCount,
            finished,
        };
    };

    return {
        startWave,
        update,
        completeSpawned,
        getState,
    };
}
