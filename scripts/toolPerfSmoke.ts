import { performance } from "node:perf_hooks";
import { createTileMapPlacementService } from "../src/services/tileMapPlacement";
import {
    DEFAULT_TOOL_PERFORMANCE_BUDGETS,
    evaluateToolPerformanceSamples,
} from "../src/services/toolPerformanceBudgets";
import {
    createLargeBgmPerfFixture,
    createLargeTilemapPerfFixture,
} from "../src/tests/fixtures/toolPerfFixtures";

const measure = <T>(work: () => T): { value: T; durationMs: number } => {
    const startedAt = performance.now();
    const value = work();
    const durationMs = performance.now() - startedAt;
    return { value, durationMs };
};

const bytesOf = (raw: string): number => {
    return Buffer.byteLength(raw, "utf8");
};

const tilemapFixture = createLargeTilemapPerfFixture();
const tilemapRaw = JSON.stringify(tilemapFixture);
const tilemapService = createTileMapPlacementService();

const tilemapLoad = measure(() => {
    return tilemapService.importPayload(tilemapRaw);
});

if (!tilemapLoad.value.ok) {
    console.error(
        `Tilemap perf smoke failed to import fixture: ${tilemapLoad.value.message}`,
    );
    process.exit(1);
}

const tilemapInteraction = measure(() => {
    for (let index = 0; index < 400; index += 1) {
        const x = index % tilemapFixture.map.width;
        const y = Math.floor(index / tilemapFixture.map.width);
        tilemapService.placeTile(x, y, (index % 7) + 1, "decor");
    }
});

const tilemapExport = measure(() => {
    return tilemapService.exportPayload({ pretty: true });
});

const bgmFixture = createLargeBgmPerfFixture();
const bgmRaw = JSON.stringify(bgmFixture);

const bgmLoad = measure(() => {
    return JSON.parse(bgmRaw) as ReturnType<typeof createLargeBgmPerfFixture>;
});

const bgmInteraction = measure(() => {
    const parsed = bgmLoad.value;
    const ids = new Set(parsed.palette.map((entry) => entry.id));
    let playable = 0;
    for (const note of parsed.sequence) {
        if (ids.has(note.soundId)) {
            playable += 1;
        }
    }

    return playable;
});

const bgmExport = measure(() => {
    return JSON.stringify(bgmLoad.value, null, 2);
});

const evaluations = evaluateToolPerformanceSamples([
    {
        tool: "tilemap",
        metric: "loadMs",
        value: Math.round(tilemapLoad.durationMs * 10) / 10,
    },
    {
        tool: "tilemap",
        metric: "interactionMs",
        value: Math.round((tilemapInteraction.durationMs / 400) * 10) / 10,
    },
    {
        tool: "tilemap",
        metric: "exportMs",
        value: Math.round(tilemapExport.durationMs * 10) / 10,
    },
    {
        tool: "tilemap",
        metric: "payloadBytes",
        value: bytesOf(tilemapExport.value),
    },
    {
        tool: "bgm",
        metric: "loadMs",
        value: Math.round(bgmLoad.durationMs * 10) / 10,
    },
    {
        tool: "bgm",
        metric: "interactionMs",
        value: Math.round(bgmInteraction.durationMs * 10) / 10,
    },
    {
        tool: "bgm",
        metric: "exportMs",
        value: Math.round(bgmExport.durationMs * 10) / 10,
    },
    {
        tool: "bgm",
        metric: "payloadBytes",
        value: bytesOf(bgmExport.value),
    },
]);

console.log("Tool performance budgets:");
console.log(JSON.stringify(DEFAULT_TOOL_PERFORMANCE_BUDGETS, null, 2));
console.log("Tool performance smoke samples:");

for (const evaluation of evaluations) {
    const metricLabel = `${evaluation.sample.tool}.${evaluation.sample.metric}`;
    const status = evaluation.passed ? "PASS" : "FAIL";
    console.log(
        `${status} ${metricLabel}=${evaluation.sample.value} (budget <= ${evaluation.budget})`,
    );
}

const failures = evaluations.filter((evaluation) => !evaluation.passed);
if (failures.length > 0) {
    console.error(
        `Tool performance smoke failed (${failures.length} budget checks exceeded).`,
    );
    process.exit(1);
}

console.log(
    `Tool performance smoke passed (${evaluations.length} budget checks).`,
);
