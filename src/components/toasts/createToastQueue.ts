export type ToastVariant = "info" | "success" | "warn" | "error";

export type ToastQueueEntry<TMeta = Record<string, unknown>> = {
    id: string;
    message: string;
    variant?: ToastVariant;
    autoDismissMs?: number;
    meta?: TMeta;
};

export type ToastQueueController<TMeta = Record<string, unknown>> = {
    enqueue: (entry: ToastQueueEntry<TMeta>) => ToastQueueEntry<TMeta>;
    dequeue: () => ToastQueueEntry<TMeta> | null;
    remove: (id: string) => ToastQueueEntry<TMeta> | null;
    clear: () => void;
    peek: () => ToastQueueEntry<TMeta> | null;
    list: () => ToastQueueEntry<TMeta>[];
    size: () => number;
};

function normalizeEntry<TMeta>(
    entry: ToastQueueEntry<TMeta>,
): ToastQueueEntry<TMeta> | null {
    const id = entry.id.trim();
    const message = entry.message;

    if (!id || typeof message !== "string") {
        return null;
    }

    const autoDismissMs = Number.isFinite(entry.autoDismissMs)
        ? Math.max(0, Math.floor(entry.autoDismissMs ?? 0))
        : undefined;

    return {
        id,
        message,
        variant: entry.variant ?? "info",
        ...(autoDismissMs !== undefined ? { autoDismissMs } : {}),
        ...(entry.meta !== undefined ? { meta: entry.meta } : {}),
    };
}

export function createToastQueue<
    TMeta = Record<string, unknown>,
>(): ToastQueueController<TMeta> {
    const items: ToastQueueEntry<TMeta>[] = [];

    const enqueue: ToastQueueController<TMeta>["enqueue"] = (entry) => {
        const normalized = normalizeEntry(entry);
        if (!normalized) {
            throw new Error("Invalid toast queue entry.");
        }

        const existingIndex = items.findIndex(
            (candidate) => candidate.id === normalized.id,
        );
        if (existingIndex >= 0) {
            items[existingIndex] = normalized;
            return normalized;
        }

        items.push(normalized);
        return normalized;
    };

    const dequeue: ToastQueueController<TMeta>["dequeue"] = () => {
        if (items.length === 0) {
            return null;
        }

        return items.shift() ?? null;
    };

    const remove: ToastQueueController<TMeta>["remove"] = (id) => {
        const normalizedId = id.trim();
        if (!normalizedId) {
            return null;
        }

        const index = items.findIndex(
            (candidate) => candidate.id === normalizedId,
        );
        if (index < 0) {
            return null;
        }

        return items.splice(index, 1)[0] ?? null;
    };

    const clear = () => {
        items.length = 0;
    };

    const peek = () => {
        return items[0] ?? null;
    };

    const list = () => {
        return [...items];
    };

    const size = () => {
        return items.length;
    };

    return {
        enqueue,
        dequeue,
        remove,
        clear,
        peek,
        list,
        size,
    };
}
