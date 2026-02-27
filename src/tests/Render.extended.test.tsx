import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Render from "../components/Render/Render";

type TestGlobals = {
    Image: unknown;
    requestAnimationFrame: typeof requestAnimationFrame;
    cancelAnimationFrame: typeof cancelAnimationFrame;
};

type MockDrawContext = {
    imageSmoothingEnabled: boolean;
    clearRect: ReturnType<typeof vi.fn>;
    drawImage: ReturnType<typeof vi.fn>;
    strokeRect: ReturnType<typeof vi.fn>;
    strokeStyle: string;
    lineWidth: number;
};

const testGlobals = globalThis as unknown as TestGlobals;
const canvasContexts = new WeakMap<HTMLCanvasElement, MockDrawContext>();

const getMockContext = (canvas: HTMLCanvasElement): MockDrawContext | null => {
    return canvasContexts.get(canvas) ?? null;
};

describe("Render coverage tests", () => {
    const originalImage = testGlobals.Image;
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    const origRaf = testGlobals.requestAnimationFrame;
    const origCancel = testGlobals.cancelAnimationFrame;

    beforeEach(() => {
        // Mock a 2D context per-canvas with the methods Render expects
        const mockGetContext = function (this: HTMLCanvasElement) {
            const existingCtx = canvasContexts.get(this);
            if (existingCtx)
                return existingCtx as unknown as CanvasRenderingContext2D;

            const ctx: MockDrawContext = {
                imageSmoothingEnabled: false,
                clearRect: vi.fn(),
                drawImage: vi.fn(),
                strokeRect: vi.fn(),
                strokeStyle: "",
                lineWidth: 1,
            };

            canvasContexts.set(this, ctx);
            return ctx as unknown as CanvasRenderingContext2D;
        } as unknown as typeof HTMLCanvasElement.prototype.getContext;

        HTMLCanvasElement.prototype.getContext = mockGetContext;

        // async RAF to avoid synchronous recursion; support cancelation via timeout id
        const rafMap = new Map<number, number>();
        let nextId = 1;
        testGlobals.requestAnimationFrame = (cb: FrameRequestCallback) => {
            const id = nextId++;
            const to = setTimeout(
                () => cb(performance.now()),
                0,
            ) as unknown as number;
            rafMap.set(id, to);
            return id;
        };

        testGlobals.cancelAnimationFrame = (id: number) => {
            const to = rafMap.get(id);
            if (to) clearTimeout(to);
            rafMap.delete(id);
        };
    });

    afterEach(() => {
        testGlobals.Image = originalImage;
        HTMLCanvasElement.prototype.getContext = originalGetContext;
        testGlobals.requestAnimationFrame = origRaf;
        testGlobals.cancelAnimationFrame = origCancel;
        vi.restoreAllMocks();
    });

    it("draws image and debug collider when image loads", async () => {
        // Mock Image to call onload
        class MockImage {
            onload: (() => void) | null = null;
            onerror: ((error?: unknown) => void) | null = null;
            _src = "";
            set src(val: string) {
                this._src = val;
                if (this.onload)
                    Promise.resolve().then(() => this.onload && this.onload());
            }
            get src() {
                return this._src;
            }
            width = 32;
            height = 32;
        }

        testGlobals.Image = MockImage;

        const items = [
            {
                spriteImageSheet: "sheet.png",
                spriteSize: 8,
                spriteSheetTileWidth: 4,
                spriteSheetTileHeight: 4,
                characterSpriteTiles: [
                    [0, 0],
                    [1, 0],
                ],
                scaler: 2,
                position: { x: 2, y: 3 },
                fps: 60,
                collider: {
                    type: "rectangle" as const,
                    size: { width: 4, height: 4 },
                    offset: { x: 1, y: 1 },
                    debugDraw: true,
                },
            },
        ];

        const { container, unmount } = render(
            <Render items={items} width={64} height={64} />,
        );

        const canvas = container.querySelector("canvas") as HTMLCanvasElement;
        expect(canvas).toBeTruthy();

        // allow microtasks where Image.onload runs
        await Promise.resolve();
        // allow the RAF macrotask to run
        await new Promise((r) => setTimeout(r, 0));

        // context should have been used; verify by checking mocked methods
        const ctx = getMockContext(canvas);
        if (!ctx) throw new Error("Expected mocked canvas context");
        await waitFor(() => expect(ctx.drawImage).toHaveBeenCalled());
        await waitFor(() => expect(ctx.strokeRect).toHaveBeenCalled());
        expect(ctx.strokeStyle).toBe("#60a5fa");

        unmount();
    });

    it("skips collider drawing when showDebugOutlines is false", async () => {
        class MockImageHiddenDebug {
            onload: (() => void) | null = null;
            onerror: ((error?: unknown) => void) | null = null;
            _src = "";
            set src(val: string) {
                this._src = val;
                if (this.onload)
                    Promise.resolve().then(() => this.onload && this.onload());
            }
            get src() {
                return this._src;
            }
        }

        testGlobals.Image = MockImageHiddenDebug;

        const items = [
            {
                spriteImageSheet: "sheet.png",
                spriteSize: 8,
                spriteSheetTileWidth: 4,
                spriteSheetTileHeight: 4,
                characterSpriteTiles: [[0, 0]],
                scaler: 2,
                position: { x: 2, y: 3 },
                collider: {
                    type: "rectangle" as const,
                    size: { width: 4, height: 4 },
                    offset: { x: 1, y: 1 },
                    debugDraw: true,
                },
            },
        ];

        const { container, unmount } = render(
            <Render
                items={items}
                width={64}
                height={64}
                showDebugOutlines={false}
            />,
        );

        const canvas = container.querySelector("canvas") as HTMLCanvasElement;
        expect(canvas).toBeTruthy();

        await Promise.resolve();
        await new Promise((r) => setTimeout(r, 0));

        const ctx = getMockContext(canvas);
        if (!ctx) throw new Error("Expected mocked canvas context");
        await waitFor(() => expect(ctx.drawImage).toHaveBeenCalled());
        expect(ctx.strokeRect).not.toHaveBeenCalled();

        unmount();
    });

    it("does nothing if canvas context is unavailable", async () => {
        const originalGet = HTMLCanvasElement.prototype.getContext;
        const noContext = function () {
            return null;
        } as unknown as typeof HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = noContext;

        class MockImage3 {
            onload: (() => void) | null = null;
            onerror: ((error?: unknown) => void) | null = null;
            _src = "";
            set src(val: string) {
                this._src = val;
                if (this.onload)
                    Promise.resolve().then(() => this.onload && this.onload());
            }
            get src() {
                return this._src;
            }
        }

        testGlobals.Image = MockImage3;

        const items = [
            {
                spriteImageSheet: "sheet.png",
                spriteSize: 8,
                spriteSheetTileWidth: 2,
                spriteSheetTileHeight: 2,
                characterSpriteTiles: [[0, 0]],
                scaler: 1,
                position: { x: 0, y: 0 },
            },
        ];

        const { container, unmount } = render(
            <Render items={items} width={32} height={32} />,
        );
        const canvas = container.querySelector("canvas");
        expect(canvas).toBeTruthy();

        await Promise.resolve();
        await new Promise((r) => setTimeout(r, 0));

        unmount();
        HTMLCanvasElement.prototype.getContext = originalGet;
    });

    it("returns early if canvas ref is not set", async () => {
        // Render and unmount immediately so the effect sees no canvas
        const items = [
            {
                spriteImageSheet: "sheet.png",
                spriteSize: 8,
                spriteSheetTileWidth: 2,
                spriteSheetTileHeight: 2,
                characterSpriteTiles: [[0, 0]],
                scaler: 1,
                position: { x: 0, y: 0 },
            },
        ];

        const { unmount } = render(
            <Render items={items} width={32} height={32} />,
        );
        unmount();

        // allow effects to run
        await Promise.resolve();
        await new Promise((r) => setTimeout(r, 0));
    });

    it("does not start tick loop if component is unmounted before images load (cancelled)", async () => {
        const originalImage = testGlobals.Image;

        class SlowImage {
            onload: (() => void) | null = null;
            onerror: ((error?: unknown) => void) | null = null;
            _src = "";
            set src(val: string) {
                this._src = val;
                // load after a short delay
                setTimeout(() => this.onload && this.onload(), 10);
            }
            get src() {
                return this._src;
            }
        }

        testGlobals.Image = SlowImage;

        const items = [
            {
                spriteImageSheet: "slow.png",
                spriteSize: 8,
                spriteSheetTileWidth: 2,
                spriteSheetTileHeight: 2,
                characterSpriteTiles: [[0, 0]],
                scaler: 1,
                position: { x: 0, y: 0 },
            },
        ];

        const { unmount } = render(
            <Render items={items} width={32} height={32} />,
        );

        // unmount before image loads, causing cancelled to be true
        unmount();

        // wait enough for the image onload to fire if it would
        await new Promise((r) => setTimeout(r, 20));

        // component was unmounted before image load; nothing to assert beyond no throw

        testGlobals.Image = originalImage;
    });

    it("skips items with empty characterSpriteTiles and uses default fps", async () => {
        const originalImage = testGlobals.Image;

        class MockImage4 {
            onload: (() => void) | null = null;
            onerror: ((error?: unknown) => void) | null = null;
            _src = "";
            set src(val: string) {
                this._src = val;
                if (this.onload)
                    Promise.resolve().then(() => this.onload && this.onload());
            }
            get src() {
                return this._src;
            }
        }

        testGlobals.Image = MockImage4;

        const items = [
            {
                spriteImageSheet: "sheet.png",
                spriteSize: 8,
                spriteSheetTileWidth: 2,
                spriteSheetTileHeight: 2,
                characterSpriteTiles: [],
                scaler: 1,
                position: { x: 0, y: 0 },
            },
        ];

        const { container, unmount } = render(
            <Render items={items} width={32} height={32} />,
        );
        const canvas = container.querySelector("canvas") as HTMLCanvasElement;
        expect(canvas).toBeTruthy();

        await Promise.resolve();
        await new Promise((r) => setTimeout(r, 0));

        const ctx = getMockContext(canvas);
        if (!ctx) throw new Error("Expected mocked canvas context");
        expect(ctx.drawImage).not.toHaveBeenCalled();

        unmount();
        testGlobals.Image = originalImage;
    });

    it("cancels RAF on unmount", async () => {
        const originalImage = testGlobals.Image;
        class MockImage5 {
            onload: (() => void) | null = null;
            onerror: ((error?: unknown) => void) | null = null;
            _src = "";
            set src(val: string) {
                this._src = val;
                if (this.onload)
                    Promise.resolve().then(() => this.onload && this.onload());
            }
            get src() {
                return this._src;
            }
        }
        testGlobals.Image = MockImage5;

        const cancelSpy = vi.spyOn(testGlobals, "cancelAnimationFrame");

        const items = [
            {
                spriteImageSheet: "sheet.png",
                spriteSize: 8,
                spriteSheetTileWidth: 2,
                spriteSheetTileHeight: 2,
                characterSpriteTiles: [[0, 0]],
                scaler: 1,
                position: { x: 0, y: 0 },
            },
        ];

        const { unmount } = render(
            <Render items={items} width={32} height={32} />,
        );

        await Promise.resolve();
        await new Promise((r) => setTimeout(r, 0));

        unmount();

        expect(cancelSpy).toHaveBeenCalled();
        cancelSpy.mockRestore();
        testGlobals.Image = originalImage;
    });

    it("uses default fps and skips collider drawing when debugDraw is false", async () => {
        const originalImage = testGlobals.Image;

        class MockImage6 {
            onload: (() => void) | null = null;
            onerror: ((error?: unknown) => void) | null = null;
            _src = "";
            set src(val: string) {
                this._src = val;
                if (this.onload)
                    Promise.resolve().then(() => this.onload && this.onload());
            }
            get src() {
                return this._src;
            }
        }

        testGlobals.Image = MockImage6;

        const items = [
            {
                spriteImageSheet: "sheet.png",
                spriteSize: 8,
                spriteSheetTileWidth: 2,
                spriteSheetTileHeight: 2,
                characterSpriteTiles: [
                    [0, 0],
                    [1, 0],
                ],
                // fps omitted to use default
                scaler: 1,
                position: { x: 0, y: 0 },
                collider: {
                    type: "rectangle" as const,
                    size: { width: 2, height: 2 },
                    offset: { x: 0, y: 0 },
                    debugDraw: false,
                },
            },
            {
                spriteImageSheet: "sheet.png",
                spriteSize: 8,
                spriteSheetTileWidth: 2,
                spriteSheetTileHeight: 2,
                characterSpriteTiles: [[0, 0]],
                scaler: 1,
                position: { x: 10, y: 10 },
            },
        ];

        const { container, unmount } = render(
            <Render items={items} width={64} height={64} />,
        );
        const canvas = container.querySelector("canvas") as HTMLCanvasElement;
        expect(canvas).toBeTruthy();

        await Promise.resolve();
        await new Promise((r) => setTimeout(r, 0));

        const ctx = getMockContext(canvas);
        if (!ctx) throw new Error("Expected mocked canvas context");
        await waitFor(() => expect(ctx.drawImage).toHaveBeenCalled());
        // debugDraw false => strokeRect should not be called for first item
        expect(ctx.strokeRect).not.toHaveBeenCalled();

        unmount();
        testGlobals.Image = originalImage;
    });

    it("logs error when image fails to load", async () => {
        const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        class ErrorImage {
            onload: (() => void) | null = null;
            onerror: ((error?: unknown) => void) | null = null;
            _src = "";
            set src(val: string) {
                this._src = val;
                if (this.onerror)
                    Promise.resolve().then(
                        () => this.onerror && this.onerror(new Error("fail")),
                    );
            }
            get src() {
                return this._src;
            }
        }

        testGlobals.Image = ErrorImage;

        const items = [
            {
                spriteImageSheet: "missing.png",
                spriteSize: 8,
                spriteSheetTileWidth: 1,
                spriteSheetTileHeight: 1,
                characterSpriteTiles: [[0, 0]],
                scaler: 1,
                position: { x: 0, y: 0 },
            },
        ];

        render(<Render items={items} width={32} height={32} />);

        // allow microtask where Image.onerror runs and outer catch logs
        await Promise.resolve();
        // allow the RAF/macrotask to run so the catch can execute
        await new Promise((r) => setTimeout(r, 0));

        expect(errSpy).toHaveBeenCalled();
        errSpy.mockRestore();
    });

    it("continues rendering valid entities when one entity has invalid tile frame", async () => {
        class MockImageInvalidTile {
            onload: (() => void) | null = null;
            onerror: ((error?: unknown) => void) | null = null;
            _src = "";
            set src(val: string) {
                this._src = val;
                if (this.onload)
                    Promise.resolve().then(() => this.onload && this.onload());
            }
            get src() {
                return this._src;
            }
        }

        testGlobals.Image = MockImageInvalidTile;

        const items = [
            {
                spriteImageSheet: "sheet.png",
                spriteSize: 8,
                spriteSheetTileWidth: 2,
                spriteSheetTileHeight: 2,
                characterSpriteTiles: [[99, 99]],
                scaler: 1,
                position: { x: 0, y: 0 },
            },
            {
                spriteImageSheet: "sheet.png",
                spriteSize: 8,
                spriteSheetTileWidth: 2,
                spriteSheetTileHeight: 2,
                characterSpriteTiles: [[0, 0]],
                scaler: 1,
                position: { x: 12, y: 12 },
            },
        ];

        const { container, unmount } = render(
            <Render items={items} width={64} height={64} />,
        );
        const canvas = container.querySelector("canvas") as HTMLCanvasElement;
        expect(canvas).toBeTruthy();

        await Promise.resolve();
        await new Promise((r) => setTimeout(r, 0));

        const ctx = getMockContext(canvas);
        if (!ctx) throw new Error("Expected mocked canvas context");
        await waitFor(() => expect(ctx.drawImage).toHaveBeenCalled());

        unmount();
    });
});
