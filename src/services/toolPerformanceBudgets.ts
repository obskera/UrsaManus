export type ToolPerformanceBudgetThresholds = {
    loadMs: number;
    interactionMs: number;
    exportMs: number;
    payloadBytes: number;
};

export type ToolPerformanceBudgets = {
    tilemap: ToolPerformanceBudgetThresholds;
    bgm: ToolPerformanceBudgetThresholds;
};

export type ToolPerformanceSample = {
    tool: keyof ToolPerformanceBudgets;
    metric: "loadMs" | "interactionMs" | "exportMs" | "payloadBytes";
    value: number;
};

export type ToolPerformanceEvaluation = {
    sample: ToolPerformanceSample;
    budget: number;
    passed: boolean;
};

export const DEFAULT_TOOL_PERFORMANCE_BUDGETS: ToolPerformanceBudgets = {
    tilemap: {
        loadMs: 60,
        interactionMs: 20,
        exportMs: 45,
        payloadBytes: 700_000,
    },
    bgm: {
        loadMs: 35,
        interactionMs: 12,
        exportMs: 25,
        payloadBytes: 350_000,
    },
};

export const evaluateToolPerformanceSamples = (
    samples: ToolPerformanceSample[],
    budgets: ToolPerformanceBudgets = DEFAULT_TOOL_PERFORMANCE_BUDGETS,
): ToolPerformanceEvaluation[] => {
    return samples.map((sample) => {
        const budget = budgets[sample.tool][sample.metric];
        return {
            sample,
            budget,
            passed: sample.value <= budget,
        };
    });
};
