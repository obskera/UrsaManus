import {
    serializeDataBusState,
    rehydrateGameState,
} from "@/services/save/state";
import { migrateSaveGame, type SaveGame } from "@/services/save/schema";
import { signalBus } from "@/services/signalBus";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const SAVE_SLOT_STORAGE_KEY_PREFIX = "ursa:save-slot:";
export const SAVE_SLOT_INDEX_STORAGE_KEY = "ursa:save-slot:index";
export const SAVE_SLOT_ROLLBACK_KEY_SUFFIX = ":rollback";

export type SaveSlotMetadata = {
    slot: string;
    timestamp: string;
    playtime: number;
    version: number;
};

type SaveSlotRollbackRecord = SaveSlotMetadata & {
    id: string;
    createdAtMs: number;
    payload: SaveGame;
};

export type SaveSlotRollbackSnapshot = Omit<SaveSlotRollbackRecord, "payload">;

export type SaveSlotErrorCode =
    | "storage-unavailable"
    | "invalid-slot"
    | "missing-slot"
    | "invalid-save"
    | "rehydrate-failed"
    | "missing-rollback"
    | "storage-failed";

export type SaveSlotResult<T = void> =
    | {
          ok: true;
          value: T;
      }
    | {
          ok: false;
          code: SaveSlotErrorCode;
          message: string;
      };

export type SaveSlotService = {
    saveSlot: (
        slot: string,
        options?: {
            playtime?: number;
            createRollbackSnapshot?: boolean;
        },
    ) => SaveSlotResult<SaveSlotMetadata>;
    loadSlot: (slot: string) => SaveSlotResult<SaveSlotMetadata>;
    deleteSlot: (slot: string) => SaveSlotResult<boolean>;
    listSlots: () => SaveSlotMetadata[];
    getSlot: (slot: string) => SaveSlotMetadata | null;
    listRollbackSnapshots: (slot: string) => SaveSlotRollbackSnapshot[];
    restoreRollbackSnapshot: (
        slot: string,
        snapshotId: string,
    ) => SaveSlotResult<SaveSlotMetadata>;
};

export const SAVE_SLOT_SAVED_SIGNAL = "save:slot:saved";
export const SAVE_SLOT_LOADED_SIGNAL = "save:slot:loaded";
export const SAVE_SLOT_DELETED_SIGNAL = "save:slot:deleted";
export const SAVE_SLOT_ROLLBACK_CREATED_SIGNAL = "save:slot:rollback:created";
export const SAVE_SLOT_ROLLBACK_RESTORED_SIGNAL = "save:slot:rollback:restored";
export const SAVE_SLOT_FAILED_SIGNAL = "save:slot:failed";

function getDefaultStorage(): StorageLike | null {
    if (typeof window === "undefined") {
        return null;
    }

    try {
        return window.localStorage;
    } catch {
        return null;
    }
}

function slotStorageKey(slot: string): string {
    return `${SAVE_SLOT_STORAGE_KEY_PREFIX}${slot}`;
}

function rollbackStorageKey(slot: string): string {
    return `${slotStorageKey(slot)}${SAVE_SLOT_ROLLBACK_KEY_SUFFIX}`;
}

function normalizeNow(now: () => number): number {
    const value = now();
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, value);
}

function isValidSlot(slot: string): boolean {
    return /^[a-zA-Z0-9_-]{1,32}$/.test(slot);
}

function normalizePlaytime(value: number | undefined): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, Math.floor(value ?? 0));
}

function sortSlotMetadata(items: SaveSlotMetadata[]): SaveSlotMetadata[] {
    return [...items].sort((left, right) => {
        if (left.timestamp === right.timestamp) {
            return left.slot.localeCompare(right.slot);
        }

        return right.timestamp.localeCompare(left.timestamp);
    });
}

