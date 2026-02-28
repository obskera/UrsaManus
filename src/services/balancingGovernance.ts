export const BALANCING_GOVERNANCE_VERSION = 1;

export type BalancingGovernanceDomain = "combat" | "economy";

export type BalancingMetricThreshold = {
    id: string;
    min?: number;
    max?: number;
};

export type BalancingGovernanceBenchmark = {
    id: string;
    domain: BalancingGovernanceDomain;
    metricThresholds: BalancingMetricThreshold[];
};

export type BalancingGovernancePolicy = {
    version: typeof BALANCING_GOVERNANCE_VERSION;
    policyId: string;
    ownership: Record<BalancingGovernanceDomain, string[]>;
    benchmarks: BalancingGovernanceBenchmark[];
};

export type BalancingGovernanceSignoff = {
    ownerId: string;
    approvedAt: string;
    note?: string;
};

export type BalancingGovernanceBenchmarkResult = {
    scenarioId: string;
    metrics: Record<string, number>;
};

export type BalancingGovernanceReportPayload = {
    version: typeof BALANCING_GOVERNANCE_VERSION;
    policyId: string;
    domains: BalancingGovernanceDomain[];
    majorUpdate: boolean;
    benchmarkResults: BalancingGovernanceBenchmarkResult[];
    signoffs?: BalancingGovernanceSignoff[];
};

export type BalancingGovernanceIssue = {
    path: string;
    message: string;
};

export type BalancingGovernanceEvaluation = {
    ok: boolean;
    issues: BalancingGovernanceIssue[];
    summary: {
        policyId: string;
        domains: BalancingGovernanceDomain[];
        benchmarkCount: number;
        benchmarkResultCount: number;
        metricCheckCount: number;
        signoffCount: number;
        majorUpdate: boolean;
    };
};

type ParseResult<TPayload> =
    | {
          ok: true;
          payload: TPayload;
      }
    | {
          ok: false;
          issue: BalancingGovernanceIssue;
      };

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

