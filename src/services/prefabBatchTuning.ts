import {
    exportPrefabBlueprint,
    importPrefabBlueprint,
    type PrefabBlueprint,
    type PrefabBuilderModule,
    type PrefabModuleConfig,
} from "@/services/prefabCore";

export type PrefabBatchTuningPresetMode =
    | "easy"
    | "normal"
    | "hard"
    | "nightmare";

export type PrefabBatchTuningKnob = "hp" | "damage" | "speed" | "reward";

export type PrefabBatchTuningScalars = Partial<
    Record<PrefabBatchTuningKnob, number>
>;

export type PrefabBatchTuningPreset = {
    mode: PrefabBatchTuningPresetMode;
    label: string;
    scalars: Record<PrefabBatchTuningKnob, number>;
};

export type PrefabBatchTuningOverlay = {
    id: string;
    label: string;
    mode: PrefabBatchTuningPresetMode;
    scalars: PrefabBatchTuningScalars;
    targetBlueprintIds?: string[];
};

export type PrefabBatchTuningChange = {
    blueprintId: string;
    moduleId: string;
    path: string;
    knob: PrefabBatchTuningKnob;
    before: number;
    after: number;
};

export type PrefabBatchTuningPreview = {
    overlay: PrefabBatchTuningOverlay;
    changedBlueprintIds: string[];
    changes: PrefabBatchTuningChange[];
    summary: {
        blueprintsScanned: number;
        blueprintsChanged: number;
        moduleChanges: number;
        scalarChanges: number;
    };
};

export type PrefabBatchTuningSnapshot = {
    snapshotId: string;
    reason: string;
    createdAtMs: number;
    blueprintCount: number;
    changedBlueprintIds: string[];
    blueprints: PrefabBlueprint[];
};

export type PrefabBatchTuningApplyResult = {
    ok: boolean;
    snapshot: PrefabBatchTuningSnapshot;
    preview: PrefabBatchTuningPreview;
    blueprints: PrefabBlueprint[];
};

export type PrefabBatchTuningRollbackResult = {
    ok: boolean;
    blueprints: PrefabBlueprint[] | null;
    snapshot: PrefabBatchTuningSnapshot | null;
};

export type PrefabBatchTuningService = {
    getCurrentBlueprints: () => PrefabBlueprint[];
    listSnapshots: () => PrefabBatchTuningSnapshot[];
    previewOverlay: (input: {
        mode: PrefabBatchTuningPresetMode;
        scalars?: PrefabBatchTuningScalars;
        targetBlueprintIds?: string[];
        overlayId?: string;
        overlayLabel?: string;
    }) => PrefabBatchTuningPreview;
    applyOverlay: (input: {
        mode: PrefabBatchTuningPresetMode;
        scalars?: PrefabBatchTuningScalars;
        targetBlueprintIds?: string[];
        overlayId?: string;
        overlayLabel?: string;
        snapshotReason?: string;
    }) => PrefabBatchTuningApplyResult;
    rollbackToSnapshot: (snapshotId: string) => PrefabBatchTuningRollbackResult;
};

type InternalPatch = {
    path: string;
    before: number;
    after: number;
    knob: PrefabBatchTuningKnob;
};

const KNOB_KEYS: Record<PrefabBatchTuningKnob, Set<string>> = {
    hp: new Set(["health", "maxhealth", "hp"]),
    damage: new Set(["damage", "attackpower", "basedamage"]),
    speed: new Set(["speed", "movespeed"]),
    reward: new Set([
        "xp",
        "gold",
        "reward",
        "rewardmultiplier",
        "droprate",
        "sellvalue",
        "buyvalue",
    ]),
};

