import type { GameState } from "@/services/DataBus";
import { createVersionedSchemaMigration } from "@/services/schemaMigration";

export const SAVE_GAME_VERSION = 1 as const;
export const SAVE_GAME_LEGACY_VERSION = 0 as const;

export type SaveGameVersion = typeof SAVE_GAME_VERSION;

export type SaveEntityV1 = {
    id: string;
    type: GameState["entitiesById"][string]["type"];
    name: string;
    spriteImageSheet: string;
    spriteSize: number;
    spriteSheetTileWidth: number;
    spriteSheetTileHeight: number;
    characterSpriteTiles: number[][];
    scaler: number;
    position: { x: number; y: number; z?: number };
    fps?: number;
    currentAnimation: string;
    animations: Array<{
        spriteSheet: string;
        name: string;
        frames: number[][];
    }>;
    collider?: {
        type: "rectangle";
        size: { width: number; height: number };
        offset: { x: number; y: number };
        collisionResponse: "block" | "overlap";
        layer: number;
        collidesWith: number;
        debugDraw?: boolean;
    };
    physicsBody?: {
        enabled: boolean;
        affectedByGravity: boolean;
        gravityScale: number;
        velocity: { x: number; y: number };
        dragX: number;
        maxVelocityY?: number;
    };
};

export type SaveGameStateV1 = {
    entitiesById: Record<string, SaveEntityV1>;
    playerId: string;
    worldSize: { width: number; height: number };
    camera: {
        x: number;
        y: number;
        viewport: { width: number; height: number };
        mode: "follow-player" | "manual";
        clampToWorld: boolean;
        followTargetId: string | null;
    };
    worldBoundsEnabled: boolean;
    worldBoundsIds: string[];
};

export type SaveGameV1 = {
    version: SaveGameVersion;
    savedAt: string;
    state: SaveGameStateV1;
};

export type SaveGame = SaveGameV1;

export type SaveGameStateV0 = Omit<
    SaveGameStateV1,
    "camera" | "worldBoundsEnabled" | "worldBoundsIds"
> & {
    camera: {
        x: number;
        y: number;
        viewport: { width: number; height: number };
        mode: "follow-player" | "manual";
    };
};

export type SaveGameV0 = {
    version: typeof SAVE_GAME_LEGACY_VERSION;
    savedAt: string;
    state: SaveGameStateV0;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === "object" && value !== null;
};

const isFiniteNumber = (value: unknown): value is number => {
    return typeof value === "number" && Number.isFinite(value);
};

const isNumberArrayPair = (value: unknown): value is number[] => {
    return (
        Array.isArray(value) &&
        value.length === 2 &&
        value.every((item) => isFiniteNumber(item))
    );
};

const isTileFrameGrid = (value: unknown): value is number[][] => {
    return (
        Array.isArray(value) && value.every((entry) => isNumberArrayPair(entry))
    );
};

const isPosition = (
    value: unknown,
): value is { x: number; y: number; z?: number } => {
    if (!isRecord(value)) return false;
    if (!isFiniteNumber(value.x) || !isFiniteNumber(value.y)) return false;
    if (value.z !== undefined && !isFiniteNumber(value.z)) return false;
    return true;
};

const isAnimation = (
    value: unknown,
): value is SaveEntityV1["animations"][number] => {
    if (!isRecord(value)) return false;

    return (
        typeof value.spriteSheet === "string" &&
        typeof value.name === "string" &&
        isTileFrameGrid(value.frames)
    );
};

const isCollider = (
    value: unknown,
): value is NonNullable<SaveEntityV1["collider"]> => {
    if (!isRecord(value)) return false;

    if (value.type !== "rectangle") return false;
    if (!isRecord(value.size) || !isRecord(value.offset)) return false;
    if (
        !isFiniteNumber(value.size.width) ||
        !isFiniteNumber(value.size.height) ||
        !isFiniteNumber(value.offset.x) ||
        !isFiniteNumber(value.offset.y)
    ) {
        return false;
    }

    if (
        value.collisionResponse !== "block" &&
        value.collisionResponse !== "overlap"
    ) {
        return false;
    }

    if (!isFiniteNumber(value.layer) || !isFiniteNumber(value.collidesWith)) {
        return false;
    }

    if (value.debugDraw !== undefined && typeof value.debugDraw !== "boolean") {
        return false;
    }

    return true;
};

const isPhysicsBody = (
    value: unknown,
): value is NonNullable<SaveEntityV1["physicsBody"]> => {
    if (!isRecord(value)) return false;
    if (!isRecord(value.velocity)) return false;

    if (
        typeof value.enabled !== "boolean" ||
        typeof value.affectedByGravity !== "boolean" ||
        !isFiniteNumber(value.gravityScale) ||
        !isFiniteNumber(value.velocity.x) ||
        !isFiniteNumber(value.velocity.y) ||
        !isFiniteNumber(value.dragX)
    ) {
        return false;
    }

    if (
        value.maxVelocityY !== undefined &&
        !isFiniteNumber(value.maxVelocityY)
    ) {
        return false;
    }

    return true;
};

