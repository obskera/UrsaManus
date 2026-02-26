import type {
    GravityConfig,
    PhysicsBody,
    PhysicsEntityLike,
    PhysicsStepResult,
} from "./types";

export const DEFAULT_GRAVITY_CONFIG: GravityConfig = {
    gravityPxPerSec2: 1800,
    terminalVelocityPxPerSec: 900,
    maxDeltaMs: 50,
};

export function createPhysicsBody(
    overrides: Partial<PhysicsBody> = {},
): PhysicsBody {
    return {
        enabled: true,
        affectedByGravity: true,
        gravityScale: 1,
        velocity: { x: 0, y: 0 },
        dragX: 0,
        ...overrides,
        velocity: {
            x: overrides.velocity?.x ?? 0,
            y: overrides.velocity?.y ?? 0,
        },
    };
}

export function clampDeltaMs(deltaMs: number, config: GravityConfig): number {
    if (deltaMs <= 0) return 0;
    return Math.min(deltaMs, config.maxDeltaMs);
}

export function stepEntityPhysics(
    entity: PhysicsEntityLike,
    deltaMs: number,
    config: GravityConfig = DEFAULT_GRAVITY_CONFIG,
): PhysicsStepResult {
    const body = entity.physicsBody;
    if (!body || !body.enabled) {
        return { dx: 0, dy: 0, changedVelocity: false };
    }

    const clampedDeltaMs = clampDeltaMs(deltaMs, config);
    if (clampedDeltaMs === 0) {
        return { dx: 0, dy: 0, changedVelocity: false };
    }

    const dt = clampedDeltaMs / 1000;
    const beforeVx = body.velocity.x;
    const beforeVy = body.velocity.y;

    if (body.affectedByGravity) {
        body.velocity.y += config.gravityPxPerSec2 * body.gravityScale * dt;
    }

    const velocityLimit = body.maxVelocityY ?? config.terminalVelocityPxPerSec;
    if (body.velocity.y > velocityLimit) body.velocity.y = velocityLimit;
    if (body.velocity.y < -velocityLimit) body.velocity.y = -velocityLimit;

    if (body.dragX > 0 && body.velocity.x !== 0) {
        const dragFactor = Math.max(0, 1 - body.dragX * dt);
        body.velocity.x *= dragFactor;
    }

    return {
        dx: body.velocity.x * dt,
        dy: body.velocity.y * dt,
        changedVelocity:
            beforeVx !== body.velocity.x || beforeVy !== body.velocity.y,
    };
}
