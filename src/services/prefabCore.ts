import { signalBus } from "@/services/signalBus";
import {
    parseJsonDocument,
    stringifyJsonDocument,
    type JsonValidationResult,
} from "@/services/toolJsonDocument";

export const PREFAB_BLUEPRINT_VERSION = "um-prefab-blueprint-v1";

export const PREFAB_ATTACHED_SIGNAL = "prefab:attached";
export const PREFAB_DETACHED_SIGNAL = "prefab:detached";
export const PREFAB_ATTACH_FAILED_SIGNAL = "prefab:attach-failed";

export type PrefabArrayMergePolicy = "replace" | "append";

export type PrefabMergeOptions = {
    defaultArrayPolicy?: PrefabArrayMergePolicy;
    arrayPolicyByPath?: Record<string, PrefabArrayMergePolicy>;
};

export type PrefabModuleConfig = Record<string, unknown>;

export type PrefabModuleDefinition<TRuntime = unknown> = {
    id: string;
    domain: string;
    dependencies?: string[];
    conflicts?: string[];
    defaults?: PrefabModuleConfig;
    attach: (input: {
        entityId: string;
        config: PrefabModuleConfig;
        context?: Record<string, unknown>;
    }) => TRuntime;
    detach?: (input: {
        entityId: string;
        runtime: TRuntime;
        context?: Record<string, unknown>;
    }) => void;
};

export type PrefabBuilderModule = {
    moduleId: string;
    config: PrefabModuleConfig;
};

export type PrefabBlueprint = {
    version: typeof PREFAB_BLUEPRINT_VERSION;
    id: string;
    domain: string;
    modules: PrefabBuilderModule[];
    metadata?: Record<string, unknown>;
};

export type PrefabValidationIssue = {
    code:
        | "missing-module"
        | "missing-dependency"
        | "module-conflict"
        | "domain-mismatch"
        | "duplicate-module";
    moduleId: string;
    relatedModuleId?: string;
    message: string;
};

export type PrefabValidationResult = {
    ok: boolean;
    issues: PrefabValidationIssue[];
};

export type PrefabBlueprintBuildResult = {
    ok: boolean;
    blueprint: PrefabBlueprint;
    issues: PrefabValidationIssue[];
};

export type PrefabRegistry = {
    registerModule: (definition: PrefabModuleDefinition) => boolean;
    unregisterModule: (moduleId: string) => boolean;
    getModule: (moduleId: string) => PrefabModuleDefinition | null;
    listModules: (options?: { domain?: string }) => PrefabModuleDefinition[];
    validateComposition: (input: {
        domain?: string;
        moduleIds: string[];
    }) => PrefabValidationResult;
};

export type PrefabBuilder = {
    setBlueprintId: (blueprintId: string) => boolean;
    addModule: (moduleId: string, overrides?: PrefabModuleConfig) => boolean;
    removeModule: (moduleId: string) => boolean;
    setModuleOverrides: (
        moduleId: string,
        overrides: PrefabModuleConfig,
    ) => boolean;
    buildBlueprint: () => PrefabBlueprintBuildResult;
    finalize: () => PrefabBlueprint | null;
};

export type PrefabAttachRequest = {
    moduleId: string;
    config?: PrefabModuleConfig;
};

export type PrefabAttachStatus = {
    moduleId: string;
};

export type PrefabAttachSkippedStatus = {
    moduleId: string;
    reason:
        | "missing-module"
        | "missing-dependency"
        | "conflict"
        | "already-attached";
    details?: string;
};

export type PrefabAttachFailedStatus = {
    moduleId: string;
    reason: "attach-threw" | "detach-threw";
    error: string;
};

export type PrefabAttachmentReport = {
    entityId: string;
    attached: PrefabAttachStatus[];
    skipped: PrefabAttachSkippedStatus[];
    failed: PrefabAttachFailedStatus[];
};

export type PrefabAttachmentRuntime = {
    attachPrefabModules: (
        entityId: string,
        requests: PrefabAttachRequest[],
        context?: Record<string, unknown>,
    ) => PrefabAttachmentReport;
    detachPrefabModules: (
        entityId: string,
        moduleIds?: string[],
        context?: Record<string, unknown>,
    ) => PrefabAttachmentReport;
    getAttachedModuleIds: (entityId: string) => string[];
};