const PRESETS: Record<PrefabBatchTuningPresetMode, PrefabBatchTuningPreset> = {
    easy: {
        mode: "easy",
        label: "Easy",
        scalars: {
            hp: 0.85,
            damage: 0.8,
            speed: 0.9,
            reward: 1.1,
        },
    },
    normal: {
        mode: "normal",
        label: "Normal",
        scalars: {
            hp: 1,
            damage: 1,
            speed: 1,
            reward: 1,
        },
    },
    hard: {
        mode: "hard",
        label: "Hard",
        scalars: {
            hp: 1.2,
            damage: 1.15,
            speed: 1.08,
            reward: 1.15,
        },
    },
    nightmare: {
        mode: "nightmare",
        label: "Nightmare",
        scalars: {
            hp: 1.45,
            damage: 1.35,
            speed: 1.18,
            reward: 1.25,
        },
    },
};

function normalizeId(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

function cloneBlueprints(blueprints: PrefabBlueprint[]): PrefabBlueprint[] {
    const raw = JSON.stringify(blueprints);
    return JSON.parse(raw) as PrefabBlueprint[];
}

function roundToPrecision(value: number, precision = 3): number {
    const scalar = 10 ** precision;
    return Math.round(value * scalar) / scalar;
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toOverlay(input: {
    mode: PrefabBatchTuningPresetMode;
    scalars?: PrefabBatchTuningScalars;
    targetBlueprintIds?: string[];
    overlayId?: string;
    overlayLabel?: string;
}): PrefabBatchTuningOverlay {
    const preset = PRESETS[input.mode];
    const id = normalizeId(input.overlayId) || `preset-${input.mode}`;
    const label = normalizeId(input.overlayLabel) || `${preset.label} overlay`;
    const targetBlueprintIds = (input.targetBlueprintIds ?? [])
        .map((entry) => normalizeId(entry))
        .filter(Boolean);

    const scalars: PrefabBatchTuningScalars = {
        hp: Number.isFinite(input.scalars?.hp)
            ? input.scalars?.hp
            : preset.scalars.hp,
        damage: Number.isFinite(input.scalars?.damage)
            ? input.scalars?.damage
            : preset.scalars.damage,
        speed: Number.isFinite(input.scalars?.speed)
            ? input.scalars?.speed
            : preset.scalars.speed,
        reward: Number.isFinite(input.scalars?.reward)
            ? input.scalars?.reward
            : preset.scalars.reward,
    };

    return {
        id,
        label,
        mode: input.mode,
        scalars,
        ...(targetBlueprintIds.length > 0 ? { targetBlueprintIds } : {}),
    };
}

function shouldApplyKnob(path: string[], knob: PrefabBatchTuningKnob): boolean {
    const key = path[path.length - 1] ?? "";
    return KNOB_KEYS[knob].has(key.toLowerCase());
}

function scaleConfigForKnob(input: {
    value: unknown;
    multiplier: number;
    knob: PrefabBatchTuningKnob;
    path: string[];
    patches: InternalPatch[];
}): unknown {
    const { value, multiplier, knob, path, patches } = input;

    if (Array.isArray(value)) {
        return value.map((entry, index) =>
            scaleConfigForKnob({
                value: entry,
                multiplier,
                knob,
                path: [...path, String(index)],
                patches,
            }),
        );
    }

    if (isObject(value)) {
        const next: Record<string, unknown> = {};
        for (const [key, entry] of Object.entries(value)) {
            next[key] = scaleConfigForKnob({
                value: entry,
                multiplier,
                knob,
                path: [...path, key],
                patches,
            });
        }
        return next;
    }

    if (typeof value === "number" && shouldApplyKnob(path, knob)) {
        const before = value;
        const after = roundToPrecision(before * multiplier);
        if (before !== after) {
            patches.push({
                path: path.join("."),
                before,
                after,
                knob,
            });
        }
        return after;
    }

    return value;
}

function applyOverlayToModules(input: {
    modules: PrefabBuilderModule[];
    scalars: PrefabBatchTuningScalars;
}): {
    modules: PrefabBuilderModule[];
    patches: Array<{ moduleId: string } & InternalPatch>;
} {
    const nextModules: PrefabBuilderModule[] = [];
    const patches: Array<{ moduleId: string } & InternalPatch> = [];

    for (const moduleEntry of input.modules) {
        let nextConfig: PrefabModuleConfig = JSON.parse(
            JSON.stringify(moduleEntry.config ?? {}),
        ) as PrefabModuleConfig;

        for (const [knob, scalar] of Object.entries(input.scalars) as Array<
            [PrefabBatchTuningKnob, number | undefined]
        >) {
            if (!Number.isFinite(scalar) || scalar === 1) {
                continue;
            }

            const localPatches: InternalPatch[] = [];
            nextConfig = scaleConfigForKnob({
                value: nextConfig,
                multiplier: scalar,
                knob,
                path: [],
                patches: localPatches,
            }) as PrefabModuleConfig;

            for (const patch of localPatches) {
                patches.push({
                    moduleId: moduleEntry.moduleId,
                    ...patch,
                });
            }
        }

        nextModules.push({
            moduleId: moduleEntry.moduleId,
            config: nextConfig,
        });
    }

    return {
        modules: nextModules,
        patches,
    };
}

function toSnapshotReason(input: {
    overlay: PrefabBatchTuningOverlay;
    snapshotReason?: string;
}): string {
    return (
        normalizeId(input.snapshotReason) ||
        `Before ${input.overlay.id} (${input.overlay.mode})`
    );
}

export function getPrefabBatchTuningPreset(
    mode: PrefabBatchTuningPresetMode,
): PrefabBatchTuningPreset {
    return {
        mode,
        label: PRESETS[mode].label,
        scalars: {
            ...PRESETS[mode].scalars,
        },
    };
}

export function parsePrefabBlueprintCatalogForBatchTuning(input: {
    entries: Array<{ filePath: string; raw: string }>;
}): {
    ok: boolean;
    blueprints: PrefabBlueprint[];
    issues: Array<{ filePath: string; message: string }>;
} {
    const blueprints: PrefabBlueprint[] = [];
    const issues: Array<{ filePath: string; message: string }> = [];

    for (const entry of input.entries) {
        const parsed = importPrefabBlueprint(entry.raw);
        if (!parsed.ok) {
            issues.push({
                filePath: entry.filePath,
                message: parsed.message,
            });
            continue;
        }

        blueprints.push(parsed.value);
    }

    return {
        ok: issues.length <= 0,
        blueprints,
        issues,
    };
}

export function createPrefabBatchTuningService(options: {
    initialBlueprints: PrefabBlueprint[];
    now?: () => number;
}): PrefabBatchTuningService {
    let currentBlueprints = cloneBlueprints(options.initialBlueprints);
    const snapshotsById = new Map<string, PrefabBatchTuningSnapshot>();
    const snapshotIds: string[] = [];
    let sequence = 0;

    const now = options.now ?? (() => Date.now());

    const getCurrentBlueprints: PrefabBatchTuningService["getCurrentBlueprints"] =
        () => cloneBlueprints(currentBlueprints);

    const listSnapshots: PrefabBatchTuningService["listSnapshots"] = () =>
        snapshotIds
            .map((snapshotId) => snapshotsById.get(snapshotId))
            .filter((entry): entry is PrefabBatchTuningSnapshot =>
                Boolean(entry),
            )
            .map((entry) => ({
                ...entry,
                blueprints: cloneBlueprints(entry.blueprints),
            }));

    const previewOverlay: PrefabBatchTuningService["previewOverlay"] = (
        input,
    ) => {
        const overlay = toOverlay(input);
        const targetIdSet = new Set(overlay.targetBlueprintIds ?? []);
        const includeAll = targetIdSet.size <= 0;

        const nextBlueprints = cloneBlueprints(currentBlueprints);
        const changedBlueprintIds = new Set<string>();
        const changes: PrefabBatchTuningChange[] = [];

        for (const blueprint of nextBlueprints) {
            if (!includeAll && !targetIdSet.has(blueprint.id)) {
                continue;
            }

            const tuned = applyOverlayToModules({
                modules: blueprint.modules,
                scalars: overlay.scalars,
            });

            blueprint.modules = tuned.modules;
            for (const patch of tuned.patches) {
                changes.push({
                    blueprintId: blueprint.id,
                    moduleId: patch.moduleId,
                    path: patch.path,
                    knob: patch.knob,
                    before: patch.before,
                    after: patch.after,
                });
                changedBlueprintIds.add(blueprint.id);
            }
        }

        return {
            overlay,
            changedBlueprintIds: Array.from(changedBlueprintIds).sort((a, b) =>
                a.localeCompare(b),
            ),
            changes,
            summary: {
                blueprintsScanned: includeAll
                    ? nextBlueprints.length
                    : nextBlueprints.filter((entry) =>
                          targetIdSet.has(entry.id),
                      ).length,
                blueprintsChanged: changedBlueprintIds.size,
                moduleChanges: new Set(
                    changes.map(
                        (change) => `${change.blueprintId}:${change.moduleId}`,
                    ),
                ).size,
                scalarChanges: changes.length,
            },
        };
    };

    const applyOverlay: PrefabBatchTuningService["applyOverlay"] = (input) => {
        const preview = previewOverlay(input);
        const overlay = preview.overlay;
        sequence += 1;
        const snapshotId = `prefab-tuning-${String(now())}-${String(sequence)}`;

        const snapshot: PrefabBatchTuningSnapshot = {
            snapshotId,
            reason: toSnapshotReason({
                overlay,
                snapshotReason: input.snapshotReason,
            }),
            createdAtMs: Math.max(0, now()),
            blueprintCount: currentBlueprints.length,
            changedBlueprintIds: [...preview.changedBlueprintIds],
            blueprints: cloneBlueprints(currentBlueprints),
        };
        snapshotsById.set(snapshotId, snapshot);
        snapshotIds.push(snapshotId);

        if (preview.summary.scalarChanges > 0) {
            const changedIdSet = new Set(preview.changedBlueprintIds);
            currentBlueprints = currentBlueprints.map((entry) => {
                if (!changedIdSet.has(entry.id)) {
                    return entry;
                }

                const next = cloneBlueprints([entry])[0];
                const tuned = applyOverlayToModules({
                    modules: next.modules,
                    scalars: overlay.scalars,
                });
                next.modules = tuned.modules;
                return next;
            });
        }

        return {
            ok: true,
            snapshot,
            preview,
            blueprints: cloneBlueprints(currentBlueprints),
        };
    };

    const rollbackToSnapshot: PrefabBatchTuningService["rollbackToSnapshot"] = (
        snapshotId,
    ) => {
        const normalizedId = normalizeId(snapshotId);
        if (!normalizedId || !snapshotsById.has(normalizedId)) {
            return {
                ok: false,
                blueprints: null,
                snapshot: null,
            };
        }

        const snapshot = snapshotsById.get(
            normalizedId,
        ) as PrefabBatchTuningSnapshot;
        currentBlueprints = cloneBlueprints(snapshot.blueprints);
        return {
            ok: true,
            blueprints: cloneBlueprints(currentBlueprints),
            snapshot: {
                ...snapshot,
                blueprints: cloneBlueprints(snapshot.blueprints),
            },
        };
    };

    return {
        getCurrentBlueprints,
        listSnapshots,
        previewOverlay,
        applyOverlay,
        rollbackToSnapshot,
    };
}

export function exportPrefabBatchTunedBlueprints(input: {
    blueprints: PrefabBlueprint[];
    pretty?: boolean;
}): string[] {
    return input.blueprints.map((blueprint) =>
        exportPrefabBlueprint(blueprint, {
            pretty: input.pretty ?? true,
        }),
    );
}
