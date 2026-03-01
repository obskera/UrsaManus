import { describe, expect, it } from "vitest";
import {
    DEFAULT_TOOL_PERFORMANCE_BUDGETS,
    evaluateToolPerformanceSamples,
} from "@/services/toolPerformanceBudgets";

describe("toolPerformanceBudgets", () => {
    it("passes samples within budget", () => {
        const evaluations = evaluateToolPerformanceSamples([
            {
                tool: "tilemap",
                metric: "loadMs",
                value: DEFAULT_TOOL_PERFORMANCE_BUDGETS.tilemap.loadMs - 1,
            },
            {
                tool: "bgm",
                metric: "payloadBytes",
                value: DEFAULT_TOOL_PERFORMANCE_BUDGETS.bgm.payloadBytes - 1,
            },
        ]);

        expect(evaluations.every((entry) => entry.passed)).toBe(true);
    });

    it("fails samples over budget", () => {
        const evaluations = evaluateToolPerformanceSamples([
            {
                tool: "tilemap",
                metric: "interactionMs",
                value:
                    DEFAULT_TOOL_PERFORMANCE_BUDGETS.tilemap.interactionMs + 5,
            },
        ]);

        expect(evaluations[0]?.passed).toBe(false);
    });
});