export function createSaveSlotService(options?: {
    storage?: StorageLike | null;
    now?: () => number;
    serialize?: () => SaveGame;
    migrate?: (input: unknown) => SaveGame | null;
    rehydrate?: (save: SaveGame) => boolean;
    emit?: <TPayload>(signal: string, payload: TPayload) => void;
    maxRollbacksPerSlot?: number;
    rollbackIdFactory?: (
        slot: string,
        atMs: number,
        sequence: number,
    ) => string;
}): SaveSlotService {
    const storage =
        options && "storage" in options
            ? (options.storage ?? null)
            : getDefaultStorage();
    const now = options?.now ?? (() => Date.now());
    const serialize = options?.serialize ?? serializeDataBusState;
    const migrate = options?.migrate ?? migrateSaveGame;
    const rehydrate = options?.rehydrate ?? rehydrateGameState;
    const emit =
        options?.emit ??
        (<TPayload>(signal: string, payload: TPayload) => {
            signalBus.emit(signal, payload);
        });
    const maxRollbacksPerSlot = Math.max(
        1,
        Math.floor(options?.maxRollbacksPerSlot ?? 5),
    );

    let rollbackSequence = 0;

    const fail = <T>(
        slot: string,
        code: SaveSlotErrorCode,
        message: string,
    ): SaveSlotResult<T> => {
        emit(SAVE_SLOT_FAILED_SIGNAL, {
            slot,
            code,
            message,
            atMs: normalizeNow(now),
        });

        return {
            ok: false,
            code,
            message,
        };
    };

    const readIndex = (): SaveSlotMetadata[] => {
        if (!storage) {
            return [];
        }

        const raw = storage.getItem(SAVE_SLOT_INDEX_STORAGE_KEY);
        if (!raw) {
            return [];
        }

        try {
            const parsed = JSON.parse(raw) as unknown;
            if (!Array.isArray(parsed)) {
                return [];
            }

            const metadata = parsed.filter(
                (item): item is SaveSlotMetadata =>
                    typeof item === "object" &&
                    item !== null &&
                    typeof (item as SaveSlotMetadata).slot === "string" &&
                    typeof (item as SaveSlotMetadata).timestamp === "string" &&
                    typeof (item as SaveSlotMetadata).playtime === "number" &&
                    typeof (item as SaveSlotMetadata).version === "number",
            );

            return sortSlotMetadata(metadata);
        } catch {
            return [];
        }
    };

    const writeIndex = (next: SaveSlotMetadata[]): boolean => {
        if (!storage) {
            return false;
        }

        try {
            storage.setItem(
                SAVE_SLOT_INDEX_STORAGE_KEY,
                JSON.stringify(sortSlotMetadata(next)),
            );
            return true;
        } catch {
            return false;
        }
    };

    const readRollbacks = (slot: string): SaveSlotRollbackRecord[] => {
        if (!storage) {
            return [];
        }

        const raw = storage.getItem(rollbackStorageKey(slot));
        if (!raw) {
            return [];
        }

        try {
            const parsed = JSON.parse(raw) as unknown;
            if (!Array.isArray(parsed)) {
                return [];
            }

            return parsed.filter(
                (item): item is SaveSlotRollbackRecord =>
                    typeof item === "object" &&
                    item !== null &&
                    typeof (item as SaveSlotRollbackRecord).id === "string" &&
                    typeof (item as SaveSlotRollbackRecord).slot === "string" &&
                    typeof (item as SaveSlotRollbackRecord).timestamp ===
                        "string" &&
                    typeof (item as SaveSlotRollbackRecord).playtime ===
                        "number" &&
                    typeof (item as SaveSlotRollbackRecord).version ===
                        "number" &&
                    typeof (item as SaveSlotRollbackRecord).createdAtMs ===
                        "number" &&
                    typeof (item as SaveSlotRollbackRecord).payload ===
                        "object" &&
                    (item as SaveSlotRollbackRecord).payload !== null,
            );
        } catch {
            return [];
        }
    };

    const writeRollbacks = (
        slot: string,
        records: SaveSlotRollbackRecord[],
    ) => {
        if (!storage) {
            return false;
        }

        try {
            if (records.length === 0) {
                storage.removeItem(rollbackStorageKey(slot));
                return true;
            }

            storage.setItem(rollbackStorageKey(slot), JSON.stringify(records));
            return true;
        } catch {
            return false;
        }
    };

    const buildMetadata = (slot: string, save: SaveGame, playtime: number) => {
        return {
            slot,
            timestamp: save.savedAt,
            playtime,
            version: save.version,
        } satisfies SaveSlotMetadata;
    };

    const updateIndexEntry = (metadata: SaveSlotMetadata): boolean => {
        const current = readIndex().filter(
            (entry) => entry.slot !== metadata.slot,
        );
        current.push(metadata);
        return writeIndex(current);
    };

    const addRollbackSnapshot = (
        slot: string,
        previous: SaveGame,
        playtime: number,
    ): SaveSlotResult<SaveSlotRollbackSnapshot> => {
        rollbackSequence += 1;
        const atMs = normalizeNow(now);
        const id =
            options?.rollbackIdFactory?.(slot, atMs, rollbackSequence) ??
            `rollback-${slot}-${atMs}-${rollbackSequence}`;

        const next: SaveSlotRollbackRecord = {
            id,
            slot,
            timestamp: previous.savedAt,
            playtime,
            version: previous.version,
            createdAtMs: atMs,
            payload: previous,
        };

        const current = readRollbacks(slot);
        current.unshift(next);
        const trimmed = current.slice(0, maxRollbacksPerSlot);

        if (!writeRollbacks(slot, trimmed)) {
            return fail(
                slot,
                "storage-failed",
                "Could not persist rollback snapshot.",
            );
        }

        emit<SaveSlotRollbackSnapshot>(SAVE_SLOT_ROLLBACK_CREATED_SIGNAL, {
            id: next.id,
            slot: next.slot,
            timestamp: next.timestamp,
            playtime: next.playtime,
            version: next.version,
            createdAtMs: next.createdAtMs,
        });

        return {
            ok: true,
            value: {
                id: next.id,
                slot: next.slot,
                timestamp: next.timestamp,
                playtime: next.playtime,
                version: next.version,
                createdAtMs: next.createdAtMs,
            },
        };
    };

    const saveSlot: SaveSlotService["saveSlot"] = (slotInput, saveOptions) => {
        const slot = slotInput.trim();
        if (!isValidSlot(slot)) {
            return fail(slotInput, "invalid-slot", "Slot id is invalid.");
        }

        if (!storage) {
            return fail(slot, "storage-unavailable", "Storage is unavailable.");
        }

        const playtime = normalizePlaytime(saveOptions?.playtime);

        try {
            const previousRaw = storage.getItem(slotStorageKey(slot));
            const previousMetadata = readIndex().find(
                (entry) => entry.slot === slot,
            );
            if (
                saveOptions?.createRollbackSnapshot !== false &&
                previousRaw &&
                previousRaw.trim().length > 0
            ) {
                const parsedPrevious = JSON.parse(previousRaw) as unknown;
                const migratedPrevious = migrate(parsedPrevious);
                if (migratedPrevious) {
                    addRollbackSnapshot(
                        slot,
                        migratedPrevious,
                        previousMetadata?.playtime ?? playtime,
                    );
                }
            }

            const nextSave = serialize();
            const metadata = buildMetadata(slot, nextSave, playtime);

            storage.setItem(slotStorageKey(slot), JSON.stringify(nextSave));
            if (!updateIndexEntry(metadata)) {
                return fail(
                    slot,
                    "storage-failed",
                    "Could not update save slot index.",
                );
            }

            emit<SaveSlotMetadata>(SAVE_SLOT_SAVED_SIGNAL, metadata);

            return {
                ok: true,
                value: metadata,
            };
        } catch {
            return fail(slot, "storage-failed", "Could not write save slot.");
        }
    };

    const loadSlot: SaveSlotService["loadSlot"] = (slotInput) => {
        const slot = slotInput.trim();
        if (!isValidSlot(slot)) {
            return fail(slotInput, "invalid-slot", "Slot id is invalid.");
        }

        if (!storage) {
            return fail(slot, "storage-unavailable", "Storage is unavailable.");
        }

        const raw = storage.getItem(slotStorageKey(slot));
        if (!raw || raw.trim().length === 0) {
            return fail(slot, "missing-slot", `Save slot "${slot}" is empty.`);
        }

        let parsed: unknown;
        try {
            parsed = JSON.parse(raw) as unknown;
        } catch {
            return fail(
                slot,
                "invalid-save",
                `Save slot "${slot}" contains invalid JSON payload.`,
            );
        }

        const migrated = migrate(parsed);
        if (!migrated) {
            return fail(
                slot,
                "invalid-save",
                `Save slot "${slot}" payload is invalid or unsupported.`,
            );
        }

        if (!rehydrate(migrated)) {
            return fail(
                slot,
                "rehydrate-failed",
                `Save slot "${slot}" could not be restored to runtime state.`,
            );
        }

        const metadata = readIndex().find((entry) => entry.slot === slot);
        const resolvedMetadata =
            metadata ??
            buildMetadata(slot, migrated, normalizePlaytime(undefined));

        emit<SaveSlotMetadata>(SAVE_SLOT_LOADED_SIGNAL, resolvedMetadata);

        return {
            ok: true,
            value: resolvedMetadata,
        };
    };

    const deleteSlot: SaveSlotService["deleteSlot"] = (slotInput) => {
        const slot = slotInput.trim();
        if (!isValidSlot(slot)) {
            return fail(slotInput, "invalid-slot", "Slot id is invalid.");
        }

        if (!storage) {
            return fail(slot, "storage-unavailable", "Storage is unavailable.");
        }

        try {
            storage.removeItem(slotStorageKey(slot));
            storage.removeItem(rollbackStorageKey(slot));

            const current = readIndex().filter((entry) => entry.slot !== slot);
            if (!writeIndex(current)) {
                return fail(
                    slot,
                    "storage-failed",
                    "Could not update save slot index.",
                );
            }

            emit(SAVE_SLOT_DELETED_SIGNAL, {
                slot,
                atMs: normalizeNow(now),
            });

            return {
                ok: true,
                value: true,
            };
        } catch {
            return fail(slot, "storage-failed", "Could not delete save slot.");
        }
    };

    const listSlots: SaveSlotService["listSlots"] = () => {
        return readIndex();
    };

    const getSlot: SaveSlotService["getSlot"] = (slotInput) => {
        const slot = slotInput.trim();
        if (!isValidSlot(slot)) {
            return null;
        }

        return readIndex().find((entry) => entry.slot === slot) ?? null;
    };

    const listRollbackSnapshots: SaveSlotService["listRollbackSnapshots"] = (
        slotInput,
    ) => {
        const slot = slotInput.trim();
        if (!isValidSlot(slot)) {
            return [];
        }

        return readRollbacks(slot).map((record) => ({
            id: record.id,
            slot: record.slot,
            timestamp: record.timestamp,
            playtime: record.playtime,
            version: record.version,
            createdAtMs: record.createdAtMs,
        }));
    };

    const restoreRollbackSnapshot: SaveSlotService["restoreRollbackSnapshot"] =
        (slotInput, snapshotIdInput) => {
            const slot = slotInput.trim();
            const snapshotId = snapshotIdInput.trim();

            if (!isValidSlot(slot)) {
                return fail(slotInput, "invalid-slot", "Slot id is invalid.");
            }

            if (!snapshotId) {
                return fail(
                    slot,
                    "missing-rollback",
                    "Rollback snapshot id is required.",
                );
            }

            if (!storage) {
                return fail(
                    slot,
                    "storage-unavailable",
                    "Storage is unavailable.",
                );
            }

            const snapshots = readRollbacks(slot);
            const target = snapshots.find(
                (snapshot) => snapshot.id === snapshotId,
            );
            if (!target) {
                return fail(
                    slot,
                    "missing-rollback",
                    `Rollback snapshot "${snapshotId}" was not found for slot "${slot}".`,
                );
            }

            const migrated = migrate(target.payload);
            if (!migrated) {
                return fail(
                    slot,
                    "invalid-save",
                    `Rollback snapshot "${snapshotId}" is invalid or unsupported.`,
                );
            }

            if (!rehydrate(migrated)) {
                return fail(
                    slot,
                    "rehydrate-failed",
                    `Rollback snapshot "${snapshotId}" could not be restored.`,
                );
            }

            const metadata = buildMetadata(slot, migrated, target.playtime);

            try {
                storage.setItem(slotStorageKey(slot), JSON.stringify(migrated));
                if (!updateIndexEntry(metadata)) {
                    return fail(
                        slot,
                        "storage-failed",
                        "Could not update save slot index.",
                    );
                }
            } catch {
                return fail(
                    slot,
                    "storage-failed",
                    "Could not persist rollback restore.",
                );
            }

            emit<SaveSlotRollbackSnapshot>(SAVE_SLOT_ROLLBACK_RESTORED_SIGNAL, {
                id: target.id,
                slot: target.slot,
                timestamp: target.timestamp,
                playtime: target.playtime,
                version: target.version,
                createdAtMs: target.createdAtMs,
            });

            return {
                ok: true,
                value: metadata,
            };
        };

    return {
        saveSlot,
        loadSlot,
        deleteSlot,
        listSlots,
        getSlot,
        listRollbackSnapshots,
        restoreRollbackSnapshot,
    };
}

export const saveSlots = createSaveSlotService();