function normalizeId(value: string): string {
    return value.trim();
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function cloneJsonValue(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map((entry) => cloneJsonValue(entry));
    }

    if (!isObject(value)) {
        return value;
    }

    const next: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort((left, right) =>
        left.localeCompare(right),
    )) {
        next[key] = cloneJsonValue(value[key]);
    }

    return next;
}

function dedupeIds(values: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const value of values) {
        const normalized = normalizeId(value);
        if (!normalized || seen.has(normalized)) {
            continue;
        }

        seen.add(normalized);
        result.push(normalized);
    }

    return result;
}

function toConfig(value: unknown): PrefabModuleConfig {
    if (!isObject(value)) {
        return {};
    }

    return cloneJsonValue(value) as PrefabModuleConfig;
}

function toPath(path: string[]): string {
    return path.join(".");
}

function toArrayPolicy(path: string[], options?: PrefabMergeOptions) {
    const pathKey = toPath(path);
    if (pathKey && options?.arrayPolicyByPath?.[pathKey]) {
        return options.arrayPolicyByPath[pathKey];
    }

    return options?.defaultArrayPolicy ?? "replace";
}

export function mergePrefabConfig(
    base: PrefabModuleConfig,
    overrides: PrefabModuleConfig,
    options?: PrefabMergeOptions,
): PrefabModuleConfig {
    const mergeValue = (
        baseValue: unknown,
        overrideValue: unknown,
        path: string[],
    ): unknown => {
        if (overrideValue === undefined) {
            return cloneJsonValue(baseValue);
        }

        if (Array.isArray(baseValue) && Array.isArray(overrideValue)) {
            return toArrayPolicy(path, options) === "append"
                ? [...baseValue, ...overrideValue].map((entry) =>
                      cloneJsonValue(entry),
                  )
                : overrideValue.map((entry) => cloneJsonValue(entry));
        }

        if (isObject(baseValue) && isObject(overrideValue)) {
            const keys = dedupeIds([
                ...Object.keys(baseValue),
                ...Object.keys(overrideValue),
            ]);
            const next: Record<string, unknown> = {};
            for (const key of keys.sort((left, right) =>
                left.localeCompare(right),
            )) {
                next[key] = mergeValue(baseValue[key], overrideValue[key], [
                    ...path,
                    key,
                ]);
            }

            return next;
        }

        return cloneJsonValue(overrideValue);
    };

    return mergeValue(base, overrides, []) as PrefabModuleConfig;
}

function cloneModuleDefinition(
    definition: PrefabModuleDefinition,
): PrefabModuleDefinition {
    return {
        ...definition,
        dependencies: definition.dependencies
            ? [...definition.dependencies]
            : undefined,
        conflicts: definition.conflicts ? [...definition.conflicts] : undefined,
        defaults: definition.defaults
            ? toConfig(definition.defaults)
            : undefined,
    };
}

