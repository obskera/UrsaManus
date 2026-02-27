import { useMemo } from "react";
import { CanvasEffectsStage } from "./CanvasEffectsStage";

export function useCanvasEffectsStage() {
    return useMemo(() => new CanvasEffectsStage(), []);
}
