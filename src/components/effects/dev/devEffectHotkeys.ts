import {
    emitBurningFlameParticles,
    emitDebrisParticles,
    emitMagicShimmerParticles,
    emitSmokeParticles,
    emitSparkParticles,
    startTorchFlameEmitter,
    stopTorchFlameEmitter,
} from "../particleEmitter";
import {
    playScreenTransition,
    type ScreenTransitionVariant,
    type TransitionCorner,
} from "../screenTransition";
import { dataBus } from "@/services/DataBus";

export type SetupDevEffectHotkeysOptions = {
    enabled: boolean;
    width: number;
    height: number;
    getContainer: () => HTMLElement | null;
    cameraPanStepPx?: number;
    cameraPanFastMultiplier?: number;
    onCameraPan?: () => void;
};

export function setupDevEffectHotkeys({
    enabled,
    width,
    height,
    getContainer,
    cameraPanStepPx = 24,
    cameraPanFastMultiplier = 3,
    onCameraPan,
}: SetupDevEffectHotkeysOptions): () => void {
    if (!enabled) {
        return () => {};
    }

    const corners: TransitionCorner[] = [
        "top-left",
        "top-right",
        "bottom-left",
        "bottom-right",
    ];
    const transitionVariants: ScreenTransitionVariant[] = [
        "diagonal",
        "venetian-blinds",
        "mosaic-dissolve",
        "iris",
        "directional-push",
    ];

    let transitionIndex = 0;
    let particleIndex = 0;
    let mousePosition: { x: number; y: number } | null = null;

    const getTorchLocation = () => {
        if (mousePosition) return mousePosition;
        return {
            x: width / 2,
            y: height / 2,
        };
    };

    const onMouseMove = (event: MouseEvent) => {
        const container = getContainer();
        if (!container) {
            mousePosition = null;
            return;
        }

        const rect = container.getBoundingClientRect();
        const localX = event.clientX - rect.left;
        const localY = event.clientY - rect.top;

        if (localX < 0 || localY < 0 || localX > width || localY > height) {
            mousePosition = null;
            return;
        }

        mousePosition = { x: localX, y: localY };
    };

    const onKeyDown = (event: KeyboardEvent) => {
        const key = event.key.toLowerCase();
        if (event.repeat) return;
        const panStep = event.shiftKey
            ? cameraPanStepPx * cameraPanFastMultiplier
            : cameraPanStepPx;

        if (key === "i") {
            dataBus.moveCameraBy(0, -panStep);
            onCameraPan?.();
            return;
        }

        if (key === "k") {
            dataBus.moveCameraBy(0, panStep);
            onCameraPan?.();
            return;
        }

        if (key === "j") {
            dataBus.moveCameraBy(-panStep, 0);
            onCameraPan?.();
            return;
        }

        if (key === "l") {
            dataBus.moveCameraBy(panStep, 0);
            onCameraPan?.();
            return;
        }

        if (key === "f") {
            if (event.shiftKey) {
                stopTorchFlameEmitter("dev-torch");
                return;
            }

            startTorchFlameEmitter("dev-torch", getTorchLocation(), {
                intervalMs: 100,
                amount: 14,
            });
            return;
        }

        if (key === "p") {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const preset = particleIndex % 5;
            particleIndex += 1;

            if (preset === 0) {
                emitSmokeParticles({ x, y });
            } else if (preset === 1) {
                emitSparkParticles({ x, y });
            } else if (preset === 2) {
                emitMagicShimmerParticles({ x, y });
            } else if (preset === 3) {
                emitDebrisParticles({ x, y });
            } else {
                emitBurningFlameParticles({ x, y });
            }
            return;
        }

        if (key !== "t") return;

        const from = corners[transitionIndex % corners.length];
        const variant =
            transitionVariants[transitionIndex % transitionVariants.length];
        transitionIndex += 1;

        const variantOptions =
            variant === "venetian-blinds"
                ? { venetianOrientation: "horizontal" as const }
                : variant === "mosaic-dissolve"
                  ? { mosaicSeed: transitionIndex }
                  : variant === "iris"
                    ? { irisOrigin: "center" as const }
                    : variant === "directional-push"
                      ? {
                            pushFrom: (
                                ["left", "right", "top", "bottom"] as const
                            )[transitionIndex % 4],
                        }
                      : {};

        playScreenTransition({
            color: "black",
            from,
            variant,
            durationMs: 500,
            stepMs: 16,
            boxSize: 16,
            ...variantOptions,
        });
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("keydown", onKeyDown);

    return () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("keydown", onKeyDown);
        stopTorchFlameEmitter("dev-torch");
    };
}
