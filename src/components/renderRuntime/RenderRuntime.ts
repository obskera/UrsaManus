import {
    RENDER_PHASE_ORDER,
    type RenderFrame,
    type RenderPhase,
    type RenderPlugin,
} from "./types";

type RenderRuntimeOptions = {
    maxDeltaMs?: number;
    requestFrame?: (callback: FrameRequestCallback) => number;
    cancelFrame?: (id: number) => void;
};

function getPhaseIndex(phase: RenderPhase): number {
    const index = RENDER_PHASE_ORDER.indexOf(phase);
    return index >= 0 ? index : Number.MAX_SAFE_INTEGER;
}

export class RenderRuntime {
    private pluginsById = new Map<string, RenderPlugin>();
    private readonly maxDeltaMs: number;
    private readonly requestFrame: (callback: FrameRequestCallback) => number;
    private readonly cancelFrame: (id: number) => void;
    private rafId: number | null = null;
    private lastNowMs: number | null = null;
    private frameFactory:
        | ((nowMs: number, deltaMs: number) => RenderFrame)
        | null = null;

    constructor(options: RenderRuntimeOptions = {}) {
        this.maxDeltaMs = options.maxDeltaMs ?? 50;
        this.requestFrame =
            options.requestFrame ??
            ((callback) => {
                return requestAnimationFrame(callback);
            });
        this.cancelFrame =
            options.cancelFrame ??
            ((id) => {
                cancelAnimationFrame(id);
            });
    }

    upsertPlugin(plugin: RenderPlugin): void {
        this.pluginsById.set(plugin.id, plugin);
    }

    removePlugin(pluginId: string): void {
        const plugin = this.pluginsById.get(pluginId);
        plugin?.dispose?.();
        this.pluginsById.delete(pluginId);
    }

    clear(): void {
        for (const plugin of this.pluginsById.values()) {
            plugin.dispose?.();
        }

        this.pluginsById.clear();
    }

    start(frameFactory: (nowMs: number, deltaMs: number) => RenderFrame): void {
        this.stop();

        this.frameFactory = frameFactory;
        this.lastNowMs = null;

        const tick: FrameRequestCallback = (nowMs) => {
            if (!this.frameFactory) {
                return;
            }

            const deltaMs =
                this.lastNowMs === null
                    ? 0
                    : Math.min(this.maxDeltaMs, nowMs - this.lastNowMs);
            this.lastNowMs = nowMs;

            this.runFrame(this.frameFactory(nowMs, deltaMs));
            this.rafId = this.requestFrame(tick);
        };

        this.rafId = this.requestFrame(tick);
    }

    stop(): void {
        this.frameFactory = null;
        this.lastNowMs = null;

        if (this.rafId === null) {
            return;
        }

        this.cancelFrame(this.rafId);
        this.rafId = null;
    }

    resetAll(): void {
        for (const plugin of this.pluginsById.values()) {
            plugin.reset?.();
        }
    }

    getOrderedPlugins(): RenderPlugin[] {
        return Array.from(this.pluginsById.values()).sort((left, right) => {
            const phaseDelta =
                getPhaseIndex(left.phase) - getPhaseIndex(right.phase);

            if (phaseDelta !== 0) {
                return phaseDelta;
            }

            const priorityDelta = left.priority - right.priority;
            if (priorityDelta !== 0) {
                return priorityDelta;
            }

            return left.id.localeCompare(right.id);
        });
    }

    runFrame(frame: RenderFrame): void {
        for (const plugin of this.getOrderedPlugins()) {
            if (!plugin.isActive(frame)) {
                continue;
            }

            plugin.update(frame);
            plugin.draw(frame);
        }
    }
}
