import { signalBus } from "@/services/signalBus";

export type MarkerCategory =
    | "objective"
    | "poi"
    | "interaction"
    | "navigation"
    | "custom";

export type MarkerChannel =
    | "map"
    | "minimap"
    | "objective-tracker"
    | "interaction-prompt";

export type MarkerPosition = {
    x: number;
    y: number;
    z?: number;
};

export type MarkerVisibilityRule<TContext = unknown> = {
    channels?: MarkerChannel[];
    predicate?: (context: TContext) => boolean;
};

export type MarkerRecord<TContext = unknown> = {
    id: string;
    category: MarkerCategory;
    label: string;
    position?: MarkerPosition;
    priority?: number;
    stackGroup?: string;
    visibility?: MarkerVisibilityRule<TContext>;
    metadata?: Record<string, unknown>;
};

export type ResolvedMarker<TContext = unknown> = MarkerRecord<TContext> & {
    priority: number;
};

export type MarkerRegistrySnapshot<TContext = unknown> = {
    total: number;
    markers: ResolvedMarker<TContext>[];
};

export type ResolveMarkerOptions<TContext = unknown> = {
    channel?: MarkerChannel;
    context?: TContext;
    categories?: MarkerCategory[];
    limit?: number;
};

export const MARKER_REGISTRY_CHANGED_SIGNAL = "markers:registry:changed";

export type MarkerRegistry<TContext = unknown> = {
    setMarker: (marker: MarkerRecord<TContext>) => void;
    setMarkers: (markers: MarkerRecord<TContext>[]) => void;
    removeMarker: (id: string) => boolean;
    clearMarkers: () => void;
    getMarker: (id: string) => ResolvedMarker<TContext> | null;
    getSnapshot: () => MarkerRegistrySnapshot<TContext>;
    resolveMarkers: (
        options?: ResolveMarkerOptions<TContext>,
    ) => ResolvedMarker<TContext>[];
};

const normalizePriority = (value: number | undefined): number => {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.round(value ?? 0);
};

function normalizeMarker<TContext>(
    marker: MarkerRecord<TContext>,
): ResolvedMarker<TContext> {
    return {
        ...marker,
        priority: normalizePriority(marker.priority),
    };
}

function markerPassesVisibility<TContext>(
    marker: ResolvedMarker<TContext>,
    options: ResolveMarkerOptions<TContext>,
): boolean {
    if (options.categories && options.categories.length > 0) {
        if (!options.categories.includes(marker.category)) {
            return false;
        }
    }

    const channel = options.channel;
    if (channel && marker.visibility?.channels) {
        if (!marker.visibility.channels.includes(channel)) {
            return false;
        }
    }

    if (marker.visibility?.predicate) {
        const context = options.context as TContext;
        if (!marker.visibility.predicate(context)) {
            return false;
        }
    }

    return true;
}

function applyPriorityStacking<TContext>(
    markers: ResolvedMarker<TContext>[],
): ResolvedMarker<TContext>[] {
    const byStackGroup = new Map<string, ResolvedMarker<TContext>>();
    const ungrouped: ResolvedMarker<TContext>[] = [];

    for (const marker of markers) {
        const stackGroup = marker.stackGroup?.trim();
        if (!stackGroup) {
            ungrouped.push(marker);
            continue;
        }

        const existing = byStackGroup.get(stackGroup);
        if (!existing || marker.priority > existing.priority) {
            byStackGroup.set(stackGroup, marker);
        }
    }

    return [...ungrouped, ...byStackGroup.values()].sort((a, b) => {
        if (a.priority === b.priority) {
            return a.id.localeCompare(b.id);
        }

        return b.priority - a.priority;
    });
}

export function createMarkerRegistry<
    TContext = unknown,
>(): MarkerRegistry<TContext> {
    const markersById = new Map<string, ResolvedMarker<TContext>>();

    const emitChanged = () => {
        signalBus.emit(MARKER_REGISTRY_CHANGED_SIGNAL, {
            total: markersById.size,
        });
    };

    const setMarker: MarkerRegistry<TContext>["setMarker"] = (marker) => {
        const id = marker.id.trim();
        if (!id) {
            return;
        }

        markersById.set(id, normalizeMarker({ ...marker, id }));
        emitChanged();
    };

    const setMarkers: MarkerRegistry<TContext>["setMarkers"] = (markers) => {
        markersById.clear();

        for (const marker of markers) {
            const id = marker.id.trim();
            if (!id) {
                continue;
            }

            markersById.set(id, normalizeMarker({ ...marker, id }));
        }

        emitChanged();
    };

    const removeMarker: MarkerRegistry<TContext>["removeMarker"] = (id) => {
        const didDelete = markersById.delete(id);
        if (didDelete) {
            emitChanged();
        }

        return didDelete;
    };

    const clearMarkers: MarkerRegistry<TContext>["clearMarkers"] = () => {
        if (markersById.size === 0) {
            return;
        }

        markersById.clear();
        emitChanged();
    };

    const getMarker: MarkerRegistry<TContext>["getMarker"] = (id) => {
        return markersById.get(id) ?? null;
    };

    const getSnapshot: MarkerRegistry<TContext>["getSnapshot"] = () => {
        const markers = Array.from(markersById.values()).sort((a, b) => {
            if (a.priority === b.priority) {
                return a.id.localeCompare(b.id);
            }

            return b.priority - a.priority;
        });

        return {
            total: markers.length,
            markers,
        };
    };

    const resolveMarkers: MarkerRegistry<TContext>["resolveMarkers"] = (
        options = {},
    ) => {
        const filtered = Array.from(markersById.values()).filter((marker) =>
            markerPassesVisibility(marker, options),
        );
        const stacked = applyPriorityStacking(filtered);

        const limit = Number.isFinite(options.limit)
            ? Math.max(0, Math.floor(options.limit ?? stacked.length))
            : stacked.length;

        if (limit === 0) {
            return [];
        }

        return stacked.slice(0, limit);
    };

    return {
        setMarker,
        setMarkers,
        removeMarker,
        clearMarkers,
        getMarker,
        getSnapshot,
        resolveMarkers,
    };
}

export const markerRegistry = createMarkerRegistry();
