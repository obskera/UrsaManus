import { signalBus } from "@/services/signalBus";

export type LootTier =
    | "common"
    | "uncommon"
    | "rare"
    | "epic"
    | "legendary"
    | (string & {});

export type LootCurrencyReward = {
    currency: string;
    amount: number;
};

export type LootDropEntry = {
    id: string;
    itemId: string;
    weight: number;
    tier?: LootTier;
    minQuantity?: number;
    maxQuantity?: number;
    affixPoolIds?: string[];
    affixRollsMin?: number;
    affixRollsMax?: number;
};

export type LootDropTableDefinition = {
    id: string;
    entries: LootDropEntry[];
    rollsMin?: number;
    rollsMax?: number;
};

export type LootAffixOption = {
    id: string;
    weight: number;
};

export type LootAffixPool = {
    id: string;
    options: LootAffixOption[];
};

export type LootEconomyRow = {
    itemId: string;
    buyPrice: number;
    sellPrice: number;
    currency?: string;
};

export type LootEconomyTableDefinition = {
    id: string;
    rows: LootEconomyRow[];
};

export type LootBundleDropReference = {
    tableId: string;
    rollsMin?: number;
    rollsMax?: number;
};

export type LootBundleItemReward = {
    itemId: string;
    quantity: number;
    tier?: LootTier;
    affixes?: string[];
};

export type LootRewardBundleDefinition = {
    id: string;
    items?: LootBundleItemReward[];
    currencies?: LootCurrencyReward[];
    dropTables?: LootBundleDropReference[];
};

export type LootResolvedItem = {
    itemId: string;
    quantity: number;
    tier: LootTier;
    affixes: string[];
    source: "table" | "bundle";
    sourceId: string;
};

export type LootDropRollResult = {
    tableId: string;
    rolls: number;
    items: LootResolvedItem[];
};

export type LootRewardBundleResult = {
    bundleId: string;
    items: LootResolvedItem[];
    currencies: LootCurrencyReward[];
};

export type LootEconomyQuote = {
    tableId: string;
    itemId: string;
    currency: string;
    buyPrice: number;
    sellPrice: number;
};

export type LootResolveAffixHook = (input: {
    tableId: string;
    entry: LootDropEntry;
    item: LootResolvedItem;
}) => string[];

export type LootEconomyService = {
    registerDropTable: (definition: LootDropTableDefinition) => boolean;
    unregisterDropTable: (tableId: string) => boolean;
    registerAffixPool: (pool: LootAffixPool) => boolean;
    unregisterAffixPool: (poolId: string) => boolean;
    registerEconomyTable: (definition: LootEconomyTableDefinition) => boolean;
    unregisterEconomyTable: (tableId: string) => boolean;
    registerRewardBundle: (definition: LootRewardBundleDefinition) => boolean;
    unregisterRewardBundle: (bundleId: string) => boolean;
    resolveDropTable: (
        tableId: string,
        options?: {
            rolls?: number;
            resolveAffixes?: LootResolveAffixHook;
        },
    ) => LootDropRollResult | null;
    resolveRewardBundle: (
        bundleId: string,
        options?: {
            resolveAffixes?: LootResolveAffixHook;
        },
    ) => LootRewardBundleResult | null;
    quoteItem: (tableId: string, itemId: string) => LootEconomyQuote | null;
    getSnapshot: () => {
        dropTableCount: number;
        affixPoolCount: number;
        economyTableCount: number;
        rewardBundleCount: number;
    };
};

export const LOOT_DROP_RESOLVED_SIGNAL = "loot:drop:resolved";
export const LOOT_BUNDLE_RESOLVED_SIGNAL = "loot:bundle:resolved";
export const LOOT_ECONOMY_TABLE_UPDATED_SIGNAL = "loot:economy:table:updated";

function normalizeInteger(value: number | undefined, fallback: number): number {
    if (!Number.isFinite(value)) {
        return fallback;
    }

    return Math.floor(value ?? fallback);
}

function normalizePositive(
    value: number | undefined,
    fallback: number,
): number {
    if (!Number.isFinite(value)) {
        return fallback;
    }

    return Math.max(0, value ?? fallback);
}

function pickWeightedIndex<T extends { weight: number }>(
    entries: T[],
    rng: () => number,
): number {
    const totalWeight = entries.reduce(
        (sum, entry) => sum + Math.max(0, entry.weight),
        0,
    );

    if (entries.length === 0 || totalWeight <= 0) {
        return -1;
    }

    let cursor = Math.max(0, Math.min(0.999999999, rng())) * totalWeight;
    for (let index = 0; index < entries.length; index += 1) {
        cursor -= Math.max(0, entries[index].weight);
        if (cursor < 0) {
            return index;
        }
    }

    return entries.length - 1;
}

