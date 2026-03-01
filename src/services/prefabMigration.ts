import {
    PREFAB_BLUEPRINT_VERSION,
    type PrefabBlueprint,
    type PrefabBuilderModule,
} from "@/services/prefabCore";
import { createVersionedSchemaMigration } from "@/services/schemaMigration";

type LegacyModuleV0 = {
    id?: unknown;
    moduleId?: unknown;
    config?: unknown;
};

type LegacyPrefabBlueprintV0 = {
    version: 0;
    id?: unknown;
    domain?: unknown;
    modules?: unknown;
    metadata?: unknown;
};

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function toConfig(value: unknown): Record<string, unknown> {
    if (!isObject(value)) {
        return {};
    }

    const next: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort((left, right) =>
        left.localeCompare(right),
    )) {
        next[key] = value[key];
    }

    return next;
}

function normalizeToVersionedPayload(payload: unknown): unknown {
    if (!isObject(payload)) {
        return payload;
    }

    const version = payload.version;
    if (version === PREFAB_BLUEPRINT_VERSION) {
        return {
            ...payload,
            version: 1,
        };
    }

    if (version === 1 || version === 0) {
        return payload;
    }

    if (version === undefined || version === null) {
        return {
            ...payload,
            version: 0,
        };
    }

    return payload;
}

function validateCurrent(payload: unknown): payload is {
    version: 1;
    id: string;
    domain: string;
    modules: PrefabBuilderModule[];
    metadata?: Record<string, unknown>;
} {
    if (!isObject(payload)) {
        return false;
    }

    if (payload.version !== 1) {
        return false;
    }

    if (typeof payload.id !== "string" || !payload.id.trim()) {
        return false;
    }

    if (typeof payload.domain !== "string" || !payload.domain.trim()) {
        return false;
    }

    if (!Array.isArray(payload.modules)) {
        return false;
    }

    for (const moduleEntry of payload.modules) {
        if (!isObject(moduleEntry)) {
            return false;
        }

        if (
            typeof moduleEntry.moduleId !== "string" ||
            !moduleEntry.moduleId.trim()
        ) {
            return false;
        }

        if (!isObject(moduleEntry.config)) {
            return false;
        }
    }

    if (payload.metadata !== undefined && !isObject(payload.metadata)) {
        return false;
    }

    return true;
}

const migration = createVersionedSchemaMigration<{
    version: 1;
    id: string;
    domain: string;
    modules: PrefabBuilderModule[];
    metadata?: Record<string, unknown>;
}>({
    currentVersion: 1,
    validateCurrent,
    migrations: {
        0: (payload) => {
            const source = payload as LegacyPrefabBlueprintV0;
            const id = String(source.id ?? "").trim();
            const domain = String(source.domain ?? "").trim();
            const modules: PrefabBuilderModule[] = Array.isArray(source.modules)
                ? source.modules
                      .map((entry) => {
                          const raw = entry as LegacyModuleV0;
                          const moduleId = String(
                              raw.moduleId ?? raw.id ?? "",
                          ).trim();
                          if (!moduleId) {
                              return null;
                          }

                          return {
                              moduleId,
                              config: toConfig(raw.config),
                          };
                      })
                      .filter(
                          (moduleEntry): moduleEntry is PrefabBuilderModule =>
                              Boolean(moduleEntry),
                      )
                : [];

            return {
                version: 1,
                id,
                domain,
                modules,
                ...(isObject(source.metadata)
                    ? { metadata: toConfig(source.metadata) }
                    : {}),
            };
        },
    },
});

export type PrefabMigrationResult = ReturnType<typeof migration.migrate>;
export type PrefabMigrationPreflightResult = ReturnType<
    typeof migration.preflight
>;

export function preflightPrefabBlueprintMigration(
    payload: unknown,
): PrefabMigrationPreflightResult {
    return migration.preflight(normalizeToVersionedPayload(payload));
}

export function migratePrefabBlueprint(
    payload: unknown,
): PrefabMigrationResult {
    return migration.migrate(normalizeToVersionedPayload(payload));
}

export function toCurrentPrefabBlueprint(
    result: PrefabMigrationResult,
): PrefabBlueprint | null {
    if (!result.ok) {
        return null;
    }

    return {
        version: PREFAB_BLUEPRINT_VERSION,
        id: result.value.id,
        domain: result.value.domain,
        modules: result.value.modules,
        ...(result.value.metadata ? { metadata: result.value.metadata } : {}),
    };
}

export function preflightMigratablePrefabBlueprint(payload: unknown): {
    ok: boolean;
    requiresMigration: boolean;
    message: string | null;
} {
    const preflight = preflightPrefabBlueprintMigration(payload);
    if (!preflight.ok) {
        return {
            ok: false,
            requiresMigration: false,
            message: preflight.message,
        };
    }

    return {
        ok: true,
        requiresMigration: preflight.version < 1,
        message: null,
    };
}
