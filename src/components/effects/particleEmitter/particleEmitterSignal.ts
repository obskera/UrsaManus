import { signalBus } from "@/services/SignalBus";
import type { EmitParticlesPayload, ParticlePresetOptions } from "./types";

export const EMIT_PARTICLES_SIGNAL = "effects:particles:emit";

export function emitParticles(payload: EmitParticlesPayload) {
    signalBus.emit(EMIT_PARTICLES_SIGNAL, payload);
}

export function emitSmokeParticles(
    location: { x: number; y: number },
    options: ParticlePresetOptions = {},
) {
    emitParticles({
        amount: options.amount ?? 24,
        location,
        direction: {
            angleDeg: 270,
            speed: 40,
            spreadDeg: 60,
            speedJitter: 20,
        },
        emissionShape: options.emissionShape ?? "circle",
        emissionRadius: options.emissionRadius ?? 8,
        lifeMs: options.lifeMs ?? 1200,
        color: options.color ?? "#9ca3af",
        colorPalette: options.colorPalette,
        size: options.size ?? 3,
        sizeJitter: options.sizeJitter ?? 1.5,
        sizeRange: options.sizeRange,
        gravity: options.gravity ?? -20,
        drag: options.drag ?? 0.3,
        emissionLength: options.emissionLength,
    });
}

export function emitSparkParticles(
    location: { x: number; y: number },
    options: ParticlePresetOptions = {},
) {
    emitParticles({
        amount: options.amount ?? 28,
        location,
        direction: {
            angleDeg: 270,
            speed: 190,
            spreadDeg: 300,
            speedJitter: 90,
        },
        emissionShape: options.emissionShape ?? "point",
        lifeMs: options.lifeMs ?? 360,
        color: options.color ?? "#ffd166",
        colorPalette: options.colorPalette,
        size: options.size ?? 2,
        sizeJitter: options.sizeJitter ?? 1,
        sizeRange: options.sizeRange,
        gravity: options.gravity ?? 100,
        drag: options.drag ?? 0.1,
        emissionRadius: options.emissionRadius,
        emissionLength: options.emissionLength,
    });
}

export function emitMagicShimmerParticles(
    location: { x: number; y: number },
    options: ParticlePresetOptions = {},
) {
    emitParticles({
        amount: options.amount ?? 32,
        location,
        direction: {
            angleDeg: 270,
            speed: 90,
            spreadDeg: 360,
            speedJitter: 50,
        },
        emissionShape: options.emissionShape ?? "circle",
        emissionRadius: options.emissionRadius ?? 12,
        lifeMs: options.lifeMs ?? 800,
        color: options.color ?? "#c77dff",
        colorPalette: options.colorPalette ?? ["#c77dff", "#7b2cbf", "#80ffdb"],
        size: options.size ?? 2,
        sizeJitter: options.sizeJitter ?? 1.5,
        sizeRange: options.sizeRange,
        gravity: options.gravity ?? -10,
        drag: options.drag ?? 0.2,
        emissionLength: options.emissionLength,
    });
}

export function emitDebrisParticles(
    location: { x: number; y: number },
    options: ParticlePresetOptions = {},
) {
    emitParticles({
        amount: options.amount ?? 18,
        location,
        direction: {
            angleDeg: 270,
            speed: 130,
            spreadDeg: 180,
            speedJitter: 60,
        },
        emissionShape: options.emissionShape ?? "line",
        emissionLength: options.emissionLength ?? 18,
        lifeMs: options.lifeMs ?? 700,
        color: options.color ?? "#8d6e63",
        colorPalette: options.colorPalette,
        size: options.size ?? 3,
        sizeJitter: options.sizeJitter ?? 1,
        sizeRange: options.sizeRange ?? { min: 2, max: 5 },
        gravity: options.gravity ?? 180,
        drag: options.drag ?? 0.22,
        emissionRadius: options.emissionRadius,
    });
}

export type BurningFlameOptions = ParticlePresetOptions & {
    flameAmount?: number;
    smokeAmount?: number;
};

export type TorchFlameEmitterOptions = BurningFlameOptions & {
    intervalMs?: number;
};

const torchFlameEmitterTimers = new Map<
    string,
    ReturnType<typeof setInterval>
>();

export function emitBurningFlameParticles(
    location: { x: number; y: number },
    options: BurningFlameOptions = {},
) {
    const baseAmount = options.amount ?? 26;
    const flameAmount = options.flameAmount ?? baseAmount;
    const smokeAmount =
        options.smokeAmount ?? Math.max(8, Math.floor(baseAmount / 2));

    emitParticles({
        amount: flameAmount,
        location,
        direction: {
            angleDeg: 270,
            speed: 95,
            spreadDeg: 80,
            speedJitter: 45,
        },
        emissionShape: options.emissionShape ?? "circle",
        emissionRadius: options.emissionRadius ?? 7,
        lifeMs: options.lifeMs ?? 520,
        color: options.color ?? "#ff6b00",
        colorPalette: options.colorPalette ?? [
            "#ff6b00",
            "#ff8c00",
            "#ffd166",
            "#ffe066",
        ],
        size: options.size ?? 3,
        sizeJitter: options.sizeJitter ?? 1.5,
        sizeRange: options.sizeRange,
        gravity: options.gravity ?? -35,
        drag: options.drag ?? 0.28,
        emissionLength: options.emissionLength,
    });

    emitParticles({
        amount: smokeAmount,
        location: { x: location.x, y: location.y - 2 },
        direction: {
            angleDeg: 270,
            speed: 36,
            spreadDeg: 55,
            speedJitter: 18,
        },
        emissionShape: "circle",
        emissionRadius: Math.max(8, options.emissionRadius ?? 7),
        lifeMs: (options.lifeMs ?? 520) + 450,
        color: "#6b7280",
        colorPalette: ["#6b7280", "#9ca3af", "#4b5563"],
        sizeRange: { min: 3, max: 7 },
        gravity: -18,
        drag: 0.35,
    });
}

export function stopTorchFlameEmitter(id: string) {
    const timer = torchFlameEmitterTimers.get(id);
    if (!timer) return;

    clearInterval(timer);
    torchFlameEmitterTimers.delete(id);
}

export function stopAllTorchFlameEmitters() {
    for (const timer of torchFlameEmitterTimers.values()) {
        clearInterval(timer);
    }
    torchFlameEmitterTimers.clear();
}

export function startTorchFlameEmitter(
    id: string,
    location: { x: number; y: number } | (() => { x: number; y: number }),
    options: TorchFlameEmitterOptions = {},
) {
    stopTorchFlameEmitter(id);

    const intervalMs = Math.max(16, options.intervalMs ?? 120);
    const {
        intervalMs: _ignoredInterval,
        amount,
        flameAmount,
        smokeAmount,
        ...rest
    } = options;
    void _ignoredInterval;

    const emitTick = () => {
        const resolvedLocation =
            typeof location === "function" ? location() : location;

        emitBurningFlameParticles(resolvedLocation, {
            amount: amount ?? 14,
            flameAmount: flameAmount ?? amount ?? 14,
            smokeAmount:
                smokeAmount ?? Math.max(4, Math.floor((amount ?? 14) / 3)),
            ...rest,
        });
    };

    emitTick();
    const timer = setInterval(emitTick, intervalMs);
    torchFlameEmitterTimers.set(id, timer);

    return () => stopTorchFlameEmitter(id);
}
