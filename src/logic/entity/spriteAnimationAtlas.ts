import type { SpriteAnimation } from "@/logic/entity/Entity";

export type SpriteTileFrame = readonly [number, number];

export type SpriteClipLoopMode = "loop" | "once" | "ping-pong";

export type SpriteAnimationClip = {
    spriteSheet: string;
    name: string;
    frames: SpriteTileFrame[];
    fps: number;
    loop: SpriteClipLoopMode;
};

export type SpriteAtlasClipDefinition = {
    name: string;
    fps?: number;
    loop?: SpriteClipLoopMode;
} & (
    | {
          frames: SpriteTileFrame[];
      }
    | {
          range: {
              from: SpriteTileFrame;
              to: SpriteTileFrame;
          };
      }
);

export type SpriteAtlasDefinition = {
    spriteSheet: string;
    tileWidth: number;
    tileHeight: number;
    defaultFps?: number;
    defaultLoop?: SpriteClipLoopMode;
    clips: SpriteAtlasClipDefinition[];
};

export type SpriteClipFrameSample = {
    frame: SpriteTileFrame;
    frameIndex: number;
    isComplete: boolean;
};

function isFiniteInteger(value: number): boolean {
    return Number.isFinite(value) && Number.isInteger(value);
}

function assertTileInBounds(
    frame: SpriteTileFrame,
    tileWidth: number,
    tileHeight: number,
    clipName: string,
): void {
    const [x, y] = frame;
    if (
        !isFiniteInteger(x) ||
        !isFiniteInteger(y) ||
        x < 0 ||
        y < 0 ||
        x >= tileWidth ||
        y >= tileHeight
    ) {
        throw new Error(
            `Clip "${clipName}" contains out-of-bounds frame [${x}, ${y}] for atlas ${tileWidth}x${tileHeight}`,
        );
    }
}

function expandRangeFrames(
    clipName: string,
    from: SpriteTileFrame,
    to: SpriteTileFrame,
): SpriteTileFrame[] {
    const xStep = from[0] <= to[0] ? 1 : -1;
    const yStep = from[1] <= to[1] ? 1 : -1;
    const frames: SpriteTileFrame[] = [];

    for (let y = from[1]; y !== to[1] + yStep; y += yStep) {
        for (let x = from[0]; x !== to[0] + xStep; x += xStep) {
            frames.push([x, y]);
        }
    }

    if (frames.length === 0) {
        throw new Error(`Clip "${clipName}" range expanded to zero frames`);
    }

    return frames;
}

function normalizeClipFrames(
    clip: SpriteAtlasClipDefinition,
    tileWidth: number,
    tileHeight: number,
): SpriteTileFrame[] {
    const frames =
        "frames" in clip
            ? clip.frames.map(
                  (frame) => [frame[0], frame[1]] as SpriteTileFrame,
              )
            : expandRangeFrames(clip.name, clip.range.from, clip.range.to);

    if (frames.length === 0) {
        throw new Error(`Clip "${clip.name}" must define at least one frame`);
    }

    for (const frame of frames) {
        assertTileInBounds(frame, tileWidth, tileHeight, clip.name);
    }

    return frames;
}

function normalizeFps(
    fps: number | undefined,
    clipName: string,
    fallbackFps: number,
): number {
    const value = fps ?? fallbackFps;
    if (!Number.isFinite(value) || value <= 0) {
        throw new Error(`Clip "${clipName}" has invalid fps "${value}"`);
    }

    return value;
}

export function createSpriteAnimationClips(
    atlas: SpriteAtlasDefinition,
): SpriteAnimationClip[] {
    if (!Number.isFinite(atlas.tileWidth) || atlas.tileWidth <= 0) {
        throw new Error("Atlas tileWidth must be a positive number");
    }

    if (!Number.isFinite(atlas.tileHeight) || atlas.tileHeight <= 0) {
        throw new Error("Atlas tileHeight must be a positive number");
    }

    const fallbackFps = atlas.defaultFps ?? 8;
    if (!Number.isFinite(fallbackFps) || fallbackFps <= 0) {
        throw new Error("Atlas defaultFps must be a positive number");
    }

    const fallbackLoop = atlas.defaultLoop ?? "loop";

    const seenNames = new Set<string>();
    const clips: SpriteAnimationClip[] = [];

    for (const clipDefinition of atlas.clips) {
        const normalizedName = clipDefinition.name.trim();
        if (normalizedName.length === 0) {
            throw new Error("Clip name must not be empty");
        }

        if (seenNames.has(normalizedName)) {
            throw new Error(`Duplicate clip name "${normalizedName}"`);
        }
        seenNames.add(normalizedName);

        const frames = normalizeClipFrames(
            clipDefinition,
            atlas.tileWidth,
            atlas.tileHeight,
        );

        clips.push({
            spriteSheet: atlas.spriteSheet,
            name: normalizedName,
            frames,
            fps: normalizeFps(clipDefinition.fps, normalizedName, fallbackFps),
            loop: clipDefinition.loop ?? fallbackLoop,
        });
    }

    return clips;
}

export function clipsToSpriteAnimations(
    clips: SpriteAnimationClip[],
): SpriteAnimation[] {
    return clips.map((clip) => ({
        spriteSheet: clip.spriteSheet,
        name: clip.name,
        frames: clip.frames.map((frame) => [frame[0], frame[1]]),
    }));
}

export function sampleSpriteClipFrame(
    clip: {
        frames: readonly SpriteTileFrame[];
        fps: number;
        loop: SpriteClipLoopMode;
    },
    elapsedMs: number,
): SpriteClipFrameSample {
    if (clip.frames.length === 0) {
        throw new Error("Cannot sample clip with zero frames");
    }

    if (!Number.isFinite(clip.fps) || clip.fps <= 0) {
        throw new Error(`Cannot sample clip with invalid fps "${clip.fps}"`);
    }

    const frameDurationMs = 1000 / clip.fps;
    const normalizedElapsedMs = Math.max(0, elapsedMs);
    const frameProgress = Math.floor(normalizedElapsedMs / frameDurationMs);

    if (clip.loop === "once") {
        const frameIndex = Math.min(frameProgress, clip.frames.length - 1);
        return {
            frame: clip.frames[frameIndex],
            frameIndex,
            isComplete: frameProgress >= clip.frames.length - 1,
        };
    }

    if (clip.loop === "ping-pong") {
        if (clip.frames.length === 1) {
            return {
                frame: clip.frames[0],
                frameIndex: 0,
                isComplete: false,
            };
        }

        const pingPongLength = clip.frames.length * 2 - 2;
        const wrapped = frameProgress % pingPongLength;
        const frameIndex =
            wrapped < clip.frames.length ? wrapped : pingPongLength - wrapped;

        return {
            frame: clip.frames[frameIndex],
            frameIndex,
            isComplete: false,
        };
    }

    const frameIndex = frameProgress % clip.frames.length;
    return {
        frame: clip.frames[frameIndex],
        frameIndex,
        isComplete: false,
    };
}
