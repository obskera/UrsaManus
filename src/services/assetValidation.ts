export type AssetValidationIssue = {
    path: string;
    message: string;
};

export type AssetValidationBudgetConfig = {
    maxTotalBytes: number;
    maxSpriteBytes: number;
    maxAudioBytes: number;
    maxAtlasBytes: number;
};

export type AssetValidationInput = {
    sourceFiles: Array<{
        filePath: string;
        content: string;
    }>;
    assetFiles: Array<{
        filePath: string;
        bytes: number;
    }>;
    budgets?: Partial<AssetValidationBudgetConfig>;
};

export type AssetValidationSummary = {
    sourceFileCount: number;
    assetFileCount: number;
    totalAssetBytes: number;
    spriteBytes: number;
    audioBytes: number;
    atlasBytes: number;
};

export type AssetValidationReport = {
    ok: boolean;
    issues: AssetValidationIssue[];
    summary: AssetValidationSummary;
    budgets: AssetValidationBudgetConfig;
};

type ReferencedAsset = {
    sourcePath: string;
    resolvedPath: string;
};

const DEFAULT_BUDGETS: AssetValidationBudgetConfig = {
    maxTotalBytes: 5 * 1024 * 1024,
    maxSpriteBytes: 1024 * 1024,
    maxAudioBytes: 1024 * 1024,
    maxAtlasBytes: 256 * 1024,
};

const SPRITE_EXTENSIONS = new Set([
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".svg",
]);

const AUDIO_EXTENSIONS = new Set([".wav", ".mp3", ".ogg", ".m4a"]);
const ATLAS_EXTENSIONS = new Set([".atlas", ".pack", ".plist"]);

