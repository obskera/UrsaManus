import { afterEach, describe, expect, it } from "vitest";
import { signalBus } from "@/services/signalBus";
import {
    GRID_MOVEMENT_APPLIED_SIGNAL,
    GRID_MOVEMENT_BLOCKED_SIGNAL,
    GRID_MOVEMENT_CONFIG_UPDATED_SIGNAL,
    createGridMovementService,
} from "@/services/gridMovement";

describe("grid movement service", () => {
    afterEach(() => {
        signalBus.clear();
    });

    it("snaps registered actors to tile centers when snap policy is always", () => {
        const service = createGridMovementService({
            config: {
                tileWidth: 10,
                tileHeight: 20,
                snapPolicy: "always",
            },
        });

        const actor = service.registerActor("player", { x: 26, y: 55 });

        expect(actor.tileX).toBe(2);
        expect(actor.tileY).toBe(2);
        expect(actor.worldX).toBe(25);
        expect(actor.worldY).toBe(50);
    });

    it("moves actors in deterministic grid steps and enforces movement cadence", () => {
        const service = createGridMovementService({
            config: {
                tileWidth: 16,
                tileHeight: 16,
                moveCadenceMs: 100,
                snapPolicy: "always",
            },
            now: () => 0,
        });

        service.registerActor("player", { x: 8, y: 8 });

        const moved = service.moveActor("player", "right");
        expect(moved.ok).toBe(true);
        if (moved.ok) {
            expect(moved.to.tileX).toBe(1);
            expect(moved.to.tileY).toBe(0);
            expect(moved.to.worldX).toBe(24);
            expect(moved.to.worldY).toBe(8);
        }

        const blocked = service.moveActor("player", "right");
        expect(blocked.ok).toBe(false);
        if (!blocked.ok) {
            expect(blocked.reason).toBe("move-cadence");
            expect(blocked.retryInMs).toBeGreaterThan(0);
        }

        service.tick(100);
        const movedAfterCadence = service.moveActor("player", "right");
        expect(movedAfterCadence.ok).toBe(true);
    });

    it("supports collision-aware blocking and on-block snapping", () => {
        const service = createGridMovementService({
            config: {
                tileWidth: 10,
                tileHeight: 10,
                snapPolicy: "on-block",
                gridWidth: 4,
                gridHeight: 4,
                moveCadenceMs: 0,
            },
            canOccupyTile: ({ to }) => {
                return !(to.tileX === 2 && to.tileY === 1);
            },
        });

        service.registerActor("npc", { x: 12, y: 15 });

        const blockedByCollision = service.moveActor("npc", "right");
        expect(blockedByCollision.ok).toBe(false);
        if (!blockedByCollision.ok) {
            expect(blockedByCollision.reason).toBe("blocked");
        }

        const actorAfterBlock = service.getActor("npc");
        expect(actorAfterBlock).not.toBeNull();
        expect(actorAfterBlock?.worldX).toBe(15);
        expect(actorAfterBlock?.worldY).toBe(15);

        const blockedByBounds = service.moveActor("npc", "up");
        expect(blockedByBounds.ok).toBe(true);
        service.moveActor("npc", "up");
        const outOfBounds = service.moveActor("npc", "up");
        expect(outOfBounds.ok).toBe(false);
        if (!outOfBounds.ok) {
            expect(outOfBounds.reason).toBe("out-of-bounds");
        }
    });

    it("converts tile/world positions and emits movement lifecycle signals", () => {
        const service = createGridMovementService({
            config: {
                tileWidth: 12,
                tileHeight: 12,
                originX: 6,
                originY: 6,
                moveCadenceMs: 0,
            },
        });

        const events: string[] = [];
        signalBus.on(GRID_MOVEMENT_CONFIG_UPDATED_SIGNAL, () => {
            events.push("config");
        });
        signalBus.on(GRID_MOVEMENT_APPLIED_SIGNAL, () => {
            events.push("applied");
        });
        signalBus.on(GRID_MOVEMENT_BLOCKED_SIGNAL, () => {
            events.push("blocked");
        });

        expect(service.worldToTile(30, 30)).toEqual({ tileX: 2, tileY: 2 });
        expect(service.tileToWorld(2, 2, "top-left")).toEqual({ x: 30, y: 30 });
        expect(service.tileToWorld(2, 2, "center")).toEqual({ x: 36, y: 36 });

        service.setConfig({ moveCadenceMs: 80 });
        service.registerActor("hero", { x: 36, y: 36 });
        service.moveActor("hero", "left");
        service.moveActor("unknown", "up");

        expect(events).toContain("config");
        expect(events).toContain("applied");
        expect(events).toContain("blocked");
    });
});
