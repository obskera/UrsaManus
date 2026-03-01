import { useMemo, useState } from "react";
import { exportBrowserJsonFile } from "@/services/browserJsonFile";
import { createDefaultPrefabRegistry } from "@/services/prefabRegistryDefaults";
import { exportPrefabBlueprint } from "@/services/prefabCore";
import {
    createPrefabStarterWizardService,
    type PrefabStarterArchetype,
    type PrefabStarterPresetId,
} from "@/services/prefabStarterWizard";

export type PrefabStarterWizardToolExampleProps = {
    title?: string;
};

type BuildMode = "preset" | "selection";

const PrefabStarterWizardToolExample = ({
    title = "Prefab starter wizard (MVP)",
}: PrefabStarterWizardToolExampleProps) => {
    const [registry] = useState(() => createDefaultPrefabRegistry());
    const [wizard] = useState(() =>
        createPrefabStarterWizardService({
            registry,
        }),
    );

    const [buildMode, setBuildMode] = useState<BuildMode>("preset");
    const [archetype, setArchetype] =
        useState<PrefabStarterArchetype>("player");

    const presets = useMemo(
        () => wizard.listPresets(archetype),
        [archetype, wizard],
    );
    const [presetId, setPresetId] =
        useState<PrefabStarterPresetId>("player:rpg-starter");
    const [blueprintId, setBlueprintId] = useState("prefab-starter");
    const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([]);
    const [issues, setIssues] = useState<string[]>([]);
    const [status, setStatus] = useState("Ready.");
    const [blueprintRaw, setBlueprintRaw] = useState("");
    const [snippetRaw, setSnippetRaw] = useState("");

    const availableModules = useMemo(() => {
        return registry
            .listModules({ domain: archetype })
            .map((module) => module.id);
    }, [archetype, registry]);

    const dependencyAdvice = useMemo(() => {
        if (buildMode !== "selection") {
            return null;
        }

        return wizard.recommendModulesForSelection({
            archetype,
            moduleIds: selectedModuleIds,
        });
    }, [archetype, buildMode, selectedModuleIds, wizard]);

    const resolvedPresetId = presets.some((preset) => preset.id === presetId)
        ? presetId
        : (presets[0]?.id ?? "player:rpg-starter");

    const toggleModule = (moduleId: string) => {
        setSelectedModuleIds((current) => {
            return current.includes(moduleId)
                ? current.filter((entry) => entry !== moduleId)
                : [...current, moduleId].sort((left, right) =>
                      left.localeCompare(right),
                  );
        });
    };

    const runBuild = () => {
        const result =
            buildMode === "preset"
                ? wizard.buildFromPreset({
                      presetId: resolvedPresetId,
                      blueprintId,
                  })
                : wizard.buildFromSelection({
                      archetype,
                      blueprintId,
                      moduleIds: selectedModuleIds,
                  });

        setIssues(result.issues);
        setSnippetRaw(result.integrationSnippet);
        setBlueprintRaw(
            exportPrefabBlueprint(result.blueprint, { pretty: true }),
        );

        if (result.ok) {
            setStatus(
                `Generated ${result.blueprint.id} (${result.blueprint.modules.length} modules).`,
            );
        } else {
            setStatus(
                `Generation failed (${result.issues.length} issue${result.issues.length === 1 ? "" : "s"}).`,
            );
        }
    };

    const exportBlueprint = () => {
        if (!blueprintRaw) {
            setStatus("Generate a blueprint before export.");
            return;
        }

        const fileName = `${(blueprintId || "prefab-starter").trim() || "prefab-starter"}.json`;
        const result = exportBrowserJsonFile(blueprintRaw, fileName);
        if (!result.ok) {
            setStatus(result.message);
            return;
        }

        setStatus(`Exported ${fileName}.`);
    };

    const applyQuickFix = () => {
        const quickFix = wizard.applyModuleQuickFix({
            archetype,
            moduleIds: selectedModuleIds,
            includeOptional: false,
        });

        setSelectedModuleIds(quickFix.moduleIds);
        setStatus(
            quickFix.addedRequiredModuleIds.length > 0
                ? `Applied quick-fix (+${quickFix.addedRequiredModuleIds.length} required module${quickFix.addedRequiredModuleIds.length === 1 ? "" : "s"}).`
                : "No dependency quick-fix changes needed.",
        );
    };

    return (
        <section
            className="ToolExampleCard"
            aria-label="Prefab starter wizard tool"
        >
            <header className="ToolExampleHeader">
                <h3>{title}</h3>
                <p>
                    Compose from preset or module selection and export
                    ready-to-use prefab JSON.
                </p>
            </header>

            <div
                className="ToolExampleActions"
                role="group"
                aria-label="Prefab wizard controls"
            >
                <label>
                    Build mode
                    <select
                        value={buildMode}
                        onChange={(event) => {
                            setBuildMode(event.target.value as BuildMode);
                        }}
                    >
                        <option value="preset">Preset</option>
                        <option value="selection">Module selection</option>
                    </select>
                </label>

                <label>
                    Archetype
                    <select
                        value={archetype}
                        onChange={(event) => {
                            const nextArchetype = event.target
                                .value as PrefabStarterArchetype;
                            setArchetype(nextArchetype);

                            const nextPresets =
                                wizard.listPresets(nextArchetype);
                            const firstPreset = nextPresets[0];
                            if (firstPreset) {
                                setPresetId(firstPreset.id);
                                setSelectedModuleIds(firstPreset.moduleIds);
                                setBlueprintId(
                                    firstPreset.id.replaceAll(":", "-"),
                                );
                            } else {
                                setSelectedModuleIds([]);
                            }
                        }}
                    >
                        <option value="player">Player</option>
                        <option value="enemy">Enemy</option>
                        <option value="object">Object</option>
                    </select>
                </label>

                {buildMode === "preset" ? (
                    <label>
                        Preset
                        <select
                            value={resolvedPresetId}
                            onChange={(event) => {
                                const nextPresetId = event.target
                                    .value as PrefabStarterPresetId;
                                setPresetId(nextPresetId);

                                const selectedPreset = presets.find(
                                    (preset) => preset.id === nextPresetId,
                                );
                                if (selectedPreset) {
                                    setSelectedModuleIds(
                                        selectedPreset.moduleIds,
                                    );
                                    setBlueprintId(
                                        selectedPreset.id.replaceAll(":", "-"),
                                    );
                                }
                            }}
                        >
                            {presets.map((preset) => (
                                <option key={preset.id} value={preset.id}>
                                    {preset.label}
                                </option>
                            ))}
                        </select>
                    </label>
                ) : null}

                <label>
                    Blueprint ID
                    <input
                        value={blueprintId}
                        onChange={(event) => {
                            setBlueprintId(event.target.value);
                        }}
                    />
                </label>

                <button
                    type="button"
                    className="DebugToggle"
                    onClick={runBuild}
                >
                    Generate prefab blueprint
                </button>
                <button
                    type="button"
                    className="DebugToggle"
                    onClick={exportBlueprint}
                >
                    Export prefab blueprint
                </button>
            </div>

            {buildMode === "selection" ? (
                <>
                    <div
                        className="ToolExampleActions"
                        role="group"
                        aria-label="Module selection"
                    >
                        {availableModules.map((moduleId) => (
                            <label key={moduleId}>
                                <input
                                    type="checkbox"
                                    checked={selectedModuleIds.includes(
                                        moduleId,
                                    )}
                                    onChange={() => {
                                        toggleModule(moduleId);
                                    }}
                                />
                                {moduleId}
                            </label>
                        ))}
                    </div>
                    <div
                        className="ToolExampleActions"
                        role="group"
                        aria-label="Dependency advisor"
                    >
                        <button
                            type="button"
                            className="DebugToggle"
                            onClick={applyQuickFix}
                        >
                            Apply dependency quick-fix
                        </button>
                    </div>
                    {dependencyAdvice &&
                    dependencyAdvice.recommendations.length > 0 ? (
                        <ul
                            className="ToolExampleIssues"
                            aria-label="Dependency recommendations"
                        >
                            {dependencyAdvice.recommendations.map((entry) => (
                                <li
                                    key={`${entry.kind}:${entry.moduleId}:${entry.reason}`}
                                >
                                    [{entry.kind}] {entry.moduleId} —{" "}
                                    {entry.reason}
                                </li>
                            ))}
                        </ul>
                    ) : null}
                </>
            ) : null}

            <p className="ToolExampleStatus" role="status" aria-live="polite">
                {status}
            </p>

            {issues.length > 0 ? (
                <ul
                    className="ToolExampleIssues"
                    aria-label="Generation issues"
                >
                    {issues.map((issue, index) => (
                        <li key={`${issue}-${index}`}>{issue}</li>
                    ))}
                </ul>
            ) : null}

            <label>
                Blueprint JSON
                <textarea value={blueprintRaw} readOnly rows={12} />
            </label>

            <label>
                Integration snippet
                <textarea value={snippetRaw} readOnly rows={10} />
            </label>
        </section>
    );
};

export default PrefabStarterWizardToolExample;
