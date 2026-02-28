import { afterEach, describe, expect, it, vi } from "vitest";
import { signalBus } from "@/services/signalBus";
import {
    CONTENT_HOT_RELOAD_APPLIED_SIGNAL,
    CONTENT_HOT_RELOAD_FAILED_SIGNAL,
    CONTENT_HOT_RELOAD_REQUESTED_SIGNAL,
    createContentHotReloadPipeline,
} from "@/services/contentHotReload";

describe("content hot-reload pipeline", () => {
    afterEach(() => {
        signalBus.clear();
    });

    it("registers domains and executes targeted reload handlers", async () => {
        let nowMs = 100;
        const reloadCalls: string[] = [];

        const pipeline = createContentHotReloadPipeline({
            enabled: true,
            now: () => nowMs,
        });

        pipeline.registerDomain("dialogue", (context) => {
            reloadCalls.push(`${context.domain}:${context.reason ?? "none"}`);
        });

        nowMs = 112;
        const result = await pipeline.requestReload("dialogue", {
            reason: "manual-refresh",
        });

        expect(result).toEqual({
            ok: true,
            domain: "dialogue",
            durationMs: 0,
        });
        expect(reloadCalls).toEqual(["dialogue:manual-refresh"]);
        expect(pipeline.getRegisteredDomains()).toEqual(["dialogue"]);
    });

    it("emits requested/applied/failed signals and domain refresh event", async () => {
        const events: string[] = [];
        signalBus.on(CONTENT_HOT_RELOAD_REQUESTED_SIGNAL, () => {
            events.push("requested");
        });
        signalBus.on(CONTENT_HOT_RELOAD_APPLIED_SIGNAL, () => {
            events.push("applied");
        });
        signalBus.on(CONTENT_HOT_RELOAD_FAILED_SIGNAL, () => {
            events.push("failed");
        });
        signalBus.on("content:refresh:quest", () => {
            events.push("domain-refresh");
        });

        const pipeline = createContentHotReloadPipeline({ enabled: true });

        pipeline.registerDomain("quest", () => undefined);
        await pipeline.requestReload("quest", {
            source: "manual",
            reason: "quest-file-updated",
        });

        pipeline.registerDomain("map", () => {
            throw new Error("map reload failed");
        });
        await pipeline.requestReload("map", {
            source: "watcher",
            changedPath: "content/map/zone-a.json",
        });

        expect(events).toEqual([
            "requested",
            "applied",
            "domain-refresh",
            "requested",
            "failed",
        ]);
    });

    it("supports watcher path domain routing", async () => {
        const dialogue = vi.fn();
        const quest = vi.fn();

        const pipeline = createContentHotReloadPipeline({ enabled: true });
        pipeline.registerDomain("dialogue", dialogue);
        pipeline.registerDomain("quest", quest);

        const dialogueResult = await pipeline.requestReloadForPath(
            "content/dialogue/chapter-1.json",
            { reason: "watch-update" },
        );
        const questResult = await pipeline.requestReloadForPath(
            "src/content/quests/main.quest.json",
        );

        expect(dialogueResult.ok).toBe(true);
        expect(questResult.ok).toBe(true);
        expect(dialogue).toHaveBeenCalledTimes(1);
        expect(quest).toHaveBeenCalledTimes(1);
        expect(
            pipeline.resolveDomainFromPath("assets/editor/placement.json"),
        ).toBe("editor");
        expect(pipeline.resolveDomainFromPath("unknown/file.bin")).toBeNull();
    });

    it("returns disabled and missing-domain errors safely", async () => {
        const pipeline = createContentHotReloadPipeline({ enabled: false });

        const disabled = await pipeline.requestReload("map");
        expect(disabled).toEqual({
            ok: false,
            domain: "map",
            code: "disabled",
            message: "Content hot-reload pipeline is disabled.",
        });

        pipeline.setEnabled(true);

        const missingDomain = await pipeline.requestReload("map");
        expect(missingDomain).toEqual({
            ok: false,
            domain: "map",
            code: "missing-domain",
            message: 'No hot-reload handler registered for domain "map".',
        });

        const unresolvedPath = await pipeline.requestReloadForPath(
            "assets/raw-binary.bin",
        );
        expect(unresolvedPath).toEqual({
            ok: false,
            domain: null,
            code: "missing-domain",
            message:
                'Could not resolve content domain for path "assets/raw-binary.bin".',
        });
    });

    it("clears and unregisters domain handlers", async () => {
        const pipeline = createContentHotReloadPipeline({ enabled: true });
        const dialogue = vi.fn();
        const offDialogue = pipeline.registerDomain("dialogue", dialogue);
        pipeline.registerDomain("quest", vi.fn());

        expect(pipeline.getRegisteredDomains().sort()).toEqual([
            "dialogue",
            "quest",
        ]);

        offDialogue();
        expect(pipeline.getRegisteredDomains()).toEqual(["quest"]);

        pipeline.clearDomain("quest");
        expect(pipeline.getRegisteredDomains()).toEqual([]);

        pipeline.registerDomain("map", vi.fn());
        pipeline.registerDomain("editor", vi.fn());
        pipeline.clearAllDomains();

        expect(pipeline.getRegisteredDomains()).toEqual([]);
    });
});
