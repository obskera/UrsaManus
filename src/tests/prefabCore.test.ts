import { describe, expect, it } from "vitest";
import {
    createPrefabAttachmentRuntime,
    createPrefabBuilder,
    createPrefabRegistry,
    exportPrefabBlueprint,
    importPrefabBlueprint,
    mergePrefabConfig,
    PREFAB_ATTACHED_SIGNAL,
    PREFAB_ATTACH_FAILED_SIGNAL,
    PREFAB_DETACHED_SIGNAL,
} from "@/services/prefabCore";

describe("prefabCore", () => {
    it("merges prefab config with replace and append array policies", () => {
        const merged = mergePrefabConfig(
            {
                tags: ["base-a"],
                nested: {
                    values: [1, 2],
                    name: "base",
                },
            },
            {
                tags: ["override-a"],
                nested: {
                    values: [3],
                },
            },
            {
                defaultArrayPolicy: "replace",
                arrayPolicyByPath: {
                    "nested.values": "append",
                },
            },
        );

        expect(merged).toEqual({
            nested: {
                name: "base",
                values: [1, 2, 3],
            },
            tags: ["override-a"],
        });
    });

    it("validates module dependencies and conflicts", () => {
        const registry = createPrefabRegistry();
        registry.registerModule({
            id: "core",
            domain: "player",
            attach: () => ({ ok: true }),
        });
        registry.registerModule({
            id: "combat",
            domain: "player",
            dependencies: ["core"],
            conflicts: ["social"],
            attach: () => ({ ok: true }),
        });
        registry.registerModule({
            id: "social",
            domain: "player",
            attach: () => ({ ok: true }),
        });

        const missingDep = registry.validateComposition({
            domain: "player",
            moduleIds: ["combat"],
        });
        expect(missingDep.ok).toBe(false);
        expect(missingDep.issues.map((issue) => issue.code)).toContain(
            "missing-dependency",
        );

        const conflict = registry.validateComposition({
            domain: "player",
            moduleIds: ["core", "combat", "social"],
        });
        expect(conflict.ok).toBe(false);
        expect(conflict.issues.map((issue) => issue.code)).toContain(
            "module-conflict",
        );
    });

    it("builds deterministic blueprint from module defaults and overrides", () => {
        const registry = createPrefabRegistry();
        registry.registerModule({
            id: "module-a",
            domain: "player",
            defaults: {
                enabled: true,
                values: ["a"],
            },
            attach: () => ({ ok: true }),
        });
        registry.registerModule({
            id: "module-b",
            domain: "player",
            defaults: {
                rank: 1,
            },
            dependencies: ["module-a"],
            attach: () => ({ ok: true }),
        });

        const builder = createPrefabBuilder({
            registry,
            domain: "player",
            blueprintId: "starter",
        });
        expect(
            builder.addModule("module-b", {
                rank: 2,
            }),
        ).toBe(true);
        expect(
            builder.addModule("module-a", {
                values: ["override"],
            }),
        ).toBe(true);

        const build = builder.buildBlueprint();
        expect(build.ok).toBe(true);
        expect(build.blueprint.modules).toEqual([
            {
                moduleId: "module-a",
                config: {
                    enabled: true,
                    values: ["override"],
                },
            },
            {
                moduleId: "module-b",
                config: {
                    rank: 2,
                },
            },
        ]);
    });

    it("exports and imports prefab blueprint JSON", () => {
        const registry = createPrefabRegistry();
        registry.registerModule({
            id: "core",
            domain: "player",
            attach: () => ({ ok: true }),
        });

        const builder = createPrefabBuilder({
            registry,
            domain: "player",
            blueprintId: "rpg-starter",
        });
        builder.addModule("core", {});

        const blueprint = builder.finalize();
        expect(blueprint).not.toBeNull();

        const raw = exportPrefabBlueprint(blueprint!);
        const imported = importPrefabBlueprint(raw);
        expect(imported.ok).toBe(true);
        if (imported.ok) {
            expect(imported.value.id).toBe("rpg-starter");
            expect(imported.value.modules).toHaveLength(1);
        }

        const invalid = importPrefabBlueprint(
            JSON.stringify({
                version: "wrong-version",
                id: "x",
                domain: "player",
                modules: [],
            }),
        );
        expect(invalid.ok).toBe(false);
    });

    it("attaches and detaches modules with status reporting", () => {
        const registry = createPrefabRegistry();
        const lifecycle: string[] = [];

        registry.registerModule({
            id: "core",
            domain: "player",
            attach: ({ entityId }) => ({ entityId }),
            detach: ({ entityId }) => {
                lifecycle.push(`detached:${entityId}:core`);
            },
        });
        registry.registerModule({
            id: "combat",
            domain: "player",
            dependencies: ["core"],
            attach: ({ entityId }) => ({ entityId }),
            detach: ({ entityId }) => {
                lifecycle.push(`detached:${entityId}:combat`);
            },
        });
        registry.registerModule({
            id: "broken",
            domain: "player",
            attach: () => {
                throw new Error("broken attach");
            },
        });

        const emitted: string[] = [];
        const runtime = createPrefabAttachmentRuntime({
            registry,
            emit: (signal) => {
                emitted.push(signal);
            },
        });

        const report = runtime.attachPrefabModules("player-1", [
            { moduleId: "combat" },
            { moduleId: "core" },
            { moduleId: "broken" },
        ]);

        expect(report.attached.map((item) => item.moduleId)).toEqual([
            "core",
            "combat",
        ]);
        expect(report.failed.map((item) => item.moduleId)).toEqual(["broken"]);
        expect(emitted).toContain(PREFAB_ATTACHED_SIGNAL);
        expect(emitted).toContain(PREFAB_ATTACH_FAILED_SIGNAL);

        const detachReport = runtime.detachPrefabModules("player-1");
        expect(detachReport.attached.map((item) => item.moduleId)).toEqual([
            "combat",
            "core",
        ]);
        expect(emitted).toContain(PREFAB_DETACHED_SIGNAL);
        expect(lifecycle).toEqual([
            "detached:player-1:combat",
            "detached:player-1:core",
        ]);
    });
});