function normalizePath(input: string): string {
    return input.replaceAll("\\", "/").replace(/^\.\//, "");
}

function decodeUrlPathSegment(pathname: string): string {
    try {
        return decodeURIComponent(pathname);
    } catch {
        return pathname;
    }
}

function getFileExtension(filePath: string): string {
    const filename = normalizePath(filePath).split("/").pop() ?? "";
    const extensionIndex = filename.lastIndexOf(".");
    if (extensionIndex <= 0) {
        return "";
    }

    return filename.slice(extensionIndex).toLowerCase();
}

function isAtlasJsonPath(filePath: string): boolean {
    const normalized = normalizePath(filePath).toLowerCase();
    if (!normalized.endsWith(".json")) {
        return false;
    }

    const filename = normalized.split("/").pop() ?? "";
    return filename.includes("atlas") || filename.includes("spritesheet");
}

function extractReferencedAssets(
    sourcePath: string,
    content: string,
): {
    spriteReferences: ReferencedAsset[];
    audioReferences: ReferencedAsset[];
    atlasReferences: ReferencedAsset[];
} {
    const spriteReferences: ReferencedAsset[] = [];
    const audioReferences: ReferencedAsset[] = [];
    const atlasReferences: ReferencedAsset[] = [];

    const aliasImportPattern = /["']@\/assets\/([^"']+)["']/g;
    let aliasMatch = aliasImportPattern.exec(content);
    while (aliasMatch) {
        const subPath = aliasMatch[1]?.trim();
        if (subPath) {
            const resolvedPath = normalizePath(`src/assets/${subPath}`);
            const extension = getFileExtension(resolvedPath);
            if (SPRITE_EXTENSIONS.has(extension)) {
                spriteReferences.push({
                    sourcePath,
                    resolvedPath,
                });
            } else if (AUDIO_EXTENSIONS.has(extension)) {
                audioReferences.push({
                    sourcePath,
                    resolvedPath,
                });
            } else if (
                ATLAS_EXTENSIONS.has(extension) ||
                isAtlasJsonPath(resolvedPath)
            ) {
                atlasReferences.push({
                    sourcePath,
                    resolvedPath,
                });
            }
        }

        aliasMatch = aliasImportPattern.exec(content);
    }

    const publicAssetPattern =
        /["']\/(?:[^"'?#]+\/)*[^"'?#]+\.(?:png|jpg|jpeg|gif|webp|svg|wav|mp3|ogg|m4a|atlas|pack|plist|json)(?:\?[^"'#]*)?(?:#[^"']*)?["']/gi;
    let publicMatch = publicAssetPattern.exec(content);
    while (publicMatch) {
        const raw = publicMatch[0];
        const quotedPath = raw.slice(1, -1);
        const [pathOnly] = quotedPath.split(/[?#]/);
        const resolvedPath = normalizePath(
            `public/${decodeUrlPathSegment(pathOnly.slice(1))}`,
        );
        const extension = getFileExtension(resolvedPath);

        if (SPRITE_EXTENSIONS.has(extension)) {
            spriteReferences.push({
                sourcePath,
                resolvedPath,
            });
        } else if (AUDIO_EXTENSIONS.has(extension)) {
            audioReferences.push({
                sourcePath,
                resolvedPath,
            });
        } else if (
            ATLAS_EXTENSIONS.has(extension) ||
            isAtlasJsonPath(resolvedPath)
        ) {
            atlasReferences.push({
                sourcePath,
                resolvedPath,
            });
        }

        publicMatch = publicAssetPattern.exec(content);
    }

    return {
        spriteReferences,
        audioReferences,
        atlasReferences,
    };
}

function summarizeBytes(
    assetFiles: Array<{ filePath: string; bytes: number }>,
): AssetValidationSummary {
    let spriteBytes = 0;
    let audioBytes = 0;
    let atlasBytes = 0;

    for (const asset of assetFiles) {
        const extension = getFileExtension(asset.filePath);
        if (SPRITE_EXTENSIONS.has(extension)) {
            spriteBytes += asset.bytes;
            continue;
        }

        if (AUDIO_EXTENSIONS.has(extension)) {
            audioBytes += asset.bytes;
            continue;
        }

        if (
            ATLAS_EXTENSIONS.has(extension) ||
            isAtlasJsonPath(asset.filePath)
        ) {
            atlasBytes += asset.bytes;
        }
    }

    return {
        sourceFileCount: 0,
        assetFileCount: assetFiles.length,
        totalAssetBytes: assetFiles.reduce((sum, file) => sum + file.bytes, 0),
        spriteBytes,
        audioBytes,
        atlasBytes,
    };
}

function appendMissingAssetIssues(
    issues: AssetValidationIssue[],
    references: ReferencedAsset[],
    knownAssets: Set<string>,
    knownAssetsLower: Set<string>,
    kind: "sprite" | "audio" | "atlas",
) {
    const seen = new Set<string>();
    for (const reference of references) {
        const key = `${reference.sourcePath}->${reference.resolvedPath}`;
        if (seen.has(key)) {
            continue;
        }

        seen.add(key);
        const resolvedLower = reference.resolvedPath.toLowerCase();
        const hasExact = knownAssets.has(reference.resolvedPath);
        const hasCaseInsensitive = knownAssetsLower.has(resolvedLower);

        let hasSpriteAliasFallback = false;
        if (!hasExact && !hasCaseInsensitive && kind === "sprite") {
            const filename = reference.resolvedPath.split("/").pop() ?? "";
            if (filename) {
                const aliasPath = normalizePath(`src/assets/${filename}`);
                hasSpriteAliasFallback =
                    knownAssets.has(aliasPath) ||
                    knownAssetsLower.has(aliasPath.toLowerCase());
            }
        }

        if (!hasExact && !hasCaseInsensitive && !hasSpriteAliasFallback) {
            issues.push({
                path: reference.sourcePath,
                message: `Missing ${kind} asset "${reference.resolvedPath}".`,
            });
        }
    }
}

export function validateAssetPipeline(
    input: AssetValidationInput,
): AssetValidationReport {
    const issues: AssetValidationIssue[] = [];
    const budgets: AssetValidationBudgetConfig = {
        ...DEFAULT_BUDGETS,
        ...input.budgets,
    };

    const assetFiles = input.assetFiles.map((asset) => ({
        filePath: normalizePath(asset.filePath),
        bytes: Math.max(0, Math.floor(asset.bytes)),
    }));
    const knownAssets = new Set(assetFiles.map((asset) => asset.filePath));
    const knownAssetsLower = new Set(
        assetFiles.map((asset) => asset.filePath.toLowerCase()),
    );
    const summary = summarizeBytes(assetFiles);
    summary.sourceFileCount = input.sourceFiles.length;

    const spriteReferences: ReferencedAsset[] = [];
    const audioReferences: ReferencedAsset[] = [];
    const atlasReferences: ReferencedAsset[] = [];

    for (const sourceFile of input.sourceFiles) {
        const sourcePath = normalizePath(sourceFile.filePath);
        const extracted = extractReferencedAssets(
            sourcePath,
            sourceFile.content,
        );
        spriteReferences.push(...extracted.spriteReferences);
        audioReferences.push(...extracted.audioReferences);
        atlasReferences.push(...extracted.atlasReferences);
    }

    appendMissingAssetIssues(
        issues,
        spriteReferences,
        knownAssets,
        knownAssetsLower,
        "sprite",
    );
    appendMissingAssetIssues(
        issues,
        audioReferences,
        knownAssets,
        knownAssetsLower,
        "audio",
    );
    appendMissingAssetIssues(
        issues,
        atlasReferences,
        knownAssets,
        knownAssetsLower,
        "atlas",
    );

    const hasAtlasReferences = atlasReferences.length > 0;
    const hasAtlasManifests = assetFiles.some((asset) => {
        const extension = getFileExtension(asset.filePath);
        return (
            ATLAS_EXTENSIONS.has(extension) || isAtlasJsonPath(asset.filePath)
        );
    });

    if (hasAtlasReferences && !hasAtlasManifests) {
        issues.push({
            path: "$",
            message:
                "Atlas references were found in source files, but no atlas/pack manifest files were discovered in public/ or src/assets/.",
        });
    }

    for (const asset of assetFiles) {
        const extension = getFileExtension(asset.filePath);
        if (
            SPRITE_EXTENSIONS.has(extension) &&
            asset.bytes > budgets.maxSpriteBytes
        ) {
            issues.push({
                path: asset.filePath,
                message: `Sprite asset exceeds budget (${asset.bytes} > ${budgets.maxSpriteBytes} bytes).`,
            });
        }

        if (
            AUDIO_EXTENSIONS.has(extension) &&
            asset.bytes > budgets.maxAudioBytes
        ) {
            issues.push({
                path: asset.filePath,
                message: `Audio asset exceeds budget (${asset.bytes} > ${budgets.maxAudioBytes} bytes).`,
            });
        }

        if (
            (ATLAS_EXTENSIONS.has(extension) ||
                isAtlasJsonPath(asset.filePath)) &&
            asset.bytes > budgets.maxAtlasBytes
        ) {
            issues.push({
                path: asset.filePath,
                message: `Atlas manifest exceeds budget (${asset.bytes} > ${budgets.maxAtlasBytes} bytes).`,
            });
        }
    }

    if (summary.totalAssetBytes > budgets.maxTotalBytes) {
        issues.push({
            path: "$",
            message: `Total asset bytes exceed budget (${summary.totalAssetBytes} > ${budgets.maxTotalBytes} bytes).`,
        });
    }

    return {
        ok: issues.length === 0,
        issues,
        summary,
        budgets,
    };
}
