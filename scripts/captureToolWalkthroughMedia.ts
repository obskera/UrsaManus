import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const MEDIA_DIR = path.resolve(process.cwd(), "docs/tools/walkthroughs/media");

const BASE_URL = process.env.TOOL_CAPTURE_BASE_URL ?? "http://127.0.0.1:5173";

const ensureMediaDir = () => {
    mkdirSync(MEDIA_DIR, { recursive: true });
};

const screenshotPath = (fileName: string): string => {
    return path.join(MEDIA_DIR, fileName);
};

const waitForToolReady = async (page: import("playwright").Page) => {
    await page.waitForSelector(".um-container", { timeout: 15000 });
    await page.waitForTimeout(250);
};

async function captureTilemap(page: import("playwright").Page) {
    await page.goto(`${BASE_URL}/?tool=tilemap`, { waitUntil: "networkidle" });
    await waitForToolReady(page);

    await page.screenshot({
        path: screenshotPath("tilemap-step-1-launch.png"),
        fullPage: true,
    });

    await page.getByRole("button", { name: "Tile 7" }).click();
    await page.getByRole("button", { name: "Pick mode" }).click();
    await page.screenshot({
        path: screenshotPath("tilemap-step-2-brush-pick.png"),
        fullPage: true,
    });

    await page
        .getByLabel("Solid layer ids (comma-separated)")
        .fill("collision,walls");
    await page
        .getByLabel("Solid layer name contains (comma-separated)")
        .fill("collision,blocker");
    await page.getByLabel("Solid tile ids (comma-separated)").fill("4,7,11");
    await page.screenshot({
        path: screenshotPath("tilemap-step-3-collision-profile.png"),
        fullPage: true,
    });

    await page.getByRole("button", { name: "Overlay mode" }).click();
    await page.getByLabel("Overlay name").fill("Objective Overlay");
    await page.getByLabel("Overlay id").fill("objective-1");
    await page.screenshot({
        path: screenshotPath("tilemap-step-4-overlay-mode.png"),
        fullPage: true,
    });

    await page.screenshot({
        path: screenshotPath("tilemap-step-5-layer-advanced-tools.png"),
        fullPage: true,
    });

    await page.getByRole("button", { name: "Refresh export" }).click();
    await page.screenshot({
        path: screenshotPath("tilemap-step-6-export-json.png"),
        fullPage: true,
    });
}

async function captureBgm(page: import("playwright").Page) {
    await page.goto(`${BASE_URL}/?tool=bgm`, { waitUntil: "networkidle" });
    await waitForToolReady(page);

    await page.screenshot({
        path: screenshotPath("bgm-step-1-launch.png"),
        fullPage: true,
    });

    await page.getByRole("button", { name: "Preset: Battle" }).click();
    await page.screenshot({
        path: screenshotPath("bgm-step-2-preset-strip.png"),
        fullPage: true,
    });

    await page.getByRole("button", { name: "Loop preview: off" }).click();
    await page.screenshot({
        path: screenshotPath("bgm-step-3-preview-controls.png"),
        fullPage: true,
    });

    await page.getByRole("button", { name: "Mute step 0" }).click();
    await page.getByRole("button", { name: "Solo step 1" }).click();
    await page.screenshot({
        path: screenshotPath("bgm-step-4-step-overrides.png"),
        fullPage: true,
    });

    await page.getByRole("button", { name: "Export JSON file" }).click();
    await page.screenshot({
        path: screenshotPath("bgm-step-5-export-json.png"),
        fullPage: true,
    });
}

async function main() {
    ensureMediaDir();

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1366, height: 900 },
    });
    const page = await context.newPage();

    try {
        await captureTilemap(page);
        await captureBgm(page);
        console.log(`Captured walkthrough media to ${MEDIA_DIR}`);
    } finally {
        await context.close();
        await browser.close();
    }
}

main().catch((error) => {
    const message =
        error instanceof Error ? error.message : "Unknown capture failure.";
    console.error(`Walkthrough capture failed: ${message}`);
    process.exit(1);
});
