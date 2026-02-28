export type TextBoxQueuePolicy = "queue" | "stack";

export type TextBoxQueueEntry<TMeta = Record<string, unknown>> = {
    id: string;
    text: string;
    autoCloseMs?: number;
    meta?: TMeta;
};

export type TextBoxQueueController<TMeta = Record<string, unknown>> = {
    policy: TextBoxQueuePolicy;
    enqueue: (entry: TextBoxQueueEntry<TMeta>) => TextBoxQueueEntry<TMeta>;
    dequeue: () => TextBoxQueueEntry<TMeta> | null;
    clear: () => void;
    getActive: () => TextBoxQueueEntry<TMeta> | null;
    list: () => TextBoxQueueEntry<TMeta>[];
    size: () => number;
};

function normalizeEntry<TMeta>(
    entry: TextBoxQueueEntry<TMeta>,
): TextBoxQueueEntry<TMeta> | null {
    const id = entry.id.trim();
    const text = entry.text;

    if (!id || typeof text !== "string") {
        return null;
    }

    const autoCloseMs = Number.isFinite(entry.autoCloseMs)
        ? Math.max(0, Math.floor(entry.autoCloseMs ?? 0))
        : undefined;

    return {
        id,
        text,
        ...(autoCloseMs !== undefined ? { autoCloseMs } : {}),
        ...(entry.meta !== undefined ? { meta: entry.meta } : {}),
    };
}

export function createTextBoxQueue<TMeta = Record<string, unknown>>(
    policy: TextBoxQueuePolicy = "queue",
): TextBoxQueueController<TMeta> {
    const items: TextBoxQueueEntry<TMeta>[] = [];

    const enqueue: TextBoxQueueController<TMeta>["enqueue"] = (entry) => {
        const normalized = normalizeEntry(entry);
        if (!normalized) {
            throw new Error("Invalid TextBox queue entry.");
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

    const dequeue: TextBoxQueueController<TMeta>["dequeue"] = () => {
        if (items.length === 0) {
            return null;
        }

        if (policy === "stack") {
            return items.pop() ?? null;
        }

        return items.shift() ?? null;
    };

    const clear = () => {
        items.length = 0;
    };

    const getActive = () => {
        if (items.length === 0) {
            return null;
        }

        return policy === "stack" ? items[items.length - 1] : items[0];
    };

    const list = () => {
        return [...items];
    };

    const size = () => {
        return items.length;
    };

    return {
        policy,
        enqueue,
        dequeue,
        clear,
        getActive,
        list,
        size,
    };
}
