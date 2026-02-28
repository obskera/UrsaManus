import { afterEach, describe, expect, it } from "vitest";
import { signalBus } from "@/services/signalBus";
import {
    WORLD_STREAM_CHUNK_LOADED_SIGNAL,
    WORLD_STREAM_CHUNK_UNLOADED_SIGNAL,
    WORLD_STREAM_ENTITY_ACTIVATED_SIGNAL,
    WORLD_STREAM_ENTITY_DEACTIVATED_SIGNAL,
    WORLD_STREAM_UPDATED_SIGNAL,
    createWorldStreamingService,
} from "@/services/worldStreaming";

describe("world streaming service", () => {
    afterEach(() => {
        signalBus.clear();
    });

    it("loads/unloads deterministic chunk regions when focus crosses boundaries", () => {
        const service = createWorldStreamingService();
        service.setWorld({
            width: 512,
            height: 512,
            chunkWidth: 128,
            chunkHeight: 128,
        });
        service.setLoadPolicy({
            activeRadiusChunks: 0,
            preloadRadiusChunks: 1,
        });

        const first = service.updateFocus(10, 10);
        expect(first.focusChunk).toEqual({ x: 0, y: 0 });
        const firstSnapshot = service.getSnapshot();
        expect(firstSnapshot.loadedChunkCount).toBe(4);
        expect(first.unloadedChunks).toHaveLength(0);

        const second = service.updateFocus(260, 10);
        expect(second.focusChunk).toEqual({ x: 2, y: 0 });
        expect(second.loadedChunks.length).toBeGreaterThan(0);
        expect(second.unloadedChunks.length).toBeGreaterThan(0);

        const snapshot = service.getSnapshot();
        expect(snapshot.focusChunk).toEqual({ x: 2, y: 0 });
        expect(snapshot.loadedChunkCount).toBeGreaterThan(0);
    });

    it("keeps entity activation deterministic across region transitions", () => {
        const service = createWorldStreamingService();
        service.setWorld({
            width: 512,
            height: 256,
            chunkWidth: 128,
            chunkHeight: 128,
        });
        service.setLoadPolicy({
            activeRadiusChunks: 0,
            preloadRadiusChunks: 0,
        });

        service.registerEntity({ id: "player", x: 10, y: 10 });
        service.registerEntity({ id: "npc-far", x: 300, y: 20 });

        service.updateFocus(10, 10);
        expect(service.isEntityActive("player")).toBe(true);
        expect(service.isEntityActive("npc-far")).toBe(false);

        service.updateFocus(300, 20);
        expect(service.isEntityActive("player")).toBe(false);
        expect(service.isEntityActive("npc-far")).toBe(true);

        service.updateEntityPosition("player", 310, 30);
        expect(service.isEntityActive("player")).toBe(true);
    });

    it("supports forced chunk loading and always-active entity flags", () => {
        const service = createWorldStreamingService();
        service.setWorld({
            width: 512,
            height: 512,
            chunkWidth: 128,
            chunkHeight: 128,
        });
        service.setLoadPolicy({
            activeRadiusChunks: 0,
            preloadRadiusChunks: 0,
        });

        service.registerEntity({
            id: "hud-proxy",
            x: 500,
            y: 500,
            alwaysActive: true,
        });
        service.updateFocus(0, 0);

        expect(service.isEntityActive("hud-proxy")).toBe(true);

        service.forceLoadChunk(3, 3);
        let snapshot = service.getSnapshot();
        expect(snapshot.loadedChunks).toContainEqual({ x: 3, y: 3 });

        expect(service.forceUnloadChunk(3, 3)).toBe(true);
        snapshot = service.getSnapshot();
        expect(snapshot.loadedChunks).not.toContainEqual({ x: 3, y: 3 });
    });

    it("emits chunk/entity lifecycle signals", () => {
        const events: string[] = [];

        signalBus.on(
            WORLD_STREAM_CHUNK_LOADED_SIGNAL,
            (event: { chunkX: number; chunkY: number }) => {
                events.push(`load:${event.chunkX},${event.chunkY}`);
            },
        );
        signalBus.on(
            WORLD_STREAM_CHUNK_UNLOADED_SIGNAL,
            (event: { chunkX: number; chunkY: number }) => {
                events.push(`unload:${event.chunkX},${event.chunkY}`);
            },
        );
        signalBus.on(
            WORLD_STREAM_ENTITY_ACTIVATED_SIGNAL,
            (event: { entityId: string }) => {
                events.push(`activate:${event.entityId}`);
            },
        );
        signalBus.on(
            WORLD_STREAM_ENTITY_DEACTIVATED_SIGNAL,
            (event: { entityId: string }) => {
                events.push(`deactivate:${event.entityId}`);
            },
        );
        signalBus.on(WORLD_STREAM_UPDATED_SIGNAL, () => {
            events.push("updated");
        });

        const service = createWorldStreamingService();
        service.setWorld({
            width: 256,
            height: 256,
            chunkWidth: 128,
            chunkHeight: 128,
        });
        service.setLoadPolicy({
            activeRadiusChunks: 0,
            preloadRadiusChunks: 0,
        });
        service.registerEntity({ id: "e1", x: 10, y: 10 });

        service.updateFocus(10, 10);
        service.updateFocus(140, 10);

        expect(events.some((event) => event.startsWith("load:"))).toBe(true);
        expect(events.some((event) => event.startsWith("unload:"))).toBe(true);
        expect(events.some((event) => event === "activate:e1")).toBe(true);
        expect(events.some((event) => event === "deactivate:e1")).toBe(true);
        expect(
            events.filter((event) => event === "updated").length,
        ).toBeGreaterThan(0);
    });
});
