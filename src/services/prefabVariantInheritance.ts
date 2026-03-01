import {
    exportPrefabBlueprint,
    mergePrefabConfig,
    type PrefabBlueprint,
    type PrefabBuilderModule,
    type PrefabModuleConfig,
    type PrefabRegistry,
} from "@/services/prefabCore";

export type PrefabVariantBlueprint = {
    version: PrefabBlueprint["version"];
    id: string;
    domain: string;
    modules: PrefabBuilderModule[];
    metadata?: Record<string, unknown>;
    extends?: string;
    extendsId?: string;
    inherits?: string[];
};

export type PrefabVariantIssue = {
    code:
        | "duplicate-blueprint-id"
        | "missing-blueprint"
        | "missing-parent"
        | "circular-inheritance"
        | "domain-mismatch"
        | "module-composition";
    path: string;
    message: string;
};

export type PrefabVariantResolutionTrace = {
    lineage: string[];
    moduleSources: Record<string, string[]>;
};

export type PrefabVariantResolutionResult = {
    ok: boolean;
    blueprint: PrefabBlueprint | null;
    trace: PrefabVariantResolutionTrace;
    issues: PrefabVariantIssue[];
};

type InternalResolvedNode = {
    id: string;
    domain: string;
    modulesById: Map<string, PrefabModuleConfig>;
    sourcesByModuleId: Map<string, string[]>;
    lineage: string[];
};

