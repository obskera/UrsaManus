export type PlaytestRuntimeBootstrapResult = {
    scope: string;
    ok: boolean;
    message: string;
    missing?: boolean;
};

export type PlaytestRuntimeSummary = {
    generatedAt: string;
    loadedCount: number;
    warningCount: number;
    errorCount: number;
    tone: "success" | "neutral" | "error";
    message: string;
    entries: Array<{
        scope: string;
        severity: "success" | "warning" | "error";
        detail: string;
    }>;
};

export const PLAYTEST_RUNTIME_SUMMARY_STORAGE_KEY =
    "um:playtest:runtime-summary:v1";

export const buildPlaytestRuntimeSummary = (
    results: PlaytestRuntimeBootstrapResult[],
): PlaytestRuntimeSummary => {
    const entries = results.map((result) => {
        if (result.ok) {
            return {
                scope: result.scope,
                severity: "success" as const,
                detail: result.message,
            };
        }

        if (result.missing) {
            return {
                scope: result.scope,
                severity: "warning" as const,
                detail: result.message,
            };
        }

        return {
            scope: result.scope,
            severity: "error" as const,
            detail: result.message,
        };
    });

    const loadedCount = entries.filter(
        (entry) => entry.severity === "success",
    ).length;
    const warningCount = entries.filter(
        (entry) => entry.severity === "warning",
    ).length;
    const errorCount = entries.filter(
        (entry) => entry.severity === "error",
    ).length;

    const tone =
        errorCount > 0 ? "error" : warningCount > 0 ? "neutral" : "success";

    const message = `Playtest runtime handoff: ${loadedCount}/${entries.length} loaded, ${warningCount} warnings, ${errorCount} errors.`;

    return {
        generatedAt: new Date().toISOString(),
        loadedCount,
        warningCount,
        errorCount,
        tone,
        message,
        entries,
    };
};

export const persistPlaytestRuntimeSummary = (
    summary: PlaytestRuntimeSummary,
): boolean => {
    if (typeof window === "undefined") {
        return false;
    }

    try {
        window.localStorage.setItem(
            PLAYTEST_RUNTIME_SUMMARY_STORAGE_KEY,
            JSON.stringify(summary),
        );
        return true;
    } catch {
        return false;
    }
};
