import { execSync } from "child_process";

const parseArg = (flag: string): string | undefined => {
    const index = process.argv.findIndex((entry) => entry === flag);
    if (index < 0) {
        return undefined;
    }

    return process.argv[index + 1];
};

const parseBooleanArg = (flag: string, defaultValue: boolean): boolean => {
    const value = parseArg(flag);
    if (value === undefined) {
        return defaultValue;
    }

    return value !== "false";
};

const runGit = (command: string): string => {
    return execSync(command, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
    }).trim();
};

const resolveBaseRef = (): string | undefined => {
    const explicit = parseArg("--base-ref");
    if (explicit) {
        return explicit;
    }

    try {
        return runGit("git describe --tags --abbrev=0 HEAD^");
    } catch {
        return undefined;
    }
};

const normalizeChangedFiles = (raw: string): string[] => {
    return raw
        .split("\n")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
};

const SCHEMA_INDICATOR_PATHS = [
    "src/services/tileMapPlacement.ts",
    "src/services/tileMapRuntimeBootstrap.ts",
    "src/services/bgmRuntimeBootstrap.ts",
    "src/components/examples/TileMapPlacementToolExample.tsx",
    "src/components/examples/BgmComposerToolExample.tsx",
    "src/tests/contracts/fixtures/tilemap-golden.json",
    "src/tests/contracts/fixtures/bgm-golden.json",
    "docs/tools/TILEMAP_TOOL.md",
    "docs/tools/BGM_JSON_SPEC.md",
    "docs/tools/PAYLOAD_FIELD_ORDER.md",
] as const;

const migrationDocPath =
    parseArg("--migration-doc") ?? "docs/tools/SCHEMA_MIGRATION_NOTES.md";
const compatibilityDocPath =
    parseArg("--compatibility-doc") ?? "docs/tools/TOOL_COMPATIBILITY_NOTES.md";
const headRef = parseArg("--head-ref") ?? "HEAD";
const baseRef = resolveBaseRef();
const requireBaseRef = parseBooleanArg("--require-base-ref", false);

if (!baseRef) {
    if (requireBaseRef) {
        console.error(
            "Schema guard failed: unable to resolve base ref. Provide --base-ref explicitly.",
        );
        process.exit(1);
    }

    console.log(
        "Schema guard skipped: no previous tag/reference available (first release path).",
    );
    process.exit(0);
}

const diffRange = `${baseRef}..${headRef}`;
let changedFiles: string[] = [];

try {
    changedFiles = normalizeChangedFiles(
        runGit(`git diff --name-only ${diffRange}`),
    );
} catch {
    console.error(
        `Schema guard failed: unable to resolve changed files for range ${diffRange}.`,
    );
    process.exit(1);
}

const schemaChanges = changedFiles.filter((filePath) =>
    SCHEMA_INDICATOR_PATHS.includes(
        filePath as (typeof SCHEMA_INDICATOR_PATHS)[number],
    ),
);

if (schemaChanges.length === 0) {
    console.log(
        `Schema guard passed: no tool schema indicator changes detected in ${diffRange}.`,
    );
    process.exit(0);
}

const migrationDocUpdated = changedFiles.includes(migrationDocPath);
const compatibilityDocUpdated = changedFiles.includes(compatibilityDocPath);

if (!migrationDocUpdated || !compatibilityDocUpdated) {
    const missingDocs = [
        ...(migrationDocUpdated ? [] : [migrationDocPath]),
        ...(compatibilityDocUpdated ? [] : [compatibilityDocPath]),
    ];

    console.error("Schema guard failed: tool schema changes detected.");
    console.error(`Diff range: ${diffRange}`);
    console.error(`Changed schema indicators: ${schemaChanges.join(", ")}`);
    console.error(`Required updated docs missing: ${missingDocs.join(", ")}`);
    console.error(
        "Update migration notes and compatibility notes before release promotion.",
    );
    process.exit(1);
}

console.log(
    `Schema guard passed: schema indicators changed (${schemaChanges.length}) and required docs were updated.`,
);
