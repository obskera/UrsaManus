export type SpritePseudoShaderEffect =
    | {
          kind: "tint";
          color: string;
          alpha?: number;
          enabled?: boolean;
      }
    | {
          kind: "flash";
          color?: string;
          strength?: number;
          pulseHz?: number;
          phaseMs?: number;
          enabled?: boolean;
      }
    | {
          kind: "outline";
          color: string;
          width?: number;
          alpha?: number;
          enabled?: boolean;
      }
    | {
          kind: "desaturate";
          amount?: number;
          enabled?: boolean;
      };

export type SpritePseudoShaderDrawImageArgs = {
    image: CanvasImageSource;
    sx: number;
    sy: number;
    sw: number;
    sh: number;
    dx: number;
    dy: number;
    dw: number;
    dh: number;
};

export type SpritePseudoShaderApplyInput = {
    ctx: CanvasRenderingContext2D;
    nowMs: number;
    effects: readonly SpritePseudoShaderEffect[];
    destination: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    drawImageArgs: SpritePseudoShaderDrawImageArgs;
};

const DEFAULT_FLASH_COLOR = "#ffffff";

function clamp(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) {
        return min;
    }

    return Math.min(max, Math.max(min, value));
}

export function computeFlashAlpha(effect: {
    nowMs: number;
    strength?: number;
    pulseHz?: number;
    phaseMs?: number;
}): number {
    const strength = clamp(effect.strength ?? 0.75, 0, 1);
    const pulseHz = clamp(effect.pulseHz ?? 8, 0.1, 60);
    const phaseMs = Number.isFinite(effect.phaseMs ?? 0)
        ? (effect.phaseMs ?? 0)
        : 0;
    const radians = ((effect.nowMs + phaseMs) / 1000) * Math.PI * 2 * pulseHz;
    const wave01 = (Math.sin(radians) + 1) / 2;

    return clamp(wave01 * strength, 0, 1);
}

export function isSpritePseudoShaderEffectActive(
    effect: SpritePseudoShaderEffect,
    nowMs: number,
): boolean {
    if (effect.enabled === false) {
        return false;
    }

    switch (effect.kind) {
        case "tint":
            return clamp(effect.alpha ?? 0.4, 0, 1) > 0;
        case "flash":
            return (
                computeFlashAlpha({
                    nowMs,
                    strength: effect.strength,
                    pulseHz: effect.pulseHz,
                    phaseMs: effect.phaseMs,
                }) > 0
            );
        case "outline":
            return (
                clamp(effect.alpha ?? 1, 0, 1) > 0 &&
                clamp(effect.width ?? 1, 0, 16) > 0
            );
        case "desaturate":
            return clamp(effect.amount ?? 1, 0, 1) > 0;
    }
}

export function applySpritePseudoShaderEffects({
    ctx,
    nowMs,
    effects,
    destination,
    drawImageArgs,
}: SpritePseudoShaderApplyInput): void {
    for (const effect of effects) {
        if (!isSpritePseudoShaderEffectActive(effect, nowMs)) {
            continue;
        }

        if (effect.kind === "outline") {
            const lineWidth = clamp(effect.width ?? 1, 0, 16);
            ctx.save();
            ctx.globalAlpha = clamp(effect.alpha ?? 1, 0, 1);
            ctx.strokeStyle = effect.color;
            ctx.lineWidth = lineWidth;
            ctx.strokeRect(
                destination.x - lineWidth / 2,
                destination.y - lineWidth / 2,
                destination.width + lineWidth,
                destination.height + lineWidth,
            );
            ctx.restore();
            continue;
        }

        if (effect.kind === "desaturate") {
            ctx.save();
            ctx.globalAlpha = clamp(effect.amount ?? 1, 0, 1);
            ctx.filter = "grayscale(1)";
            ctx.drawImage(
                drawImageArgs.image,
                drawImageArgs.sx,
                drawImageArgs.sy,
                drawImageArgs.sw,
                drawImageArgs.sh,
                drawImageArgs.dx,
                drawImageArgs.dy,
                drawImageArgs.dw,
                drawImageArgs.dh,
            );
            ctx.restore();
            continue;
        }

        if (effect.kind === "tint") {
            ctx.save();
            ctx.globalCompositeOperation = "source-atop";
            ctx.globalAlpha = clamp(effect.alpha ?? 0.4, 0, 1);
            ctx.fillStyle = effect.color;
            ctx.fillRect(
                destination.x,
                destination.y,
                destination.width,
                destination.height,
            );
            ctx.restore();
            continue;
        }

        if (effect.kind === "flash") {
            const flashAlpha = computeFlashAlpha({
                nowMs,
                strength: effect.strength,
                pulseHz: effect.pulseHz,
                phaseMs: effect.phaseMs,
            });

            if (flashAlpha <= 0) {
                continue;
            }

            ctx.save();
            ctx.globalCompositeOperation = "source-atop";
            ctx.globalAlpha = flashAlpha;
            ctx.fillStyle = effect.color ?? DEFAULT_FLASH_COLOR;
            ctx.fillRect(
                destination.x,
                destination.y,
                destination.width,
                destination.height,
            );
            ctx.restore();
        }
    }
}
