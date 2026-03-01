import {
    importPrefabBlueprint,
    type PrefabBlueprint,
    type PrefabRegistry,
} from "@/services/prefabCore";

export type PrefabBlueprintValidationIssue = {
    code:
        | "invalid-blueprint"
        | "unknown-module"
        | "module-composition"
        | "duplicate-blueprint-id";
    path: string;
    message: string;
};

export type PrefabBlueprintValidationResult = {
    ok: boolean;
    blueprint: PrefabBlueprint | null;
    issues: PrefabBlueprintValidationIssue[];
};

export type PrefabBlueprintCatalogValidationEntry = {
    filePath: string;
    raw: string;
};

export type PrefabBlueprintCatalogValidationResult = {
    ok: boolean;
    filesChecked: number;
    filesFailed: number;
    results: Array<{
        filePath: string;
        result: PrefabBlueprintValidationResult;
    }>;
};

function toIssue(
    issue: PrefabBlueprintValidationIssue,
): PrefabBlueprintValidationIssue {
    return {
        code: issue.code,
        path: issue.path,
        message: issue.message,
    };
}

export function validatePrefabBlueprint(
    raw: string,
    options?: {
        registry?: PrefabRegistry;
        requireKnownModules?: boolean;
    },
): PrefabBlueprintValidationResult {
    const parsed = importPrefabBlueprint(raw);
    if (!parsed.ok) {
        return {
            ok: false,
            blueprint: null,
            issues: [
                {
                    code: "invalid-blueprint",
                    path: "$",
                    message: parsed.message,
                },
            ],
        };
    }

    const blueprint = parsed.value;
    const issues: PrefabBlueprintValidationIssue[] = [];
    const registry = options?.registry;

    if (registry && (options?.requireKnownModules ?? true)) {
        for (let index = 0; index < blueprint.modules.length; index += 1) {
            const moduleId = blueprint.modules[index].moduleId;
            if (!registry.getModule(moduleId)) {
                issues.push({
                    code: "unknown-module",
                    path: `$.modules[${index}].moduleId`,
                    message: `Unknown prefab module "${moduleId}".`,
                });
            }
        }
    }

    if (registry) {
        const composition = registry.validateComposition({
            domain: blueprint.domain,
            moduleIds: blueprint.modules.map((module) => module.moduleId),
        });
        for (const issue of composition.issues) {
            issues.push({
                code: "module-composition",
                path: "$.modules",
                message: issue.message,
            });
        }
    }

    return {
        ok: issues.length <= 0,
        blueprint,
        issues: issues.map((issue) => toIssue(issue)),
    };
}

export function validatePrefabBlueprintCatalog(
    entries: PrefabBlueprintCatalogValidationEntry[],
    options?: {
        registry?: PrefabRegistry;
        requireKnownModules?: boolean;
    },
): PrefabBlueprintCatalogValidationResult {
    const results: Array<{
        filePath: string;
        result: PrefabBlueprintValidationResult;
    }> = [];

    const seenBlueprintIds = new Map<string, string>();
    for (const entry of entries) {
        const result = validatePrefabBlueprint(entry.raw, options);
        if (result.ok && result.blueprint) {
            const seenPath = seenBlueprintIds.get(result.blueprint.id);
            if (seenPath) {
                result.issues.push({
                    code: "duplicate-blueprint-id",
                    path: "$.id",
                    message: `Duplicate blueprint id "${result.blueprint.id}" already used in ${seenPath}.`,
                });
            } else {
                seenBlueprintIds.set(result.blueprint.id, entry.filePath);
            }
        }

        const normalizedResult = {
            ...result,
            ok: result.issues.length <= 0,
            issues: result.issues.map((issue) => toIssue(issue)),
        };
        results.push({
            filePath: entry.filePath,
            result: normalizedResult,
        });
    }

    const filesFailed = results.filter((entry) => !entry.result.ok).length;
    return {
        ok: filesFailed <= 0,
        filesChecked: results.length,
        filesFailed,
        results,
    };
}
