import { render } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Render from "../components/Render/Render";

type TestGlobals = {
    Image: unknown;
};

const testGlobals = globalThis as unknown as TestGlobals;

describe("Render component", () => {
    const originalImage = testGlobals.Image;

    beforeAll(() => {
        // Mock Image to immediately succeed when src is set
        class MockImage {
            onload: (() => void) | null = null;
            onerror: (() => void) | null = null;
            _src = "";
            set src(val: string) {
                this._src = val;
                // simulate async load microtask
                if (this.onload) {
                    Promise.resolve().then(() => this.onload && this.onload());
                }
            }
            get src() {
                return this._src;
            }
            width = 32;
            height = 32;
        }

        testGlobals.Image = MockImage;
    });

    afterAll(() => {
        testGlobals.Image = originalImage;
    });

    it("renders a canvas and starts render loop", async () => {
        const items = [
            {
                spriteImageSheet: "sheet.png",
                spriteSize: 16,
                spriteSheetTileWidth: 2,
                spriteSheetTileHeight: 2,
                characterSpriteTiles: [[0, 0]],
                scaler: 1,
                position: { x: 0, y: 0 },
            },
        ];

        const { container, unmount } = render(
            <Render items={items} width={64} height={64} />,
        );

        const canvas = container.querySelector("canvas");
        expect(canvas).toBeTruthy();

        // allow the mocked image to "load"
        await Promise.resolve();

        unmount();
    });
});