const isSaveEntityV1 = (value: unknown): value is SaveEntityV1 => {
    if (!isRecord(value)) return false;

    if (
        typeof value.id !== "string" ||
        (value.type !== "player" &&
            value.type !== "enemy" &&
            value.type !== "object") ||
        typeof value.name !== "string" ||
        typeof value.spriteImageSheet !== "string" ||
        !isFiniteNumber(value.spriteSize) ||
        !isFiniteNumber(value.spriteSheetTileWidth) ||
        !isFiniteNumber(value.spriteSheetTileHeight) ||
        !isTileFrameGrid(value.characterSpriteTiles) ||
        !isFiniteNumber(value.scaler) ||
        !isPosition(value.position) ||
        typeof value.currentAnimation !== "string" ||
        !Array.isArray(value.animations) ||
        !value.animations.every((animation) => isAnimation(animation))
    ) {
        return false;
    }

    if (value.fps !== undefined && !isFiniteNumber(value.fps)) {
        return false;
    }

    if (value.collider !== undefined && !isCollider(value.collider)) {
        return false;
    }

    if (value.physicsBody !== undefined && !isPhysicsBody(value.physicsBody)) {
        return false;
    }

    return true;
};

const isSaveGameStateV1 = (value: unknown): value is SaveGameStateV1 => {
    if (!isRecord(value)) return false;

    if (!isRecord(value.entitiesById)) return false;
    for (const [entityId, entity] of Object.entries(value.entitiesById)) {
        if (!entityId) return false;
        if (!isSaveEntityV1(entity)) return false;
    }

    if (typeof value.playerId !== "string") return false;
    if (!(value.playerId in value.entitiesById)) return false;

    if (!isRecord(value.worldSize)) return false;
    if (
        !isFiniteNumber(value.worldSize.width) ||
        !isFiniteNumber(value.worldSize.height)
    ) {
        return false;
    }

    if (!isRecord(value.camera) || !isRecord(value.camera.viewport))
        return false;

    if (
        !isFiniteNumber(value.camera.x) ||
        !isFiniteNumber(value.camera.y) ||
        !isFiniteNumber(value.camera.viewport.width) ||
        !isFiniteNumber(value.camera.viewport.height) ||
        (value.camera.mode !== "follow-player" &&
            value.camera.mode !== "manual") ||
        typeof value.camera.clampToWorld !== "boolean"
    ) {
        return false;
    }

    if (
        value.camera.followTargetId !== null &&
        typeof value.camera.followTargetId !== "string"
    ) {
        return false;
    }

    if (typeof value.worldBoundsEnabled !== "boolean") return false;

    if (
        !Array.isArray(value.worldBoundsIds) ||
        !value.worldBoundsIds.every((id) => typeof id === "string")
    ) {
        return false;
    }

    return true;
};

const isSaveGameStateV0 = (value: unknown): value is SaveGameStateV0 => {
    if (!isRecord(value)) return false;

    if (!isRecord(value.entitiesById)) return false;
    for (const [entityId, entity] of Object.entries(value.entitiesById)) {
        if (!entityId) return false;
        if (!isSaveEntityV1(entity)) return false;
    }

    if (typeof value.playerId !== "string") return false;
    if (!(value.playerId in value.entitiesById)) return false;

    if (!isRecord(value.worldSize)) return false;
    if (
        !isFiniteNumber(value.worldSize.width) ||
        !isFiniteNumber(value.worldSize.height)
    ) {
        return false;
    }

    if (!isRecord(value.camera) || !isRecord(value.camera.viewport)) {
        return false;
    }

    if (
        !isFiniteNumber(value.camera.x) ||
        !isFiniteNumber(value.camera.y) ||
        !isFiniteNumber(value.camera.viewport.width) ||
        !isFiniteNumber(value.camera.viewport.height) ||
        (value.camera.mode !== "follow-player" &&
            value.camera.mode !== "manual")
    ) {
        return false;
    }

    return true;
};

export const isSaveGameV1 = (value: unknown): value is SaveGameV1 => {
    if (!isRecord(value)) return false;

    return (
        value.version === SAVE_GAME_VERSION &&
        typeof value.savedAt === "string" &&
        isSaveGameStateV1(value.state)
    );
};

export const isSaveGameV0 = (value: unknown): value is SaveGameV0 => {
    if (!isRecord(value)) return false;

    return (
        value.version === SAVE_GAME_LEGACY_VERSION &&
        typeof value.savedAt === "string" &&
        isSaveGameStateV0(value.state)
    );
};

const migrateSaveGameV0ToV1 = (input: unknown): SaveGameV1 => {
    if (!isSaveGameV0(input)) {
        throw new Error("Invalid v0 save payload");
    }

    return {
        version: SAVE_GAME_VERSION,
        savedAt: input.savedAt,
        state: {
            entitiesById: input.state.entitiesById,
            playerId: input.state.playerId,
            worldSize: input.state.worldSize,
            camera: {
                ...input.state.camera,
                clampToWorld: true,
                followTargetId:
                    input.state.camera.mode === "follow-player"
                        ? input.state.playerId
                        : null,
            },
            worldBoundsEnabled: false,
            worldBoundsIds: [],
        },
    };
};

const saveGameMigrationPipeline = createVersionedSchemaMigration<SaveGameV1>({
    currentVersion: SAVE_GAME_VERSION,
    validateCurrent: isSaveGameV1,
    migrations: {
        [SAVE_GAME_LEGACY_VERSION]: migrateSaveGameV0ToV1,
    },
});

export const parseSaveGame = (input: unknown): SaveGame | null => {
    return isSaveGameV1(input) ? input : null;
};

export const migrateSaveGame = (input: unknown): SaveGame | null => {
    const result = saveGameMigrationPipeline.migrate(input);
    return result.ok ? result.value : null;
};

export const preflightSaveGameMigration = (input: unknown) => {
    return saveGameMigrationPipeline.preflight(input);
};