export function parseBalancingGovernancePolicy(
    raw: string,
): ParseResult<BalancingGovernancePolicy> {
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
                message: "Policy payload must be an object.",
            },
        };
    }

    if (value.version !== BALANCING_GOVERNANCE_VERSION) {
        return {
            ok: false,
            issue: {
                path: "$.version",
                message: `Policy version must be ${BALANCING_GOVERNANCE_VERSION}.`,
            },
        };
    }

    const policyId = normalizeString(value.policyId);
    if (!policyId) {
        return {
            ok: false,
            issue: {
                path: "$.policyId",
                message: "Policy id is required.",
            },
        };
    }

    const ownershipValue = value.ownership;
    if (!isObject(ownershipValue)) {
        return {
            ok: false,
            issue: {
                path: "$.ownership",
                message: "Ownership mapping is required.",
            },
        };
    }

    const combatOwners = Array.isArray(ownershipValue.combat)
        ? ownershipValue.combat.map(normalizeString).filter(Boolean)
        : [];
    const economyOwners = Array.isArray(ownershipValue.economy)
        ? ownershipValue.economy.map(normalizeString).filter(Boolean)
        : [];

    if (combatOwners.length === 0 || economyOwners.length === 0) {
        return {
            ok: false,
            issue: {
                path: "$.ownership",
                message:
                    "Ownership must include at least one combat owner and one economy owner.",
            },
        };
    }

    if (!Array.isArray(value.benchmarks) || value.benchmarks.length === 0) {
        return {
            ok: false,
            issue: {
                path: "$.benchmarks",
                message: "At least one benchmark scenario is required.",
            },
        };
    }

    const benchmarks: BalancingGovernanceBenchmark[] = [];
    const benchmarkIds = new Set<string>();

    for (let index = 0; index < value.benchmarks.length; index += 1) {
        const benchmark = value.benchmarks[index];
        const benchmarkPath = `$.benchmarks[${index}]`;

        if (!isObject(benchmark)) {
            return {
                ok: false,
                issue: {
                    path: benchmarkPath,
                    message: "Benchmark must be an object.",
                },
            };
        }

        const benchmarkId = normalizeString(benchmark.id);
        const domain = benchmark.domain;
        if (!benchmarkId) {
            return {
                ok: false,
                issue: {
                    path: `${benchmarkPath}.id`,
                    message: "Benchmark id is required.",
                },
            };
        }

        if (benchmarkIds.has(benchmarkId)) {
            return {
                ok: false,
                issue: {
                    path: `${benchmarkPath}.id`,
                    message: `Duplicate benchmark id "${benchmarkId}".`,
                },
            };
        }

        if (domain !== "combat" && domain !== "economy") {
            return {
                ok: false,
                issue: {
                    path: `${benchmarkPath}.domain`,
                    message: "Benchmark domain must be combat or economy.",
                },
            };
        }

        if (
            !Array.isArray(benchmark.metricThresholds) ||
            benchmark.metricThresholds.length === 0
        ) {
            return {
                ok: false,
                issue: {
                    path: `${benchmarkPath}.metricThresholds`,
                    message:
                        "Benchmark metricThresholds must be a non-empty array.",
                },
            };
        }

        const thresholds: BalancingMetricThreshold[] = [];
        const metricIds = new Set<string>();
        for (
            let metricIndex = 0;
            metricIndex < benchmark.metricThresholds.length;
            metricIndex += 1
        ) {
            const threshold = benchmark.metricThresholds[metricIndex];
            const thresholdPath = `${benchmarkPath}.metricThresholds[${metricIndex}]`;

            if (!isObject(threshold)) {
                return {
                    ok: false,
                    issue: {
                        path: thresholdPath,
                        message: "Metric threshold must be an object.",
                    },
                };
            }

            const metricId = normalizeString(threshold.id);
            const minValue =
                typeof threshold.min === "number" ? threshold.min : undefined;
            const maxValue =
                typeof threshold.max === "number" ? threshold.max : undefined;

            if (!metricId) {
                return {
                    ok: false,
                    issue: {
                        path: `${thresholdPath}.id`,
                        message: "Metric threshold id is required.",
                    },
                };
            }

            if (metricIds.has(metricId)) {
                return {
                    ok: false,
                    issue: {
                        path: `${thresholdPath}.id`,
                        message: `Duplicate metric threshold id "${metricId}".`,
                    },
                };
            }

            if (minValue === undefined && maxValue === undefined) {
                return {
                    ok: false,
                    issue: {
                        path: thresholdPath,
                        message:
                            "Metric threshold requires min and/or max value.",
                    },
                };
            }

            if (
                minValue !== undefined &&
                maxValue !== undefined &&
                minValue > maxValue
            ) {
                return {
                    ok: false,
                    issue: {
                        path: thresholdPath,
                        message:
                            "Metric threshold min cannot be greater than max.",
                    },
                };
            }

            metricIds.add(metricId);
            thresholds.push({
                id: metricId,
                ...(minValue !== undefined ? { min: minValue } : {}),
                ...(maxValue !== undefined ? { max: maxValue } : {}),
            });
        }

        benchmarkIds.add(benchmarkId);
        benchmarks.push({
            id: benchmarkId,
            domain,
            metricThresholds: thresholds,
        });
    }

    return {
        ok: true,
        payload: {
            version: BALANCING_GOVERNANCE_VERSION,
            policyId,
            ownership: {
                combat: Array.from(new Set(combatOwners)).sort((a, b) =>
                    a.localeCompare(b),
                ),
                economy: Array.from(new Set(economyOwners)).sort((a, b) =>
                    a.localeCompare(b),
                ),
            },
            benchmarks,
        },
    };
}