export function createPrefabRegistry(): PrefabRegistry {
    const modulesById = new Map<string, PrefabModuleDefinition>();

    return {
        registerModule: (definition) => {
            const id = normalizeId(definition.id);
            const domain = normalizeId(definition.domain);
            if (!id || !domain || typeof definition.attach !== "function") {
                return false;
            }

            const dependencies = dedupeIds(
                definition.dependencies ?? [],
            ).filter((dependency) => dependency !== id);
            const conflicts = dedupeIds(definition.conflicts ?? []).filter(
                (conflict) => conflict !== id,
            );

            modulesById.set(id, {
                ...definition,
                id,
                domain,
                dependencies,
                conflicts,
                defaults: definition.defaults
                    ? toConfig(definition.defaults)
                    : undefined,
            });
            return true;
        },
        unregisterModule: (moduleId) => {
            const id = normalizeId(moduleId);
            return id ? modulesById.delete(id) : false;
        },
        getModule: (moduleId) => {
            const moduleDefinition = modulesById.get(normalizeId(moduleId));
            return moduleDefinition
                ? cloneModuleDefinition(moduleDefinition)
                : null;
        },
        listModules: (options) => {
            const domainFilter = options?.domain?.trim();
            return Array.from(modulesById.values())
                .filter((definition) =>
                    domainFilter ? definition.domain === domainFilter : true,
                )
                .sort((left, right) => left.id.localeCompare(right.id))
                .map((definition) => cloneModuleDefinition(definition));
        },
        validateComposition: (input) => {
            const issues: PrefabValidationIssue[] = [];
            const domain = input.domain?.trim();
            const normalizedIds = dedupeIds(input.moduleIds);
            const selected = new Set(normalizedIds);

            const rawSeen = new Set<string>();
            for (const moduleId of input.moduleIds) {
                const normalized = normalizeId(moduleId);
                if (!normalized) {
                    continue;
                }

                if (rawSeen.has(normalized)) {
                    issues.push({
                        code: "duplicate-module",
                        moduleId: normalized,
                        message: `Module "${normalized}" was selected more than once.`,
                    });
                    continue;
                }

                rawSeen.add(normalized);
            }

            for (const moduleId of normalizedIds) {
                const moduleDefinition = modulesById.get(moduleId);
                if (!moduleDefinition) {
                    issues.push({
                        code: "missing-module",
                        moduleId,
                        message: `Module "${moduleId}" is not registered.`,
                    });
                    continue;
                }

                if (domain && moduleDefinition.domain !== domain) {
                    issues.push({
                        code: "domain-mismatch",
                        moduleId,
                        message: `Module "${moduleId}" belongs to domain "${moduleDefinition.domain}", expected "${domain}".`,
                    });
                }

                for (const dependency of moduleDefinition.dependencies ?? []) {
                    if (!selected.has(dependency)) {
                        issues.push({
                            code: "missing-dependency",
                            moduleId,
                            relatedModuleId: dependency,
                            message: `Module "${moduleId}" requires "${dependency}".`,
                        });
                    }
                }

                for (const conflict of moduleDefinition.conflicts ?? []) {
                    if (!selected.has(conflict)) {
                        continue;
                    }

                    if (moduleId.localeCompare(conflict) > 0) {
                        continue;
                    }

                    issues.push({
                        code: "module-conflict",
                        moduleId,
                        relatedModuleId: conflict,
                        message: `Module "${moduleId}" conflicts with "${conflict}".`,
                    });
                }
            }

            return {
                ok: issues.length === 0,
                issues,
            };
        },
    };
}

export function createPrefabBuilder(options: {
    registry: PrefabRegistry;
    domain: string;
    blueprintId: string;
}): PrefabBuilder {
    let blueprintId = normalizeId(options.blueprintId);
    const domain = normalizeId(options.domain);
    const selectedById = new Map<string, PrefabModuleConfig>();

    const build = (): PrefabBlueprintBuildResult => {
        const moduleIds = Array.from(selectedById.keys()).sort((left, right) =>
            left.localeCompare(right),
        );
        const validation = options.registry.validateComposition({
            domain,
            moduleIds,
        });

        const modules: PrefabBuilderModule[] = moduleIds.map((moduleId) => {
            const moduleDefinition = options.registry.getModule(moduleId);
            const defaults = moduleDefinition?.defaults ?? {};
            const overrides = selectedById.get(moduleId) ?? {};

            return {
                moduleId,
                config: mergePrefabConfig(defaults, overrides),
            };
        });

        const blueprint: PrefabBlueprint = {
            version: PREFAB_BLUEPRINT_VERSION,
            id: blueprintId,
            domain,
            modules,
        };

        return {
            ok:
                validation.ok &&
                Boolean(blueprint.id) &&
                Boolean(blueprint.domain) &&
                blueprint.modules.length > 0,
            blueprint,
            issues: validation.issues,
        };
    };

    return {
        setBlueprintId: (nextBlueprintId) => {
            const normalized = normalizeId(nextBlueprintId);
            if (!normalized) {
                return false;
            }

            blueprintId = normalized;
            return true;
        },
        addModule: (moduleId, overrides) => {
            const id = normalizeId(moduleId);
            if (!id || !options.registry.getModule(id)) {
                return false;
            }

            selectedById.set(id, toConfig(overrides ?? {}));
            return true;
        },
        removeModule: (moduleId) => {
            const id = normalizeId(moduleId);
            return id ? selectedById.delete(id) : false;
        },
        setModuleOverrides: (moduleId, overrides) => {
            const id = normalizeId(moduleId);
            if (!id || !selectedById.has(id)) {
                return false;
            }

            selectedById.set(id, toConfig(overrides));
            return true;
        },
        buildBlueprint: build,
        finalize: () => {
            const result = build();
            return result.ok ? result.blueprint : null;
        },
    };
}

