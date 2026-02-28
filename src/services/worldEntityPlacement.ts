import type { EntityType, Position } from "@/logic/entity/Entity";
import type { SpawnEntityTag } from "@/logic/worldgen/dataBusSpawn";
import { signalBus } from "@/services/signalBus";

export const WORLD_ENTITY_PLACEMENT_PAYLOAD_VERSION =
    "um-placement-v1" as const;

export type PlacementGridOptions = {
    enabled: boolean;
    size: number;
};

export type PlacementWorldBounds = {
    width: number;
    height: number;
};

export type PlacementEntityRecord = {
    id: string;
    name: string;
    type: EntityType;
    tag: SpawnEntityTag;
    position: Position;
    roomIndex: number;
    tileId?: number;
};

export type PlacementEntityInput = {
    id?: string;
    name: string;
    type: EntityType;
    tag: SpawnEntityTag;
    x: number;
    y: number;
    z?: number;
    roomIndex?: number;
    tileId?: number;
};

export type PlacementPayload = {
    version: typeof WORLD_ENTITY_PLACEMENT_PAYLOAD_VERSION;
    world: PlacementWorldBounds;
    grid: PlacementGridOptions;
    entities: PlacementEntityRecord[];
};

export type PlacementValidationResult = {
    ok: boolean;
    code:
        | "missing-name"
        | "missing-id"
        | "duplicate-id"
        | "out-of-bounds"
        | "missing-entity"
        | "invalid-payload"
        | null;
    message: string | null;
};

export type WorldEntityPlacementSnapshot = {
    world: PlacementWorldBounds;
    grid: PlacementGridOptions;
    selectedEntityId: string | null;
    entityCount: number;
    entities: PlacementEntityRecord[];
};

export type WorldEntityPlacementService = {
    setWorldBounds: (patch: Partial<PlacementWorldBounds>) => void;
    setGridOptions: (patch: Partial<PlacementGridOptions>) => void;
    placeEntity: (input: PlacementEntityInput) => PlacementValidationResult;
    moveEntity: (
        entityId: string,
        x: number,
        y: number,
    ) => PlacementValidationResult;
    deleteEntity: (entityId: string) => boolean;
    selectEntity: (entityId: string | null) => boolean;
    moveSelected: (x: number, y: number) => PlacementValidationResult;
    duplicateSelected: (options?: {
        offsetX?: number;
        offsetY?: number;
        idSuffix?: string;
    }) => PlacementValidationResult;
    exportPayload: (options?: { pretty?: boolean }) => string;
    importPayload: (raw: string) => PlacementValidationResult;
    getSnapshot: () => WorldEntityPlacementSnapshot;
};

export const WORLD_ENTITY_PLACEMENT_CHANGED_SIGNAL = "world:placement:changed";
export const WORLD_ENTITY_SELECTED_SIGNAL = "world:placement:selected";
export const WORLD_ENTITY_INVALID_SIGNAL = "world:placement:invalid";
export const WORLD_ENTITY_IMPORTED_SIGNAL = "world:placement:imported";

function normalizePositiveInt(
    value: number | undefined,
    fallback: number,
): number {
    if (!Number.isFinite(value)) {
        return fallback;
    }

    return Math.max(1, Math.floor(value ?? fallback));
}

function normalizeFinite(value: number | undefined, fallback: number): number {
    if (!Number.isFinite(value)) {
        return fallback;
    }

    return value ?? fallback;
}

function createFailure(
    code: PlacementValidationResult["code"],
    message: string,
): PlacementValidationResult {
    return {
        ok: false,
        code,
        message,
    };
}

function createSuccess(): PlacementValidationResult {
    return {
        ok: true,
        code: null,
        message: null,
    };
}

