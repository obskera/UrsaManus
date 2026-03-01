import type {
    PrefabRegistry,
    PrefabValidationIssue,
} from "@/services/prefabCore";

export type PrefabAdvisorArchetype = "player" | "enemy" | "object";

export type PrefabDependencyRecommendation = {
    moduleId: string;
    kind: "required" | "optional";
    reason: string;
    sourceModuleId?: string;
};

export type PrefabDependencyAdvisorReport = {
    archetype: PrefabAdvisorArchetype;
    selectedModuleIds: string[];
    requiredRecommendations: PrefabDependencyRecommendation[];
    optionalRecommendations: PrefabDependencyRecommendation[];
    recommendations: PrefabDependencyRecommendation[];
    explainability: string[];
    compositionIssues: PrefabValidationIssue[];
};

export type PrefabDependencyQuickFixResult = {
    moduleIds: string[];
    addedRequiredModuleIds: string[];
    addedOptionalModuleIds: string[];
    report: PrefabDependencyAdvisorReport;
};

export type PrefabDependencyAdvisorService = {
    recommend: (input: {
        archetype: PrefabAdvisorArchetype;
        moduleIds: string[];
    }) => PrefabDependencyAdvisorReport;
    applyQuickFix: (input: {
        archetype: PrefabAdvisorArchetype;
        moduleIds: string[];
        includeOptional?: boolean;
    }) => PrefabDependencyQuickFixResult;
};

function normalizeId(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

function dedupeModuleIds(moduleIds: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const moduleId of moduleIds) {
        const normalized = normalizeId(moduleId);
        if (!normalized || seen.has(normalized)) {
            continue;
        }

        seen.add(normalized);
        result.push(normalized);
    }

    return result.sort((left, right) => left.localeCompare(right));
}

export function createPrefabDependencyAdvisorService(options: {
    registry: PrefabRegistry;
    optionalModuleIdsByArchetype?: Partial<
        Record<PrefabAdvisorArchetype, string[]>
    >;
}): PrefabDependencyAdvisorService {
    const recommend: PrefabDependencyAdvisorService["recommend"] = (input) => {
        const selectedModuleIds = dedupeModuleIds(input.moduleIds);
        const selectedSet = new Set(selectedModuleIds);

        const composition = options.registry.validateComposition({
            domain: input.archetype,
            moduleIds: selectedModuleIds,
        });

        const requiredByModuleId = new Map<
            string,
            PrefabDependencyRecommendation
        >();
        for (const issue of composition.issues) {
            if (issue.code !== "missing-dependency" || !issue.relatedModuleId) {
                continue;
            }

            if (selectedSet.has(issue.relatedModuleId)) {
                continue;
            }

            const existing = requiredByModuleId.get(issue.relatedModuleId);
            const reason = `Required by "${issue.moduleId}".`;
            if (!existing) {
                requiredByModuleId.set(issue.relatedModuleId, {
                    moduleId: issue.relatedModuleId,
                    kind: "required",
                    reason,
                    sourceModuleId: issue.moduleId,
                });
            }
        }

        const optionalModuleIds = dedupeModuleIds(
            options.optionalModuleIdsByArchetype?.[input.archetype] ?? [],
        );

        const optionalRecommendations: PrefabDependencyRecommendation[] = [];
        for (const moduleId of optionalModuleIds) {
            if (selectedSet.has(moduleId) || requiredByModuleId.has(moduleId)) {
                continue;
            }

            optionalRecommendations.push({
                moduleId,
                kind: "optional",
                reason: `Commonly used in ${input.archetype} presets.`,
            });
        }

        const requiredRecommendations = Array.from(
            requiredByModuleId.values(),
        ).sort((left, right) => left.moduleId.localeCompare(right.moduleId));
        const optionalSorted = optionalRecommendations.sort((left, right) =>
            left.moduleId.localeCompare(right.moduleId),
        );

        const explainability = [
            ...requiredRecommendations.map(
                (entry) => `${entry.moduleId}: ${entry.reason}`,
            ),
            ...optionalSorted.map(
                (entry) => `${entry.moduleId}: ${entry.reason}`,
            ),
        ];

        return {
            archetype: input.archetype,
            selectedModuleIds,
            requiredRecommendations,
            optionalRecommendations: optionalSorted,
            recommendations: [...requiredRecommendations, ...optionalSorted],
            explainability,
            compositionIssues: composition.issues,
        };
    };

    const applyQuickFix: PrefabDependencyAdvisorService["applyQuickFix"] = (
        input,
    ) => {
        const report = recommend({
            archetype: input.archetype,
            moduleIds: input.moduleIds,
        });

        const selectedSet = new Set(report.selectedModuleIds);
        const addedRequiredModuleIds: string[] = [];
        const addedOptionalModuleIds: string[] = [];

        for (const recommendation of report.requiredRecommendations) {
            if (selectedSet.has(recommendation.moduleId)) {
                continue;
            }

            selectedSet.add(recommendation.moduleId);
            addedRequiredModuleIds.push(recommendation.moduleId);
        }

        if (input.includeOptional) {
            for (const recommendation of report.optionalRecommendations) {
                if (selectedSet.has(recommendation.moduleId)) {
                    continue;
                }

                selectedSet.add(recommendation.moduleId);
                addedOptionalModuleIds.push(recommendation.moduleId);
            }
        }

        return {
            moduleIds: Array.from(selectedSet.values()).sort((left, right) =>
                left.localeCompare(right),
            ),
            addedRequiredModuleIds: addedRequiredModuleIds.sort((left, right) =>
                left.localeCompare(right),
            ),
            addedOptionalModuleIds: addedOptionalModuleIds.sort((left, right) =>
                left.localeCompare(right),
            ),
            report,
        };
    };

    return {
        recommend,
        applyQuickFix,
    };
}
