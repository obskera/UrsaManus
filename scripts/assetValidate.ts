import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { validateAssetPipeline } from "../src/services/assetValidation";

type CliOptions = {
    files: string[];
    allowEmpty: boolean;
    json: boolean;
    pretty: boolean;
    maxTotalBytes?: number;
    maxSpriteBytes?: number;
    maxAudioBytes?: number;
    maxAtlasBytes?: number;
};

const SOURCE_EXTENSIONS = new Set([
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
]);

const ASSET_EXTENSIONS = new Set([
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".svg",
    ".wav",
    ".mp3",
    ".ogg",
    ".m4a",
    ".atlas",
    ".pack",
    ".plist",
    ".json",
]);

function normalizePath(input: string): string {
    return input.replaceAll("\\", "/");
}

function toRelativePath(filePath: string): string {
    return normalizePath(path.relative(globalThis.process.cwd(), filePath));
}

function parseNumericArg(value: string | undefined): number | undefined {
    if (!value) {
        return undefined;
    }

    const numeric = Number.parseInt(value, 10);
    if (!Number.isFinite(numeric) || numeric < 0) {
        return undefined;
    }

    return Math.floor(numeric);
}

function parseArgs(argv: string[]): CliOptions {
    const options: CliOptions = {
        files: [],
        allowEmpty: false,
        json: false,
        pretty: false,
    };

    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (token === "--allow-empty") {
            options.allowEmpty = true;
            continue;
        }

        if (token === "--json") {
            options.json = true;
            continue;
        }

        if (token === "--pretty") {
            options.pretty = true;
            continue;
        }

        if (token === "--max-total-bytes") {
            options.maxTotalBytes = parseNumericArg(argv[index + 1]);
            index += 1;
            continue;
        }

        if (token === "--max-sprite-bytes") {
            options.maxSpriteBytes = parseNumericArg(argv[index + 1]);
            index += 1;
            continue;
        }

        if (token === "--max-audio-bytes") {
            options.maxAudioBytes = parseNumericArg(argv[index + 1]);
            index += 1;
            continue;
        }

        if (token === "--max-atlas-bytes") {
            options.maxAtlasBytes = parseNumericArg(argv[index + 1]);
            index += 1;
            continue;
        }

        options.files.push(path.resolve(token));
    }

    return options;
}

async function collectFiles(
    rootPath: string,
    predicate: (absolutePath: string) => boolean,
): Promise<string[]> {
    let entries;
    try {
        entries = await readdir(rootPath, { withFileTypes: true });
    } catch {
        return [];
    }

    const files: string[] = [];
    for (const entry of entries) {
        const absolutePath = path.join(rootPath, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await collectFiles(absolutePath, predicate)));
            continue;
        }

        if (entry.isFile() && predicate(absolutePath)) {
            files.push(absolutePath);
        }
    }

    return files;
}

function getExtension(filePath: string): string {
    return path.extname(filePath).toLowerCase();
}

function isSourceFileCandidate(filePath: string): boolean {
    const normalized = normalizePath(filePath).toLowerCase();
    if (normalized.includes("/src/tests/")) {
        return false;
    }

    const fileName = normalized.split("/").pop() ?? "";
    if (
        fileName.includes(".test.") ||
        fileName.includes(".spec.") ||
        fileName.endsWith(".d.ts")
    ) {
        return false;
    }

    return SOURCE_EXTENSIONS.has(getExtension(normalized));
}

function isAtlasJsonFile(filePath: string): boolean {
    const normalized = normalizePath(filePath).toLowerCase();
    if (!normalized.endsWith(".json")) {
        return false;
    }

    const filename = normalized.split("/").pop() ?? "";
    return filename.includes("atlas") || filename.includes("spritesheet");
}

async function resolveSourceFiles(options: CliOptions): Promise<string[]> {
    if (options.files.length > 0) {
        return options.files;
    }

    const cwd = globalThis.process.cwd();
    const sourceRoots = [path.join(cwd, "src"), path.join(cwd, "scripts")];
    const discovered = new Set<string>();

    for (const rootPath of sourceRoots) {
        const files = await collectFiles(rootPath, (absolutePath) =>
            isSourceFileCandidate(absolutePath),
        );
        files.forEach((filePath) => discovered.add(filePath));
    }

    return Array.from(discovered).sort((left, right) =>
        left.localeCompare(right),
    );
}

