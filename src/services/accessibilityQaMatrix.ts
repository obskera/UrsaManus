export const ACCESSIBILITY_QA_MATRIX_VERSION = 1;

export type AccessibilityQaAreaId =
    | "keyboard-navigation"
    | "readability-contrast"
    | "reduced-motion"
    | "assist-timing";

export type AccessibilityQaCheckStatus = "pass" | "fail" | "na";

export type AccessibilityQaCheck = {
    id: string;
    status: AccessibilityQaCheckStatus;
    note?: string;
};

export type AccessibilityQaAreaReport = {
    id: string;
    checks: AccessibilityQaCheck[];
};

export type AccessibilityQaMatrixReport = {
    version: typeof ACCESSIBILITY_QA_MATRIX_VERSION;
    runId: string;
    executedAt: string;
    areas: AccessibilityQaAreaReport[];
};

export type AccessibilityQaMatrixIssue = {
    path: string;
    message: string;
};

export type AccessibilityQaMatrixEvaluation = {
    ok: boolean;
    issues: AccessibilityQaMatrixIssue[];
    summary: {
        runId: string;
        requiredAreaCount: number;
        requiredCheckCount: number;
        reportedAreaCount: number;
        reportedCheckCount: number;
        passCount: number;
        failCount: number;
        notApplicableCount: number;
    };
};

type ParseResult<TPayload> =
    | {
          ok: true;
          payload: TPayload;
      }
    | {
          ok: false;
          issue: AccessibilityQaMatrixIssue;
      };

const REQUIRED_ACCESSIBILITY_QA_AREA_CHECKS: Record<
    AccessibilityQaAreaId,
    readonly string[]
> = {
    "keyboard-navigation": [
        "focus-order",
        "focus-visible",
        "primary-actions-reachable",
    ],
    "readability-contrast": ["text-scale-legible", "contrast-aa"],
    "reduced-motion": ["reduced-flash-toggle", "reduced-shake-toggle"],
    "assist-timing": ["hold-toggle-option", "subtitle-speed-options"],
};

