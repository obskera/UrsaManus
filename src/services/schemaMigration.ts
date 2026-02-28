type UnknownRecord = Record<string, unknown>;

export type SchemaMigrationFailureCode =
    | "invalid-payload"
    | "unsupported-version"
    | "migration-failed";

export type SchemaMigrationFailure = {
    ok: false;
    code: SchemaMigrationFailureCode;
    version: number | null;
    message: string;
};

export type SchemaMigrationSuccess<TCurrent> = {
    ok: true;
    version: number;
    value: TCurrent;
    appliedVersions: number[];
};

export type SchemaMigrationResult<TCurrent> =
    | SchemaMigrationSuccess<TCurrent>
    | SchemaMigrationFailure;

export type SchemaMigrationStep = (payload: unknown) => unknown;

export type VersionedSchemaMigrationOptions<TCurrent> = {
    currentVersion: number;
    validateCurrent: (payload: unknown) => payload is TCurrent;
    migrations?: Record<number, SchemaMigrationStep>;
};

const isRecord = (value: unknown): value is UnknownRecord => {
    return typeof value === "object" && value !== null;
};

const readVersion = (payload: unknown): number | null => {
    if (!isRecord(payload)) {
        return null;
    }

    const version = payload.version;
    if (typeof version !== "number" || !Number.isFinite(version)) {
        return null;
    }

    return Math.floor(version);
};

export function createVersionedSchemaMigration<TCurrent>(
    options: VersionedSchemaMigrationOptions<TCurrent>,
) {
    const migrations = options.migrations ?? {};

    const preflight = (payload: unknown): SchemaMigrationResult<TCurrent> => {
        const version = readVersion(payload);
        if (version === null) {
            return {
                ok: false,
                code: "invalid-payload",
                version: null,
                message: "Schema payload must include a numeric version.",
            };
        }

        if (version > options.currentVersion) {
            return {
                ok: false,
                code: "unsupported-version",
                version,
                message: `Schema version ${version} is newer than supported ${options.currentVersion}.`,
            };
        }

        let cursorVersion = version;
        while (cursorVersion < options.currentVersion) {
            if (!migrations[cursorVersion]) {
                return {
                    ok: false,
                    code: "unsupported-version",
                    version,
                    message: `No migration path from version ${cursorVersion} to ${cursorVersion + 1}.`,
                };
            }

            cursorVersion += 1;
        }

        if (
            version === options.currentVersion &&
            !options.validateCurrent(payload)
        ) {
            return {
                ok: false,
                code: "invalid-payload",
                version,
                message: `Schema payload for version ${version} failed validation.`,
            };
        }

        return {
            ok: true,
            version,
            value:
                options.validateCurrent(payload) &&
                version === options.currentVersion
                    ? payload
                    : (payload as TCurrent),
            appliedVersions: [],
        };
    };

    const migrate = (payload: unknown): SchemaMigrationResult<TCurrent> => {
        const preflightResult = preflight(payload);
        if (!preflightResult.ok) {
            return preflightResult;
        }

        const sourceVersion = readVersion(payload);
        if (sourceVersion === null) {
            return {
                ok: false,
                code: "invalid-payload",
                version: null,
                message: "Schema payload must include a numeric version.",
            };
        }

        let currentPayload = payload;
        let currentVersion = sourceVersion;
        const appliedVersions: number[] = [];

        while (currentVersion < options.currentVersion) {
            const step = migrations[currentVersion];
            if (!step) {
                return {
                    ok: false,
                    code: "unsupported-version",
                    version: sourceVersion,
                    message: `No migration path from version ${currentVersion} to ${currentVersion + 1}.`,
                };
            }

            try {
                currentPayload = step(currentPayload);
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : "Unknown error";
                return {
                    ok: false,
                    code: "migration-failed",
                    version: sourceVersion,
                    message: `Migration ${currentVersion} -> ${currentVersion + 1} failed: ${message}`,
                };
            }

            currentVersion += 1;
            appliedVersions.push(currentVersion);
        }

        if (!options.validateCurrent(currentPayload)) {
            return {
                ok: false,
                code: "invalid-payload",
                version: sourceVersion,
                message: `Migrated payload failed validation for version ${options.currentVersion}.`,
            };
        }

        return {
            ok: true,
            version: sourceVersion,
            value: currentPayload,
            appliedVersions,
        };
    };

    return {
        preflight,
        migrate,
    };
}
