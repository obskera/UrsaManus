import { useMemo, useSyncExternalStore } from "react";
import {
    accessibilitySettingsStore,
    type AccessibilitySettings,
    type AccessibilitySettingsStore,
} from "@/services/accessibilitySettings";

export type UseAccessibilitySettingsResult = {
    settings: AccessibilitySettings;
    setSettings: (
        next: Partial<AccessibilitySettings>,
    ) => AccessibilitySettings;
    resetSettings: () => AccessibilitySettings;
};

export function useAccessibilitySettings(
    store: AccessibilitySettingsStore = accessibilitySettingsStore,
): UseAccessibilitySettingsResult {
    const settings = useSyncExternalStore(
        (listener) => store.subscribe(listener),
        () => store.getSettings(),
        () => store.getSettings(),
    );

    return useMemo(
        () => ({
            settings,
            setSettings: (next) => store.setSettings(next),
            resetSettings: () => store.resetSettings(),
        }),
        [settings, store],
    );
}
