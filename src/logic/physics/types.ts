export type PhysicsVector = {
    x: number;
    y: number;
};

export type PhysicsBody = {
    enabled: boolean;
    affectedByGravity: boolean;
    gravityScale: number;
    velocity: PhysicsVector;
    dragX: number;
    maxVelocityY?: number;
};

export type PhysicsBodyOverrides = Omit<Partial<PhysicsBody>, "velocity"> & {
    velocity?: Partial<PhysicsVector>;
};

export type GravityConfig = {
    gravityPxPerSec2: number;
    terminalVelocityPxPerSec: number;
    maxDeltaMs: number;
};

export type PhysicsEntityLike = {
    position: { x: number; y: number };
    physicsBody?: PhysicsBody;
};

export type PhysicsStepResult = {
    dx: number;
    dy: number;
    changedVelocity: boolean;
};
