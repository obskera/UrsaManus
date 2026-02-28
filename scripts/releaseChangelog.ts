import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type CliOptions = {
    version?: string;
    fromTag?: string;
    toRef: string;
    changelogPath: string;
    notesPath: string;
};

type CommitGroups = {
    features: string[];
    fixes: string[];
    improvements: string[];
    maintenance: string[];
    other: string[];
};

function parseArgs(argv: string[]): CliOptions {
    const options: CliOptions = {
        toRef: "HEAD",
        changelogPath: path.resolve("CHANGELOG.md"),
        notesPath: path.resolve("release-notes.md"),
    };

    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (token === "--version") {
            options.version = argv[index + 1]?.trim();
            index += 1;
            continue;
        }

        if (token === "--from") {
            options.fromTag = argv[index + 1]?.trim();
            index += 1;
            continue;
        }

        if (token === "--to") {
            options.toRef = argv[index + 1]?.trim() || "HEAD";
            index += 1;
            continue;
        }

        if (token === "--changelog") {
            const value = argv[index + 1]?.trim();
            if (value) {
                options.changelogPath = path.resolve(value);
            }
            index += 1;
            continue;
        }

        if (token === "--notes") {
            const value = argv[index + 1]?.trim();
            if (value) {
                options.notesPath = path.resolve(value);
            }
            index += 1;
        }
    }

    return options;
}

function isSemver(value: string): boolean {
    return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(
        value,
    );
}

function runGit(args: string[]): string {
    return execFileSync("git", args, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
    }).trim();
}

async function getPackageVersion(): Promise<string> {
    const raw = await readFile(path.resolve("package.json"), "utf8");
    const parsed = JSON.parse(raw) as { version?: unknown };
    if (typeof parsed.version !== "string" || !parsed.version.trim()) {
        throw new Error("package.json must include a non-empty version.");
    }

    return parsed.version.trim();
}

function classifyCommits(subjects: string[]): CommitGroups {
    const groups: CommitGroups = {
        features: [],
        fixes: [],
        improvements: [],
        maintenance: [],
        other: [],
    };

    for (const subject of subjects) {
        const normalized = subject.trim();
        if (!normalized) {
            continue;
        }

        if (/^feat(?:\(.+\))?:/i.test(normalized)) {
            groups.features.push(normalized);
            continue;
        }

        if (/^fix(?:\(.+\))?:/i.test(normalized)) {
            groups.fixes.push(normalized);
            continue;
        }

        if (/^(perf|refactor)(?:\(.+\))?:/i.test(normalized)) {
            groups.improvements.push(normalized);
            continue;
        }

        if (/^(docs|chore|build|ci|test)(?:\(.+\))?:/i.test(normalized)) {
            groups.maintenance.push(normalized);
            continue;
        }

        groups.other.push(normalized);
    }

    return groups;
}

function renderSection(title: string, values: string[]): string {
    if (values.length === 0) {
        return "";
    }

    const lines = values.map((value) => `- ${value}`);
    return [`### ${title}`, "", ...lines, ""].join("\n");
}

function renderReleaseNotes(input: {
    version: string;
    dateLabel: string;
    compareRange: string;
    groups: CommitGroups;
}): string {
    const sections = [
        renderSection("Features", input.groups.features),
        renderSection("Fixes", input.groups.fixes),
        renderSection("Improvements", input.groups.improvements),
        renderSection("Maintenance", input.groups.maintenance),
        renderSection("Other", input.groups.other),
    ].filter(Boolean);

    const fallback =
        sections.length === 0
            ? "### Notes\n\n- No user-facing commit summaries were detected for this range.\n"
            : sections.join("\n");

    return [
        `## v${input.version} - ${input.dateLabel}`,
        "",
        `Compare: ${input.compareRange}`,
        "",
        fallback.trimEnd(),
        "",
    ].join("\n");
}

function prependChangelog(existing: string, addition: string): string {
    if (!existing.trim()) {
        return [`# Changelog`, "", addition.trimEnd(), ""].join("\n");
    }

    const normalized = existing.replace(/\r\n/g, "\n");
    if (normalized.startsWith("# Changelog")) {
        const remainder = normalized.slice("# Changelog".length).trimStart();
        return [`# Changelog`, "", addition.trimEnd(), "", remainder].join(
            "\n",
        );
    }

    return ["# Changelog", "", addition.trimEnd(), "", normalized].join("\n");
}

async function main(): Promise<void> {
    const options = parseArgs(globalThis.process.argv.slice(2));
    const packageVersion = await getPackageVersion();
    const version = (options.version ?? packageVersion).trim();

    if (!isSemver(version)) {
        throw new Error(`Invalid semantic version: "${version}".`);
    }

    if (options.version && options.version !== packageVersion) {
        throw new Error(
            `Version mismatch: package.json=${packageVersion}, --version=${options.version}.`,
        );
    }

    const currentTag = `v${version}`;
    const tagsRaw = runGit(["tag", "--list", "v*.*.*", "--sort=-v:refname"]);
    const tags = tagsRaw
        .split("\n")
        .map((tag) => tag.trim())
        .filter(Boolean);

    const fromTag =
        options.fromTag ?? tags.find((tag) => tag !== currentTag) ?? undefined;
    const toRef = options.toRef || "HEAD";
    const range = fromTag ? `${fromTag}..${toRef}` : toRef;

    const subjectsRaw = runGit([
        "log",
        "--no-merges",
        "--pretty=format:%s",
        range,
    ]);
    const subjects = subjectsRaw
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

    const notes = renderReleaseNotes({
        version,
        dateLabel: new Date().toISOString().slice(0, 10),
        compareRange: fromTag ? `${fromTag}...${toRef}` : toRef,
        groups: classifyCommits(subjects),
    });

    let existingChangelog = "";
    try {
        existingChangelog = await readFile(options.changelogPath, "utf8");
    } catch {
        existingChangelog = "";
    }

    await writeFile(options.notesPath, notes, "utf8");
    await writeFile(
        options.changelogPath,
        prependChangelog(existingChangelog, notes),
        "utf8",
    );

    console.log(`Release notes written: ${options.notesPath}`);
    console.log(`Changelog updated: ${options.changelogPath}`);
}

main().catch((error) => {
    const message =
        error instanceof Error
            ? error.message
            : "Unknown changelog generation failure.";
    console.error(`Release changelog generation failed: ${message}`);
    globalThis.process.exitCode = 1;
});
