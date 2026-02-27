import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useCanvasEffectsStage } from "@/components/effects/canvas";

describe("useCanvasEffectsStage", () => {
    it("returns a stable stage instance across re-renders", () => {
        const stages: unknown[] = [];

        const Probe = ({ tick }: { tick: number }) => {
            void tick;
            const stage = useCanvasEffectsStage();
            stages.push(stage);
            return null;
        };

        const { rerender } = render(<Probe tick={0} />);
        rerender(<Probe tick={1} />);

        expect(stages).toHaveLength(2);
        expect(stages[0]).toBe(stages[1]);
    });
});
