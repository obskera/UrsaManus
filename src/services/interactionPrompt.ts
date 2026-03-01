export type InteractionPromptConfig = {
    id: string;
    label: string;
    actionLabel?: string;
    radius: number;
    cooldownMs?: number;
};

export type InteractionPromptState = {
    id: string;
    visible: boolean;
    canInteract: boolean;
    promptText: string;
    cooldownRemainingMs: number;
};

export type InteractionPromptService = {
    updateDistance: (distance: number) => void;
    update: (deltaMs: number) => void;
    trigger: () => boolean;
    getState: () => InteractionPromptState;
};

function normalizeMs(value: number | undefined): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, Math.floor(value ?? 0));
}

export function createInteractionPromptService(
    config: InteractionPromptConfig,
): InteractionPromptService {
    const id = config.id.trim();
    const label = config.label.trim() || "Interact";
    const actionLabel = config.actionLabel?.trim() || "E";
    const radius = Number.isFinite(config.radius)
        ? Math.max(0, config.radius)
        : 0;
    const cooldownMs = normalizeMs(config.cooldownMs);

    let distance = Number.POSITIVE_INFINITY;
    let cooldownRemainingMs = 0;

    return {
        updateDistance: (nextDistance) => {
            distance = Number.isFinite(nextDistance)
                ? Math.max(0, nextDistance)
                : Number.POSITIVE_INFINITY;
        },
        update: (deltaMs) => {
            const normalized = normalizeMs(deltaMs);
            if (normalized <= 0) {
                return;
            }

            cooldownRemainingMs = Math.max(0, cooldownRemainingMs - normalized);
        },
        trigger: () => {
            const visible = distance <= radius;
            if (!visible || cooldownRemainingMs > 0) {
                return false;
            }

            cooldownRemainingMs = cooldownMs;
            return true;
        },
        getState: () => {
            const visible = distance <= radius;
            const canInteract = visible && cooldownRemainingMs <= 0;

            return {
                id,
                visible,
                canInteract,
                promptText: `${label} [${actionLabel}]`,
                cooldownRemainingMs,
            };
        },
    };
}
