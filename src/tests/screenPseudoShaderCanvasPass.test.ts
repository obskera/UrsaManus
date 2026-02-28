import { afterEach, describe, expect, it, vi } from "vitest";
import { signalBus } from "@/services/signalBus";
import {
    applyScreenPseudoShaderPreset,
    clearScreenPseudoShaderEffects,
    createScreenPseudoShaderCanvasPass,
    createScreenPseudoShaderPreset,
    pushScreenPseudoShaderEffect,
    removeScreenPseudoShaderEffect,
    setScreenPseudoShaderEffects,
} from "@/components/effects";

function createMockCtx(fillRect = vi.fn(), drawImage = vi.fn()) {
    return {
        save: vi.fn(),
        restore: vi.fn(),
        fillRect,
        drawImage,
        globalAlpha: 1,
        globalCompositeOperation: "source-over",
        fillStyle: "#000000",
        filter: "none",
        canvas: {},
    } as unknown as CanvasRenderingContext2D;
}

function createMockCanvasContext() {
    return {
        clearRect: vi.fn(),
        drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
}

function withMockBufferCanvas(options?: {
    getContextReturnsNull?: boolean;
    throwOnSnapshotDraw?: boolean;
}) {
    const originalCreateElement = document.createElement.bind(document);
    const bufferCtx = createMockCanvasContext();

    if (options?.throwOnSnapshotDraw) {
        (
            bufferCtx.drawImage as unknown as ReturnType<typeof vi.fn>
        ).mockImplementation(() => {
            throw new Error("snapshot failed");
        });
    }

    const createElementSpy = vi
        .spyOn(document, "createElement")
        .mockImplementation((tagName: string) => {
            if (tagName !== "canvas") {
                return originalCreateElement(
                    tagName as keyof HTMLElementTagNameMap,
                );
            }

            return {
                width: 0,
                height: 0,
                getContext: vi.fn(() =>
                    options?.getContextReturnsNull ? null : bufferCtx,
                ),
            } as unknown as HTMLCanvasElement;
        });

    return {
        createElementSpy,
        bufferCtx,
        restore: () => {
            createElementSpy.mockRestore();
        },
    };
}

describe("screen pseudo shader canvas pass", () => {
    afterEach(() => {
        signalBus.clear();
    });

    it("applies deterministic preset payloads", () => {
        const warm = createScreenPseudoShaderPreset("cutscene-warm");
        const noir = createScreenPseudoShaderPreset("vhs-noir");

        expect(warm).toEqual([
            {
                id: "warm-tint",
                kind: "tint",
                color: "#f59e0b",
                alpha: 0.16,
            },
            {
                id: "warm-scan",
                kind: "scanline",
                lineAlpha: 0.08,
                lineSpacing: 3,
            },
        ]);
        expect(noir[0]).toEqual(
            expect.objectContaining({ kind: "monochrome" }),
        );
        expect(noir[1]).toEqual(expect.objectContaining({ kind: "vhs" }));
    });

    it("supports set/push/remove/clear through signal bus", () => {
        const controller = createScreenPseudoShaderCanvasPass({
            width: 64,
            height: 32,
        });

        setScreenPseudoShaderEffects([
            {
                id: "base",
                kind: "tint",
                color: "#ffffff",
                alpha: 0.2,
            },
        ]);
        expect(controller.getEffects()).toHaveLength(1);

        pushScreenPseudoShaderEffect({
            id: "scan",
            kind: "scanline",
            lineAlpha: 0.1,
            lineSpacing: 2,
        });
        expect(controller.getEffects()).toHaveLength(2);

        removeScreenPseudoShaderEffect("base");
        expect(controller.getEffects()).toEqual([
            {
                id: "scan",
                kind: "scanline",
                lineAlpha: 0.1,
                lineSpacing: 2,
            },
        ]);

        clearScreenPseudoShaderEffects();
        expect(controller.getEffects()).toEqual([]);

        controller.dispose();
    });

    it("draws active effects and can apply presets via signal", () => {
        const fillRect = vi.fn();
        const drawImage = vi.fn();
        const ctx = createMockCtx(fillRect, drawImage);

        const controller = createScreenPseudoShaderCanvasPass({
            width: 80,
            height: 40,
        });

        setScreenPseudoShaderEffects([
            { kind: "tint", color: "#ef4444", alpha: 0.25 },
            { kind: "scanline", lineAlpha: 0.12, lineSpacing: 4 },
        ]);
        controller.pass.update(16);
        controller.pass.draw({
            ctx,
            width: 80,
            height: 40,
            deltaMs: 16,
        });

        expect(fillRect).toHaveBeenCalled();

        applyScreenPseudoShaderPreset("flashback-mono");
        expect(controller.getEffects()).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ kind: "monochrome" }),
            ]),
        );

        controller.pass.draw({
            ctx,
            width: 80,
            height: 40,
            deltaMs: 16,
        });

        expect(drawImage).toHaveBeenCalled();
        controller.dispose();
    });

    it("treats disabled effects as inactive until enabled", () => {
        const controller = createScreenPseudoShaderCanvasPass({
            width: 32,
            height: 16,
            initialEffects: [
                {
                    id: "tint-disabled",
                    kind: "tint",
                    color: "#000000",
                    enabled: false,
                },
            ],
        });

        expect(controller.pass.isActive()).toBe(false);

        controller.pushEffect({
            id: "scan-enabled",
            kind: "scanline",
            enabled: true,
        });

        expect(controller.pass.isActive()).toBe(true);
        controller.dispose();
    });

    it("renders wavy and vhs effects through the offscreen buffer path", () => {
        const fillRect = vi.fn();
        const drawImage = vi.fn();
        const ctx = createMockCtx(fillRect, drawImage);
        const mockCanvas = withMockBufferCanvas();

        const controller = createScreenPseudoShaderCanvasPass({
            width: 64,
            height: 32,
            initialEffects: [
                {
                    id: "wavy-main",
                    kind: "wavy",
                    amplitudePx: 4,
                    frequency: 3,
                    speedHz: 0.8,
                    verticalStep: 4,
                },
                {
                    id: "vhs-main",
                    kind: "vhs",
                    noiseAlpha: 0.2,
                    scanlineAlpha: 0.1,
                    jitterPx: 3,
                    speedHz: 1.2,
                },
            ],
        });

        controller.pass.update(33);
        controller.pass.draw({
            ctx,
            width: 64,
            height: 32,
            deltaMs: 33,
        });

        expect(drawImage).toHaveBeenCalled();
        expect(fillRect).toHaveBeenCalled();
        expect(mockCanvas.bufferCtx.clearRect).toHaveBeenCalled();
        expect(mockCanvas.bufferCtx.drawImage).toHaveBeenCalled();

        controller.dispose();
        mockCanvas.restore();
    });

    it("skips buffered effects when offscreen canvas context cannot be created", () => {
        const fillRect = vi.fn();
        const drawImage = vi.fn();
        const ctx = createMockCtx(fillRect, drawImage);
        const mockCanvas = withMockBufferCanvas({
            getContextReturnsNull: true,
        });

        const controller = createScreenPseudoShaderCanvasPass({
            width: 40,
            height: 24,
            initialEffects: [
                { id: "wavy-skip", kind: "wavy" },
                { id: "vhs-skip", kind: "vhs" },
            ],
        });

        controller.pass.draw({
            ctx,
            width: 40,
            height: 24,
            deltaMs: 16,
        });

        expect(drawImage).not.toHaveBeenCalled();
        expect(fillRect).not.toHaveBeenCalled();

        controller.dispose();
        mockCanvas.restore();
    });

    it("handles snapshot failures and supports reset plus resized bounds", () => {
        const fillRect = vi.fn();
        const drawImage = vi.fn();
        const ctx = createMockCtx(fillRect, drawImage);
        const mockCanvas = withMockBufferCanvas({ throwOnSnapshotDraw: true });

        const controller = createScreenPseudoShaderCanvasPass({
            width: 32,
            height: 20,
            initialEffects: [{ id: "vhs-fail", kind: "vhs" }],
        });

        controller.pass.update(-25);
        controller.pass.draw({
            ctx,
            width: 32,
            height: 20,
            deltaMs: 16,
        });
        expect(drawImage).not.toHaveBeenCalled();

        controller.pass.reset?.();
        controller.setBounds(80, 40);
        controller.setEffects([
            {
                id: "scan-clamped",
                kind: "scanline",
                lineAlpha: 99,
                lineSpacing: 0,
            },
        ]);

        controller.pass.draw({
            ctx,
            width: 80,
            height: 40,
            deltaMs: 16,
        });

        expect(fillRect).toHaveBeenCalled();
        controller.dispose();
        mockCanvas.restore();
    });

    it("skips disabled effects during draw and uses fallback effect defaults", () => {
        const fillRect = vi.fn();
        const drawImage = vi.fn();
        const ctx = createMockCtx(fillRect, drawImage);
        const mockCanvas = withMockBufferCanvas();

        const controller = createScreenPseudoShaderCanvasPass({
            width: 36,
            height: 18,
            initialEffects: [
                {
                    id: "disabled-tint",
                    kind: "tint",
                    color: "#ff00ff",
                    enabled: false,
                },
                {
                    id: "fallback-mono",
                    kind: "monochrome",
                },
                {
                    id: "fallback-wavy",
                    kind: "wavy",
                },
                {
                    id: "fallback-vhs",
                    kind: "vhs",
                },
            ],
        });

        controller.pass.draw({
            ctx,
            width: 36,
            height: 18,
            deltaMs: 16,
        });

        expect(drawImage).toHaveBeenCalled();
        expect(mockCanvas.bufferCtx.drawImage).toHaveBeenCalled();
        controller.dispose();
        mockCanvas.restore();
    });

    it("clamps non-finite scanline/tint inputs and handles missing document", () => {
        const fillRect = vi.fn();
        const drawImage = vi.fn();
        const ctx = createMockCtx(fillRect, drawImage);

        const controller = createScreenPseudoShaderCanvasPass({
            width: 20,
            height: 12,
            initialEffects: [
                {
                    id: "bad-tint",
                    kind: "tint",
                    color: "#fff",
                    alpha: Number.NaN,
                },
                {
                    id: "bad-scan",
                    kind: "scanline",
                    lineAlpha: Number.NaN,
                    lineSpacing: -4,
                },
            ],
        });

        controller.pass.draw({
            ctx,
            width: 20,
            height: 12,
            deltaMs: 16,
        });
        expect(fillRect).toHaveBeenCalled();

        drawImage.mockClear();
        const originalDocument = globalThis.document;
        vi.stubGlobal("document", undefined);

        controller.setEffects([{ id: "no-doc", kind: "wavy" }]);
        controller.pass.draw({
            ctx,
            width: 20,
            height: 12,
            deltaMs: 16,
        });

        expect(drawImage).not.toHaveBeenCalled();
        vi.stubGlobal("document", originalDocument);
        controller.dispose();
    });
});