export function exportPrefabBlueprint(
    blueprint: PrefabBlueprint,
    options?: { pretty?: boolean },
): string {
    return stringifyJsonDocument(
        cloneJsonValue(blueprint),
        options?.pretty ?? true,
    );
}

function validateBlueprintPayload(
    value: unknown,
): JsonValidationResult<PrefabBlueprint> {
    if (!isObject(value)) {
        return {
            ok: false,
            message: "Invalid prefab blueprint payload.",
        };
    }

    if (value.version !== PREFAB_BLUEPRINT_VERSION) {
        return {
            ok: false,
            message: "Invalid prefab blueprint version.",
        };
    }

    const id = normalizeId(String(value.id ?? ""));
    const domain = normalizeId(String(value.domain ?? ""));
    if (!id || !domain || !Array.isArray(value.modules)) {
        return {
            ok: false,
            message: "Invalid prefab blueprint shape.",
        };
    }

    const modules: PrefabBuilderModule[] = [];
    for (const entry of value.modules) {
        if (!isObject(entry)) {
            return {
                ok: false,
                message: "Invalid prefab module entry.",
            };
        }

        const moduleId = normalizeId(String(entry.moduleId ?? ""));
        if (!moduleId) {
            return {
                ok: false,
                message: "Invalid prefab module id.",
            };
        }

        modules.push({
            moduleId,
            config: toConfig(entry.config),
        });
    }

    return {
        ok: true,
        value: {
            version: PREFAB_BLUEPRINT_VERSION,
            id,
            domain,
            modules,
            ...(isObject(value.metadata)
                ? { metadata: toConfig(value.metadata) }
                : {}),
        },
    };
}

export function importPrefabBlueprint(
    raw: string,
): JsonValidationResult<PrefabBlueprint> {
    return parseJsonDocument(raw, {
        invalidJsonMessage: "Invalid prefab blueprint JSON.",
        validate: validateBlueprintPayload,
    });
}

type AttachedModuleRuntime = {
    definition: PrefabModuleDefinition;
    runtime: unknown;
};