const REQUIRED_ACCESSIBILITY_QA_AREAS = Object.keys(
    REQUIRED_ACCESSIBILITY_QA_AREA_CHECKS,
) as AccessibilityQaAreaId[];

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function normalizeString(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

function parseJson(raw: string): ParseResult<unknown> {
    try {
        return {
            ok: true,
            payload: JSON.parse(raw) as unknown,
        };
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Invalid JSON payload.";
        return {
            ok: false,
            issue: {
                path: "$",
                message: `Invalid JSON: ${message}`,
            },
        };
    }
}

function isValidDateString(value: string): boolean {
    return value.length > 0 && Number.isFinite(Date.parse(value));
}

export function parseAccessibilityQaMatrixReport(
    raw: string,
): ParseResult<AccessibilityQaMatrixReport> {
    const parsed = parseJson(raw);
    if (!parsed.ok) {
        return parsed;
    }

    const value = parsed.payload;
    if (!isObject(value)) {
        return {
            ok: false,
            issue: {
                path: "$",
                message: "Accessibility QA matrix payload must be an object.",
            },
        };
    }

    if (value.version !== ACCESSIBILITY_QA_MATRIX_VERSION) {
        return {
            ok: false,
            issue: {
                path: "$.version",
                message: `Accessibility QA matrix version must be ${ACCESSIBILITY_QA_MATRIX_VERSION}.`,
            },
        };
    }

    const runId = normalizeString(value.runId);
    if (!runId) {
        return {
            ok: false,
            issue: {
                path: "$.runId",
                message: "Run id is required.",
            },
        };
    }

    const executedAt = normalizeString(value.executedAt);
    if (!isValidDateString(executedAt)) {
        return {
            ok: false,
            issue: {
                path: "$.executedAt",
                message: "executedAt must be a valid ISO date-time string.",
            },
        };
    }

    if (!Array.isArray(value.areas) || value.areas.length === 0) {
        return {
            ok: false,
            issue: {
                path: "$.areas",
                message: "At least one accessibility QA area is required.",
            },
        };
    }

    const areas: AccessibilityQaAreaReport[] = [];
    const areaIds = new Set<string>();

    for (let areaIndex = 0; areaIndex < value.areas.length; areaIndex += 1) {
        const area = value.areas[areaIndex];
        const areaPath = `$.areas[${areaIndex}]`;
        if (!isObject(area)) {
            return {
                ok: false,
                issue: {
                    path: areaPath,
                    message: "Area must be an object.",
                },
            };
        }

        const areaId = normalizeString(area.id);
        if (!areaId) {
            return {
                ok: false,
                issue: {
                    path: `${areaPath}.id`,
                    message: "Area id is required.",
                },
            };
        }

        if (areaIds.has(areaId)) {
            return {
                ok: false,
                issue: {
                    path: `${areaPath}.id`,
                    message: `Duplicate area id "${areaId}".`,
                },
            };
        }

        if (!Array.isArray(area.checks) || area.checks.length === 0) {
            return {
                ok: false,
                issue: {
                    path: `${areaPath}.checks`,
                    message: "Area checks must be a non-empty array.",
                },
            };
        }

        const checks: AccessibilityQaCheck[] = [];
        const checkIds = new Set<string>();

        for (
            let checkIndex = 0;
            checkIndex < area.checks.length;
            checkIndex += 1
        ) {
            const check = area.checks[checkIndex];
            const checkPath = `${areaPath}.checks[${checkIndex}]`;

            if (!isObject(check)) {
                return {
                    ok: false,
                    issue: {
                        path: checkPath,
                        message: "Area check must be an object.",
                    },
                };
            }

            const checkId = normalizeString(check.id);
            if (!checkId) {
                return {
                    ok: false,
                    issue: {
                        path: `${checkPath}.id`,
                        message: "Area check id is required.",
                    },
                };
            }

            if (checkIds.has(checkId)) {
                return {
                    ok: false,
                    issue: {
                        path: `${checkPath}.id`,
                        message: `Duplicate area check id "${checkId}".`,
                    },
                };
            }

            const status = check.status;
            if (status !== "pass" && status !== "fail" && status !== "na") {
                return {
                    ok: false,
                    issue: {
                        path: `${checkPath}.status`,
                        message:
                            'Area check status must be "pass", "fail", or "na".',
                    },
                };
            }

            checkIds.add(checkId);
            checks.push({
                id: checkId,
                status,
                ...(normalizeString(check.note)
                    ? { note: normalizeString(check.note) }
                    : {}),
            });
        }

        areaIds.add(areaId);
        areas.push({
            id: areaId,
            checks,
        });
    }

    return {
        ok: true,
        payload: {
            version: ACCESSIBILITY_QA_MATRIX_VERSION,
            runId,
            executedAt,
            areas,
        },
    };
}

export function evaluateAccessibilityQaMatrix(
    report: AccessibilityQaMatrixReport,
): AccessibilityQaMatrixEvaluation {
    const issues: AccessibilityQaMatrixIssue[] = [];
    let passCount = 0;
    let failCount = 0;
    let notApplicableCount = 0;
    let checkCount = 0;

    for (let areaIndex = 0; areaIndex < report.areas.length; areaIndex += 1) {
        const area = report.areas[areaIndex];
        for (
            let checkIndex = 0;
            checkIndex < area.checks.length;
            checkIndex += 1
        ) {
            const check = area.checks[checkIndex];
            const basePath = `$.areas[${areaIndex}].checks[${checkIndex}]`;
            checkCount += 1;

            if (check.status === "pass") {
                passCount += 1;
                continue;
            }

            if (check.status === "na") {
                notApplicableCount += 1;
                issues.push({
                    path: `${basePath}.status`,
                    message: `Accessibility QA check "${check.id}" is not marked pass (status=na).`,
                });
                continue;
            }

            failCount += 1;
            issues.push({
                path: `${basePath}.status`,
                message: `Accessibility QA check "${check.id}" failed.`,
            });
        }
    }

    const areaLookup = new Map<string, AccessibilityQaAreaReport>();
    report.areas.forEach((area) => {
        areaLookup.set(area.id, area);
    });

    for (const requiredArea of REQUIRED_ACCESSIBILITY_QA_AREAS) {
        const area = areaLookup.get(requiredArea);
        if (!area) {
            issues.push({
                path: "$.areas",
                message: `Missing required accessibility QA area "${requiredArea}".`,
            });
            continue;
        }

        const checkIds = new Set(area.checks.map((check) => check.id));
        const requiredCheckIds =
            REQUIRED_ACCESSIBILITY_QA_AREA_CHECKS[requiredArea];
        for (const requiredCheckId of requiredCheckIds) {
            if (!checkIds.has(requiredCheckId)) {
                issues.push({
                    path: "$.areas",
                    message: `Missing required accessibility QA check "${requiredCheckId}" in area "${requiredArea}".`,
                });
            }
        }
    }

    const requiredCheckCount = REQUIRED_ACCESSIBILITY_QA_AREAS.reduce(
        (count, areaId) =>
            count + REQUIRED_ACCESSIBILITY_QA_AREA_CHECKS[areaId].length,
        0,
    );

    return {
        ok: issues.length === 0,
        issues,
        summary: {
            runId: report.runId,
            requiredAreaCount: REQUIRED_ACCESSIBILITY_QA_AREAS.length,
            requiredCheckCount,
            reportedAreaCount: report.areas.length,
            reportedCheckCount: checkCount,
            passCount,
            failCount,
            notApplicableCount,
        },
    };
}
