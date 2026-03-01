import { beforeEach, describe, expect, it } from "vitest";
import {
    PLAYTEST_RUNTIME_SUMMARY_STORAGE_KEY,
    buildPlaytestRuntimeSummary,
    persistPlaytestRuntimeSummary,
} from "@/services/playtestRuntimeSummary";

describe("playtestRuntimeSummary", () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    it("builds success summary when all bootstraps load", () => {
        const summary = buildPlaytestRuntimeSummary([
            {
                scope: "tilemap",
                ok: true,
                message: "Loaded tilemap bootstrap.",
            },
            {
                scope: "bgm",
                ok: true,
                message: "Loaded BGM bootstrap.",
            },
        ]);

        expect(summary.tone).toBe("success");
        expect(summary.loadedCount).toBe(2);
        expect(summary.warningCount).toBe(0);
        expect(summary.errorCount).toBe(0);
        expect(summary.message).toBe(
            "Playtest runtime handoff: 2/2 loaded, 0 warnings, 0 errors.",
        );
    });

    it("classifies missing bootstrap as warning", () => {
        const summary = buildPlaytestRuntimeSummary([
            {
                scope: "tilemap",
                ok: true,
                message: "Loaded tilemap bootstrap.",
            },
            {
                scope: "bgm",
                ok: false,
                missing: true,
                message: "No recovery snapshot found.",
            },
        ]);

        expect(summary.tone).toBe("neutral");
        expect(summary.loadedCount).toBe(1);
        expect(summary.warningCount).toBe(1);
        expect(summary.errorCount).toBe(0);
        expect(summary.entries[1]?.severity).toBe("warning");
    });

    it("classifies non-missing failure as error", () => {
        const summary = buildPlaytestRuntimeSummary([
            {
                scope: "tilemap",
                ok: false,
                missing: false,
                message: "Tilemap runtime bootstrap failed.",
            },
        ]);

        expect(summary.tone).toBe("error");
        expect(summary.loadedCount).toBe(0);
        expect(summary.warningCount).toBe(0);
        expect(summary.errorCount).toBe(1);
        expect(summary.entries[0]?.severity).toBe("error");
    });

    it("persists summary payload in local storage", () => {
        const summary = buildPlaytestRuntimeSummary([
            {
                scope: "tilemap",
                ok: true,
                message: "Loaded tilemap bootstrap.",
            },
        ]);

        expect(persistPlaytestRuntimeSummary(summary)).toBe(true);

        const stored = window.localStorage.getItem(
            PLAYTEST_RUNTIME_SUMMARY_STORAGE_KEY,
        );
        expect(stored).not.toBeNull();

        const parsed = JSON.parse(stored ?? "{}") as {
            message?: string;
            loadedCount?: number;
        };
        expect(parsed.message).toBe(summary.message);
        expect(parsed.loadedCount).toBe(1);
    });
});
