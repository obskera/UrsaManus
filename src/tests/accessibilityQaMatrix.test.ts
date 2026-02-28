import { describe, expect, it } from "vitest";
import {
    evaluateAccessibilityQaMatrix,
    parseAccessibilityQaMatrixReport,
} from "@/services/accessibilityQaMatrix";

describe("accessibility QA matrix service", () => {
    const validMatrixReportRaw = JSON.stringify({
        version: 1,
        runId: "qa-2026-02-28-main",
        executedAt: "2026-02-28T12:00:00.000Z",
        areas: [
            {
                id: "keyboard-navigation",
                checks: [
                    { id: "focus-order", status: "pass" },
                    { id: "focus-visible", status: "pass" },
                    { id: "primary-actions-reachable", status: "pass" },
                ],
            },
            {
                id: "readability-contrast",
                checks: [
                    { id: "text-scale-legible", status: "pass" },
                    { id: "contrast-aa", status: "pass" },
                ],
            },
            {
                id: "reduced-motion",
                checks: [
                    { id: "reduced-flash-toggle", status: "pass" },
                    { id: "reduced-shake-toggle", status: "pass" },
                ],
            },
            {
                id: "assist-timing",
                checks: [
                    { id: "hold-toggle-option", status: "pass" },
                    { id: "subtitle-speed-options", status: "pass" },
                ],
            },
        ],
    });

    it("passes when required accessibility areas/checks are present and passing", () => {
        const parsedReport =
            parseAccessibilityQaMatrixReport(validMatrixReportRaw);

        expect(parsedReport.ok).toBe(true);
        if (!parsedReport.ok) {
            return;
        }

        const evaluation = evaluateAccessibilityQaMatrix(parsedReport.payload);
        expect(evaluation.ok).toBe(true);
        expect(evaluation.issues).toEqual([]);
        expect(evaluation.summary.reportedAreaCount).toBe(4);
        expect(evaluation.summary.reportedCheckCount).toBe(9);
    });

    it("flags missing required areas and checks", () => {
        const parsedReport = parseAccessibilityQaMatrixReport(
            JSON.stringify({
                version: 1,
                runId: "qa-2026-02-28-main",
                executedAt: "2026-02-28T12:00:00.000Z",
                areas: [
                    {
                        id: "keyboard-navigation",
                        checks: [{ id: "focus-order", status: "pass" }],
                    },
                ],
            }),
        );

        expect(parsedReport.ok).toBe(true);
        if (!parsedReport.ok) {
            return;
        }

        const evaluation = evaluateAccessibilityQaMatrix(parsedReport.payload);

        expect(evaluation.ok).toBe(false);
        expect(evaluation.issues).toEqual([
            {
                path: "$.areas",
                message:
                    'Missing required accessibility QA check "focus-visible" in area "keyboard-navigation".',
            },
            {
                path: "$.areas",
                message:
                    'Missing required accessibility QA check "primary-actions-reachable" in area "keyboard-navigation".',
            },
            {
                path: "$.areas",
                message:
                    'Missing required accessibility QA area "readability-contrast".',
            },
            {
                path: "$.areas",
                message:
                    'Missing required accessibility QA area "reduced-motion".',
            },
            {
                path: "$.areas",
                message:
                    'Missing required accessibility QA area "assist-timing".',
            },
        ]);
    });

    it("flags failed and not-applicable checklist statuses", () => {
        const parsedReport = parseAccessibilityQaMatrixReport(
            JSON.stringify({
                version: 1,
                runId: "qa-2026-02-28-main",
                executedAt: "2026-02-28T12:00:00.000Z",
                areas: [
                    {
                        id: "keyboard-navigation",
                        checks: [
                            { id: "focus-order", status: "fail" },
                            { id: "focus-visible", status: "pass" },
                            { id: "primary-actions-reachable", status: "pass" },
                        ],
                    },
                    {
                        id: "readability-contrast",
                        checks: [
                            { id: "text-scale-legible", status: "pass" },
                            { id: "contrast-aa", status: "na" },
                        ],
                    },
                    {
                        id: "reduced-motion",
                        checks: [
                            { id: "reduced-flash-toggle", status: "pass" },
                            { id: "reduced-shake-toggle", status: "pass" },
                        ],
                    },
                    {
                        id: "assist-timing",
                        checks: [
                            { id: "hold-toggle-option", status: "pass" },
                            { id: "subtitle-speed-options", status: "pass" },
                        ],
                    },
                ],
            }),
        );

        expect(parsedReport.ok).toBe(true);
        if (!parsedReport.ok) {
            return;
        }

        const evaluation = evaluateAccessibilityQaMatrix(parsedReport.payload);

        expect(evaluation.ok).toBe(false);
        expect(evaluation.issues).toEqual([
            {
                path: "$.areas[0].checks[0].status",
                message: 'Accessibility QA check "focus-order" failed.',
            },
            {
                path: "$.areas[1].checks[1].status",
                message:
                    'Accessibility QA check "contrast-aa" is not marked pass (status=na).',
            },
        ]);
    });

    it("rejects invalid report versions", () => {
        const parsedReport = parseAccessibilityQaMatrixReport(
            JSON.stringify({
                version: 99,
                runId: "qa-2026-02-28-main",
                executedAt: "2026-02-28T12:00:00.000Z",
                areas: [],
            }),
        );

        expect(parsedReport.ok).toBe(false);
    });
});
