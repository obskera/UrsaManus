import { describe, expect, it, vi } from "vitest";
import {
    QUICK_SAVE_STORAGE_KEY,
    sanitizePersistedState,
} from "@/services/save";

class MemoryStorage implements Pick<Storage, "key" | "length" | "removeItem"> {
    private values = new Map<string, string>();

    constructor(initial: Record<string, string> = {}) {
        for (const [key, value] of Object.entries(initial)) {
            this.values.set(key, value);
        }
    }

    get length(): number {
        return this.values.size;
    }

    key(index: number): string | null {
        const keys = [...this.values.keys()];
        return keys[index] ?? null;
    }

    removeItem(key: string): void {
        this.values.delete(key);
    }

    has(key: string): boolean {
        return this.values.has(key);
    }
}

describe("save sanitize", () => {
    it("removes quick save only in save-only scope", () => {
        const storage = new MemoryStorage({
            [QUICK_SAVE_STORAGE_KEY]: "{}",
            "ursa:audio:masterMuted:v1": "1",
            "other:key": "keep",
        });

        const result = sanitizePersistedState("save-only", storage);

        expect(result.ok).toBe(true);
        expect(result.removedKeys).toEqual([QUICK_SAVE_STORAGE_KEY]);
        expect(storage.has(QUICK_SAVE_STORAGE_KEY)).toBe(false);
        expect(storage.has("ursa:audio:masterMuted:v1")).toBe(true);
        expect(storage.has("other:key")).toBe(true);
    });

    it("removes all Ursa-prefixed keys in all scope", () => {
        const storage = new MemoryStorage({
            [QUICK_SAVE_STORAGE_KEY]: "{}",
            "ursa:audio:masterMuted:v1": "1",
            "ursa:audio:musicMuted:v1": "0",
            "other:key": "keep",
        });

        const result = sanitizePersistedState("all", storage);

        expect(result.ok).toBe(true);
        expect(result.removedKeys).toContain(QUICK_SAVE_STORAGE_KEY);
        expect(result.removedKeys).toContain("ursa:audio:masterMuted:v1");
        expect(result.removedKeys).toContain("ursa:audio:musicMuted:v1");
        expect(storage.has(QUICK_SAVE_STORAGE_KEY)).toBe(false);
        expect(storage.has("ursa:audio:masterMuted:v1")).toBe(false);
        expect(storage.has("ursa:audio:musicMuted:v1")).toBe(false);
        expect(storage.has("other:key")).toBe(true);
    });

    it("removes only input profile keys in input-profiles scope", () => {
        const storage = new MemoryStorage({
            [QUICK_SAVE_STORAGE_KEY]: "{}",
            "ursa:input-profile:v1": "{}",
            "ursa:input-profile:legacy": "{}",
            "ursa:audio:masterMuted:v1": "1",
            "other:key": "keep",
        });

        const result = sanitizePersistedState("input-profiles", storage);

        expect(result.ok).toBe(true);
        expect(result.removedKeys).toContain("ursa:input-profile:v1");
        expect(result.removedKeys).toContain("ursa:input-profile:legacy");
        expect(storage.has("ursa:input-profile:v1")).toBe(false);
        expect(storage.has("ursa:input-profile:legacy")).toBe(false);
        expect(storage.has(QUICK_SAVE_STORAGE_KEY)).toBe(true);
        expect(storage.has("ursa:audio:masterMuted:v1")).toBe(true);
        expect(storage.has("other:key")).toBe(true);
    });

    it("returns false when storage is unavailable", () => {
        const result = sanitizePersistedState("all", null);
        expect(result.ok).toBe(false);
        expect(result.removedKeys).toEqual([]);
    });

    it("returns false when storage throws", () => {
        const failingStorage = {
            length: 1,
            key: vi.fn(() => QUICK_SAVE_STORAGE_KEY),
            removeItem: vi.fn(() => {
                throw new Error("blocked");
            }),
        };

        const result = sanitizePersistedState("all", failingStorage);

        expect(result.ok).toBe(false);
        expect(result.removedKeys).toEqual([]);
    });
});
