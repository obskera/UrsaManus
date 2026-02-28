import { signalBus } from "@/services/signalBus";

export const ENCOUNTER_PRESET_PAYLOAD_VERSION = "um-encounter-presets-v1";

export type EncounterSpawnPackUnit = {
    id: string;
    tag: string;
    count: number;
    weight?: number;
};

export type EncounterSpawnPackDefinition = {
    id: string;
    label?: string;
    units: EncounterSpawnPackUnit[];
};

export type EncounterObjective = {
    id: string;
    label: string;
    targetCount?: number;
};

export type EncounterObjectiveBundleDefinition = {
    id: string;
    label?: string;
    objectives: EncounterObjective[];
};

export type EncounterRewardBundleReference = {
    rewardBundleId: string;
    quantity?: number;
};

export type EncounterRewardBundleDefinition = {
    id: string;
    label?: string;
    rewards: EncounterRewardBundleReference[];
};

export type EncounterTemplateDefinition = {
    id: string;
    label?: string;
    spawnPackIds: string[];
    objectiveBundleIds: string[];
    rewardBundleIds: string[];
    metadata?: Record<string, unknown>;
};

export type EncounterTemplateResolved = {
    id: string;
    label?: string;
    spawnPacks: EncounterSpawnPackDefinition[];
    objectiveBundles: EncounterObjectiveBundleDefinition[];
    rewardBundles: EncounterRewardBundleDefinition[];
    metadata?: Record<string, unknown>;
};

export type EncounterPresetPayload = {
    version: typeof ENCOUNTER_PRESET_PAYLOAD_VERSION;
    templates: EncounterTemplateDefinition[];
    spawnPacks: EncounterSpawnPackDefinition[];
    objectiveBundles: EncounterObjectiveBundleDefinition[];
    rewardBundles: EncounterRewardBundleDefinition[];
};

export type EncounterPresetValidationResult = {
    ok: boolean;
    code:
        | "invalid-id"
        | "duplicate-id"
        | "invalid-template"
        | "invalid-bundle"
        | "missing-reference"
        | "invalid-payload"
        | null;
    message: string | null;
};

export type EncounterPresetSnapshot = {
    templateCount: number;
    spawnPackCount: number;
    objectiveBundleCount: number;
    rewardBundleCount: number;
    templates: EncounterTemplateDefinition[];
};

export type EncounterPresetService = {
    registerSpawnPack: (
        definition: EncounterSpawnPackDefinition,
    ) => EncounterPresetValidationResult;
    unregisterSpawnPack: (spawnPackId: string) => boolean;
    registerObjectiveBundle: (
        definition: EncounterObjectiveBundleDefinition,
    ) => EncounterPresetValidationResult;
    unregisterObjectiveBundle: (bundleId: string) => boolean;
    registerRewardBundle: (
        definition: EncounterRewardBundleDefinition,
    ) => EncounterPresetValidationResult;
    unregisterRewardBundle: (bundleId: string) => boolean;
    registerTemplate: (
        definition: EncounterTemplateDefinition,
    ) => EncounterPresetValidationResult;
    unregisterTemplate: (templateId: string) => boolean;
    getTemplate: (templateId: string) => EncounterTemplateDefinition | null;
    resolveTemplate: (templateId: string) => EncounterTemplateResolved | null;
    exportPayload: (options?: { pretty?: boolean }) => string;
    importPayload: (raw: string) => EncounterPresetValidationResult;
    getSnapshot: () => EncounterPresetSnapshot;
};

export const ENCOUNTER_PRESET_CHANGED_SIGNAL = "encounter:preset:changed";
export const ENCOUNTER_PRESET_INVALID_SIGNAL = "encounter:preset:invalid";
export const ENCOUNTER_PRESET_IMPORTED_SIGNAL = "encounter:preset:imported";

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function createFailure(
    code: EncounterPresetValidationResult["code"],
    message: string,
): EncounterPresetValidationResult {
    return {
        ok: false,
        code,
        message,
    };
}

function createSuccess(): EncounterPresetValidationResult {
    return {
        ok: true,
        code: null,
        message: null,
    };
}

function normalizeId(value: string | undefined): string {
    return String(value ?? "").trim();
}

