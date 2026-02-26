export type Particle = {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
    lifeMs: number;
    ageMs: number;
    gravity: number;
    drag: number;
    alpha: number;
};

export type ParticleDirection = {
    angleDeg: number;
    speed: number;
    spreadDeg?: number;
    speedJitter?: number;
};

export type EmissionShape = "point" | "circle" | "line";

export type EmitParticlesPayload = {
    amount: number;
    location: { x: number; y: number };
    direction: ParticleDirection;
    emissionShape: EmissionShape;
    lifeMs: number;
    color: string;
    colorPalette?: string[];
    size?: number;
    sizeJitter?: number;
    sizeRange?: { min: number; max: number };
    emissionRadius?: number;
    emissionLength?: number;
    gravity?: number;
    drag?: number;
};

export type ParticlePresetOptions = {
    amount?: number;
    color?: string;
    colorPalette?: string[];
    size?: number;
    sizeJitter?: number;
    sizeRange?: { min: number; max: number };
    lifeMs?: number;
    emissionShape?: EmissionShape;
    emissionRadius?: number;
    emissionLength?: number;
    gravity?: number;
    drag?: number;
};

export type ParticleSeed = {
    x: number;
    y: number;
    color: string;
    size: number;
    lifeMs: number;
    direction: ParticleDirection;
    gravity: number;
    drag: number;
};
