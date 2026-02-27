import {
    CANVAS_EFFECT_LAYER_ORDER,
    type CanvasEffectFrame,
    type CanvasEffectLayer,
    type CanvasEffectPass,
} from "./types";

export type EffectGraphPlugin = CanvasEffectPass;

function getLayerIndex(layer: CanvasEffectLayer) {
    const index = CANVAS_EFFECT_LAYER_ORDER.indexOf(layer);
    return index >= 0 ? index : Number.MAX_SAFE_INTEGER;
}

export class EffectGraph {
    private pluginsById = new Map<string, EffectGraphPlugin>();

    upsertPlugin(plugin: EffectGraphPlugin) {
        this.pluginsById.set(plugin.id, plugin);
    }

    removePlugin(pluginId: string) {
        this.pluginsById.delete(pluginId);
    }

    clear() {
        this.pluginsById.clear();
    }

    resetAll() {
        for (const plugin of this.pluginsById.values()) {
            plugin.reset?.();
        }
    }

    hasActivePlugins() {
        for (const plugin of this.pluginsById.values()) {
            if (plugin.isActive()) {
                return true;
            }
        }

        return false;
    }

    run(frame: CanvasEffectFrame) {
        const orderedPlugins = Array.from(this.pluginsById.values()).sort(
            (left, right) => {
                const layerDelta =
                    getLayerIndex(left.layer) - getLayerIndex(right.layer);
                if (layerDelta !== 0) {
                    return layerDelta;
                }

                return left.id.localeCompare(right.id);
            },
        );

        for (const plugin of orderedPlugins) {
            if (!plugin.isActive()) {
                continue;
            }

            plugin.update(frame.deltaMs);
            plugin.draw(frame);
        }
    }
}