export function parseBalancingGovernanceReport(
    raw: string,
): ParseResult<BalancingGovernanceReportPayload> {
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
                message: "Report payload must be an object.",
            },
        };
    }

    if (value.version !== BALANCING_GOVERNANCE_VERSION) {
        return {
            ok: false,
            issue: {
                path: "$.version",
                message: `Report version must be ${BALANCING_GOVERNANCE_VERSION}.`,
            },
        };
    }

    const policyId = normalizeString(value.policyId);
    if (!policyId) {
        return {
            ok: false,
            issue: {
                path: "$.policyId",
                message: "Report policyId is required.",
            },
        };
    }

    if (!Array.isArray(value.domains) || value.domains.length === 0) {
        return {
            ok: false,
            issue: {
                path: "$.domains",
                message: "Report domains must be a non-empty array.",
            },
        };
    }

    const domains = Array.from(
        new Set(
            value.domains
                .map((domain) =>
                    domain === "combat" || domain === "economy" ? domain : null,
                )
                .filter(
                    (domain): domain is BalancingGovernanceDomain =>
                        domain !== null,
                ),
        ),
    ).sort((left, right) => left.localeCompare(right));

    if (domains.length === 0) {
        return {
            ok: false,
            issue: {
                path: "$.domains",
                message: "Report domains must include combat and/or economy.",
            },
        };
    }

    if (!Array.isArray(value.benchmarkResults)) {
        return {
            ok: false,
            issue: {
                path: "$.benchmarkResults",
                message: "Report benchmarkResults must be an array.",
            },
        };
    }

    const benchmarkResults: BalancingGovernanceBenchmarkResult[] = [];
    for (
        let resultIndex = 0;
        resultIndex < value.benchmarkResults.length;
        resultIndex += 1
    ) {
        const result = value.benchmarkResults[resultIndex];
        const resultPath = `$.benchmarkResults[${resultIndex}]`;
        if (!isObject(result)) {
            return {
                ok: false,
                issue: {
                    path: resultPath,
                    message: "Benchmark result must be an object.",
                },
            };
        }

        const scenarioId = normalizeString(result.scenarioId);
        if (!scenarioId) {
            return {
                ok: false,
                issue: {
                    path: `${resultPath}.scenarioId`,
                    message: "Benchmark result scenarioId is required.",
                },
            };
        }

        if (!isObject(result.metrics)) {
            return {
                ok: false,
                issue: {
                    path: `${resultPath}.metrics`,
                    message: "Benchmark result metrics must be an object.",
                },
            };
        }

        const metrics: Record<string, number> = {};
        for (const [metricId, metricValue] of Object.entries(result.metrics)) {
            if (
                typeof metricValue !== "number" ||
                !Number.isFinite(metricValue)
            ) {
                return {
                    ok: false,
                    issue: {
                        path: `${resultPath}.metrics.${metricId}`,
                        message:
                            "Benchmark metric value must be a finite number.",
                    },
                };
            }

            metrics[metricId] = metricValue;
        }

        benchmarkResults.push({
            scenarioId,
            metrics,
        });
    }

    const signoffs: BalancingGovernanceSignoff[] = [];
    if (Array.isArray(value.signoffs)) {
        for (
            let signoffIndex = 0;
            signoffIndex < value.signoffs.length;
            signoffIndex += 1
        ) {
            const signoff = value.signoffs[signoffIndex];
            const signoffPath = `$.signoffs[${signoffIndex}]`;
            if (!isObject(signoff)) {
                return {
                    ok: false,
                    issue: {
                        path: signoffPath,
                        message: "Signoff must be an object.",
                    },
                };
            }

            const ownerId = normalizeString(signoff.ownerId);
            const approvedAt = normalizeString(signoff.approvedAt);
            if (!ownerId || !approvedAt) {
                return {
                    ok: false,
                    issue: {
                        path: signoffPath,
                        message: "Signoff ownerId and approvedAt are required.",
                    },
                };
            }

            signoffs.push({
                ownerId,
                approvedAt,
                ...(typeof signoff.note === "string" && signoff.note.trim()
                    ? {
                          note: signoff.note.trim(),
                      }
                    : {}),
            });
        }
    }

    return {
        ok: true,
        payload: {
            version: BALANCING_GOVERNANCE_VERSION,
            policyId,
            domains,
            majorUpdate: value.majorUpdate === true,
            benchmarkResults,
            ...(signoffs.length > 0 ? { signoffs } : {}),
        },
    };
}

