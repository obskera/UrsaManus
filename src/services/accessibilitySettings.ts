import { signalBus } from "@/services/signalBus";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const ACCESSIBILITY_SETTINGS_STORAGE_KEY =
    "ursa:accessibility-settings:v1";

export const ACCESSIBILITY_SETTINGS_CHANGED_SIGNAL =
    "settings:accessibility:changed";

export type AccessibilityControlMode = "hold" | "toggle";
export type AccessibilitySubtitleSpeed = "slow" | "normal" | "fast";

export type AccessibilitySettings = {
    textScale: number;
    controlMode: AccessibilityControlMode;
    reducedFlash: boolean;
    reducedShake: boolean;
    subtitleSpeed: AccessibilitySubtitleSpeed;
};

export type AccessibilitySettingsListener = (
    settings: AccessibilitySettings,
) => void;

export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
    textScale: 1,
    controlMode: "hold",
    reducedFlash: false,
    reducedShake: false,
    subtitleSpeed: "normal",
};

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

function normalizeTextScale(value: number | undefined): number {
    if (!Number.isFinite(value)) {
        return DEFAULT_ACCESSIBILITY_SETTINGS.textScale;
    }

    return Math.max(0.75, Math.min(1.75, Number(value)));
}

function normalizeControlMode(
    value: AccessibilityControlMode | undefined,
): AccessibilityControlMode {
    return value === "toggle" ? "toggle" : "hold";
}

function normalizeSubtitleSpeed(
    value: AccessibilitySubtitleSpeed | undefined,
): AccessibilitySubtitleSpeed {
    if (value === "slow" || value === "fast") {
        return value;
    }

    return "normal";
}

export function resolveAccessibilitySettings(
    settings: Partial<AccessibilitySettings> | undefined,
): AccessibilitySettings {
    return {
        textScale: normalizeTextScale(settings?.textScale),
        controlMode: normalizeControlMode(settings?.controlMode),
        reducedFlash:
            typeof settings?.reducedFlash === "boolean"
                ? settings.reducedFlash
                : DEFAULT_ACCESSIBILITY_SETTINGS.reducedFlash,
        reducedShake:
            typeof settings?.reducedShake === "boolean"
                ? settings.reducedShake
                : DEFAULT_ACCESSIBILITY_SETTINGS.reducedShake,
        subtitleSpeed: normalizeSubtitleSpeed(settings?.subtitleSpeed),
    };
}

export function saveAccessibilitySettings(
    settings: AccessibilitySettings,
    storage: StorageLike | null = getDefaultStorage(),
): boolean {
    if (!storage) {
        return false;
    }

    try {
        storage.setItem(
            ACCESSIBILITY_SETTINGS_STORAGE_KEY,
            JSON.stringify(settings),
        );
        return true;
    } catch {
        return false;
    }
}

export function loadAccessibilitySettings(
    storage: StorageLike | null = getDefaultStorage(),
): AccessibilitySettings | null {
    if (!storage) {
        return null;
    }

    try {
        const raw = storage.getItem(ACCESSIBILITY_SETTINGS_STORAGE_KEY);
        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw) as Partial<AccessibilitySettings>;
        if (!parsed || typeof parsed !== "object") {
            return null;
        }

        return resolveAccessibilitySettings(parsed);
    } catch {
        return null;
    }
}

export function clearAccessibilitySettings(
    storage: StorageLike | null = getDefaultStorage(),
): boolean {
    if (!storage) {
        return false;
    }

    try {
        storage.removeItem(ACCESSIBILITY_SETTINGS_STORAGE_KEY);
        return true;
    } catch {
        return false;
    }
}

export type AccessibilitySettingsStore = {
    getSettings: () => AccessibilitySettings;
    setSettings: (
        next: Partial<AccessibilitySettings>,
    ) => AccessibilitySettings;
    resetSettings: () => AccessibilitySettings;
    subscribe: (listener: AccessibilitySettingsListener) => () => void;
};

export function createAccessibilitySettingsStore(options?: {
    storage?: StorageLike | null;
    initialSettings?: Partial<AccessibilitySettings>;
}) {
    const listeners = new Set<AccessibilitySettingsListener>();
    const storage = options?.storage ?? getDefaultStorage();

    let current = resolveAccessibilitySettings({
        ...DEFAULT_ACCESSIBILITY_SETTINGS,
        ...options?.initialSettings,
        ...loadAccessibilitySettings(storage),
    });

    const notify = () => {
        signalBus.emit(ACCESSIBILITY_SETTINGS_CHANGED_SIGNAL, current);
        for (const listener of listeners) {
            listener(current);
        }
    };

    const persist = () => {
        saveAccessibilitySettings(current, storage);
    };

    return {
        getSettings: () => current,
        setSettings: (next) => {
            current = resolveAccessibilitySettings({
                ...current,
                ...next,
            });
            persist();
            notify();
            return current;
        },
        resetSettings: () => {
            current = { ...DEFAULT_ACCESSIBILITY_SETTINGS };
            persist();
            notify();
            return current;
        },
        subscribe: (listener: AccessibilitySettingsListener) => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
    } satisfies AccessibilitySettingsStore;
}

export const accessibilitySettingsStore = createAccessibilitySettingsStore();
