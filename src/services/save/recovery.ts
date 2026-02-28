import { signalBus } from "@/services/signalBus";
import { QUICK_SAVE_STORAGE_KEY } from "@/services/save/bus";
import { migrateSaveGame, type SaveGame } from "@/services/save/schema";
import { rehydrateGameState } from "@/services/save/state";

type StorageLike = Pick<Storage, "getItem" | "removeItem">;

export type SaveRecoveryDiagnosticCode =
    | "storage-unavailable"
    | "missing-save"
    | "invalid-json"
    | "invalid-save-format"
    | "rehydrate-failed"
    | "reset-failed"
    | "unknown";

export type SaveRecoveryDiagnostic = {
    code: SaveRecoveryDiagnosticCode;
    message: string;
    atMs: number;
    storageKey: string;
    payloadBytes?: number;
};

export type SaveRecoverySnapshot = {
    version: number;
    savedAt: string;
    storageKey: string;
    payloadBytes: number;
};

export type SaveStartupRecoveryStatus =
    | "clean"
    | "recoverable"
    | "corrupted"
    | "storage-unavailable";

export type SaveStartupRecoveryResult = {
    status: SaveStartupRecoveryStatus;
    diagnostics: SaveRecoveryDiagnostic[];
    snapshot: SaveRecoverySnapshot | null;
};

export type SaveRecoveryActionResult =
    | {
          ok: true;
          action: "restore" | "reset";
      }
    | {
          ok: false;
          action: "restore" | "reset";
          code: SaveRecoveryDiagnosticCode;
          message: string;
      };

export type SaveRecoveryService = {
    inspectStartup: () => SaveStartupRecoveryResult;
    restorePersisted: () => SaveRecoveryActionResult;
    resetPersisted: () => SaveRecoveryActionResult;
    getLastStartupResult: () => SaveStartupRecoveryResult | null;
    getLastDiagnostics: () => SaveRecoveryDiagnostic[];
};

export const SAVE_RECOVERY_STARTUP_CHECKED_SIGNAL =
    "save:recovery:startup-checked";
export const SAVE_RECOVERY_RESTORE_APPLIED_SIGNAL =
    "save:recovery:restore-applied";
export const SAVE_RECOVERY_RESET_APPLIED_SIGNAL = "save:recovery:reset-applied";
export const SAVE_RECOVERY_FAILED_SIGNAL = "save:recovery:failed";

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

function normalizeNow(now: () => number): number {
    const value = now();
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, value);
}

function emitFailure(
    emit: <TPayload>(signal: string, payload: TPayload) => void,
    diagnostic: SaveRecoveryDiagnostic,
) {
    emit<SaveRecoveryDiagnostic>(SAVE_RECOVERY_FAILED_SIGNAL, diagnostic);
}

function createDiagnostic(options: {
    code: SaveRecoveryDiagnosticCode;
    message: string;
    now: () => number;
    storageKey: string;
    payloadBytes?: number;
}): SaveRecoveryDiagnostic {
    return {
        code: options.code,
        message: options.message,
        atMs: normalizeNow(options.now),
        storageKey: options.storageKey,
        ...(typeof options.payloadBytes === "number"
            ? { payloadBytes: options.payloadBytes }
            : {}),
    };
}