export function evaluateBalancingGovernance(
    policy: BalancingGovernancePolicy,
    report: BalancingGovernanceReportPayload,
): BalancingGovernanceEvaluation {
    const issues: BalancingGovernanceIssue[] = [];

    if (policy.policyId !== report.policyId) {
        issues.push({
            path: "$.policyId",
            message: `Report policyId "${report.policyId}" does not match policy "${policy.policyId}".`,
        });
    }

    const requiredBenchmarks = policy.benchmarks.filter((benchmark) =>
        report.domains.includes(benchmark.domain),
    );
    const requiredBenchmarkById = new Map(
        requiredBenchmarks.map((benchmark) => [benchmark.id, benchmark]),
    );

    const reportResultById = new Map(
        report.benchmarkResults.map((result) => [result.scenarioId, result]),
    );

    for (const benchmark of requiredBenchmarks) {
        if (!reportResultById.has(benchmark.id)) {
            issues.push({
                path: "$.benchmarkResults",
                message: `Missing benchmark result for required scenario "${benchmark.id}" (${benchmark.domain}).`,
            });
        }
    }

    for (let index = 0; index < report.benchmarkResults.length; index += 1) {
        const result = report.benchmarkResults[index];
        const benchmark = requiredBenchmarkById.get(result.scenarioId);
        if (!benchmark) {
            issues.push({
                path: `$.benchmarkResults[${index}].scenarioId`,
                message: `Scenario "${result.scenarioId}" is not registered in the policy for domains [${report.domains.join(", ")}].`,
            });
            continue;
        }

        for (const threshold of benchmark.metricThresholds) {
            const metricValue = result.metrics[threshold.id];
            const metricPath = `$.benchmarkResults[${index}].metrics.${threshold.id}`;
            if (!Number.isFinite(metricValue)) {
                issues.push({
                    path: metricPath,
                    message: `Missing required metric "${threshold.id}" for scenario "${benchmark.id}".`,
                });
                continue;
            }

            if (threshold.min !== undefined && metricValue < threshold.min) {
                issues.push({
                    path: metricPath,
                    message: `Metric "${threshold.id}" is below minimum threshold (${metricValue} < ${threshold.min}).`,
                });
            }

            if (threshold.max !== undefined && metricValue > threshold.max) {
                issues.push({
                    path: metricPath,
                    message: `Metric "${threshold.id}" exceeds maximum threshold (${metricValue} > ${threshold.max}).`,
                });
            }
        }
    }

    const signoffOwnerIds = new Set(
        (report.signoffs ?? []).map((signoff) => signoff.ownerId),
    );
    if (report.majorUpdate) {
        const requiredOwnerIds = Array.from(
            new Set(
                report.domains.flatMap(
                    (domain) => policy.ownership[domain] ?? [],
                ),
            ),
        ).sort((left, right) => left.localeCompare(right));

        for (const ownerId of requiredOwnerIds) {
            if (!signoffOwnerIds.has(ownerId)) {
                issues.push({
                    path: "$.signoffs",
                    message: `Major update requires signoff from owner "${ownerId}".`,
                });
            }
        }
    }

    const metricCheckCount = requiredBenchmarks.reduce((sum, benchmark) => {
        return sum + benchmark.metricThresholds.length;
    }, 0);

    return {
        ok: issues.length === 0,
        issues,
        summary: {
            policyId: policy.policyId,
            domains: [...report.domains],
            benchmarkCount: requiredBenchmarks.length,
            benchmarkResultCount: report.benchmarkResults.length,
            metricCheckCount,
            signoffCount: report.signoffs?.length ?? 0,
            majorUpdate: report.majorUpdate,
        },
    };
}