export function createWorldEntityPlacementService(options?: {
    emit?: <TPayload>(signal: string, payload: TPayload) => void;
}): WorldEntityPlacementService {
    const emit =
        options?.emit ??
        (<TPayload>(signal: string, payload: TPayload) => {
            signalBus.emit(signal, payload);
        });

    let world: PlacementWorldBounds = {
        width: 1024,
        height: 1024,
    };
    let grid: PlacementGridOptions = {
        enabled: true,
        size: 16,
    };
    let selectedEntityId: string | null = null;
    const entitiesById = new Map<string, PlacementEntityRecord>();

    const snap = (value: number) => {
        if (!grid.enabled) {
            return value;
        }

        return Math.round(value / grid.size) * grid.size;
    };

    const withinBounds = (x: number, y: number): boolean => {
        return x >= 0 && y >= 0 && x <= world.width && y <= world.height;
    };

    const emitChanged = () => {
        emit(WORLD_ENTITY_PLACEMENT_CHANGED_SIGNAL, {
            entityCount: entitiesById.size,
            selectedEntityId,
        });
    };

    const cloneRecord = (
        record: PlacementEntityRecord,
    ): PlacementEntityRecord => {
        return {
            ...record,
            position: {
                x: record.position.x,
                y: record.position.y,
                ...(Number.isFinite(record.position.z)
                    ? { z: record.position.z }
                    : {}),
            },
        };
    };

    const getSortedEntities = (): PlacementEntityRecord[] => {
        return Array.from(entitiesById.values())
            .sort((left, right) => left.id.localeCompare(right.id))
            .map((record) => cloneRecord(record));
    };

    const validatePosition = (
        x: number,
        y: number,
    ): PlacementValidationResult => {
        if (!withinBounds(x, y)) {
            const failure = createFailure(
                "out-of-bounds",
                "Entity placement is outside world bounds.",
            );
            emit(WORLD_ENTITY_INVALID_SIGNAL, failure);
            return failure;
        }

        return createSuccess();
    };

    const setWorldBounds = (patch: Partial<PlacementWorldBounds>) => {
        world = {
            width: normalizePositiveInt(patch.width, world.width),
            height: normalizePositiveInt(patch.height, world.height),
        };
        emitChanged();
    };

    const setGridOptions = (patch: Partial<PlacementGridOptions>) => {
        grid = {
            enabled:
                typeof patch.enabled === "boolean"
                    ? patch.enabled
                    : grid.enabled,
            size: normalizePositiveInt(patch.size, grid.size),
        };
        emitChanged();
    };

    const placeEntity = (
        input: PlacementEntityInput,
    ): PlacementValidationResult => {
        const id = input.id?.trim() || `${input.tag}:${entitiesById.size}`;
        const name = input.name.trim();

        if (!id) {
            const failure = createFailure(
                "missing-id",
                "Entity id is required.",
            );
            emit(WORLD_ENTITY_INVALID_SIGNAL, failure);
            return failure;
        }

        if (!name) {
            const failure = createFailure(
                "missing-name",
                "Entity name is required.",
            );
            emit(WORLD_ENTITY_INVALID_SIGNAL, failure);
            return failure;
        }

        if (entitiesById.has(id)) {
            const failure = createFailure(
                "duplicate-id",
                "Entity id already exists.",
            );
            emit(WORLD_ENTITY_INVALID_SIGNAL, failure);
            return failure;
        }

        const x = snap(normalizeFinite(input.x, 0));
        const y = snap(normalizeFinite(input.y, 0));
        const validation = validatePosition(x, y);
        if (!validation.ok) {
            return validation;
        }

        entitiesById.set(id, {
            id,
            name,
            type: input.type,
            tag: input.tag,
            position: {
                x,
                y,
                ...(Number.isFinite(input.z) ? { z: input.z } : {}),
            },
            roomIndex: Math.max(
                0,
                Math.floor(normalizeFinite(input.roomIndex, 0)),
            ),
            ...(Number.isFinite(input.tileId)
                ? { tileId: Math.floor(input.tileId ?? 0) }
                : {}),
        });

        if (!selectedEntityId) {
            selectedEntityId = id;
            emit(WORLD_ENTITY_SELECTED_SIGNAL, { entityId: selectedEntityId });
        }

        emitChanged();
        return createSuccess();
    };

    const moveEntity = (
        entityId: string,
        x: number,
        y: number,
    ): PlacementValidationResult => {
        const id = entityId.trim();
        const entity = entitiesById.get(id);
        if (!entity) {
            const failure = createFailure(
                "missing-entity",
                "Entity could not be found.",
            );
            emit(WORLD_ENTITY_INVALID_SIGNAL, failure);
            return failure;
        }

        const nextX = snap(normalizeFinite(x, entity.position.x));
        const nextY = snap(normalizeFinite(y, entity.position.y));

        const validation = validatePosition(nextX, nextY);
        if (!validation.ok) {
            return validation;
        }

        entity.position = {
            ...entity.position,
            x: nextX,
            y: nextY,
        };

        emitChanged();
        return createSuccess();
    };

    const deleteEntity = (entityId: string): boolean => {
        const id = entityId.trim();
        if (!id) {
            return false;
        }

        const deleted = entitiesById.delete(id);
        if (!deleted) {
            return false;
        }

        if (selectedEntityId === id) {
            selectedEntityId = null;
            emit(WORLD_ENTITY_SELECTED_SIGNAL, { entityId: null });
        }

        emitChanged();
        return true;
    };

    const selectEntity = (entityId: string | null): boolean => {
        if (entityId === null) {
            selectedEntityId = null;
            emit(WORLD_ENTITY_SELECTED_SIGNAL, { entityId: null });
            emitChanged();
            return true;
        }

        const id = entityId.trim();
        if (!entitiesById.has(id)) {
            return false;
        }

        selectedEntityId = id;
        emit(WORLD_ENTITY_SELECTED_SIGNAL, { entityId: id });
        emitChanged();
        return true;
    };

    const moveSelected = (x: number, y: number) => {
        if (!selectedEntityId) {
            const failure = createFailure(
                "missing-entity",
                "No selected entity to move.",
            );
            emit(WORLD_ENTITY_INVALID_SIGNAL, failure);
            return failure;
        }

        return moveEntity(selectedEntityId, x, y);
    };

    const duplicateSelected = (duplicateOptions?: {
        offsetX?: number;
        offsetY?: number;
        idSuffix?: string;
    }): PlacementValidationResult => {
        if (!selectedEntityId) {
            const failure = createFailure(
                "missing-entity",
                "No selected entity to duplicate.",
            );
            emit(WORLD_ENTITY_INVALID_SIGNAL, failure);
            return failure;
        }

        const source = entitiesById.get(selectedEntityId);
        if (!source) {
            const failure = createFailure(
                "missing-entity",
                "Selected entity could not be found.",
            );
            emit(WORLD_ENTITY_INVALID_SIGNAL, failure);
            return failure;
        }

        const suffix = duplicateOptions?.idSuffix?.trim() || "copy";
        const baseId = `${source.id}:${suffix}`;
        let candidateId = baseId;
        let index = 1;

        while (entitiesById.has(candidateId)) {
            candidateId = `${baseId}:${index}`;
            index += 1;
        }

        const offsetX = normalizeFinite(duplicateOptions?.offsetX, grid.size);
        const offsetY = normalizeFinite(duplicateOptions?.offsetY, grid.size);

        return placeEntity({
            id: candidateId,
            name: `${source.name} Copy`,
            type: source.type,
            tag: source.tag,
            x: source.position.x + offsetX,
            y: source.position.y + offsetY,
            z: source.position.z,
            roomIndex: source.roomIndex,
            tileId: source.tileId,
        });
    };

    const exportPayload = (options?: { pretty?: boolean }) => {
        const payload: PlacementPayload = {
            version: WORLD_ENTITY_PLACEMENT_PAYLOAD_VERSION,
            world: { ...world },
            grid: { ...grid },
            entities: getSortedEntities(),
        };

        return JSON.stringify(payload, null, options?.pretty ? 2 : 0);
    };

    const importPayload = (raw: string): PlacementValidationResult => {
        let parsed: unknown;

        try {
            parsed = JSON.parse(raw);
        } catch {
            const failure = createFailure(
                "invalid-payload",
                "Placement payload is not valid JSON.",
            );
            emit(WORLD_ENTITY_INVALID_SIGNAL, failure);
            return failure;
        }

        if (typeof parsed !== "object" || parsed === null) {
            const failure = createFailure(
                "invalid-payload",
                "Placement payload must be an object.",
            );
            emit(WORLD_ENTITY_INVALID_SIGNAL, failure);
            return failure;
        }

        const payload = parsed as Partial<PlacementPayload>;
        if (payload.version !== WORLD_ENTITY_PLACEMENT_PAYLOAD_VERSION) {
            const failure = createFailure(
                "invalid-payload",
                "Placement payload version is unsupported.",
            );
            emit(WORLD_ENTITY_INVALID_SIGNAL, failure);
            return failure;
        }

        if (
            !payload.world ||
            !payload.grid ||
            !Array.isArray(payload.entities)
        ) {
            const failure = createFailure(
                "invalid-payload",
                "Placement payload is missing required fields.",
            );
            emit(WORLD_ENTITY_INVALID_SIGNAL, failure);
            return failure;
        }

        const nextWorld = {
            width: normalizePositiveInt(payload.world.width, world.width),
            height: normalizePositiveInt(payload.world.height, world.height),
        };
        const nextGrid = {
            enabled:
                typeof payload.grid.enabled === "boolean"
                    ? payload.grid.enabled
                    : grid.enabled,
            size: normalizePositiveInt(payload.grid.size, grid.size),
        };

        const nextEntities = new Map<string, PlacementEntityRecord>();
        for (const item of payload.entities) {
            const id = item.id?.trim();
            const name = item.name?.trim();
            if (!id || !name || nextEntities.has(id)) {
                const failure = createFailure(
                    "invalid-payload",
                    "Placement payload contains invalid entities.",
                );
                emit(WORLD_ENTITY_INVALID_SIGNAL, failure);
                return failure;
            }

            const x = nextGrid.enabled
                ? Math.round(
                      normalizeFinite(item.position?.x, 0) / nextGrid.size,
                  ) * nextGrid.size
                : normalizeFinite(item.position?.x, 0);
            const y = nextGrid.enabled
                ? Math.round(
                      normalizeFinite(item.position?.y, 0) / nextGrid.size,
                  ) * nextGrid.size
                : normalizeFinite(item.position?.y, 0);

            if (x < 0 || y < 0 || x > nextWorld.width || y > nextWorld.height) {
                const failure = createFailure(
                    "invalid-payload",
                    "Placement payload has out-of-bounds entities.",
                );
                emit(WORLD_ENTITY_INVALID_SIGNAL, failure);
                return failure;
            }

            nextEntities.set(id, {
                id,
                name,
                type: item.type ?? "object",
                tag: item.tag ?? "item",
                position: {
                    x,
                    y,
                    ...(Number.isFinite(item.position?.z)
                        ? { z: item.position?.z }
                        : {}),
                },
                roomIndex: Math.max(
                    0,
                    Math.floor(normalizeFinite(item.roomIndex, 0)),
                ),
                ...(Number.isFinite(item.tileId)
                    ? { tileId: Math.floor(item.tileId ?? 0) }
                    : {}),
            });
        }

        world = nextWorld;
        grid = nextGrid;
        entitiesById.clear();
        for (const [id, entity] of nextEntities.entries()) {
            entitiesById.set(id, entity);
        }

        selectedEntityId = getSortedEntities()[0]?.id ?? null;

        emit(WORLD_ENTITY_IMPORTED_SIGNAL, {
            entityCount: entitiesById.size,
            selectedEntityId,
        });
        emit(WORLD_ENTITY_SELECTED_SIGNAL, {
            entityId: selectedEntityId,
        });
        emitChanged();

        return createSuccess();
    };

    const getSnapshot = (): WorldEntityPlacementSnapshot => {
        const entities = getSortedEntities();

        return {
            world: { ...world },
            grid: { ...grid },
            selectedEntityId,
            entityCount: entities.length,
            entities,
        };
    };

    return {
        setWorldBounds,
        setGridOptions,
        placeEntity,
        moveEntity,
        deleteEntity,
        selectEntity,
        moveSelected,
        duplicateSelected,
        exportPayload,
        importPayload,
        getSnapshot,
    };
}

export const worldEntityPlacement = createWorldEntityPlacementService();
