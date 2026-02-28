import { afterEach, describe, expect, it } from "vitest";
import { signalBus } from "@/services/signalBus";
import {
    CAMERA_V2_SHAKE_COMPLETED_SIGNAL,
    CAMERA_V2_TRACK_COMPLETED_SIGNAL,
    CAMERA_V2_TRACK_STARTED_SIGNAL,
    CAMERA_V2_UPDATED_SIGNAL,
    createCameraV2Service,
} from "@/services/cameraV2";

describe("camera v2 service", () => {
    afterEach(() => {
        signalBus.clear();
    });

    it("supports dead-zone follow with look-ahead and world bounds clamping", () => {
        const service = createCameraV2Service();
        service.setViewport({ width: 100, height: 80 });
        service.setBounds({
            enabled: true,
            minX: 0,
            minY: 0,
            maxX: 300,
            maxY: 200,
        });
        service.setDeadZone({ width: 40, height: 30 });
        service.setLookAhead({ x: 20, y: 10, smoothing: 1 });
        service.setPosition(0, 0);

        const first = service.update(16, {
            x: 30,
            y: 30,
            velocityX: 50,
            velocityY: 0,
        });
        expect(first.position.x).toBe(0);
        expect(first.position.y).toBe(0);

        const second = service.update(16, {
            x: 120,
            y: 90,
            velocityX: 100,
            velocityY: 0,
        });

        expect(second.position.x).toBeGreaterThan(0);
        expect(second.position.y).toBeGreaterThan(0);

        service.setPosition(500, 500);
        const clamped = service.getSnapshot();
        expect(clamped.position.x).toBeLessThanOrEqual(200);
        expect(clamped.position.y).toBeLessThanOrEqual(120);
    });

    it("supports scripted camera tracks for cutscene/cinematic steps", () => {
        const events: string[] = [];
        signalBus.on(
            CAMERA_V2_TRACK_STARTED_SIGNAL,
            (event: { id: string }) => {
                events.push(`start:${event.id}`);
            },
        );
        signalBus.on(
            CAMERA_V2_TRACK_COMPLETED_SIGNAL,
            (event: { id: string }) => {
                events.push(`end:${event.id}`);
            },
        );

        const service = createCameraV2Service();
        const started = service.playTrack({
            id: "intro-pan",
            keyframes: [
                { atMs: 0, x: 0, y: 0 },
                { atMs: 1000, x: 200, y: 100 },
            ],
        });
        expect(started).toBe(true);

        const mid = service.update(500, {
            x: 999,
            y: 999,
        });
        expect(mid.position.x).toBe(100);
        expect(mid.position.y).toBe(50);

        const end = service.update(500);
        expect(end.position.x).toBe(200);
        expect(end.position.y).toBe(100);
        expect(events).toEqual(["start:intro-pan", "end:intro-pan"]);
    });

    it("supports layered camera shake and emits shake completion", () => {
        const completed: string[] = [];
        signalBus.on(
            CAMERA_V2_SHAKE_COMPLETED_SIGNAL,
            (event: { id: string }) => {
                completed.push(event.id);
            },
        );

        const service = createCameraV2Service();
        service.startShake({
            id: "hit",
            amplitudeX: 10,
            amplitudeY: 5,
            frequencyHz: 5,
            durationMs: 100,
        });
        service.startShake({
            id: "quake",
            amplitudeX: 4,
            amplitudeY: 8,
            frequencyHz: 2,
            durationMs: 200,
        });

        const withShake = service.update(50);
        expect(withShake.activeShakes).toBe(2);
        expect(withShake.renderPosition.x !== withShake.position.x).toBe(true);

        service.update(60);
        expect(completed).toContain("hit");

        service.update(120);
        expect(completed).toContain("quake");
        expect(service.getSnapshot().activeShakes).toBe(0);
    });

    it("emits camera updated signal and allows manual track stop", () => {
        const events: string[] = [];
        signalBus.on(CAMERA_V2_UPDATED_SIGNAL, () => {
            events.push("updated");
        });

        const service = createCameraV2Service();
        service.playTrack({
            id: "looping",
            loop: true,
            keyframes: [
                { atMs: 0, x: 0, y: 0 },
                { atMs: 100, x: 50, y: 0 },
            ],
        });

        service.update(40);
        expect(service.stopTrack()).toBe(true);
        expect(service.stopTrack()).toBe(false);

        service.update(16, {
            x: 20,
            y: 20,
        });

        expect(events.length).toBeGreaterThanOrEqual(2);
    });
});
