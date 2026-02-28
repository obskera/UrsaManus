import { describe, expect, it } from "vitest";
import {
    clipsToSpriteAnimations,
    createSpriteAnimationClips,
    sampleSpriteClipFrame,
} from "@/logic/entity/spriteAnimationAtlas";

describe("spriteAnimationAtlas", () => {
    it("creates clips from explicit frames and range definitions", () => {
        const clips = createSpriteAnimationClips({
            spriteSheet: "/spriteSheet.png",
            tileWidth: 8,
            tileHeight: 8,
            defaultFps: 10,
            defaultLoop: "loop",
            clips: [
                {
                    name: "idle",
                    frames: [
                        [0, 0],
                        [1, 0],
                    ],
                },
                {
                    name: "run",
                    range: {
                        from: [0, 1],
                        to: [3, 1],
                    },
                    fps: 14,
                    loop: "ping-pong",
                },
            ],
        });

        expect(clips).toHaveLength(2);
        expect(clips[0]).toEqual(
            expect.objectContaining({
                name: "idle",
                fps: 10,
                loop: "loop",
                frames: [
                    [0, 0],
                    [1, 0],
                ],
            }),
        );
        expect(clips[1]).toEqual(
            expect.objectContaining({
                name: "run",
                fps: 14,
                loop: "ping-pong",
                frames: [
                    [0, 1],
                    [1, 1],
                    [2, 1],
                    [3, 1],
                ],
            }),
        );

        const animations = clipsToSpriteAnimations(clips);
        expect(animations).toEqual([
            {
                spriteSheet: "/spriteSheet.png",
                name: "idle",
                frames: [
                    [0, 0],
                    [1, 0],
                ],
            },
            {
                spriteSheet: "/spriteSheet.png",
                name: "run",
                frames: [
                    [0, 1],
                    [1, 1],
                    [2, 1],
                    [3, 1],
                ],
            },
        ]);
    });

    it("throws when clip names are duplicated", () => {
        expect(() =>
            createSpriteAnimationClips({
                spriteSheet: "/spriteSheet.png",
                tileWidth: 8,
                tileHeight: 8,
                clips: [
                    { name: "idle", frames: [[0, 0]] },
                    { name: "idle", frames: [[1, 0]] },
                ],
            }),
        ).toThrowError(/Duplicate clip name/);
    });

    it("throws when any frame is out of atlas bounds", () => {
        expect(() =>
            createSpriteAnimationClips({
                spriteSheet: "/spriteSheet.png",
                tileWidth: 4,
                tileHeight: 4,
                clips: [
                    {
                        name: "invalid",
                        frames: [[5, 1]],
                    },
                ],
            }),
        ).toThrowError(/out-of-bounds frame/);
    });

    it("samples once loop clips and marks completion", () => {
        const frame0 = [0, 0] as const;
        const frame1 = [1, 0] as const;
        const frame2 = [2, 0] as const;
        const sampleA = sampleSpriteClipFrame(
            {
                frames: [frame0, frame1, frame2],
                fps: 10,
                loop: "once",
            },
            0,
        );
        expect(sampleA).toEqual({
            frame: frame0,
            frameIndex: 0,
            isComplete: false,
        });

        const sampleB = sampleSpriteClipFrame(
            {
                frames: [frame0, frame1, frame2],
                fps: 10,
                loop: "once",
            },
            1000,
        );
        expect(sampleB).toEqual({
            frame: frame2,
            frameIndex: 2,
            isComplete: true,
        });
    });

    it("samples ping-pong clips in alternating order", () => {
        const frames = [
            [0, 0],
            [1, 0],
            [2, 0],
        ] as const;

        const sampledIndexes = [0, 250, 500, 750, 1000, 1250, 1500].map(
            (elapsedMs) =>
                sampleSpriteClipFrame(
                    {
                        frames,
                        fps: 4,
                        loop: "ping-pong",
                    },
                    elapsedMs,
                ).frameIndex,
        );

        expect(sampledIndexes).toEqual([0, 1, 2, 1, 0, 1, 2]);
    });
});
