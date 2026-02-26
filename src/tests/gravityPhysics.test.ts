import { describe, expect, it } from "vitest";
import {
    clampDeltaMs,
    createPhysicsBody,
    DEFAULT_GRAVITY_CONFIG,
    stepEntityPhysics,
} from "@/logic/physics";

describe("gravity physics helpers", () => {
    it("creates a usable default physics body", () => {
        const body = createPhysicsBody();

        expect(body.enabled).toBe(true);
        expect(body.affectedByGravity).toBe(true);
        expect(body.gravityScale).toBe(1);
        expect(body.velocity).toEqual({ x: 0, y: 0 });
    });

    it("clamps delta milliseconds for stable simulation", () => {
        expect(clampDeltaMs(-10, DEFAULT_GRAVITY_CONFIG)).toBe(0);
        expect(clampDeltaMs(0, DEFAULT_GRAVITY_CONFIG)).toBe(0);
        expect(clampDeltaMs(16, DEFAULT_GRAVITY_CONFIG)).toBe(16);
        expect(clampDeltaMs(500, DEFAULT_GRAVITY_CONFIG)).toBe(
            DEFAULT_GRAVITY_CONFIG.maxDeltaMs,
        );
    });

    it("applies gravity and returns displacement", () => {
        const entity = {
            position: { x: 0, y: 0 },
            physicsBody: createPhysicsBody(),
        };

        const result = stepEntityPhysics(entity, 16, {
            gravityPxPerSec2: 1000,
            terminalVelocityPxPerSec: 500,
            maxDeltaMs: 50,
        });

        expect(result.dy).toBeGreaterThan(0);
        expect(result.changedVelocity).toBe(true);
        expect(entity.physicsBody.velocity.y).toBeGreaterThan(0);
    });

    it("does not move when physics is disabled", () => {
        const entity = {
            position: { x: 0, y: 0 },
            physicsBody: createPhysicsBody({ enabled: false }),
        };

        const result = stepEntityPhysics(entity, 16);
        expect(result).toEqual({ dx: 0, dy: 0, changedVelocity: false });
    });

    it("respects terminal velocity limits", () => {
        const entity = {
            position: { x: 0, y: 0 },
            physicsBody: createPhysicsBody({
                velocity: { x: 0, y: 1000 },
                maxVelocityY: 300,
            }),
        };

        stepEntityPhysics(entity, 16, {
            gravityPxPerSec2: 1000,
            terminalVelocityPxPerSec: 900,
            maxDeltaMs: 50,
        });

        expect(entity.physicsBody.velocity.y).toBe(300);
    });
});
