import { describe, expect, it } from "vitest";
import { createVersionedSchemaMigration } from "@/services/schemaMigration";

type CurrentDoc = {
    version: 2;
    name: string;
    enabled: boolean;
};

describe("versioned schema migration", () => {
    const migration = createVersionedSchemaMigration<CurrentDoc>({
        currentVersion: 2,
        validateCurrent: (payload: unknown): payload is CurrentDoc => {
            if (!payload || typeof payload !== "object") {
                return false;
            }

            const record = payload as Record<string, unknown>;
            return (
                record.version === 2 &&
                typeof record.name === "string" &&
                typeof record.enabled === "boolean"
            );
        },
        migrations: {
            0: (payload) => {
                const source = payload as {
                    version: 0;
                    title: string;
                };

                return {
                    version: 1,
                    name: source.title,
                };
            },
            1: (payload) => {
                const source = payload as {
                    version: 1;
                    name: string;
                };

                return {
                    version: 2,
                    name: source.name,
                    enabled: true,
                };
            },
        },
    });

    it("migrates old versions through each step", () => {
        const result = migration.migrate({
            version: 0,
            title: "profile-a",
        });

        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }

        expect(result.appliedVersions).toEqual([1, 2]);
        expect(result.value).toEqual({
            version: 2,
            name: "profile-a",
            enabled: true,
        });
    });

    it("returns unsupported-version for missing migration step", () => {
        const partial = createVersionedSchemaMigration<CurrentDoc>({
            currentVersion: 2,
            validateCurrent: (payload: unknown): payload is CurrentDoc => {
                const record = payload as Record<string, unknown>;
                return (
                    !!record &&
                    record.version === 2 &&
                    typeof record.name === "string" &&
                    typeof record.enabled === "boolean"
                );
            },
            migrations: {
                1: (payload) => payload,
            },
        });

        const result = partial.preflight({ version: 0, title: "x" });
        expect(result.ok).toBe(false);
        if (result.ok) {
            return;
        }

        expect(result.code).toBe("unsupported-version");
    });

    it("returns invalid-payload when version field is missing", () => {
        const result = migration.preflight({ title: "x" });
        expect(result.ok).toBe(false);
        if (result.ok) {
            return;
        }

        expect(result.code).toBe("invalid-payload");
        expect(result.version).toBeNull();
    });

    it("returns migration-failed when a step throws", () => {
        const failing = createVersionedSchemaMigration<CurrentDoc>({
            currentVersion: 2,
            validateCurrent: (payload: unknown): payload is CurrentDoc => {
                const record = payload as Record<string, unknown>;
                return (
                    !!record &&
                    record.version === 2 &&
                    typeof record.name === "string" &&
                    typeof record.enabled === "boolean"
                );
            },
            migrations: {
                1: () => {
                    throw new Error("bad step");
                },
            },
        });

        const result = failing.migrate({ version: 1, name: "x" });
        expect(result.ok).toBe(false);
        if (result.ok) {
            return;
        }

        expect(result.code).toBe("migration-failed");
    });

    it("returns unsupported-version for newer payload versions", () => {
        const result = migration.preflight({
            version: 3,
            name: "future",
            enabled: true,
        });

        expect(result.ok).toBe(false);
        if (result.ok) {
            return;
        }

        expect(result.code).toBe("unsupported-version");
        expect(result.version).toBe(3);
    });
});
