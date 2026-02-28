import { QUICK_SAVE_STORAGE_KEY } from "@/services/save/bus";

export const URSA_STORAGE_PREFIX = "ursa:";
export const URSA_INPUT_PROFILE_STORAGE_KEY_PREFIX = "ursa:input-profile";

export type PersistedStateSanitizeScope =
    | "save-only"
    | "input-profiles"
    | "all";

type StorageLike = Pick<Storage, "removeItem" | "key" | "length">;

export type PersistedStateSanitizeResult = {
    ok: boolean;
    removedKeys: string[];
};

const getDefaultStorage = (): StorageLike | null => {
    if (typeof window === "undefined") {
        return null;
    }

    try {
        return window.localStorage;
    } catch {
        return null;
    }
};

const collectScopedKeys = (
    scope: PersistedStateSanitizeScope,
    storage: StorageLike,
): string[] => {
    if (scope === "save-only") {
        return [QUICK_SAVE_STORAGE_KEY];
    }

    if (scope === "input-profiles") {
        const keys = new Set<string>();

        for (let index = 0; index < storage.length; index += 1) {
            const key = storage.key(index);
            if (!key) continue;
            if (!key.startsWith(URSA_INPUT_PROFILE_STORAGE_KEY_PREFIX)) {
                continue;
            }

            keys.add(key);
        }

        return [...keys];
    }

    const keys = new Set<string>([QUICK_SAVE_STORAGE_KEY]);

    for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (!key) continue;
        if (!key.startsWith(URSA_STORAGE_PREFIX)) continue;
        keys.add(key);
    }

    return [...keys];
};

export const sanitizePersistedState = (
    scope: PersistedStateSanitizeScope = "all",
    storage: StorageLike | null = getDefaultStorage(),
): PersistedStateSanitizeResult => {
    if (!storage) {
        return {
            ok: false,
            removedKeys: [],
        };
    }

    const keys = collectScopedKeys(scope, storage);

    try {
        for (const key of keys) {
            storage.removeItem(key);
        }

        return {
            ok: true,
            removedKeys: keys,
        };
    } catch {
        return {
            ok: false,
            removedKeys: [],
        };
    }
};
