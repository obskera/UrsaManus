import { describe, expect, it, vi } from "vitest";
import {
    ACCESSIBILITY_SETTINGS_STORAGE_KEY,
    createAccessibilitySettingsStore,
    loadAccessibilitySettings,
    resolveAccessibilitySettings,
    saveAccessibilitySettings,
    clearAccessibilitySettings,
} from "@/services/accessibilitySettings";

class MemoryStorage implements Pick<
    Storage,
    "getItem" | "setItem" | "removeItem"
> {
    private values = new Map<string, string>();

    getItem(key: string): string | null {
        return this.values.has(key) ? (this.values.get(key) ?? null) : null;
    }

    setItem(key: string, value: string): void {
        this.values.set(key, value);
    }

    removeItem(key: string): void {
        this.values.delete(key);
    }
}

class ThrowingStorage implements Pick<
    Storage,
    "getItem" | "setItem" | "removeItem"
> {
    getItem(): string | null {
        throw new Error("get failed");
    }

    setItem(): void {
        throw new Error("set failed");
    }

    removeItem(): void {
        throw new Error("remove failed");
    }
}

describe("accessibility settings service", () => {
    it("normalizes settings defaults and clamps text scale", () => {
        const resolved = resolveAccessibilitySettings({
            textScale: 99,
            controlMode: "toggle",
            reducedFlash: true,
            reducedShake: true,
            subtitleSpeed: "fast",
        });

        expect(resolved.textScale).toBe(1.75);
        expect(resolved.controlMode).toBe("toggle");
        expect(resolved.reducedFlash).toBe(true);
        expect(resolved.reducedShake).toBe(true);
        expect(resolved.subtitleSpeed).toBe("fast");

        const fallback = resolveAccessibilitySettings({
            textScale: Number.NaN,
            subtitleSpeed: "invalid" as never,
        });
        expect(fallback.textScale).toBe(1);
        expect(fallback.subtitleSpeed).toBe("normal");
    });

    it("saves, loads, and clears persisted settings", () => {
        const storage = new MemoryStorage();

        expect(
            saveAccessibilitySettings(
                {
                    textScale: 1.2,
                    controlMode: "hold",
                    reducedFlash: true,
                    reducedShake: false,
                    subtitleSpeed: "slow",
                },
                storage,
            ),
        ).toBe(true);

        expect(
            storage.getItem(ACCESSIBILITY_SETTINGS_STORAGE_KEY),
        ).not.toBeNull();

        expect(loadAccessibilitySettings(storage)).toEqual({
            textScale: 1.2,
            controlMode: "hold",
            reducedFlash: true,
            reducedShake: false,
            subtitleSpeed: "slow",
        });

        expect(clearAccessibilitySettings(storage)).toBe(true);
        expect(storage.getItem(ACCESSIBILITY_SETTINGS_STORAGE_KEY)).toBeNull();
    });

    it("handles unavailable/throwing storage safely", () => {
        const settings = {
            textScale: 1,
            controlMode: "hold" as const,
            reducedFlash: false,
            reducedShake: false,
            subtitleSpeed: "normal" as const,
        };

        expect(saveAccessibilitySettings(settings, null)).toBe(false);
        expect(loadAccessibilitySettings(null)).toBeNull();
        expect(clearAccessibilitySettings(null)).toBe(false);

        const throwing = new ThrowingStorage();
        expect(saveAccessibilitySettings(settings, throwing)).toBe(false);
        expect(loadAccessibilitySettings(throwing)).toBeNull();
        expect(clearAccessibilitySettings(throwing)).toBe(false);
    });

    it("supports subscriptions and reset through store", () => {
        const storage = new MemoryStorage();
        const store = createAccessibilitySettingsStore({ storage });
        const listener = vi.fn();

        const off = store.subscribe(listener);

        const updated = store.setSettings({
            controlMode: "toggle",
            textScale: 1.4,
            subtitleSpeed: "fast",
        });

        expect(updated.controlMode).toBe("toggle");
        expect(store.getSettings().textScale).toBe(1.4);
        expect(listener).toHaveBeenCalledTimes(1);

        const reset = store.resetSettings();
        expect(reset).toEqual({
            textScale: 1,
            controlMode: "hold",
            reducedFlash: false,
            reducedShake: false,
            subtitleSpeed: "normal",
        });
        expect(listener).toHaveBeenCalledTimes(2);

        off();
        store.setSettings({ reducedFlash: true });
        expect(listener).toHaveBeenCalledTimes(2);
    });
});