export function createSaveRecoveryService(options?: {
    storage?: StorageLike | null;
    storageKey?: string;
    now?: () => number;
    emit?: <TPayload>(signal: string, payload: TPayload) => void;
    migrate?: (input: unknown) => SaveGame | null;
    rehydrate?: (save: SaveGame) => boolean;
}): SaveRecoveryService {
    const storage =
        options && "storage" in options
            ? (options.storage ?? null)
            : getDefaultStorage();
    const storageKey = options?.storageKey ?? QUICK_SAVE_STORAGE_KEY;
    const now = options?.now ?? (() => Date.now());
    const migrate = options?.migrate ?? migrateSaveGame;
    const rehydrate = options?.rehydrate ?? rehydrateGameState;
    const emit =
        options?.emit ??
        (<TPayload>(signal: string, payload: TPayload) => {
            signalBus.emit(signal, payload);
        });

    let lastStartupResult: SaveStartupRecoveryResult | null = null;
    let lastDiagnostics: SaveRecoveryDiagnostic[] = [];

    const inspectStartup: SaveRecoveryService["inspectStartup"] = () => {
        const diagnostics: SaveRecoveryDiagnostic[] = [];

        if (!storage) {
            const diagnostic = createDiagnostic({
                code: "storage-unavailable",
                message:
                    "Persistent storage is unavailable in this environment.",
                now,
                storageKey,
            });

            diagnostics.push(diagnostic);
            const result: SaveStartupRecoveryResult = {
                status: "storage-unavailable",
                diagnostics,
                snapshot: null,
            };

            lastDiagnostics = diagnostics;
            lastStartupResult = result;
            emit<SaveStartupRecoveryResult>(
                SAVE_RECOVERY_STARTUP_CHECKED_SIGNAL,
                result,
            );
            emitFailure(emit, diagnostic);
            return result;
        }

        let payload: string | null;
        try {
            payload = storage.getItem(storageKey);
        } catch {
            const diagnostic = createDiagnostic({
                code: "unknown",
                message: "Persistent storage read failed unexpectedly.",
                now,
                storageKey,
            });

            diagnostics.push(diagnostic);
            const result: SaveStartupRecoveryResult = {
                status: "corrupted",
                diagnostics,
                snapshot: null,
            };

            lastDiagnostics = diagnostics;
            lastStartupResult = result;
            emit<SaveStartupRecoveryResult>(
                SAVE_RECOVERY_STARTUP_CHECKED_SIGNAL,
                result,
            );
            emitFailure(emit, diagnostic);
            return result;
        }

        if (!payload || payload.trim().length === 0) {
            const diagnostic = createDiagnostic({
                code: "missing-save",
                message: "No persisted quick-save payload was found.",
                now,
                storageKey,
            });

            diagnostics.push(diagnostic);
            const result: SaveStartupRecoveryResult = {
                status: "clean",
                diagnostics,
                snapshot: null,
            };

            lastDiagnostics = diagnostics;
            lastStartupResult = result;
            emit<SaveStartupRecoveryResult>(
                SAVE_RECOVERY_STARTUP_CHECKED_SIGNAL,
                result,
            );
            return result;
        }

        const payloadBytes = payload.length;

        let parsed: unknown;
        try {
            parsed = JSON.parse(payload) as unknown;
        } catch {
            const diagnostic = createDiagnostic({
                code: "invalid-json",
                message: "Persisted quick-save is not valid JSON.",
                now,
                storageKey,
                payloadBytes,
            });

            diagnostics.push(diagnostic);
            const result: SaveStartupRecoveryResult = {
                status: "corrupted",
                diagnostics,
                snapshot: null,
            };

            lastDiagnostics = diagnostics;
            lastStartupResult = result;
            emit<SaveStartupRecoveryResult>(
                SAVE_RECOVERY_STARTUP_CHECKED_SIGNAL,
                result,
            );
            emitFailure(emit, diagnostic);
            return result;
        }

        const migrated = migrate(parsed);
        if (!migrated) {
            const diagnostic = createDiagnostic({
                code: "invalid-save-format",
                message:
                    "Persisted quick-save payload is invalid or unsupported.",
                now,
                storageKey,
                payloadBytes,
            });

            diagnostics.push(diagnostic);
            const result: SaveStartupRecoveryResult = {
                status: "corrupted",
                diagnostics,
                snapshot: null,
            };

            lastDiagnostics = diagnostics;
            lastStartupResult = result;
            emit<SaveStartupRecoveryResult>(
                SAVE_RECOVERY_STARTUP_CHECKED_SIGNAL,
                result,
            );
            emitFailure(emit, diagnostic);
            return result;
        }

        const result: SaveStartupRecoveryResult = {
            status: "recoverable",
            diagnostics,
            snapshot: {
                version: migrated.version,
                savedAt: migrated.savedAt,
                storageKey,
                payloadBytes,
            },
        };

        lastDiagnostics = diagnostics;
        lastStartupResult = result;
        emit<SaveStartupRecoveryResult>(
            SAVE_RECOVERY_STARTUP_CHECKED_SIGNAL,
            result,
        );

        return result;
    };

    const restorePersisted: SaveRecoveryService["restorePersisted"] = () => {
        const startup = inspectStartup();
        if (startup.status !== "recoverable") {
            const first = startup.diagnostics[0];
            return {
                ok: false,
                action: "restore",
                code: first?.code ?? "unknown",
                message:
                    first?.message ?? "Persisted save recovery is unavailable.",
            };
        }

        if (!storage) {
            return {
                ok: false,
                action: "restore",
                code: "storage-unavailable",
                message:
                    "Persistent storage is unavailable in this environment.",
            };
        }

        const payload = storage.getItem(storageKey);
        if (!payload) {
            return {
                ok: false,
                action: "restore",
                code: "missing-save",
                message: "No persisted quick-save payload was found.",
            };
        }

        let parsed: unknown;
        try {
            parsed = JSON.parse(payload) as unknown;
        } catch {
            const diagnostic = createDiagnostic({
                code: "invalid-json",
                message: "Persisted quick-save is not valid JSON.",
                now,
                storageKey,
                payloadBytes: payload.length,
            });
            lastDiagnostics = [diagnostic];
            emitFailure(emit, diagnostic);
            return {
                ok: false,
                action: "restore",
                code: diagnostic.code,
                message: diagnostic.message,
            };
        }

        const migrated = migrate(parsed);
        if (!migrated) {
            const diagnostic = createDiagnostic({
                code: "invalid-save-format",
                message:
                    "Persisted quick-save payload is invalid or unsupported.",
                now,
                storageKey,
                payloadBytes: payload.length,
            });
            lastDiagnostics = [diagnostic];
            emitFailure(emit, diagnostic);
            return {
                ok: false,
                action: "restore",
                code: diagnostic.code,
                message: diagnostic.message,
            };
        }

        const ok = rehydrate(migrated);
        if (!ok) {
            const diagnostic = createDiagnostic({
                code: "rehydrate-failed",
                message:
                    "Persisted quick-save could not be applied to runtime state.",
                now,
                storageKey,
                payloadBytes: payload.length,
            });
            lastDiagnostics = [diagnostic];
            emitFailure(emit, diagnostic);
            return {
                ok: false,
                action: "restore",
                code: diagnostic.code,
                message: diagnostic.message,
            };
        }

        emit<SaveRecoverySnapshot>(SAVE_RECOVERY_RESTORE_APPLIED_SIGNAL, {
            version: migrated.version,
            savedAt: migrated.savedAt,
            storageKey,
            payloadBytes: payload.length,
        });

        return {
            ok: true,
            action: "restore",
        };
    };

    const resetPersisted: SaveRecoveryService["resetPersisted"] = () => {
        if (!storage) {
            return {
                ok: false,
                action: "reset",
                code: "storage-unavailable",
                message:
                    "Persistent storage is unavailable in this environment.",
            };
        }

        try {
            storage.removeItem(storageKey);
        } catch {
            const diagnostic = createDiagnostic({
                code: "reset-failed",
                message: "Persisted quick-save reset failed.",
                now,
                storageKey,
            });

            lastDiagnostics = [diagnostic];
            emitFailure(emit, diagnostic);

            return {
                ok: false,
                action: "reset",
                code: diagnostic.code,
                message: diagnostic.message,
            };
        }

        emit(SAVE_RECOVERY_RESET_APPLIED_SIGNAL, {
            storageKey,
            atMs: normalizeNow(now),
        });

        return {
            ok: true,
            action: "reset",
        };
    };

    const getLastStartupResult: SaveRecoveryService["getLastStartupResult"] =
        () => {
            return lastStartupResult;
        };

    const getLastDiagnostics: SaveRecoveryService["getLastDiagnostics"] =
        () => {
            return [...lastDiagnostics];
        };

    return {
        inspectStartup,
        restorePersisted,
        resetPersisted,
        getLastStartupResult,
        getLastDiagnostics,
    };
}

export const saveRecovery = createSaveRecoveryService();
