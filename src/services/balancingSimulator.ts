import {
    createCombatCoreService,
    type CombatDamageType,
    type CombatKnockback,
} from "@/services/combatCore";
import {
    createLootEconomyService,
    type LootAffixPool,
    type LootDropTableDefinition,
    type LootEconomyTableDefinition,
    type LootRewardBundleDefinition,
} from "@/services/lootEconomy";

export const BALANCING_SIMULATOR_PRESET_VERSION = 1;

export type BalancingCombatScenarioPreset = {
    id: string;
    label?: string;
    rounds: number;
    stepMs?: number;
    attackerId?: string;
    targetId?: string;
    targetMaxHp: number;
    targetResistances?: Partial<Record<CombatDamageType, number>>;
    hit: {
        amount: number;
        damageType?: CombatDamageType;
        invulnerabilityMs?: number;
        ignoreInvulnerability?: boolean;
        knockback?: CombatKnockback;
    };
};

export type BalancingEconomyScenarioPreset = {
    id: string;
    label?: string;
    iterations: number;
    dropTable: LootDropTableDefinition;
    economyTable?: LootEconomyTableDefinition;
    affixPools?: LootAffixPool[];
    rewardBundle?: LootRewardBundleDefinition;
    dropRolls?: number;
};

export type BalancingSimulationPresetPayload = {
    version: typeof BALANCING_SIMULATOR_PRESET_VERSION;
    combatScenarios?: BalancingCombatScenarioPreset[];
    economyScenarios?: BalancingEconomyScenarioPreset[];
};

export type BalancingCombatScenarioReport = {
    id: string;
    label: string;
    roundsPlanned: number;
    roundsSimulated: number;
    hitsApplied: number;
    hitsBlocked: number;
    totalDamage: number;
    averageDamagePerAppliedHit: number;
    finalTargetHp: number;
    defeated: boolean;
    defeatAtRound: number | null;
    totalElapsedMs: number;
};

export type BalancingEconomyScenarioReport = {
    id: string;
    label: string;
    iterations: number;
    totalItemsResolved: number;
    totalQuantityResolved: number;
    uniqueItemCount: number;
    quantityByItemId: Record<string, number>;
    totalSellValue: number;
    totalBuyValue: number;
    averageSellValuePerIteration: number;
    averageBuyValuePerIteration: number;
    currencyTotals: Record<string, number>;
};

export type BalancingSimulationBatchReport = {
    version: typeof BALANCING_SIMULATOR_PRESET_VERSION;
    generatedAtMs: number;
    combat: {
        scenarioCount: number;
        defeatedCount: number;
        totalDamage: number;
        averageDamagePerScenario: number;
        scenarios: BalancingCombatScenarioReport[];
    };
    economy: {
        scenarioCount: number;
        totalItemsResolved: number;
        totalQuantityResolved: number;
        totalSellValue: number;
        totalBuyValue: number;
        averageSellValuePerScenario: number;
        averageBuyValuePerScenario: number;
        currencyTotals: Record<string, number>;
        scenarios: BalancingEconomyScenarioReport[];
    };
};

export type BalancingSimulationValidationResult = {
    ok: boolean;
    code:
        | "invalid-json"
        | "invalid-payload"
        | "invalid-version"
        | "invalid-scenarios"
        | null;
    message: string | null;
};

export type BalancingSimulatorService = {
    runCombatScenario: (
        scenario: BalancingCombatScenarioPreset,
    ) => BalancingCombatScenarioReport | null;
    runEconomyScenario: (
        scenario: BalancingEconomyScenarioPreset,
    ) => BalancingEconomyScenarioReport | null;
    runBatch: (
        payload: BalancingSimulationPresetPayload,
    ) => BalancingSimulationBatchReport | null;
    parsePresetPayload: (raw: string) =>
        | {
              ok: true;
              payload: BalancingSimulationPresetPayload;
          }
        | {
              ok: false;
              validation: BalancingSimulationValidationResult;
          };
};

function normalizeNumber(value: number | undefined, fallback = 0): number {
    if (!Number.isFinite(value)) {
        return fallback;
    }

    return value ?? fallback;
}

function normalizeInteger(value: number | undefined, fallback: number): number {
    return Math.floor(normalizeNumber(value, fallback));
}

function normalizeScenarioId(value: string): string {
    return value.trim();
}

function roundToPrecision(value: number, precision = 3): number {
    const scalar = 10 ** precision;
    return Math.round(value * scalar) / scalar;
}

