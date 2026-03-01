import { useMemo, useState } from "react";
import {
    createPrefabExampleMatrixCatalog,
    type PrefabExampleDomain,
    type PrefabExampleVariant,
} from "@/services/prefabExampleMatrix";

export type PrefabExampleMatrixExampleProps = {
    title?: string;
};

const DOMAINS: PrefabExampleDomain[] = ["player", "enemy", "object"];

const VARIANT_ORDER: PrefabExampleVariant[] = [
    "minimal",
    "full-featured",
    "override-heavy",
    "migration-legacy",
];

function formatVariantLabel(variant: PrefabExampleVariant): string {
    if (variant === "full-featured") {
        return "full-featured";
    }

    if (variant === "override-heavy") {
        return "override-heavy";
    }

    if (variant === "migration-legacy") {
        return "migration/legacy";
    }

    return "minimal";
}

const PrefabExampleMatrixExample = ({
    title = "Prefab example matrix",
}: PrefabExampleMatrixExampleProps) => {
    const [catalog] = useState(() => createPrefabExampleMatrixCatalog());
    const [selectedDomain, setSelectedDomain] =
        useState<PrefabExampleDomain>("player");

    const entries = useMemo(() => {
        const rankByVariant = new Map<PrefabExampleVariant, number>();
        for (let index = 0; index < VARIANT_ORDER.length; index += 1) {
            rankByVariant.set(VARIANT_ORDER[index], index);
        }

        return catalog
            .listEntries({ domain: selectedDomain })
            .sort((left, right) => {
                const rankLeft = rankByVariant.get(left.variant) ?? 0;
                const rankRight = rankByVariant.get(right.variant) ?? 0;
                return rankLeft - rankRight;
            });
    }, [catalog, selectedDomain]);

    return (
        <section className="um-container um-stack" aria-label={title}>
            <h3 className="um-title">{title}</h3>
            <p className="um-help">
                Matrix coverage for major prefab domains across minimal,
                full-featured, override-heavy, and migration/legacy variants.
            </p>

            <label className="um-label">
                Domain
                <select
                    className="um-select"
                    aria-label="Prefab matrix domain"
                    value={selectedDomain}
                    onChange={(event) => {
                        setSelectedDomain(
                            event.target.value as PrefabExampleDomain,
                        );
                    }}
                >
                    {DOMAINS.map((domain) => (
                        <option key={domain} value={domain}>
                            {domain}
                        </option>
                    ))}
                </select>
            </label>

            <p className="um-help" aria-label="Prefab matrix summary">
                Showing {entries.length} variants for {selectedDomain}.
            </p>

            <div className="um-stack" aria-label="Prefab matrix entries">
                {entries.map((entry) => (
                    <article
                        key={entry.id}
                        className="um-panel um-stack"
                        aria-label={`${entry.label} (${entry.variant})`}
                    >
                        <div className="um-row">
                            <h4 className="um-title">{entry.label}</h4>
                            <span className="um-capsule">
                                variant: {formatVariantLabel(entry.variant)}
                            </span>
                            <span className="um-capsule">
                                modules: {entry.blueprint.modules.length}
                            </span>
                        </div>

                        <ul className="um-list">
                            {entry.expectedOutcomes.map((outcome) => (
                                <li key={outcome} className="um-list-item">
                                    {outcome}
                                </li>
                            ))}
                        </ul>

                        {entry.migration ? (
                            <p className="um-help">
                                Migration: source v
                                {entry.migration.sourceVersion}; requires
                                migration:{" "}
                                {entry.migration.requiresMigration
                                    ? "yes"
                                    : "no"}
                                ; status: {entry.migration.ok ? "ok" : "failed"}
                                {entry.migration.message
                                    ? ` (${entry.migration.message})`
                                    : "."}
                            </p>
                        ) : null}

                        <p className="um-help">
                            Source: {entry.source.service} ·{" "}
                            {entry.source.uiExample}
                        </p>
                    </article>
                ))}
            </div>
        </section>
    );
};

export default PrefabExampleMatrixExample;
