import { describe, expect, it } from "vitest";
import {
    getInputProfilePreset,
    INPUT_PROFILE_STORAGE_KEY,
    clearInputProfilePreset,
    createInputProfileBindings,
    listInputProfilePresets,
    loadInputProfilePreset,
    resolveInputProfilePreset,
    saveInputProfilePreset,
} from "@/components/screenController";

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

describe("input profile presets", () => {
    it("lists available presets with default profile", () => {
        const presets = listInputProfilePresets();

        expect(presets.length).toBeGreaterThanOrEqual(3);
        expect(presets.some((preset) => preset.id === "default")).toBe(true);

        presets[0]!.name = "Mutated";
        expect(getInputProfilePreset("default").name).toBe("Default");
    });

    it("resolves preset and custom overrides for bindings", () => {
        const resolved = resolveInputProfilePreset({
            id: "left-handed",
            name: "Custom Left",
            deadzone: 0.5,
            keyboardEnabled: true,
            gamepadEnabled: false,
            pointerEnabled: true,
        });

        expect(resolved.id).toBe("left-handed");
        expect(resolved.name).toBe("Custom Left");
        expect(resolved.deadzone).toBe(0.5);
        expect(resolved.gamepadEnabled).toBe(false);
        expect(resolved.keyMap?.north).toContain("i");
    });

    it("creates composed hook options from active profile", () => {
        const composed = createInputProfileBindings({
            profile: "gamepad-first",
            enabled: true,
        });

        expect(composed.keyBindings.enabled).toBe(false);
        expect(composed.gamepad.enabled).toBe(true);
        expect(composed.pointerEnabled).toBe(true);
        expect(composed.gamepad.deadzone).toBeGreaterThan(0.2);
    });

    it("normalizes fallback profile values and composed enable flags", () => {
        const fallbackResolved = resolveInputProfilePreset(undefined);
        expect(fallbackResolved.id).toBe("default");
        expect(fallbackResolved.preventDefault).toBe(true);

        const customResolved = resolveInputProfilePreset({
            id: "default",
            name: "Edge",
            deadzone: 4,
            gamepadIndex: 3.9,
            keyboardEnabled: false,
            pointerEnabled: false,
            gamepadEnabled: true,
            preventDefault: false,
        });

        expect(customResolved.deadzone).toBe(0.99);
        expect(customResolved.gamepadIndex).toBe(3);
        expect(customResolved.keyboardEnabled).toBe(false);
        expect(customResolved.pointerEnabled).toBe(false);
        expect(customResolved.preventDefault).toBe(false);

        const resolvedFallbackId = resolveInputProfilePreset({
            id: "unknown-profile" as never,
            name: "Fallback",
            deadzone: Number.NaN,
            gamepadIndex: Number.NaN,
        });
        expect(resolvedFallbackId.id).toBe("unknown-profile");
        expect(resolvedFallbackId.deadzone).toBe(0.2);
        expect(resolvedFallbackId.gamepadIndex).toBe(-1);

        const composed = createInputProfileBindings({
            enabled: false,
            profile: "left-handed",
            keyBindings: {
                preventDefault: false,
            },
        });

        expect(composed.keyBindings.enabled).toBe(false);
        expect(composed.gamepad.enabled).toBe(false);
        expect(composed.pointerEnabled).toBe(false);
        expect(composed.keyBindings.preventDefault).toBe(false);
    });
});

describe("input profile persistence", () => {
    it("saves, loads, and clears profile payloads", () => {
        const storage = new MemoryStorage();
        const profile = {
            id: "default" as const,
            name: "Default",
            deadzone: 0.31,
            keyboardEnabled: true,
        };

        expect(saveInputProfilePreset(profile, storage)).toBe(true);
        expect(storage.getItem(INPUT_PROFILE_STORAGE_KEY)).not.toBeNull();

        const loaded = loadInputProfilePreset(storage);
        expect(loaded).toEqual(profile);

        expect(clearInputProfilePreset(storage)).toBe(true);
        expect(storage.getItem(INPUT_PROFILE_STORAGE_KEY)).toBeNull();
    });

    it("returns null for invalid stored payload", () => {
        const storage = new MemoryStorage();
        storage.setItem(INPUT_PROFILE_STORAGE_KEY, "{bad-json");

        expect(loadInputProfilePreset(storage)).toBeNull();
    });

    it("returns null for malformed profile payload shape", () => {
        const storage = new MemoryStorage();
        storage.setItem(
            INPUT_PROFILE_STORAGE_KEY,
            JSON.stringify({ id: "default" }),
        );
        expect(loadInputProfilePreset(storage)).toBeNull();

        storage.setItem(
            INPUT_PROFILE_STORAGE_KEY,
            JSON.stringify("not-an-object"),
        );
        expect(loadInputProfilePreset(storage)).toBeNull();
    });

    it("handles unavailable and throwing storage safely", () => {
        const profile = {
            id: "default" as const,
            name: "Default",
        };

        expect(saveInputProfilePreset(profile, null)).toBe(false);
        expect(loadInputProfilePreset(null)).toBeNull();
        expect(clearInputProfilePreset(null)).toBe(false);

        const throwingStorage = new ThrowingStorage();
        expect(saveInputProfilePreset(profile, throwingStorage)).toBe(false);
        expect(loadInputProfilePreset(throwingStorage)).toBeNull();
        expect(clearInputProfilePreset(throwingStorage)).toBe(false);
    });
});