export function createPrefabAttachmentRuntime(options: {
    registry: PrefabRegistry;
    emit?: <TPayload>(signal: string, payload: TPayload) => void;
}): PrefabAttachmentRuntime {
    const emit =
        options.emit ??
        (<TPayload>(signal: string, payload: TPayload) => {
            signalBus.emit(signal, payload);
        });

    const byEntity = new Map<string, Map<string, AttachedModuleRuntime>>();

    const toAttachedSet = (entityId: string) => {
        const existing = byEntity.get(entityId);
        if (existing) {
            return existing;
        }

        const next = new Map<string, AttachedModuleRuntime>();
        byEntity.set(entityId, next);
        return next;
    };

    return {
        attachPrefabModules: (entityIdInput, requests, context) => {
            const entityId = normalizeId(entityIdInput);
            const report: PrefabAttachmentReport = {
                entityId,
                attached: [],
                skipped: [],
                failed: [],
            };
            if (!entityId) {
                return report;
            }

            const attachedByModuleId = toAttachedSet(entityId);
            const requestByModuleId = new Map<string, PrefabAttachRequest>();
            for (const request of requests) {
                const moduleId = normalizeId(request.moduleId);
                if (!moduleId) {
                    continue;
                }

                requestByModuleId.set(moduleId, {
                    moduleId,
                    config: toConfig(request.config),
                });
            }

            const pendingIds = new Set<string>(requestByModuleId.keys());
            const attachedThisRun = new Set<string>();

            let progressed = true;
            while (pendingIds.size > 0 && progressed) {
                progressed = false;

                for (const moduleId of Array.from(pendingIds.values())) {
                    if (attachedByModuleId.has(moduleId)) {
                        pendingIds.delete(moduleId);
                        report.skipped.push({
                            moduleId,
                            reason: "already-attached",
                        });
                        continue;
                    }

                    const definition = options.registry.getModule(moduleId);
                    if (!definition) {
                        pendingIds.delete(moduleId);
                        report.skipped.push({
                            moduleId,
                            reason: "missing-module",
                        });
                        continue;
                    }

                    const dependencies = definition.dependencies ?? [];
                    const missingDependency = dependencies.find(
                        (dependency) =>
                            !attachedByModuleId.has(dependency) &&
                            !attachedThisRun.has(dependency),
                    );
                    if (missingDependency) {
                        continue;
                    }

                    const conflicts = definition.conflicts ?? [];
                    const conflict = conflicts.find(
                        (module) =>
                            attachedByModuleId.has(module) ||
                            attachedThisRun.has(module),
                    );
                    if (conflict) {
                        pendingIds.delete(moduleId);
                        report.skipped.push({
                            moduleId,
                            reason: "conflict",
                            details: `Conflicts with "${conflict}".`,
                        });
                        continue;
                    }

                    const request = requestByModuleId.get(moduleId);
                    const mergedConfig = mergePrefabConfig(
                        definition.defaults ?? {},
                        request?.config ?? {},
                    );

                    try {
                        const runtime = definition.attach({
                            entityId,
                            config: mergedConfig,
                            context,
                        });
                        attachedByModuleId.set(moduleId, {
                            definition,
                            runtime,
                        });
                        pendingIds.delete(moduleId);
                        attachedThisRun.add(moduleId);
                        progressed = true;
                        report.attached.push({ moduleId });
                        emit(PREFAB_ATTACHED_SIGNAL, {
                            entityId,
                            moduleId,
                        });
                    } catch (error) {
                        pendingIds.delete(moduleId);
                        const message =
                            error instanceof Error
                                ? error.message
                                : String(error);
                        report.failed.push({
                            moduleId,
                            reason: "attach-threw",
                            error: message,
                        });
                        emit(PREFAB_ATTACH_FAILED_SIGNAL, {
                            entityId,
                            moduleId,
                            error: message,
                        });
                    }
                }
            }

            for (const moduleId of pendingIds) {
                const definition = options.registry.getModule(moduleId);
                const dependencies = definition?.dependencies ?? [];
                const missingDependency = dependencies.find(
                    (dependency) =>
                        !attachedByModuleId.has(dependency) &&
                        !attachedThisRun.has(dependency),
                );

                report.skipped.push({
                    moduleId,
                    reason: "missing-dependency",
                    ...(missingDependency
                        ? { details: `Requires "${missingDependency}".` }
                        : {}),
                });
            }

            return report;
        },
        detachPrefabModules: (entityIdInput, moduleIds, context) => {
            const entityId = normalizeId(entityIdInput);
            const report: PrefabAttachmentReport = {
                entityId,
                attached: [],
                skipped: [],
                failed: [],
            };
            if (!entityId) {
                return report;
            }

            const attachedByModuleId = byEntity.get(entityId);
            if (!attachedByModuleId) {
                return report;
            }

            const targetIds =
                moduleIds && moduleIds.length > 0
                    ? dedupeIds(moduleIds)
                    : Array.from(attachedByModuleId.keys());

            const detachIds = [...targetIds].reverse();
            for (const moduleId of detachIds) {
                const attached = attachedByModuleId.get(moduleId);
                if (!attached) {
                    report.skipped.push({
                        moduleId,
                        reason: "missing-module",
                    });
                    continue;
                }

                if (attached.definition.detach) {
                    try {
                        attached.definition.detach({
                            entityId,
                            runtime: attached.runtime,
                            context,
                        });
                    } catch (error) {
                        const message =
                            error instanceof Error
                                ? error.message
                                : String(error);
                        report.failed.push({
                            moduleId,
                            reason: "detach-threw",
                            error: message,
                        });
                        continue;
                    }
                }

                attachedByModuleId.delete(moduleId);
                report.attached.push({ moduleId });
                emit(PREFAB_DETACHED_SIGNAL, {
                    entityId,
                    moduleId,
                });
            }

            if (attachedByModuleId.size <= 0) {
                byEntity.delete(entityId);
            }

            return report;
        },
        getAttachedModuleIds: (entityIdInput) => {
            const entityId = normalizeId(entityIdInput);
            const attached = byEntity.get(entityId);
            if (!attached) {
                return [];
            }

            return Array.from(attached.keys()).sort((left, right) =>
                left.localeCompare(right),
            );
        },
    };
}