function rollRange(min: number, max: number, rng: () => number): number {
    const low = Math.min(min, max);
    const high = Math.max(min, max);
    if (low === high) {
        return low;
    }

    const value = Math.max(0, Math.min(0.999999999, rng()));
    return low + Math.floor(value * (high - low + 1));
}

export function createLootEconomyService(options?: {
    rng?: () => number;
    emit?: <TPayload>(signal: string, payload: TPayload) => void;
}): LootEconomyService {
    const rng =
        options?.rng ??
        (() => {
            return Math.random();
        });
    const emit =
        options?.emit ??
        (<TPayload>(signal: string, payload: TPayload) => {
            signalBus.emit(signal, payload);
        });

    const dropTablesById = new Map<string, LootDropTableDefinition>();
    const affixPoolsById = new Map<string, LootAffixPool>();
    const economyTablesById = new Map<string, LootEconomyTableDefinition>();
    const rewardBundlesById = new Map<string, LootRewardBundleDefinition>();

    const cloneItem = (item: LootResolvedItem): LootResolvedItem => ({
        ...item,
        affixes: [...item.affixes],
    });

    const normalizeDropEntry = (entry: LootDropEntry): LootDropEntry | null => {
        const id = entry.id.trim();
        const itemId = entry.itemId.trim();

        if (!id || !itemId) {
            return null;
        }

        const minQuantity = Math.max(1, normalizeInteger(entry.minQuantity, 1));
        const maxQuantity = Math.max(
            minQuantity,
            normalizeInteger(entry.maxQuantity, minQuantity),
        );

        return {
            id,
            itemId,
            weight: normalizePositive(entry.weight, 0),
            tier: entry.tier ?? "common",
            minQuantity,
            maxQuantity,
            affixPoolIds: (entry.affixPoolIds ?? [])
                .map((poolId) => poolId.trim())
                .filter(Boolean),
            affixRollsMin: Math.max(
                0,
                normalizeInteger(entry.affixRollsMin, 0),
            ),
            affixRollsMax: Math.max(
                Math.max(0, normalizeInteger(entry.affixRollsMin, 0)),
                normalizeInteger(
                    entry.affixRollsMax,
                    normalizeInteger(entry.affixRollsMin, 0),
                ),
            ),
        };
    };

    const registerDropTable: LootEconomyService["registerDropTable"] = (
        definition,
    ) => {
        const id = definition.id.trim();
        if (!id || definition.entries.length === 0) {
            return false;
        }

        const normalizedEntries: LootDropEntry[] = [];
        const seenEntryIds = new Set<string>();

        for (const entry of definition.entries) {
            const normalized = normalizeDropEntry(entry);
            if (!normalized || seenEntryIds.has(normalized.id)) {
                return false;
            }

            seenEntryIds.add(normalized.id);
            normalizedEntries.push(normalized);
        }

        const rollsMin = Math.max(1, normalizeInteger(definition.rollsMin, 1));
        const rollsMax = Math.max(
            rollsMin,
            normalizeInteger(definition.rollsMax, rollsMin),
        );

        dropTablesById.set(id, {
            id,
            entries: normalizedEntries,
            rollsMin,
            rollsMax,
        });

        return true;
    };

    const unregisterDropTable = (tableId: string): boolean => {
        return dropTablesById.delete(tableId.trim());
    };

    const registerAffixPool: LootEconomyService["registerAffixPool"] = (
        pool,
    ) => {
        const id = pool.id.trim();
        if (!id || pool.options.length === 0) {
            return false;
        }

        const normalizedOptions = pool.options
            .map((option) => ({
                id: option.id.trim(),
                weight: normalizePositive(option.weight, 0),
            }))
            .filter((option) => option.id.length > 0);

        if (normalizedOptions.length === 0) {
            return false;
        }

        affixPoolsById.set(id, {
            id,
            options: normalizedOptions,
        });

        return true;
    };

    const unregisterAffixPool = (poolId: string): boolean => {
        return affixPoolsById.delete(poolId.trim());
    };

    const registerEconomyTable: LootEconomyService["registerEconomyTable"] = (
        definition,
    ) => {
        const id = definition.id.trim();
        if (!id || definition.rows.length === 0) {
            return false;
        }

        const rows = definition.rows
            .map((row) => ({
                itemId: row.itemId.trim(),
                buyPrice: Math.max(0, normalizeInteger(row.buyPrice, 0)),
                sellPrice: Math.max(0, normalizeInteger(row.sellPrice, 0)),
                currency: row.currency?.trim() || "gold",
            }))
            .filter((row) => row.itemId.length > 0);

        if (rows.length === 0) {
            return false;
        }

        economyTablesById.set(id, { id, rows });
        emit(LOOT_ECONOMY_TABLE_UPDATED_SIGNAL, {
            tableId: id,
            rowCount: rows.length,
        });

        return true;
    };

    const unregisterEconomyTable = (tableId: string): boolean => {
        return economyTablesById.delete(tableId.trim());
    };

    const registerRewardBundle: LootEconomyService["registerRewardBundle"] = (
        definition,
    ) => {
        const id = definition.id.trim();
        if (!id) {
            return false;
        }

        const items = (definition.items ?? [])
            .map((item) => ({
                itemId: item.itemId.trim(),
                quantity: Math.max(1, normalizeInteger(item.quantity, 1)),
                tier: item.tier ?? "common",
                affixes: (item.affixes ?? [])
                    .map((affix) => affix.trim())
                    .filter(Boolean),
            }))
            .filter((item) => item.itemId.length > 0);

        const currencies = (definition.currencies ?? [])
            .map((currency) => ({
                currency: currency.currency.trim(),
                amount: Math.max(0, normalizeInteger(currency.amount, 0)),
            }))
            .filter(
                (currency) =>
                    currency.currency.length > 0 && currency.amount > 0,
            );

        const dropTables = (definition.dropTables ?? [])
            .map((reference) => ({
                tableId: reference.tableId.trim(),
                rollsMin: Math.max(1, normalizeInteger(reference.rollsMin, 1)),
                rollsMax: Math.max(
                    Math.max(1, normalizeInteger(reference.rollsMin, 1)),
                    normalizeInteger(
                        reference.rollsMax,
                        Math.max(1, normalizeInteger(reference.rollsMin, 1)),
                    ),
                ),
            }))
            .filter((reference) => reference.tableId.length > 0);

        if (
            items.length === 0 &&
            currencies.length === 0 &&
            dropTables.length === 0
        ) {
            return false;
        }

        rewardBundlesById.set(id, {
            id,
            items,
            currencies,
            dropTables,
        });

        return true;
    };

    const unregisterRewardBundle = (bundleId: string): boolean => {
        return rewardBundlesById.delete(bundleId.trim());
    };

    const resolveAffixesForEntry = (
        tableId: string,
        entry: LootDropEntry,
        baseItem: LootResolvedItem,
        resolveAffixes?: LootResolveAffixHook,
    ): string[] => {
        const hookResult = resolveAffixes?.({
            tableId,
            entry,
            item: cloneItem(baseItem),
        });

        if (hookResult && hookResult.length > 0) {
            return hookResult.map((affix) => affix.trim()).filter(Boolean);
        }

        const requestedRolls = rollRange(
            Math.max(0, entry.affixRollsMin ?? 0),
            Math.max(0, entry.affixRollsMax ?? entry.affixRollsMin ?? 0),
            rng,
        );

        if (requestedRolls <= 0 || (entry.affixPoolIds?.length ?? 0) === 0) {
            return [];
        }

        const selected: string[] = [];
        const seen = new Set<string>();

        for (let roll = 0; roll < requestedRolls; roll += 1) {
            const poolId =
                entry.affixPoolIds?.[roll % entry.affixPoolIds.length];
            if (!poolId) {
                continue;
            }

            const pool = affixPoolsById.get(poolId);
            if (!pool) {
                continue;
            }

            const index = pickWeightedIndex(pool.options, rng);
            if (index < 0) {
                continue;
            }

            const affixId = pool.options[index].id;
            if (seen.has(affixId)) {
                continue;
            }

            seen.add(affixId);
            selected.push(affixId);
        }

        return selected;
    };

    const resolveDropTable: LootEconomyService["resolveDropTable"] = (
        tableId,
        options,
    ) => {
        const id = tableId.trim();
        const table = dropTablesById.get(id);
        if (!table) {
            return null;
        }

        const rolls = options?.rolls
            ? Math.max(1, normalizeInteger(options.rolls, 1))
            : rollRange(
                  table.rollsMin ?? 1,
                  table.rollsMax ?? table.rollsMin ?? 1,
                  rng,
              );

        const items: LootResolvedItem[] = [];

        for (let roll = 0; roll < rolls; roll += 1) {
            const chosenIndex = pickWeightedIndex(table.entries, rng);
            if (chosenIndex < 0) {
                continue;
            }

            const entry = table.entries[chosenIndex];
            const quantity = rollRange(
                Math.max(1, entry.minQuantity ?? 1),
                Math.max(1, entry.maxQuantity ?? entry.minQuantity ?? 1),
                rng,
            );

            const baseItem: LootResolvedItem = {
                itemId: entry.itemId,
                quantity,
                tier: entry.tier ?? "common",
                affixes: [],
                source: "table",
                sourceId: id,
            };

            const affixes = resolveAffixesForEntry(
                id,
                entry,
                baseItem,
                options?.resolveAffixes,
            );

            items.push({
                ...baseItem,
                affixes,
            });
        }

        const result: LootDropRollResult = {
            tableId: id,
            rolls,
            items,
        };

        emit(LOOT_DROP_RESOLVED_SIGNAL, {
            tableId: result.tableId,
            rolls: result.rolls,
            itemCount: result.items.length,
        });

        return {
            ...result,
            items: result.items.map((item) => cloneItem(item)),
        };
    };

    const mergeCurrencies = (
        entries: LootCurrencyReward[],
    ): LootCurrencyReward[] => {
        const amountsByCurrency = new Map<string, number>();

        for (const entry of entries) {
            const currency = entry.currency.trim();
            if (!currency) {
                continue;
            }

            amountsByCurrency.set(
                currency,
                (amountsByCurrency.get(currency) ?? 0) +
                    Math.max(0, entry.amount),
            );
        }

        return Array.from(amountsByCurrency.entries())
            .map(([currency, amount]) => ({ currency, amount }))
            .sort((left, right) => left.currency.localeCompare(right.currency));
    };

    const resolveRewardBundle: LootEconomyService["resolveRewardBundle"] = (
        bundleId,
        options,
    ) => {
        const id = bundleId.trim();
        const bundle = rewardBundlesById.get(id);
        if (!bundle) {
            return null;
        }

        const items: LootResolvedItem[] = (bundle.items ?? []).map((item) => ({
            itemId: item.itemId,
            quantity: item.quantity,
            tier: item.tier ?? "common",
            affixes: [...(item.affixes ?? [])],
            source: "bundle",
            sourceId: id,
        }));

        for (const dropReference of bundle.dropTables ?? []) {
            const rolls = rollRange(
                dropReference.rollsMin ?? 1,
                dropReference.rollsMax ?? dropReference.rollsMin ?? 1,
                rng,
            );
            const tableResult = resolveDropTable(dropReference.tableId, {
                rolls,
                resolveAffixes: options?.resolveAffixes,
            });
            if (!tableResult) {
                continue;
            }

            items.push(...tableResult.items.map((item) => cloneItem(item)));
        }

        const currencies = mergeCurrencies(bundle.currencies ?? []);

        const result: LootRewardBundleResult = {
            bundleId: id,
            items,
            currencies,
        };

        emit(LOOT_BUNDLE_RESOLVED_SIGNAL, {
            bundleId: result.bundleId,
            itemCount: result.items.length,
            currencyCount: result.currencies.length,
        });

        return {
            ...result,
            items: result.items.map((item) => cloneItem(item)),
            currencies: result.currencies.map((currency) => ({ ...currency })),
        };
    };

    const quoteItem = (
        tableId: string,
        itemId: string,
    ): LootEconomyQuote | null => {
        const table = economyTablesById.get(tableId.trim());
        if (!table) {
            return null;
        }

        const row = table.rows.find((entry) => entry.itemId === itemId.trim());
        if (!row) {
            return null;
        }

        return {
            tableId: table.id,
            itemId: row.itemId,
            currency: row.currency?.trim() || "gold",
            buyPrice: row.buyPrice,
            sellPrice: row.sellPrice,
        };
    };

    const getSnapshot = () => {
        return {
            dropTableCount: dropTablesById.size,
            affixPoolCount: affixPoolsById.size,
            economyTableCount: economyTablesById.size,
            rewardBundleCount: rewardBundlesById.size,
        };
    };

    return {
        registerDropTable,
        unregisterDropTable,
        registerAffixPool,
        unregisterAffixPool,
        registerEconomyTable,
        unregisterEconomyTable,
        registerRewardBundle,
        unregisterRewardBundle,
        resolveDropTable,
        resolveRewardBundle,
        quoteItem,
        getSnapshot,
    };
}

export const lootEconomy = createLootEconomyService();