function normalizePositiveInt(value: number | undefined, fallback = 1): number {
    if (!Number.isFinite(value)) {
        return fallback;
    }

    return Math.max(1, Math.floor(value ?? fallback));
}

function cloneSpawnPack(
    definition: EncounterSpawnPackDefinition,
): EncounterSpawnPackDefinition {
    return {
        id: definition.id,
        ...(definition.label ? { label: definition.label } : {}),
        units: definition.units.map((unit) => ({
            id: unit.id,
            tag: unit.tag,
            count: unit.count,
            ...(Number.isFinite(unit.weight) ? { weight: unit.weight } : {}),
        })),
    };
}

function cloneObjectiveBundle(
    definition: EncounterObjectiveBundleDefinition,
): EncounterObjectiveBundleDefinition {
    return {
        id: definition.id,
        ...(definition.label ? { label: definition.label } : {}),
        objectives: definition.objectives.map((objective) => ({
            id: objective.id,
            label: objective.label,
            ...(Number.isFinite(objective.targetCount)
                ? { targetCount: objective.targetCount }
                : {}),
        })),
    };
}

function cloneRewardBundle(
    definition: EncounterRewardBundleDefinition,
): EncounterRewardBundleDefinition {
    return {
        id: definition.id,
        ...(definition.label ? { label: definition.label } : {}),
        rewards: definition.rewards.map((reward) => ({
            rewardBundleId: reward.rewardBundleId,
            ...(Number.isFinite(reward.quantity)
                ? { quantity: reward.quantity }
                : {}),
        })),
    };
}

function cloneTemplate(
    definition: EncounterTemplateDefinition,
): EncounterTemplateDefinition {
    return {
        id: definition.id,
        ...(definition.label ? { label: definition.label } : {}),
        spawnPackIds: [...definition.spawnPackIds],
        objectiveBundleIds: [...definition.objectiveBundleIds],
        rewardBundleIds: [...definition.rewardBundleIds],
        ...(definition.metadata
            ? { metadata: { ...definition.metadata } }
            : {}),
    };
}