function normalizeId(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

function toObject(value: unknown): PrefabModuleConfig {
    if (typeof value === "object" && value !== null) {
        return value as PrefabModuleConfig;
    }

    return {};
}

function toParentIds(blueprint: PrefabVariantBlueprint): string[] {
    const parentIds: string[] = [];
    const extendsId = normalizeId(blueprint.extendsId ?? blueprint.extends);
    if (extendsId) {
        parentIds.push(extendsId);
    }

    for (const inheritId of blueprint.inherits ?? []) {
        const normalized = normalizeId(inheritId);
        if (normalized && !parentIds.includes(normalized)) {
            parentIds.push(normalized);
        }
    }

    return parentIds;
}

function mergeModuleMaps(
    target: Map<string, PrefabModuleConfig>,
    source: Map<string, PrefabModuleConfig>,
): void {
    for (const [moduleId, config] of source.entries()) {
        const existing = target.get(moduleId);
        target.set(
            moduleId,
            existing ? mergePrefabConfig(existing, config) : toObject(config),
        );
    }
}

function mergeSourceMaps(
    target: Map<string, string[]>,
    source: Map<string, string[]>,
): void {
    for (const [moduleId, contributors] of source.entries()) {
        const existing = target.get(moduleId) ?? [];
        for (const contributor of contributors) {
            if (!existing.includes(contributor)) {
                existing.push(contributor);
            }
        }
        target.set(moduleId, existing);
    }
}

function includeLineage(target: string[], source: string[]): void {
    for (const item of source) {
        if (!target.includes(item)) {
            target.push(item);
        }
    }
}

function toIssue(
    code: PrefabVariantIssue["code"],
    path: string,
    message: string,
): PrefabVariantIssue {
    return {
        code,
        path,
        message,
    };
}

export function resolvePrefabVariantBlueprint(input: {
    targetId: string;
    blueprints: PrefabVariantBlueprint[];
    registry?: PrefabRegistry;
}): PrefabVariantResolutionResult {
    const issues: PrefabVariantIssue[] = [];
    const byId = new Map<string, PrefabVariantBlueprint>();

    for (let index = 0; index < input.blueprints.length; index += 1) {
        const blueprint = input.blueprints[index];
        const id = normalizeId(blueprint.id);
        if (!id) {
            issues.push(
                toIssue(
                    "missing-blueprint",
                    `$.blueprints[${index}].id`,
                    "Blueprint id is required.",
                ),
            );
            continue;
        }

        if (byId.has(id)) {
            issues.push(
                toIssue(
                    "duplicate-blueprint-id",
                    `$.blueprints[${index}].id`,
                    `Duplicate variant blueprint id "${id}".`,
                ),
            );
            continue;
        }

        byId.set(id, {
            ...blueprint,
            id,
        });
    }

    const targetId = normalizeId(input.targetId);
    if (!targetId) {
        issues.push(
            toIssue(
                "missing-blueprint",
                "$.targetId",
                "Target id is required.",
            ),
        );
    }

    const memo = new Map<string, InternalResolvedNode>();
    const resolving = new Set<string>();

    const resolveNode = (id: string): InternalResolvedNode | null => {
        if (memo.has(id)) {
            return memo.get(id) ?? null;
        }

        const blueprint = byId.get(id);
        if (!blueprint) {
            issues.push(
                toIssue(
                    "missing-parent",
                    `$.blueprints[*].parents`,
                    `Missing parent blueprint "${id}".`,
                ),
            );
            return null;
        }

        if (resolving.has(id)) {
            const cyclePath = [...resolving.values(), id].join(" -> ");
            issues.push(
                toIssue(
                    "circular-inheritance",
                    `$.blueprints[${id}]`,
                    `Circular inheritance detected (${cyclePath}).`,
                ),
            );
            return null;
        }

        resolving.add(id);
        const modulesById = new Map<string, PrefabModuleConfig>();
        const sourcesByModuleId = new Map<string, string[]>();
        const lineage: string[] = [];

        for (const parentId of toParentIds(blueprint)) {
            const parent = resolveNode(parentId);
            if (!parent) {
                continue;
            }

            if (parent.domain !== blueprint.domain) {
                issues.push(
                    toIssue(
                        "domain-mismatch",
                        `$.blueprints["${id}"].parents`,
                        `Parent "${parent.id}" domain "${parent.domain}" does not match child domain "${blueprint.domain}".`,
                    ),
                );
                continue;
            }

            mergeModuleMaps(modulesById, parent.modulesById);
            mergeSourceMaps(sourcesByModuleId, parent.sourcesByModuleId);
            includeLineage(lineage, parent.lineage);
        }

        for (const module of blueprint.modules) {
            const moduleId = normalizeId(module.moduleId);
            if (!moduleId) {
                continue;
            }

            const existing = modulesById.get(moduleId) ?? {};
            const merged = mergePrefabConfig(existing, toObject(module.config));
            modulesById.set(moduleId, merged);

            const sources = sourcesByModuleId.get(moduleId) ?? [];
            if (!sources.includes(blueprint.id)) {
                sources.push(blueprint.id);
            }
            sourcesByModuleId.set(moduleId, sources);
        }

        includeLineage(lineage, [blueprint.id]);

        const resolvedNode: InternalResolvedNode = {
            id: blueprint.id,
            domain: blueprint.domain,
            modulesById,
            sourcesByModuleId,
            lineage,
        };
        memo.set(id, resolvedNode);
        resolving.delete(id);
        return resolvedNode;
    };

    const target = targetId ? resolveNode(targetId) : null;
    if (!target && targetId) {
        if (!byId.has(targetId)) {
            issues.push(
                toIssue(
                    "missing-blueprint",
                    "$.targetId",
                    `Target blueprint "${targetId}" was not found.`,
                ),
            );
        }

        return {
            ok: false,
            blueprint: null,
            trace: {
                lineage: [],
                moduleSources: {},
            },
            issues,
        };
    }

    const modules = Array.from(target?.modulesById.entries() ?? [])
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([moduleId, config]) => ({
            moduleId,
            config,
        }));

    const moduleSources = Array.from(target?.sourcesByModuleId.entries() ?? [])
        .sort(([left], [right]) => left.localeCompare(right))
        .reduce<Record<string, string[]>>((acc, [moduleId, sources]) => {
            acc[moduleId] = [...sources];
            return acc;
        }, {});

    const targetBlueprint = byId.get(targetId);
    const flattened: PrefabBlueprint | null =
        target && targetBlueprint
            ? {
                  version: targetBlueprint.version,
                  id: targetBlueprint.id,
                  domain: targetBlueprint.domain,
                  modules,
                  ...(targetBlueprint.metadata
                      ? { metadata: targetBlueprint.metadata }
                      : {}),
              }
            : null;

    if (flattened && input.registry) {
        const composition = input.registry.validateComposition({
            domain: flattened.domain,
            moduleIds: flattened.modules.map((entry) => entry.moduleId),
        });

        for (const compositionIssue of composition.issues) {
            issues.push(
                toIssue(
                    "module-composition",
                    "$.modules",
                    compositionIssue.message,
                ),
            );
        }
    }

    return {
        ok: issues.length <= 0 && Boolean(flattened),
        blueprint: flattened,
        trace: {
            lineage: [...(target?.lineage ?? [])],
            moduleSources,
        },
        issues,
    };
}

export function exportResolvedPrefabVariantBlueprint(
    input: PrefabVariantResolutionResult,
    options?: { pretty?: boolean },
): string | null {
    if (!input.ok || !input.blueprint) {
        return null;
    }

    return exportPrefabBlueprint(input.blueprint, options);
}
