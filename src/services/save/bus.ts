import {
    rehydrateGameState,
    serializeDataBusState,
} from "@/services/save/state";
import { SAVE_GAME_VERSION } from "@/services/save/schema";

export const QUICK_SAVE_STORAGE_KEY = `ursa:quickSave:v${SAVE_GAME_VERSION}`;

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

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

export const quickSave = (
    storage: StorageLike | null = getDefaultStorage(),
): boolean => {
    if (!storage) {
        return false;
    }

    try {
        const save = serializeDataBusState();
        storage.setItem(QUICK_SAVE_STORAGE_KEY, JSON.stringify(save));
        return true;
    } catch {
        return false;
    }
};

export const quickLoad = (
    storage: StorageLike | null = getDefaultStorage(),
): boolean => {
    if (!storage) {
        return false;
    }

    try {
        const payload = storage.getItem(QUICK_SAVE_STORAGE_KEY);
        if (!payload) {
            return false;
        }

        const parsed = JSON.parse(payload) as unknown;
        return rehydrateGameState(parsed);
    } catch {
        return false;
    }
};

export const clearQuickSave = (
    storage: StorageLike | null = getDefaultStorage(),
): boolean => {
    if (!storage) {
        return false;
    }

    try {
        storage.removeItem(QUICK_SAVE_STORAGE_KEY);
        return true;
    } catch {
        return false;
    }
};

type QuickSaveSchedulerOptions = {
    waitMs?: number;
    save?: () => boolean;
};

export type QuickSaveScheduler = {
    notifyChange: () => void;
    dispose: () => void;
};

export const createQuickSaveScheduler = (
    options: QuickSaveSchedulerOptions = {},
): QuickSaveScheduler => {
    const waitMs = options.waitMs ?? 500;
    const save = options.save ?? (() => quickSave());

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return {
        notifyChange: () => {
            if (timeoutId) {
                return;
            }

            timeoutId = setTimeout(() => {
                timeoutId = null;
                save();
            }, waitMs);
        },
        dispose: () => {
            if (!timeoutId) {
                return;
            }

            clearTimeout(timeoutId);
            timeoutId = null;
        },
    };
};
