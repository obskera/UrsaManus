import type { CanvasEffectFrame, CanvasEffectPass } from "./types";
import { EffectGraph } from "./EffectGraph";

export class CanvasEffectsStage {
    private graph = new EffectGraph();

    upsertPass(pass: CanvasEffectPass) {
        this.graph.upsertPlugin(pass);
    }

    removePass(passId: string) {
        this.graph.removePlugin(passId);
    }

    clear() {
        this.graph.clear();
    }

    resetAll() {
        this.graph.resetAll();
    }

    hasActivePasses() {
        return this.graph.hasActivePlugins();
    }

    updateAndDraw(frame: CanvasEffectFrame) {
        this.graph.run(frame);
    }
}
