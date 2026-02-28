import type { EntityType } from "@/logic/entity/Entity";

export type EnvironmentalForceZoneBounds = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export type EnvironmentalForceVector = {
    x: number;
    y: number;
};

export type EnvironmentalForceZoneDragScaleByType = Partial<
    Record<EntityType, number>
>;

export type EnvironmentalForceZoneInput = {
    id: string;
    bounds: EnvironmentalForceZoneBounds;
    forcePxPerSec?: EnvironmentalForceVector;
    dragScaleByType?: EnvironmentalForceZoneDragScaleByType;
};

export type EnvironmentalForceZone = {
    id: string;
    bounds: EnvironmentalForceZoneBounds;
    forcePxPerSec: EnvironmentalForceVector;
    dragScaleByType: EnvironmentalForceZoneDragScaleByType;
};

export type ResolvedEnvironmentalForceEffect = {
    deltaVelocityX: number;
    deltaVelocityY: number;
    dragScaleX: number;
};

function toFiniteNumber(value: number, fallback: number) {
    return Number.isFinite(value) ? value : fallback;
}

function clampNonNegative(value: number) {
    return Math.max(0, toFiniteNumber(value, 0));
}

function clampBounds(
    bounds: EnvironmentalForceZoneBounds,
): EnvironmentalForceZoneBounds {
    return {
        x: toFiniteNumber(bounds.x, 0),
        y: toFiniteNumber(bounds.y, 0),
        width: clampNonNegative(bounds.width),
        height: clampNonNegative(bounds.height),
    };
}

export function normalizeEnvironmentalForceZone(
    input: EnvironmentalForceZoneInput,
): EnvironmentalForceZone {
    const dragScaleByType: EnvironmentalForceZoneDragScaleByType = {};

    if (input.dragScaleByType) {
        for (const [entityType, value] of Object.entries(
            input.dragScaleByType,
        )) {
            dragScaleByType[entityType as EntityType] = clampNonNegative(value);
        }
    }

    return {
        id: input.id,
        bounds: clampBounds(input.bounds),
        forcePxPerSec: {
            x: toFiniteNumber(input.forcePxPerSec?.x ?? 0, 0),
            y: toFiniteNumber(input.forcePxPerSec?.y ?? 0, 0),
        },
        dragScaleByType,
    };
}

export function isPositionInsideEnvironmentalForceZone(
    x: number,
    y: number,
    zone: EnvironmentalForceZone,
) {
    return (
        x >= zone.bounds.x &&
        x <= zone.bounds.x + zone.bounds.width &&
        y >= zone.bounds.y &&
        y <= zone.bounds.y + zone.bounds.height
    );
}

export function resolveEnvironmentalForceEffect(options: {
    zones: EnvironmentalForceZone[];
    entityType: EntityType;
    position: { x: number; y: number };
    deltaMs: number;
}): ResolvedEnvironmentalForceEffect {
    if (!Number.isFinite(options.deltaMs) || options.deltaMs <= 0) {
        return {
            deltaVelocityX: 0,
            deltaVelocityY: 0,
            dragScaleX: 1,
        };
    }

    const dt = options.deltaMs / 1000;
    let deltaVelocityX = 0;
    let deltaVelocityY = 0;
    let dragScaleX = 1;

    for (const zone of options.zones) {
        if (
            !isPositionInsideEnvironmentalForceZone(
                options.position.x,
                options.position.y,
                zone,
            )
        ) {
            continue;
        }

        deltaVelocityX += zone.forcePxPerSec.x * dt;
        deltaVelocityY += zone.forcePxPerSec.y * dt;

        const dragScale = zone.dragScaleByType[options.entityType];
        if (Number.isFinite(dragScale) && dragScale !== undefined) {
            dragScaleX *= Math.max(0, dragScale);
        }
    }

    return {
        deltaVelocityX,
        deltaVelocityY,
        dragScaleX,
    };
}
