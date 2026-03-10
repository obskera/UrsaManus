import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SoundManager from "@/components/gameModes/SoundManager";
import { audioBus, type AudioCueDefinition } from "@/services/audioBus";

export type BgmComposerToolExampleProps = {
    title?: string;
};

type GenerationStyle = "menu" | "battle";

type GeneratedEvent = {
    atMs: number;
    filePath: string;
    volume: number;
};

type GeneratedTrack = {
    id: string;
    seed: number;
    style: GenerationStyle;
    loopMs: number;
    stepMs: number;
    events: GeneratedEvent[];
};

const DEFAULT_PUBLIC_FILES = ["/beep 1.wav", "/beep 2.wav", "/beep 3.wav"];
const AUDIO_FILE_PATTERN = /\.(wav|mp3|ogg|m4a|aac)$/i;
const FILE_POOL_PRESETS = {
    menu: ["/beep 1.wav", "/beep 3.wav"],
    battle: ["/beep 1.wav", "/beep 2.wav", "/beep 3.wav"],
    all: DEFAULT_PUBLIC_FILES,
} as const;

function normalizePublicPath(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
        return "";
    }

    return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function mulberry32(seed: number) {
    let state = seed >>> 0;
    return () => {
        state += 0x6d2b79f5;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function randomInt(rng: () => number, min: number, max: number) {
    return Math.floor(rng() * (max - min + 1)) + min;
}

function randomChoice<T>(rng: () => number, items: T[]) {
    return items[Math.floor(rng() * items.length)] ?? items[0];
}

function createSeed(counter: number) {
    const randomBits = new Uint32Array(1);
    if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
        window.crypto.getRandomValues(randomBits);
    } else {
        randomBits[0] = Math.floor(Math.random() * 0xffffffff);
    }

    return (
        (randomBits[0] ^ Date.now() ^ Math.imul(counter + 1, 2654435761)) >>> 0
    );
}

function areSameFileSet(left: readonly string[], right: readonly string[]) {
    if (left.length !== right.length) {
        return false;
    }

    const leftSorted = [...left].sort((a, b) => a.localeCompare(b));
    const rightSorted = [...right].sort((a, b) => a.localeCompare(b));

    for (let index = 0; index < leftSorted.length; index += 1) {
        if (leftSorted[index] !== rightSorted[index]) {
            return false;
        }
    }

    return true;
}

function generateTrack(options: {
    style: GenerationStyle;
    selectedFiles: string[];
    seed: number;
}): GeneratedTrack {
    const { style, selectedFiles, seed } = options;
    const rng = mulberry32(seed);

    const isBattle = style === "battle";
    const stepMs = isBattle
        ? randomInt(rng, 90, 170)
        : randomInt(rng, 160, 280);
    const stepCount = isBattle
        ? randomInt(rng, 32, 52)
        : randomInt(rng, 24, 40);
    const loopMs = stepMs * stepCount;

    const density = isBattle ? 0.78 : 0.52;
    const overlayChance = isBattle ? 0.34 : 0.14;
    const minEvents = isBattle ? 18 : 10;

    const events: GeneratedEvent[] = [];

    for (let step = 0; step < stepCount; step += 1) {
        const phraseAccent = step % 8 === 0 ? 0.2 : step % 4 === 0 ? 0.08 : 0;
        if (rng() <= density + phraseAccent) {
            const filePath = randomChoice(rng, selectedFiles);
            const timeJitter = randomInt(
                rng,
                0,
                Math.max(0, Math.round(stepMs * 0.22)),
            );
            const volumeBase = isBattle
                ? randomInt(rng, 68, 96) / 100
                : randomInt(rng, 56, 88) / 100;

            events.push({
                atMs: Math.min(loopMs - 1, step * stepMs + timeJitter),
                filePath,
                volume: volumeBase,
            });
        }

        if (rng() <= overlayChance) {
            const filePath = randomChoice(rng, selectedFiles);
            const offsetMs = randomInt(
                rng,
                Math.max(18, Math.round(stepMs * 0.2)),
                Math.max(36, Math.round(stepMs * 0.58)),
            );
            const volume = isBattle
                ? randomInt(rng, 48, 78) / 100
                : randomInt(rng, 42, 66) / 100;

            events.push({
                atMs: Math.min(loopMs - 1, step * stepMs + offsetMs),
                filePath,
                volume,
            });
        }
    }

    while (events.length < minEvents) {
        const filePath = randomChoice(rng, selectedFiles);
        events.push({
            atMs: randomInt(rng, 0, Math.max(0, loopMs - 1)),
            filePath,
            volume: randomInt(rng, 52, 92) / 100,
        });
    }

    events.sort((left, right) => left.atMs - right.atMs);

    return {
        id: `${style}-${seed.toString(16)}-${Date.now()}`,
        seed,
        style,
        loopMs,
        stepMs,
        events,
    };
}

const BgmComposerToolExample = ({
    title = "BGM composer tool (RNG generator)",
}: BgmComposerToolExampleProps) => {
    const [availableFiles, setAvailableFiles] =
        useState<string[]>(DEFAULT_PUBLIC_FILES);
    const [selectedFiles, setSelectedFiles] =
        useState<string[]>(DEFAULT_PUBLIC_FILES);
    const [customFileInput, setCustomFileInput] = useState("");
    const [status, setStatus] = useState(
        "Select public files, then generate menu or battle music.",
    );
    const [loopEnabled, setLoopEnabled] = useState(true);
    const [activeTrack, setActiveTrack] = useState<GeneratedTrack | null>(null);
    const [isPreviewing, setIsPreviewing] = useState(false);

    const generationCounterRef = useRef(0);
    const previewTimeoutsRef = useRef<number[]>([]);
    const previewActiveRef = useRef(false);

    const cueRegistry = useMemo(() => {
        const cues: Record<string, AudioCueDefinition> = {};
        const cueIdByPath = new Map<string, string>();

        availableFiles.forEach((filePath, index) => {
            const cueId = `public-file-${index}`;
            cues[cueId] = {
                kind: "file",
                src: filePath,
                gain: 1,
            };
            cueIdByPath.set(filePath, cueId);
        });

        return {
            cues,
            cueIdByPath,
        };
    }, [availableFiles]);

    const activeFilePoolPreset = useMemo<
        keyof typeof FILE_POOL_PRESETS | null
    >(() => {
        if (areSameFileSet(selectedFiles, FILE_POOL_PRESETS.menu)) {
            return "menu";
        }
        if (areSameFileSet(selectedFiles, FILE_POOL_PRESETS.battle)) {
            return "battle";
        }
        if (areSameFileSet(selectedFiles, FILE_POOL_PRESETS.all)) {
            return "all";
        }

        return null;
    }, [selectedFiles]);

    const enableAudio = useCallback(() => {
        audioBus.setEnabled(true);
        audioBus.setMasterMuted(false);
        audioBus.setChannelMuted("music", false);
        audioBus.setChannelMuted("ui", false);
    }, []);

    const stopPreview = useCallback((nextStatus?: string) => {
        previewActiveRef.current = false;
        setIsPreviewing(false);

        for (const timeoutId of previewTimeoutsRef.current) {
            window.clearTimeout(timeoutId);
        }
        previewTimeoutsRef.current = [];

        audioBus.stopChannel("music");
        audioBus.stopChannel("sfx");
        audioBus.stopChannel("ui");

        if (nextStatus) {
            setStatus(nextStatus);
        }
    }, []);

    const playTrack = useCallback(
        (track: GeneratedTrack, options?: { reason?: string }) => {
            if (track.events.length <= 0) {
                setStatus("Track has no events to preview.");
                return;
            }

            stopPreview();
            enableAudio();

            previewActiveRef.current = true;
            setIsPreviewing(true);

            const firstFallbackCue =
                cueRegistry.cueIdByPath.get(selectedFiles[0] ?? "") ?? null;

            const scheduleCycle = (cycle: number) => {
                if (!previewActiveRef.current) {
                    return;
                }

                const cycleOffsetMs = cycle * track.loopMs;

                for (const event of track.events) {
                    const timeoutId = window.setTimeout(() => {
                        if (!previewActiveRef.current) {
                            return;
                        }

                        const cueId =
                            cueRegistry.cueIdByPath.get(event.filePath) ??
                            firstFallbackCue;
                        if (!cueId) {
                            return;
                        }

                        audioBus.play(cueId, {
                            channel: "music",
                            volume: event.volume,
                            restartIfPlaying: false,
                        });
                    }, cycleOffsetMs + event.atMs);

                    previewTimeoutsRef.current.push(timeoutId);
                }

                if (!loopEnabled) {
                    const finishTimeout = window.setTimeout(
                        () => {
                            previewActiveRef.current = false;
                            setIsPreviewing(false);
                            previewTimeoutsRef.current = [];
                            setStatus(
                                `Preview finished (${track.events.length} events across ${track.loopMs}ms).`,
                            );
                        },
                        cycleOffsetMs + track.loopMs + 20,
                    );

                    previewTimeoutsRef.current.push(finishTimeout);
                    return;
                }

                const nextCycleTimeout = window.setTimeout(() => {
                    scheduleCycle(cycle + 1);
                }, cycleOffsetMs + track.loopMs);

                previewTimeoutsRef.current.push(nextCycleTimeout);
            };

            scheduleCycle(0);
            setStatus(
                options?.reason
                    ? `Playing ${track.style} track (${options.reason})${loopEnabled ? " with loop." : "."}`
                    : `Playing ${track.style} track${loopEnabled ? " with loop." : "."}`,
            );
        },
        [
            cueRegistry.cueIdByPath,
            enableAudio,
            loopEnabled,
            selectedFiles,
            stopPreview,
        ],
    );

    const generateAndPlay = useCallback(
        (style: GenerationStyle) => {
            if (selectedFiles.length <= 0) {
                setStatus(
                    "Select at least one sound file before generating music.",
                );
                return;
            }

            generationCounterRef.current += 1;
            const seed = createSeed(generationCounterRef.current);
            const track = generateTrack({
                style,
                selectedFiles,
                seed,
            });

            setActiveTrack(track);
            playTrack(track, { reason: `seed ${seed}` });
        },
        [playTrack, selectedFiles],
    );

    const regenerateLastStyle = useCallback(() => {
        const style = activeTrack?.style ?? "menu";
        generateAndPlay(style);
    }, [activeTrack?.style, generateAndPlay]);

    const addCustomFile = useCallback(() => {
        const normalized = normalizePublicPath(customFileInput);
        if (!normalized) {
            setStatus("Enter a public file path first (example: /beep 1.wav).");
            return;
        }

        if (!AUDIO_FILE_PATTERN.test(normalized)) {
            setStatus(
                "Use an audio file extension: .wav, .mp3, .ogg, .m4a, or .aac.",
            );
            return;
        }

        setAvailableFiles((current) => {
            if (current.includes(normalized)) {
                return current;
            }

            return [...current, normalized];
        });

        setSelectedFiles((current) => {
            if (current.includes(normalized)) {
                return current;
            }

            return [...current, normalized];
        });

        setCustomFileInput("");
        setStatus(`Added ${normalized} to selectable files.`);
    }, [customFileInput]);

    const toggleFileSelection = useCallback((filePath: string) => {
        setSelectedFiles((current) => {
            if (current.includes(filePath)) {
                const next = current.filter((value) => value !== filePath);
                return next;
            }

            return [...current, filePath];
        });
    }, []);

    const applyFilePoolPreset = useCallback(
        (preset: keyof typeof FILE_POOL_PRESETS) => {
            const presetFiles = FILE_POOL_PRESETS[preset];

            setAvailableFiles((current) => {
                const merged = [...current];
                for (const filePath of presetFiles) {
                    if (!merged.includes(filePath)) {
                        merged.push(filePath);
                    }
                }
                return merged;
            });

            setSelectedFiles([...presetFiles]);
            setStatus(
                `Applied ${preset} file pool (${presetFiles.length} files).`,
            );
        },
        [],
    );

    useEffect(() => {
        return () => {
            stopPreview();
        };
    }, [stopPreview]);

    return (
        <section className="um-container um-stack" aria-label={title}>
            <SoundManager cues={cueRegistry.cues} />

            <h3 className="um-title">{title}</h3>
            <p className="um-help">
                Pick sound files from public, then generate randomized menu or
                battle music. Every generate call uses a fresh RNG seed.
            </p>

            <div className="um-panel um-stack">
                <p className="um-label">Selectable public audio files</p>
                <div
                    className="um-row"
                    role="group"
                    aria-label="File pool presets"
                >
                    <button
                        type="button"
                        className={
                            activeFilePoolPreset === "menu"
                                ? "um-button um-button--primary"
                                : "um-button"
                        }
                        aria-pressed={activeFilePoolPreset === "menu"}
                        onClick={() => {
                            applyFilePoolPreset("menu");
                        }}
                    >
                        Preset: Menu pool
                    </button>
                    <button
                        type="button"
                        className={
                            activeFilePoolPreset === "battle"
                                ? "um-button um-button--primary"
                                : "um-button"
                        }
                        aria-pressed={activeFilePoolPreset === "battle"}
                        onClick={() => {
                            applyFilePoolPreset("battle");
                        }}
                    >
                        Preset: Battle pool
                    </button>
                    <button
                        type="button"
                        className={
                            activeFilePoolPreset === "all"
                                ? "um-button um-button--primary"
                                : "um-button"
                        }
                        aria-pressed={activeFilePoolPreset === "all"}
                        onClick={() => {
                            applyFilePoolPreset("all");
                        }}
                    >
                        Preset: All defaults
                    </button>
                </div>
                <div className="um-row" role="group" aria-label="File picker">
                    {availableFiles.map((filePath) => {
                        const checked = selectedFiles.includes(filePath);
                        return (
                            <label
                                key={filePath}
                                className="um-row"
                                style={{ gap: "0.35rem" }}
                            >
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                        toggleFileSelection(filePath);
                                    }}
                                />
                                <span className="um-capsule">{filePath}</span>
                            </label>
                        );
                    })}
                </div>
                <div
                    className="um-row"
                    role="group"
                    aria-label="Add custom file"
                >
                    <input
                        className="um-input"
                        placeholder="/my-sound.wav"
                        value={customFileInput}
                        onChange={(event) => {
                            setCustomFileInput(event.target.value);
                        }}
                    />
                    <button
                        type="button"
                        className="um-button"
                        onClick={addCustomFile}
                    >
                        Add file path
                    </button>
                </div>
                <p className="um-help">
                    Selected files: {selectedFiles.length}. Generators use only
                    selected entries.
                </p>
            </div>

            <div
                className="um-row"
                role="group"
                aria-label="Generator controls"
            >
                <button
                    type="button"
                    className="um-button um-button--primary"
                    onClick={() => {
                        generateAndPlay("menu");
                    }}
                >
                    Generate menu music
                </button>
                <button
                    type="button"
                    className="um-button um-button--primary"
                    onClick={() => {
                        generateAndPlay("battle");
                    }}
                >
                    Generate battle music
                </button>
                <button
                    type="button"
                    className="um-button"
                    onClick={regenerateLastStyle}
                    disabled={selectedFiles.length <= 0}
                >
                    Regenerate last style
                </button>
                <button
                    type="button"
                    className={
                        loopEnabled
                            ? "um-button um-button--primary"
                            : "um-button"
                    }
                    onClick={() => {
                        setLoopEnabled((current) => !current);
                    }}
                >
                    {loopEnabled ? "Loop: on" : "Loop: off"}
                </button>
                <button
                    type="button"
                    className="um-button"
                    onClick={() => {
                        if (!activeTrack) {
                            setStatus("Generate a track first to preview.");
                            return;
                        }

                        playTrack(activeTrack);
                    }}
                    disabled={!activeTrack}
                >
                    Play current preview
                </button>
                <button
                    type="button"
                    className="um-button"
                    onClick={() => {
                        stopPreview("Preview stopped.");
                    }}
                    disabled={!isPreviewing}
                >
                    Stop preview
                </button>
            </div>

            <p className="um-help" aria-live="polite">
                {status}
            </p>

            {activeTrack ? (
                <div className="um-panel um-stack">
                    <p className="um-help">
                        Current track: {activeTrack.style} · seed{" "}
                        {activeTrack.seed} · step {activeTrack.stepMs}ms · loop{" "}
                        {activeTrack.loopMs}ms · {activeTrack.events.length}{" "}
                        events
                    </p>
                    <div
                        className="um-stack"
                        style={{ maxHeight: "14rem", overflowY: "auto" }}
                    >
                        {activeTrack.events.map((event, index) => {
                            return (
                                <div
                                    key={`${activeTrack.id}-${index}`}
                                    className="um-row"
                                >
                                    <span className="um-capsule">
                                        {event.atMs}ms
                                    </span>
                                    <span className="um-capsule">
                                        {event.filePath}
                                    </span>
                                    <span className="um-capsule">
                                        vol {event.volume.toFixed(2)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : null}
        </section>
    );
};

export default BgmComposerToolExample;