export function createEncounterPresetService(options?: {
    emit?: <TPayload>(signal: string, payload: TPayload) => void;
}): EncounterPresetService {
    const emit =
        options?.emit ??
        (<TPayload>(signal: string, payload: TPayload) => {
            signalBus.emit(signal, payload);
        });

    const spawnPacksById = new Map<string, EncounterSpawnPackDefinition>();
    const objectiveBundlesById = new Map<
        string,
        EncounterObjectiveBundleDefinition
    >();
    const rewardBundlesById = new Map<
        string,
        EncounterRewardBundleDefinition
    >();
    const templatesById = new Map<string, EncounterTemplateDefinition>();

    const emitChanged = () => {
        emit(ENCOUNTER_PRESET_CHANGED_SIGNAL, {
            templateCount: templatesById.size,
            spawnPackCount: spawnPacksById.size,
            objectiveBundleCount: objectiveBundlesById.size,
            rewardBundleCount: rewardBundlesById.size,
        });
    };

    const emitInvalid = (failure: EncounterPresetValidationResult) => {
        emit(ENCOUNTER_PRESET_INVALID_SIGNAL, failure);
        return failure;
    };

    const validateSpawnPack = (
        definition: EncounterSpawnPackDefinition,
    ): EncounterSpawnPackDefinition | null => {
        const id = normalizeId(definition.id);
        if (!id) {
            return null;
        }

        const units: EncounterSpawnPackUnit[] = [];
        for (const unit of definition.units) {
            const unitId = normalizeId(unit.id);
            const tag = normalizeId(unit.tag);
            if (!unitId || !tag) {
                return null;
            }

            units.push({
                id: unitId,
                tag,
                count: normalizePositiveInt(unit.count, 1),
                ...(Number.isFinite(unit.weight)
                    ? { weight: Math.max(0, Number(unit.weight)) }
                    : {}),
            });
        }

        if (units.length === 0) {
            return null;
        }

        return {
            id,
            ...(normalizeId(definition.label)
                ? { label: normalizeId(definition.label) }
                : {}),
            units,
        };
    };

    const validateObjectiveBundle = (
        definition: EncounterObjectiveBundleDefinition,
    ): EncounterObjectiveBundleDefinition | null => {
        const id = normalizeId(definition.id);
        if (!id) {
            return null;
        }

        const seenObjectiveIds = new Set<string>();
        const objectives: EncounterObjective[] = [];
        for (const objective of definition.objectives) {
            const objectiveId = normalizeId(objective.id);
            const label = normalizeId(objective.label);
            if (!objectiveId || !label || seenObjectiveIds.has(objectiveId)) {
                return null;
            }

            seenObjectiveIds.add(objectiveId);
            objectives.push({
                id: objectiveId,
                label,
                ...(Number.isFinite(objective.targetCount)
                    ? {
                          targetCount: normalizePositiveInt(
                              objective.targetCount,
                              1,
                          ),
                      }
                    : {}),
            });
        }

        if (objectives.length === 0) {
            return null;
        }

        return {
            id,
            ...(normalizeId(definition.label)
                ? { label: normalizeId(definition.label) }
                : {}),
            objectives,
        };
    };

    const validateRewardBundle = (
        definition: EncounterRewardBundleDefinition,
    ): EncounterRewardBundleDefinition | null => {
        const id = normalizeId(definition.id);
        if (!id) {
            return null;
        }

        const rewards: EncounterRewardBundleReference[] = [];
        for (const reward of definition.rewards) {
            const rewardBundleId = normalizeId(reward.rewardBundleId);
            if (!rewardBundleId) {
                return null;
            }

            rewards.push({
                rewardBundleId,
                ...(Number.isFinite(reward.quantity)
                    ? { quantity: normalizePositiveInt(reward.quantity, 1) }
                    : {}),
            });
        }

        if (rewards.length === 0) {
            return null;
        }

        return {
            id,
            ...(normalizeId(definition.label)
                ? { label: normalizeId(definition.label) }
                : {}),
            rewards,
        };
    };

    const normalizeReferenceList = (value: string[]): string[] => {
        const seen = new Set<string>();
        const normalized: string[] = [];

        for (const entry of value) {
            const id = normalizeId(entry);
            if (!id || seen.has(id)) {
                continue;
            }

            seen.add(id);
            normalized.push(id);
        }

        return normalized;
    };

    const validateTemplate = (
        definition: EncounterTemplateDefinition,
    ): EncounterTemplateDefinition | null => {
        const id = normalizeId(definition.id);
        if (!id) {
            return null;
        }

        const spawnPackIds = normalizeReferenceList(definition.spawnPackIds);
        const objectiveBundleIds = normalizeReferenceList(
            definition.objectiveBundleIds,
        );
        const rewardBundleIds = normalizeReferenceList(
            definition.rewardBundleIds,
        );

        if (
            spawnPackIds.length === 0 ||
            objectiveBundleIds.length === 0 ||
            rewardBundleIds.length === 0
        ) {
            return null;
        }

        return {
            id,
            ...(normalizeId(definition.label)
                ? { label: normalizeId(definition.label) }
                : {}),
            spawnPackIds,
            objectiveBundleIds,
            rewardBundleIds,
            ...(isObject(definition.metadata)
                ? { metadata: { ...definition.metadata } }
                : {}),
        };
    };

    const hasMissingReference = (
        template: EncounterTemplateDefinition,
    ): string | null => {
        for (const spawnPackId of template.spawnPackIds) {
            if (!spawnPacksById.has(spawnPackId)) {
                return `Missing spawn pack reference "${spawnPackId}".`;
            }
        }

        for (const objectiveBundleId of template.objectiveBundleIds) {
            if (!objectiveBundlesById.has(objectiveBundleId)) {
                return `Missing objective bundle reference "${objectiveBundleId}".`;
            }
        }

        for (const rewardBundleId of template.rewardBundleIds) {
            if (!rewardBundlesById.has(rewardBundleId)) {
                return `Missing reward bundle reference "${rewardBundleId}".`;
            }
        }

        return null;
    };

    const registerSpawnPack: EncounterPresetService["registerSpawnPack"] = (
        definition,
    ) => {
        const normalized = validateSpawnPack(definition);
        if (!normalized) {
            return emitInvalid(
                createFailure(
                    "invalid-bundle",
                    "Spawn pack is invalid or missing required fields.",
                ),
            );
        }

        if (spawnPacksById.has(normalized.id)) {
            return emitInvalid(
                createFailure("duplicate-id", "Spawn pack id already exists."),
            );
        }

        spawnPacksById.set(normalized.id, normalized);
        emitChanged();
        return createSuccess();
    };

    const unregisterSpawnPack = (spawnPackId: string) => {
        const normalizedId = normalizeId(spawnPackId);
        if (!normalizedId) {
            return false;
        }

        const removed = spawnPacksById.delete(normalizedId);
        if (removed) {
            emitChanged();
        }

        return removed;
    };

    const registerObjectiveBundle: EncounterPresetService["registerObjectiveBundle"] =
        (definition) => {
            const normalized = validateObjectiveBundle(definition);
            if (!normalized) {
                return emitInvalid(
                    createFailure(
                        "invalid-bundle",
                        "Objective bundle is invalid or missing required fields.",
                    ),
                );
            }

            if (objectiveBundlesById.has(normalized.id)) {
                return emitInvalid(
                    createFailure(
                        "duplicate-id",
                        "Objective bundle id already exists.",
                    ),
                );
            }

            objectiveBundlesById.set(normalized.id, normalized);
            emitChanged();
            return createSuccess();
        };

    const unregisterObjectiveBundle = (bundleId: string) => {
        const normalizedId = normalizeId(bundleId);
        if (!normalizedId) {
            return false;
        }

        const removed = objectiveBundlesById.delete(normalizedId);
        if (removed) {
            emitChanged();
        }

        return removed;
    };

    const registerRewardBundle: EncounterPresetService["registerRewardBundle"] =
        (definition) => {
            const normalized = validateRewardBundle(definition);
            if (!normalized) {
                return emitInvalid(
                    createFailure(
                        "invalid-bundle",
                        "Reward bundle is invalid or missing required fields.",
                    ),
                );
            }

            if (rewardBundlesById.has(normalized.id)) {
                return emitInvalid(
                    createFailure(
                        "duplicate-id",
                        "Reward bundle id already exists.",
                    ),
                );
            }

            rewardBundlesById.set(normalized.id, normalized);
            emitChanged();
            return createSuccess();
        };

    const unregisterRewardBundle = (bundleId: string) => {
        const normalizedId = normalizeId(bundleId);
        if (!normalizedId) {
            return false;
        }

        const removed = rewardBundlesById.delete(normalizedId);
        if (removed) {
            emitChanged();
        }

        return removed;
    };

    const registerTemplate: EncounterPresetService["registerTemplate"] = (
        definition,
    ) => {
        const normalized = validateTemplate(definition);
        if (!normalized) {
            return emitInvalid(
                createFailure(
                    "invalid-template",
                    "Template is invalid or missing required bundle references.",
                ),
            );
        }

        if (templatesById.has(normalized.id)) {
            return emitInvalid(
                createFailure("duplicate-id", "Template id already exists."),
            );
        }

        const missingReference = hasMissingReference(normalized);
        if (missingReference) {
            return emitInvalid(
                createFailure("missing-reference", missingReference),
            );
        }

        templatesById.set(normalized.id, normalized);
        emitChanged();
        return createSuccess();
    };

    const unregisterTemplate = (templateId: string) => {
        const normalizedId = normalizeId(templateId);
        if (!normalizedId) {
            return false;
        }

        const removed = templatesById.delete(normalizedId);
        if (removed) {
            emitChanged();
        }

        return removed;
    };

    const getTemplate = (templateId: string) => {
        const normalizedId = normalizeId(templateId);
        if (!normalizedId) {
            return null;
        }

        const template = templatesById.get(normalizedId);
        return template ? cloneTemplate(template) : null;
    };

    const resolveTemplate = (templateId: string) => {
        const template = getTemplate(templateId);
        if (!template) {
            return null;
        }

        const spawnPacks: EncounterSpawnPackDefinition[] = [];
        const objectiveBundles: EncounterObjectiveBundleDefinition[] = [];
        const rewardBundles: EncounterRewardBundleDefinition[] = [];

        for (const spawnPackId of template.spawnPackIds) {
            const spawnPack = spawnPacksById.get(spawnPackId);
            if (!spawnPack) {
                return null;
            }

            spawnPacks.push(cloneSpawnPack(spawnPack));
        }

        for (const objectiveBundleId of template.objectiveBundleIds) {
            const objectiveBundle = objectiveBundlesById.get(objectiveBundleId);
            if (!objectiveBundle) {
                return null;
            }

            objectiveBundles.push(cloneObjectiveBundle(objectiveBundle));
        }

        for (const rewardBundleId of template.rewardBundleIds) {
            const rewardBundle = rewardBundlesById.get(rewardBundleId);
            if (!rewardBundle) {
                return null;
            }

            rewardBundles.push(cloneRewardBundle(rewardBundle));
        }

        return {
            id: template.id,
            ...(template.label ? { label: template.label } : {}),
            spawnPacks,
            objectiveBundles,
            rewardBundles,
            ...(template.metadata
                ? { metadata: { ...template.metadata } }
                : {}),
        };
    };

    const getSortedSpawnPacks = () => {
        return Array.from(spawnPacksById.values())
            .sort((left, right) => left.id.localeCompare(right.id))
            .map((definition) => cloneSpawnPack(definition));
    };

    const getSortedObjectiveBundles = () => {
        return Array.from(objectiveBundlesById.values())
            .sort((left, right) => left.id.localeCompare(right.id))
            .map((definition) => cloneObjectiveBundle(definition));
    };

    const getSortedRewardBundles = () => {
        return Array.from(rewardBundlesById.values())
            .sort((left, right) => left.id.localeCompare(right.id))
            .map((definition) => cloneRewardBundle(definition));
    };

    const getSortedTemplates = () => {
        return Array.from(templatesById.values())
            .sort((left, right) => left.id.localeCompare(right.id))
            .map((definition) => cloneTemplate(definition));
    };

    const exportPayload = (options?: { pretty?: boolean }) => {
        const payload: EncounterPresetPayload = {
            version: ENCOUNTER_PRESET_PAYLOAD_VERSION,
            templates: getSortedTemplates(),
            spawnPacks: getSortedSpawnPacks(),
            objectiveBundles: getSortedObjectiveBundles(),
            rewardBundles: getSortedRewardBundles(),
        };

        return JSON.stringify(payload, null, options?.pretty ? 2 : 0);
    };

    const importPayload = (raw: string): EncounterPresetValidationResult => {
        let parsed: unknown;

        try {
            parsed = JSON.parse(raw);
        } catch {
            return emitInvalid(
                createFailure(
                    "invalid-payload",
                    "Encounter preset payload is not valid JSON.",
                ),
            );
        }

        if (!isObject(parsed)) {
            return emitInvalid(
                createFailure(
                    "invalid-payload",
                    "Encounter preset payload must be an object.",
                ),
            );
        }

        if (parsed.version !== ENCOUNTER_PRESET_PAYLOAD_VERSION) {
            return emitInvalid(
                createFailure(
                    "invalid-payload",
                    "Encounter preset payload version is unsupported.",
                ),
            );
        }

        if (
            !Array.isArray(parsed.templates) ||
            !Array.isArray(parsed.spawnPacks) ||
            !Array.isArray(parsed.objectiveBundles) ||
            !Array.isArray(parsed.rewardBundles)
        ) {
            return emitInvalid(
                createFailure(
                    "invalid-payload",
                    "Encounter preset payload is missing required arrays.",
                ),
            );
        }

        const importedSpawnPacks = new Map<
            string,
            EncounterSpawnPackDefinition
        >();
        for (const rawSpawnPack of parsed.spawnPacks) {
            const normalized = validateSpawnPack(
                rawSpawnPack as EncounterSpawnPackDefinition,
            );
            if (!normalized || importedSpawnPacks.has(normalized.id)) {
                return emitInvalid(
                    createFailure(
                        "invalid-payload",
                        "Encounter preset payload contains invalid spawn packs.",
                    ),
                );
            }

            importedSpawnPacks.set(normalized.id, normalized);
        }

        const importedObjectiveBundles = new Map<
            string,
            EncounterObjectiveBundleDefinition
        >();
        for (const rawObjectiveBundle of parsed.objectiveBundles) {
            const normalized = validateObjectiveBundle(
                rawObjectiveBundle as EncounterObjectiveBundleDefinition,
            );
            if (!normalized || importedObjectiveBundles.has(normalized.id)) {
                return emitInvalid(
                    createFailure(
                        "invalid-payload",
                        "Encounter preset payload contains invalid objective bundles.",
                    ),
                );
            }

            importedObjectiveBundles.set(normalized.id, normalized);
        }

        const importedRewardBundles = new Map<
            string,
            EncounterRewardBundleDefinition
        >();
        for (const rawRewardBundle of parsed.rewardBundles) {
            const normalized = validateRewardBundle(
                rawRewardBundle as EncounterRewardBundleDefinition,
            );
            if (!normalized || importedRewardBundles.has(normalized.id)) {
                return emitInvalid(
                    createFailure(
                        "invalid-payload",
                        "Encounter preset payload contains invalid reward bundles.",
                    ),
                );
            }

            importedRewardBundles.set(normalized.id, normalized);
        }

        const importedTemplates = new Map<
            string,
            EncounterTemplateDefinition
        >();
        for (const rawTemplate of parsed.templates) {
            const normalized = validateTemplate(
                rawTemplate as EncounterTemplateDefinition,
            );
            if (!normalized || importedTemplates.has(normalized.id)) {
                return emitInvalid(
                    createFailure(
                        "invalid-payload",
                        "Encounter preset payload contains invalid templates.",
                    ),
                );
            }

            const hasMissingSpawnPack = normalized.spawnPackIds.some(
                (spawnPackId) => !importedSpawnPacks.has(spawnPackId),
            );
            const hasMissingObjectiveBundle =
                normalized.objectiveBundleIds.some(
                    (bundleId) => !importedObjectiveBundles.has(bundleId),
                );
            const hasMissingRewardBundle = normalized.rewardBundleIds.some(
                (bundleId) => !importedRewardBundles.has(bundleId),
            );
            if (
                hasMissingSpawnPack ||
                hasMissingObjectiveBundle ||
                hasMissingRewardBundle
            ) {
                return emitInvalid(
                    createFailure(
                        "invalid-payload",
                        "Encounter preset payload has templates with missing references.",
                    ),
                );
            }

            importedTemplates.set(normalized.id, normalized);
        }

        spawnPacksById.clear();
        objectiveBundlesById.clear();
        rewardBundlesById.clear();
        templatesById.clear();

        for (const [id, definition] of importedSpawnPacks.entries()) {
            spawnPacksById.set(id, definition);
        }
        for (const [id, definition] of importedObjectiveBundles.entries()) {
            objectiveBundlesById.set(id, definition);
        }
        for (const [id, definition] of importedRewardBundles.entries()) {
            rewardBundlesById.set(id, definition);
        }
        for (const [id, definition] of importedTemplates.entries()) {
            templatesById.set(id, definition);
        }

        emit(ENCOUNTER_PRESET_IMPORTED_SIGNAL, {
            templateCount: templatesById.size,
            spawnPackCount: spawnPacksById.size,
            objectiveBundleCount: objectiveBundlesById.size,
            rewardBundleCount: rewardBundlesById.size,
        });
        emitChanged();

        return createSuccess();
    };

    const getSnapshot = (): EncounterPresetSnapshot => {
        const templates = getSortedTemplates();

        return {
            templateCount: templatesById.size,
            spawnPackCount: spawnPacksById.size,
            objectiveBundleCount: objectiveBundlesById.size,
            rewardBundleCount: rewardBundlesById.size,
            templates,
        };
    };

    return {
        registerSpawnPack,
        unregisterSpawnPack,
        registerObjectiveBundle,
        unregisterObjectiveBundle,
        registerRewardBundle,
        unregisterRewardBundle,
        registerTemplate,
        unregisterTemplate,
        getTemplate,
        resolveTemplate,
        exportPayload,
        importPayload,
        getSnapshot,
    };
}

export const encounterPresets = createEncounterPresetService();