function mergeTotals(
    target: Record<string, number>,
    source: Record<string, number>,
) {
    for (const [key, value] of Object.entries(source)) {
        target[key] = roundToPrecision((target[key] ?? 0) + value);
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyArray(value: unknown): value is unknown[] {
    return Array.isArray(value) && value.length > 0;
}

function isScenarioArray(value: unknown): value is Record<string, unknown>[] {
    return Array.isArray(value) && value.every((entry) => isRecord(entry));
}

function isPresetPayload(
    value: unknown,
): value is BalancingSimulationPresetPayload {
    if (!isRecord(value)) {
        return false;
    }

    if (value.version !== BALANCING_SIMULATOR_PRESET_VERSION) {
        return false;
    }

    if (
        value.combatScenarios !== undefined &&
        !isScenarioArray(value.combatScenarios)
    ) {
        return false;
    }

    if (
        value.economyScenarios !== undefined &&
        !isScenarioArray(value.economyScenarios)
    ) {
        return false;
    }

    return true;
}

function sanitizeCombatScenario(
    scenario: BalancingCombatScenarioPreset,
): BalancingCombatScenarioPreset | null {
    const id = normalizeScenarioId(scenario.id);
    const rounds = Math.max(1, normalizeInteger(scenario.rounds, 1));
    const stepMs = Math.max(1, normalizeInteger(scenario.stepMs, 100));
    const targetMaxHp = Math.max(1, normalizeNumber(scenario.targetMaxHp, 1));
    const hitAmount = Math.max(0, normalizeNumber(scenario.hit?.amount, 0));

    if (!id || hitAmount <= 0) {
        return null;
    }

    return {
        ...scenario,
        id,
        rounds,
        stepMs,
        targetMaxHp,
        attackerId: scenario.attackerId?.trim() || "attacker",
        targetId: scenario.targetId?.trim() || "target",
        hit: {
            amount: hitAmount,
            damageType: scenario.hit.damageType ?? "physical",
            invulnerabilityMs: Math.max(
                0,
                normalizeInteger(scenario.hit.invulnerabilityMs, 0),
            ),
            ignoreInvulnerability: Boolean(scenario.hit.ignoreInvulnerability),
            ...(scenario.hit.knockback
                ? {
                      knockback: {
                          x: normalizeNumber(scenario.hit.knockback.x, 0),
                          y: normalizeNumber(scenario.hit.knockback.y, 0),
                      },
                  }
                : {}),
        },
        targetResistances: scenario.targetResistances ?? {},
    };
}

function sanitizeEconomyScenario(
    scenario: BalancingEconomyScenarioPreset,
): BalancingEconomyScenarioPreset | null {
    const id = normalizeScenarioId(scenario.id);
    const iterations = Math.max(1, normalizeInteger(scenario.iterations, 1));
    const dropRolls = Math.max(1, normalizeInteger(scenario.dropRolls, 1));

    if (
        !id ||
        !scenario.dropTable ||
        !isNonEmptyArray(scenario.dropTable.entries)
    ) {
        return null;
    }

    return {
        ...scenario,
        id,
        iterations,
        dropRolls,
    };
}

export function createBalancingSimulatorService(options?: {
    now?: () => number;
    rng?: () => number;
}): BalancingSimulatorService {
    const now = options?.now ?? (() => Date.now());
    const rng =
        options?.rng ??
        (() => {
            return Math.random();
        });

    const runCombatScenario: BalancingSimulatorService["runCombatScenario"] = (
        input,
    ) => {
        const scenario = sanitizeCombatScenario(input);
        if (!scenario) {
            return null;
        }

        let currentMs = 0;
        const combat = createCombatCoreService({
            now: () => currentMs,
            emit: () => undefined,
        });

        combat.registerCombatant({
            id: scenario.targetId ?? "target",
            maxHp: scenario.targetMaxHp,
            resistances: scenario.targetResistances,
        });

        let roundsSimulated = 0;
        let hitsApplied = 0;
        let hitsBlocked = 0;
        let totalDamage = 0;
        let defeatAtRound: number | null = null;

        for (let round = 1; round <= scenario.rounds; round += 1) {
            roundsSimulated = round;

            const hit = combat.applyHit({
                targetId: scenario.targetId ?? "target",
                sourceId: scenario.attackerId,
                amount: scenario.hit.amount,
                damageType: scenario.hit.damageType,
                invulnerabilityMs: scenario.hit.invulnerabilityMs,
                ignoreInvulnerability: scenario.hit.ignoreInvulnerability,
                knockback: scenario.hit.knockback,
            });

            if (hit.ok) {
                hitsApplied += 1;
                totalDamage += hit.finalAmount;
                if (hit.defeated && defeatAtRound === null) {
                    defeatAtRound = round;
                }
            } else {
                hitsBlocked += 1;
            }

            if (defeatAtRound !== null) {
                break;
            }

            currentMs += scenario.stepMs ?? 100;
        }

        const finalState = combat.getCombatant(scenario.targetId ?? "target");
        const finalTargetHp = Math.max(0, normalizeNumber(finalState?.hp, 0));

        return {
            id: scenario.id,
            label: scenario.label?.trim() || scenario.id,
            roundsPlanned: scenario.rounds,
            roundsSimulated,
            hitsApplied,
            hitsBlocked,
            totalDamage: roundToPrecision(totalDamage),
            averageDamagePerAppliedHit:
                hitsApplied > 0
                    ? roundToPrecision(totalDamage / hitsApplied)
                    : 0,
            finalTargetHp: roundToPrecision(finalTargetHp),
            defeated: finalTargetHp <= 0,
            defeatAtRound,
            totalElapsedMs: roundsSimulated * (scenario.stepMs ?? 100),
        };
    };

    const runEconomyScenario: BalancingSimulatorService["runEconomyScenario"] =
        (input) => {
            const scenario = sanitizeEconomyScenario(input);
            if (!scenario) {
                return null;
            }

            const lootEconomy = createLootEconomyService({
                rng,
                emit: () => undefined,
            });

            const registeredDropTable = lootEconomy.registerDropTable(
                scenario.dropTable,
            );
            if (!registeredDropTable) {
                return null;
            }

            if (scenario.economyTable) {
                const registeredTable = lootEconomy.registerEconomyTable(
                    scenario.economyTable,
                );
                if (!registeredTable) {
                    return null;
                }
            }

            for (const affixPool of scenario.affixPools ?? []) {
                lootEconomy.registerAffixPool(affixPool);
            }

            if (scenario.rewardBundle) {
                const registeredBundle = lootEconomy.registerRewardBundle(
                    scenario.rewardBundle,
                );
                if (!registeredBundle) {
                    return null;
                }
            }

            const quantityByItemId: Record<string, number> = {};
            const currencyTotals: Record<string, number> = {};
            let totalItemsResolved = 0;
            let totalQuantityResolved = 0;
            let totalSellValue = 0;
            let totalBuyValue = 0;

            const applyResolvedItem = (itemId: string, quantity: number) => {
                const normalizedQuantity = Math.max(0, Math.floor(quantity));
                if (!itemId || normalizedQuantity <= 0) {
                    return;
                }

                quantityByItemId[itemId] =
                    (quantityByItemId[itemId] ?? 0) + normalizedQuantity;
                totalQuantityResolved += normalizedQuantity;
                totalItemsResolved += 1;

                if (!scenario.economyTable) {
                    return;
                }

                const quote = lootEconomy.quoteItem(
                    scenario.economyTable.id,
                    itemId,
                );
                if (!quote) {
                    return;
                }

                totalSellValue += quote.sellPrice * normalizedQuantity;
                totalBuyValue += quote.buyPrice * normalizedQuantity;
            };

            for (let index = 0; index < scenario.iterations; index += 1) {
                const roll = lootEconomy.resolveDropTable(
                    scenario.dropTable.id,
                    {
                        rolls: scenario.dropRolls,
                    },
                );

                if (roll) {
                    for (const item of roll.items) {
                        applyResolvedItem(item.itemId, item.quantity);
                    }
                }

                if (!scenario.rewardBundle) {
                    continue;
                }

                const bundle = lootEconomy.resolveRewardBundle(
                    scenario.rewardBundle.id,
                );
                if (!bundle) {
                    continue;
                }

                for (const item of bundle.items) {
                    applyResolvedItem(item.itemId, item.quantity);
                }

                for (const currency of bundle.currencies) {
                    const key = currency.currency.trim() || "currency";
                    currencyTotals[key] = roundToPrecision(
                        (currencyTotals[key] ?? 0) +
                            Math.max(0, normalizeNumber(currency.amount, 0)),
                    );
                }
            }

            return {
                id: scenario.id,
                label: scenario.label?.trim() || scenario.id,
                iterations: scenario.iterations,
                totalItemsResolved,
                totalQuantityResolved,
                uniqueItemCount: Object.keys(quantityByItemId).length,
                quantityByItemId,
                totalSellValue: roundToPrecision(totalSellValue),
                totalBuyValue: roundToPrecision(totalBuyValue),
                averageSellValuePerIteration: roundToPrecision(
                    totalSellValue / scenario.iterations,
                ),
                averageBuyValuePerIteration: roundToPrecision(
                    totalBuyValue / scenario.iterations,
                ),
                currencyTotals,
            };
        };

    const runBatch: BalancingSimulatorService["runBatch"] = (payload) => {
        if (!isPresetPayload(payload)) {
            return null;
        }

        const combatScenarios = payload.combatScenarios ?? [];
        const economyScenarios = payload.economyScenarios ?? [];

        if (combatScenarios.length + economyScenarios.length === 0) {
            return null;
        }

        const combatReports = combatScenarios
            .map((scenario) => runCombatScenario(scenario))
            .filter((report): report is BalancingCombatScenarioReport =>
                Boolean(report),
            );
        const economyReports = economyScenarios
            .map((scenario) => runEconomyScenario(scenario))
            .filter((report): report is BalancingEconomyScenarioReport =>
                Boolean(report),
            );

        if (combatReports.length + economyReports.length === 0) {
            return null;
        }

        const totalCombatDamage = combatReports.reduce(
            (sum, report) => sum + report.totalDamage,
            0,
        );
        const defeatedCount = combatReports.filter(
            (report) => report.defeated,
        ).length;

        const totalEconomyItems = economyReports.reduce(
            (sum, report) => sum + report.totalItemsResolved,
            0,
        );
        const totalEconomyQuantity = economyReports.reduce(
            (sum, report) => sum + report.totalQuantityResolved,
            0,
        );
        const totalSellValue = economyReports.reduce(
            (sum, report) => sum + report.totalSellValue,
            0,
        );
        const totalBuyValue = economyReports.reduce(
            (sum, report) => sum + report.totalBuyValue,
            0,
        );

        const currencyTotals: Record<string, number> = {};
        economyReports.forEach((report) => {
            mergeTotals(currencyTotals, report.currencyTotals);
        });

        return {
            version: BALANCING_SIMULATOR_PRESET_VERSION,
            generatedAtMs: Math.max(0, normalizeNumber(now(), 0)),
            combat: {
                scenarioCount: combatReports.length,
                defeatedCount,
                totalDamage: roundToPrecision(totalCombatDamage),
                averageDamagePerScenario:
                    combatReports.length > 0
                        ? roundToPrecision(
                              totalCombatDamage / combatReports.length,
                          )
                        : 0,
                scenarios: combatReports,
            },
            economy: {
                scenarioCount: economyReports.length,
                totalItemsResolved: totalEconomyItems,
                totalQuantityResolved: totalEconomyQuantity,
                totalSellValue: roundToPrecision(totalSellValue),
                totalBuyValue: roundToPrecision(totalBuyValue),
                averageSellValuePerScenario:
                    economyReports.length > 0
                        ? roundToPrecision(
                              totalSellValue / economyReports.length,
                          )
                        : 0,
                averageBuyValuePerScenario:
                    economyReports.length > 0
                        ? roundToPrecision(
                              totalBuyValue / economyReports.length,
                          )
                        : 0,
                currencyTotals,
                scenarios: economyReports,
            },
        };
    };

    const parsePresetPayload: BalancingSimulatorService["parsePresetPayload"] =
        (raw) => {
            let parsed: unknown;

            try {
                parsed = JSON.parse(raw) as unknown;
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : "Invalid JSON payload.";
                return {
                    ok: false,
                    validation: {
                        ok: false,
                        code: "invalid-json",
                        message: `Invalid JSON: ${message}`,
                    },
                };
            }

            if (!isRecord(parsed)) {
                return {
                    ok: false,
                    validation: {
                        ok: false,
                        code: "invalid-payload",
                        message: "Preset payload must be an object.",
                    },
                };
            }

            if (parsed.version !== BALANCING_SIMULATOR_PRESET_VERSION) {
                return {
                    ok: false,
                    validation: {
                        ok: false,
                        code: "invalid-version",
                        message: `Expected version ${BALANCING_SIMULATOR_PRESET_VERSION}.`,
                    },
                };
            }

            if (!isPresetPayload(parsed)) {
                return {
                    ok: false,
                    validation: {
                        ok: false,
                        code: "invalid-payload",
                        message:
                            "Preset payload requires optional combatScenarios/economyScenarios arrays.",
                    },
                };
            }

            const combatScenarios = parsed.combatScenarios ?? [];
            const economyScenarios = parsed.economyScenarios ?? [];
            if (combatScenarios.length + economyScenarios.length === 0) {
                return {
                    ok: false,
                    validation: {
                        ok: false,
                        code: "invalid-scenarios",
                        message:
                            "At least one combat or economy scenario is required.",
                    },
                };
            }

            return {
                ok: true,
                payload: parsed,
            };
        };

    return {
        runCombatScenario,
        runEconomyScenario,
        runBatch,
        parsePresetPayload,
    };
}

export const balancingSimulator = createBalancingSimulatorService();