async function resolveAssetFiles(): Promise<
    Array<{ filePath: string; bytes: number }>
> {
    const cwd = globalThis.process.cwd();
    const assetRoots = [
        path.join(cwd, "public"),
        path.join(cwd, "src", "assets"),
    ];
    const discovered = new Set<string>();

    for (const rootPath of assetRoots) {
        const files = await collectFiles(rootPath, (absolutePath) => {
            const extension = getExtension(absolutePath);
            return (
                ASSET_EXTENSIONS.has(extension) || isAtlasJsonFile(absolutePath)
            );
        });
        files.forEach((filePath) => discovered.add(filePath));
    }

    const summaries: Array<{ filePath: string; bytes: number }> = [];
    const sortedPaths = Array.from(discovered).sort((left, right) =>
        left.localeCompare(right),
    );

    for (const filePath of sortedPaths) {
        const metadata = await stat(filePath);
        summaries.push({
            filePath,
            bytes: metadata.size,
        });
    }

    return summaries;
}

async function main(): Promise<void> {
    const options = parseArgs(globalThis.process.argv.slice(2));
    const sourceFiles = await resolveSourceFiles(options);

    if (sourceFiles.length === 0) {
        if (options.allowEmpty) {
            console.log(
                "No source files found for asset validation; skipping (--allow-empty).",
            );
            return;
        }

        console.error(
            "No source files found for asset validation. Provide source files or ensure src/ and scripts/ exist.",
        );
        globalThis.process.exitCode = 1;
        return;
    }

    const sourcePayload = await Promise.all(
        sourceFiles.map(async (filePath) => {
            const content = await readFile(filePath, "utf8");
            return {
                filePath: toRelativePath(filePath),
                content,
            };
        }),
    );

    const assetPayload = (await resolveAssetFiles()).map((asset) => ({
        filePath: toRelativePath(asset.filePath),
        bytes: asset.bytes,
    }));

    if (assetPayload.length === 0 && !options.allowEmpty) {
        console.error(
            "No assets discovered under public/ or src/assets/. Use --allow-empty to skip.",
        );
        globalThis.process.exitCode = 1;
        return;
    }

    const report = validateAssetPipeline({
        sourceFiles: sourcePayload,
        assetFiles: assetPayload,
        budgets: {
            ...(options.maxTotalBytes !== undefined
                ? {
                      maxTotalBytes: options.maxTotalBytes,
                  }
                : {}),
            ...(options.maxSpriteBytes !== undefined
                ? {
                      maxSpriteBytes: options.maxSpriteBytes,
                  }
                : {}),
            ...(options.maxAudioBytes !== undefined
                ? {
                      maxAudioBytes: options.maxAudioBytes,
                  }
                : {}),
            ...(options.maxAtlasBytes !== undefined
                ? {
                      maxAtlasBytes: options.maxAtlasBytes,
                  }
                : {}),
        },
    });

    if (options.json) {
        console.log(JSON.stringify(report, null, options.pretty ? 2 : 0));
    } else {
        if (report.ok) {
            console.log(
                `Asset validation passed (${report.summary.assetFileCount} assets, ${report.summary.totalAssetBytes} bytes total).`,
            );
        } else {
            report.issues.forEach((issue) => {
                console.error(`- ${issue.path}: ${issue.message}`);
            });
            console.error(
                `Asset validation failed (${report.issues.length} issue(s) across ${report.summary.assetFileCount} assets).`,
            );
        }

        console.log(
            `Budgets: total<=${report.budgets.maxTotalBytes}, sprite<=${report.budgets.maxSpriteBytes}, audio<=${report.budgets.maxAudioBytes}, atlas<=${report.budgets.maxAtlasBytes}`,
        );
        console.log(
            `Usage: total=${report.summary.totalAssetBytes}, sprite=${report.summary.spriteBytes}, audio=${report.summary.audioBytes}, atlas=${report.summary.atlasBytes}`,
        );
    }

    if (!report.ok) {
        globalThis.process.exitCode = 1;
    }
}

main().catch((error) => {
    const message =
        error instanceof Error
            ? error.message
            : "Unknown asset validation failure.";
    console.error(`Asset validation CLI failed: ${message}`);
    globalThis.process.exitCode = 1;
});
