import { createHash } from "node:crypto";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

type CliOptions = {
    distPath: string;
    version?: string;
};

type ArtifactSummary = {
    filePath: string;
    bytes: number;
    sha256: string;
};

function parseArgs(argv: string[]): CliOptions {
    const options: CliOptions = {
        distPath: path.resolve("dist"),
    };

    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (token === "--dist") {
            const next = argv[index + 1]?.trim();
            if (next) {
                options.distPath = path.resolve(next);
            }
            index += 1;
            continue;
        }

        if (token === "--version") {
            options.version = argv[index + 1]?.trim();
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

async function getPackageVersion(): Promise<string> {
    const raw = await readFile(path.resolve("package.json"), "utf8");
    const parsed = JSON.parse(raw) as { version?: unknown };

    if (typeof parsed.version !== "string" || !parsed.version.trim()) {
        throw new Error("package.json must include a non-empty version.");
    }

    return parsed.version.trim();
}

async function collectFiles(rootPath: string): Promise<string[]> {
    const entries = await readdir(rootPath, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
        const absolutePath = path.join(rootPath, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await collectFiles(absolutePath)));
            continue;
        }

        if (entry.isFile()) {
            files.push(absolutePath);
        }
    }

    return files;
}

async function summarizeArtifact(
    filePath: string,
    rootPath: string,
): Promise<ArtifactSummary> {
    const file = await readFile(filePath);
    const hash = createHash("sha256").update(file).digest("hex");
    const metadata = await stat(filePath);
    return {
        filePath: path.relative(rootPath, filePath).replaceAll("\\", "/"),
        bytes: metadata.size,
        sha256: hash,
    };
}

async function main(): Promise<void> {
    const options = parseArgs(globalThis.process.argv.slice(2));
    const packageVersion = await getPackageVersion();
    const version = options.version ?? packageVersion;

    if (!isSemver(version)) {
        throw new Error(`Invalid semantic version: "${version}".`);
    }

    if (options.version && options.version !== packageVersion) {
        throw new Error(
            `Version mismatch: package.json=${packageVersion}, --version=${options.version}.`,
        );
    }

    const distStats = await stat(options.distPath).catch(() => null);
    if (!distStats || !distStats.isDirectory()) {
        throw new Error(
            `Missing dist directory at ${options.distPath}. Run npm run build first.`,
        );
    }

    const indexHtmlPath = path.join(options.distPath, "index.html");
    const assetsPath = path.join(options.distPath, "assets");

    const indexStats = await stat(indexHtmlPath).catch(() => null);
    if (!indexStats || !indexStats.isFile()) {
        throw new Error(`Missing required artifact: ${indexHtmlPath}`);
    }

    const assetsStats = await stat(assetsPath).catch(() => null);
    if (!assetsStats || !assetsStats.isDirectory()) {
        throw new Error(`Missing required artifact directory: ${assetsPath}`);
    }

    const files = (await collectFiles(options.distPath)).sort((left, right) =>
        left.localeCompare(right),
    );
    if (files.length === 0) {
        throw new Error("No build artifacts found in dist.");
    }

    const summaries: ArtifactSummary[] = [];
    for (const filePath of files) {
        summaries.push(await summarizeArtifact(filePath, options.distPath));
    }

    const totalBytes = summaries.reduce((sum, item) => sum + item.bytes, 0);
    const checksums = summaries
        .map((item) => `${item.sha256}  ${item.filePath}`)
        .join("\n");

    const checksumPath = path.join(options.distPath, "SHA256SUMS.txt");
    await writeFile(checksumPath, `${checksums}\n`, "utf8");

    const manifestPath = path.join(options.distPath, "release-manifest.json");
    await writeFile(
        manifestPath,
        JSON.stringify(
            {
                version,
                generatedAt: new Date().toISOString(),
                fileCount: summaries.length,
                totalBytes,
                artifacts: summaries,
            },
            null,
            2,
        ),
        "utf8",
    );

    console.log(`Verified ${summaries.length} artifact file(s).`);
    console.log(`Wrote checksums: ${checksumPath}`);
    console.log(`Wrote manifest: ${manifestPath}`);
}

main().catch((error) => {
    const message =
        error instanceof Error
            ? error.message
            : "Unknown release artifact verification failure.";
    console.error(`Release artifact verification failed: ${message}`);
    globalThis.process.exitCode = 1;
});
