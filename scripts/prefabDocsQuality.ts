import { readFile, stat } from "node:fs/promises";
import path from "node:path";

type GateIssue = {
    file: string;
    message: string;
};

async function exists(absolutePath: string): Promise<boolean> {
    try {
        const info = await stat(absolutePath);
        return info.isFile();
    } catch {
        return false;
    }
}

async function readUtf8(absolutePath: string): Promise<string | null> {
    try {
        return await readFile(absolutePath, "utf8");
    } catch {
        return null;
    }
}

function includesAll(content: string, snippets: string[]): boolean {
    return snippets.every((snippet) => content.includes(snippet));
}

async function main(): Promise<void> {
    const cwd = process.cwd();

    const requiredFiles = [
        "docs/prefabs/PREFAB_WORKFLOW.md",
        "docs/prefabs/CHEATSHEET.md",
        "docs/prefabs/PREFAB_EXAMPLE_INDEX.md",
        "docs/prefabs/PLAYER_PREFABS.md",
        "docs/prefabs/ENEMY_PREFABS.md",
        "docs/prefabs/OBJECT_PREFABS.md",
        "docs/ai/PREFAB_AI_VERIFICATION_FLOW.md",
    ];

    const issues: GateIssue[] = [];

    for (const relativePath of requiredFiles) {
        const absolutePath = path.resolve(cwd, relativePath);
        if (!(await exists(absolutePath))) {
            issues.push({
                file: relativePath,
                message: "Required prefab docs file is missing.",
            });
        }
    }

    const cheatsheetPath = path.resolve(cwd, "docs/prefabs/CHEATSHEET.md");
    const cheatsheetContent = await readUtf8(cheatsheetPath);
    if (!cheatsheetContent) {
        issues.push({
            file: "docs/prefabs/CHEATSHEET.md",
            message: "Unable to read cheatsheet content.",
        });
    } else {
        if (!cheatsheetContent.includes("Top 30 prefab snippets")) {
            issues.push({
                file: "docs/prefabs/CHEATSHEET.md",
                message:
                    "Cheatsheet must include the Top 30 snippet section heading.",
            });
        }

        const snippetFenceCount = (cheatsheetContent.match(/```/g) ?? [])
            .length;
        if (snippetFenceCount < 20) {
            issues.push({
                file: "docs/prefabs/CHEATSHEET.md",
                message:
                    "Cheatsheet must include multiple copy/paste snippets (expected at least 10 fenced blocks).",
            });
        }

        if (!cheatsheetContent.includes("Start here in 5 minutes")) {
            issues.push({
                file: "docs/prefabs/CHEATSHEET.md",
                message:
                    "Cheatsheet must include the 5-minute start flow (wizard + runtime attach + export/import).",
            });
        }
    }

    const exampleIndexPath = path.resolve(
        cwd,
        "docs/prefabs/PREFAB_EXAMPLE_INDEX.md",
    );
    const exampleIndexContent = await readUtf8(exampleIndexPath);
    if (!exampleIndexContent) {
        issues.push({
            file: "docs/prefabs/PREFAB_EXAMPLE_INDEX.md",
            message: "Unable to read prefab example index content.",
        });
    } else {
        const requiredExampleLinks = [
            "src/services/prefabExampleMatrix.ts",
            "src/components/examples/PrefabExampleMatrixExample.tsx",
            "src/tests/prefabExampleMatrix.test.ts",
            "src/tests/PrefabExampleMatrixExample.test.tsx",
        ];

        if (!includesAll(exampleIndexContent, requiredExampleLinks)) {
            issues.push({
                file: "docs/prefabs/PREFAB_EXAMPLE_INDEX.md",
                message:
                    "Example index must link matrix source and focused test files.",
            });
        }
    }

    const workflowPath = path.resolve(cwd, "docs/prefabs/PREFAB_WORKFLOW.md");
    const workflowContent = await readUtf8(workflowPath);
    if (!workflowContent) {
        issues.push({
            file: "docs/prefabs/PREFAB_WORKFLOW.md",
            message: "Unable to read prefab workflow content.",
        });
    } else {
        const expectedLinks = [
            "docs/prefabs/CHEATSHEET.md",
            "docs/prefabs/PLAYER_PREFABS.md",
            "docs/prefabs/ENEMY_PREFABS.md",
            "docs/prefabs/OBJECT_PREFABS.md",
            "docs/prefabs/PREFAB_EXAMPLE_INDEX.md",
        ];

        if (!includesAll(workflowContent, expectedLinks)) {
            issues.push({
                file: "docs/prefabs/PREFAB_WORKFLOW.md",
                message:
                    "Workflow doc must link cheatsheet and prefab reference docs.",
            });
        }
    }

    if (issues.length > 0) {
        for (const issue of issues) {
            console.error(`✗ ${issue.file}`);
            console.error(`  - ${issue.message}`);
        }
        console.error(
            `Prefab docs quality gate failed (${issues.length} issue(s)).`,
        );
        process.exitCode = 1;
        return;
    }

    console.log(
        `Prefab docs quality gate passed (${requiredFiles.length}/${requiredFiles.length} required docs files).`,
    );
}

main().catch((error) => {
    const message =
        error instanceof Error
            ? error.message
            : "Unknown prefab docs quality gate failure.";
    console.error(`Prefab docs quality gate failed: ${message}`);
    process.exitCode = 1;
});
