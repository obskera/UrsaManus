import type { RectangleCollider } from "@/logic/collision";

export type InteractionInputMode = "keyboard" | "controller" | "pointer";

export type InteractionInputHint =
    | string
    | Partial<Record<InteractionInputMode, string>>;

export type InteractionRaycastEntity = {
    id: string;
    position: { x: number; y: number };
    collider?: RectangleCollider;
};

export const DEFAULT_INTERACTION_DISTANCE_PX = 72;

function getColliderBounds(entity: InteractionRaycastEntity) {
    const collider = entity.collider;
    if (!collider) {
        return null;
    }

    const left = entity.position.x + collider.offset.x;
    const top = entity.position.y + collider.offset.y;
    const right = left + collider.size.width;
    const bottom = top + collider.size.height;

    return { left, top, right, bottom };
}

function pointInBounds(
    x: number,
    y: number,
    bounds: { left: number; top: number; right: number; bottom: number },
) {
    return (
        x >= bounds.left &&
        x <= bounds.right &&
        y >= bounds.top &&
        y <= bounds.bottom
    );
}

export function getEntityCenter(entity: InteractionRaycastEntity) {
    const bounds = getColliderBounds(entity);
    if (!bounds) {
        return {
            x: entity.position.x,
            y: entity.position.y,
        };
    }

    return {
        x: (bounds.left + bounds.right) / 2,
        y: (bounds.top + bounds.bottom) / 2,
    };
}

export function getEntityDistancePx(
    source: InteractionRaycastEntity,
    target: InteractionRaycastEntity,
) {
    const sourceCenter = getEntityCenter(source);
    const targetCenter = getEntityCenter(target);

    return Math.hypot(
        targetCenter.x - sourceCenter.x,
        targetCenter.y - sourceCenter.y,
    );
}

export function hasLineOfSightBetweenEntities(
    source: InteractionRaycastEntity,
    target: InteractionRaycastEntity,
    entities: InteractionRaycastEntity[],
    stepPx: number = 8,
) {
    const from = getEntityCenter(source);
    const to = getEntityCenter(target);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.hypot(dx, dy);

    if (distance <= 0.0001) {
        return true;
    }

    const sampleStep = Math.max(1, Math.round(stepPx));
    const steps = Math.max(1, Math.ceil(distance / sampleStep));

    const blockers = entities.filter(
        (entity) =>
            entity.id !== source.id &&
            entity.id !== target.id &&
            entity.collider?.collisionResponse === "block",
    );

    if (blockers.length <= 0) {
        return true;
    }

    for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const sampleX = from.x + dx * t;
        const sampleY = from.y + dy * t;

        for (const blocker of blockers) {
            const bounds = getColliderBounds(blocker);
            if (!bounds) {
                continue;
            }

            if (pointInBounds(sampleX, sampleY, bounds)) {
                return false;
            }
        }
    }

    return true;
}

export function resolveInteractionHintLabel(
    hint: InteractionInputHint | undefined,
    mode: InteractionInputMode,
    actionLabel: string = "Interact",
) {
    if (typeof hint === "string") {
        return hint;
    }

    const modeHint = hint?.[mode];
    if (modeHint && modeHint.trim().length > 0) {
        return modeHint;
    }

    const label = actionLabel.trim().length > 0 ? actionLabel : "Interact";

    if (mode === "controller") {
        return `Press X to ${label}`;
    }

    if (mode === "pointer") {
        return `Tap to ${label}`;
    }

    return `Press E to ${label}`;
}
