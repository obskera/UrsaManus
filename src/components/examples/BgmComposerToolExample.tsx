import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
} from "react";
import SoundManager from "@/components/gameModes/SoundManager";
import {
    audioBus,
    type AudioCueDefinition,
    type AudioChannel,
} from "@/services/audioBus";
import {
    exportBrowserJsonFile,
    readBrowserJsonFileText,
} from "@/services/browserJsonFile";
import {
    parseJsonDocument,
    stringifyJsonDocument,
    TOOL_JSON_MESSAGE,
    withStatusPrefix,
    type JsonValidationResult,
} from "@/services/toolJsonDocument";
import {
    clearToolRecoverySnapshot,
    loadToolRecoverySnapshot,
    persistToolRecoverySnapshot,
} from "@/services/toolRecoverySnapshot";

export type BgmComposerToolExampleProps = {
    title?: string;
};

type BgmToolDocument = {
    version: "um-bgm-v1";
    name: string;
    bpm: number;
    stepMs: number;
    loop: {
        startStep: number;
        endStep: number;
    };
    palette: Array<{
        id: string;
        file: string;
        gain?: number;
    }>;
    sequence: Array<{
        step: number;
        soundId: string;
        lengthSteps: number;
        bend?: {
            cents: number;
            curve: "linear" | "ease-in" | "ease-out";
        };
        effect?:
            | "none"
            | "vibrato"
            | "tremolo"
            | "bitcrush"
            | "filter"
            | "send";
    }>;
};

type StepOverride = {
    muted: boolean;
    solo: boolean;
    channel: AudioChannel;
};

type EditHistory = {
    entries: string[];
    index: number;
};

type ToolPerfDiagnostics = {
    label: string;
    durationMs: number;
    payloadBytes: number;
};

type PresetKey = "intro" | "loop-a" | "battle" | "custom";

const STARTER_DOCUMENT: BgmToolDocument = {
    version: "um-bgm-v1",
    name: "overworld-loop-a",
    bpm: 132,
    stepMs: 120,
    loop: {
        startStep: 0,
        endStep: 16,
    },
    palette: [
        { id: "sq1", file: "assets/audio/chiptune/sq1.wav", gain: 0.8 },
        { id: "sq2", file: "assets/audio/chiptune/sq2.wav", gain: 0.75 },
        { id: "tri", file: "assets/audio/chiptune/tri.wav", gain: 0.9 },
        { id: "noise", file: "assets/audio/chiptune/noise.wav", gain: 0.65 },
    ],
    sequence: [
        { step: 0, soundId: "sq1", lengthSteps: 2, effect: "vibrato" },
        {
            step: 2,
            soundId: "sq2",
            lengthSteps: 2,
            bend: { cents: 80, curve: "ease-out" },
        },
        { step: 4, soundId: "tri", lengthSteps: 4, effect: "none" },
        { step: 8, soundId: "noise", lengthSteps: 1, effect: "bitcrush" },
        { step: 10, soundId: "sq1", lengthSteps: 2, effect: "tremolo" },
        { step: 12, soundId: "sq2", lengthSteps: 2, effect: "none" },
        { step: 14, soundId: "tri", lengthSteps: 2, effect: "none" },
    ],
};

const INTRO_PRESET_DOCUMENT: BgmToolDocument = {
    version: "um-bgm-v1",
    name: "intro-fanfare-a",
    bpm: 108,
    stepMs: 140,
    loop: {
        startStep: 0,
        endStep: 8,
    },
    palette: [
        { id: "sq1", file: "assets/audio/chiptune/sq1.wav", gain: 0.85 },
        { id: "tri", file: "assets/audio/chiptune/tri.wav", gain: 0.9 },
        { id: "noise", file: "assets/audio/chiptune/noise.wav", gain: 0.55 },
    ],
    sequence: [
        { step: 0, soundId: "sq1", lengthSteps: 2, effect: "tremolo" },
        { step: 2, soundId: "tri", lengthSteps: 2, effect: "none" },
        {
            step: 4,
            soundId: "sq1",
            lengthSteps: 2,
            bend: { cents: 120, curve: "ease-out" },
        },
        { step: 6, soundId: "noise", lengthSteps: 1, effect: "bitcrush" },
    ],
};

const LOOP_A_PRESET_DOCUMENT: BgmToolDocument = STARTER_DOCUMENT;

const BATTLE_PRESET_DOCUMENT: BgmToolDocument = {
    version: "um-bgm-v1",
    name: "battle-loop-b",
    bpm: 156,
    stepMs: 96,
    loop: {
        startStep: 0,
        endStep: 16,
    },
    palette: [
        { id: "sq1", file: "assets/audio/chiptune/sq1.wav", gain: 0.85 },
        { id: "sq2", file: "assets/audio/chiptune/sq2.wav", gain: 0.8 },
        { id: "noise", file: "assets/audio/chiptune/noise.wav", gain: 0.7 },
    ],
    sequence: [
        { step: 0, soundId: "sq1", lengthSteps: 1, effect: "vibrato" },
        { step: 1, soundId: "sq2", lengthSteps: 1, effect: "none" },
        { step: 2, soundId: "noise", lengthSteps: 1, effect: "bitcrush" },
        { step: 4, soundId: "sq1", lengthSteps: 2, effect: "tremolo" },
        {
            step: 6,
            soundId: "sq2",
            lengthSteps: 2,
            bend: { cents: 90, curve: "ease-in" },
        },
        { step: 8, soundId: "noise", lengthSteps: 1, effect: "bitcrush" },
        { step: 10, soundId: "sq1", lengthSteps: 2, effect: "none" },
        { step: 12, soundId: "sq2", lengthSteps: 2, effect: "none" },
        { step: 14, soundId: "noise", lengthSteps: 1, effect: "bitcrush" },
    ],
};

const BGM_RECOVERY_TOOL_KEY = "bgm";

function validateDocument(
    value: unknown,
): JsonValidationResult<BgmToolDocument> {
    if (!value || typeof value !== "object") {
        return { ok: false, message: "Payload must be a JSON object." };
    }

    const parsed = value as Partial<BgmToolDocument>;
    if (parsed.version !== "um-bgm-v1") {
        return { ok: false, message: 'version must be "um-bgm-v1".' };
    }

    if (!parsed.name || !parsed.name.trim()) {
        return { ok: false, message: "name is required." };
    }

    if (!Number.isFinite(parsed.bpm) || Number(parsed.bpm) <= 0) {
        return { ok: false, message: "bpm must be a positive number." };
    }

    if (!Number.isFinite(parsed.stepMs) || Number(parsed.stepMs) <= 0) {
        return { ok: false, message: "stepMs must be a positive number." };
    }

    if (!Array.isArray(parsed.palette) || parsed.palette.length < 1) {
        return {
            ok: false,
            message: "palette must include at least one sound.",
        };
    }

    if (!Array.isArray(parsed.sequence)) {
        return { ok: false, message: "sequence must be an array." };
    }

    const soundIds = new Set(parsed.palette.map((entry) => entry.id));
    if (soundIds.size !== parsed.palette.length) {
        return { ok: false, message: "palette ids must be unique." };
    }

    for (const note of parsed.sequence) {
        if (!soundIds.has(note.soundId)) {
            return {
                ok: false,
                message: `sequence references unknown soundId: ${note.soundId}`,
            };
        }

        if (!Number.isInteger(note.step) || note.step < 0) {
            return {
                ok: false,
                message: "each note step must be >= 0 integer.",
            };
        }

        if (!Number.isInteger(note.lengthSteps) || note.lengthSteps <= 0) {
            return {
                ok: false,
                message: "each note lengthSteps must be positive integer.",
            };
        }
    }

    return { ok: true, value: parsed as BgmToolDocument };
}

const BgmComposerToolExample = ({
    title = "BGM composer tool (JSON authoring MVP)",
}: BgmComposerToolExampleProps) => {
    const [initialRaw] = useState(() =>
        stringifyJsonDocument(STARTER_DOCUMENT),
    );
    const [raw, setRaw] = useState(initialRaw);
    const [history, setHistory] = useState<EditHistory>({
        entries: [initialRaw],
        index: 0,
    });
    const [savedRaw, setSavedRaw] = useState(initialRaw);
    const [status, setStatus] = useState("Ready.");
    const [lastAutosaveAt, setLastAutosaveAt] = useState<string | null>(null);
    const [perfDiagnostics, setPerfDiagnostics] =
        useState<ToolPerfDiagnostics | null>(null);
    const [activePreset, setActivePreset] = useState<PresetKey>("loop-a");
    const [loopPreviewEnabled, setLoopPreviewEnabled] = useState(false);
    const [stepOverrides, setStepOverrides] = useState<
        Record<number, StepOverride>
    >({});
    const previewTimeoutsRef = useRef<number[]>([]);
    const previewLoopActiveRef = useRef(false);
    const importFileInputRef = useRef<HTMLInputElement | null>(null);

    const isDirty = raw !== savedRaw;
    const canUndo = history.index > 0;
    const canRedo = history.index < history.entries.length - 1;

    const pushHistory = (nextRaw: string) => {
        setHistory((current) => {
            const currentRaw = current.entries[current.index];
            if (currentRaw === nextRaw) {
                return current;
            }

            const base = current.entries.slice(0, current.index + 1);
            const nextEntries = [...base, nextRaw];
            const maxEntries = 120;

            if (nextEntries.length > maxEntries) {
                const trimmed = nextEntries.slice(
                    nextEntries.length - maxEntries,
                );
                return {
                    entries: trimmed,
                    index: trimmed.length - 1,
                };
            }

            return {
                entries: nextEntries,
                index: nextEntries.length - 1,
            };
        });
    };

    const updateRaw = (
        nextRaw: string,
        options?: {
            trackHistory?: boolean;
            markSaved?: boolean;
        },
    ) => {
        setRaw(nextRaw);

        if (options?.trackHistory !== false) {
            pushHistory(nextRaw);
        }

        if (options?.markSaved) {
            setSavedRaw(nextRaw);
        }
    };

    const summary = useMemo(() => {
        try {
            const parsed = JSON.parse(raw) as Partial<BgmToolDocument>;
            const paletteCount = Array.isArray(parsed.palette)
                ? parsed.palette.length
                : 0;
            const sequenceCount = Array.isArray(parsed.sequence)
                ? parsed.sequence.length
                : 0;
            const bpm = Number(parsed.bpm) || 0;
            const stepMs = Number(parsed.stepMs) || 0;

            return `Palette: ${paletteCount} sounds. Steps: ${sequenceCount}. Tempo: ${bpm} BPM / ${stepMs}ms.`;
        } catch {
            return "Summary unavailable until JSON is valid.";
        }
    }, [raw]);

    const parsedDocument = useMemo(() => {
        const parsed = parseJsonDocument<BgmToolDocument>(raw, {
            invalidJsonMessage: TOOL_JSON_MESSAGE.validationInvalidJson,
            validate: validateDocument,
        });

        if (!parsed.ok) {
            return null;
        }

        return parsed.value;
    }, [raw]);

    const registeredCues = useMemo<Record<string, AudioCueDefinition>>(() => {
        if (!parsedDocument) {
            return {};
        }

        const cues: Record<string, AudioCueDefinition> = {};
        for (const paletteEntry of parsedDocument.palette) {
            cues[paletteEntry.id] = {
                kind: "file",
                src: paletteEntry.file,
                gain: paletteEntry.gain ?? 1,
            };
        }

        return cues;
    }, [parsedDocument]);

    const stopPreview = (nextStatus?: string) => {
        previewLoopActiveRef.current = false;
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
    };

    const resolvePreviewEffectShape = (
        note: BgmToolDocument["sequence"][number],
        baseStepMs: number,
    ): {
        gainMultiplier: number;
        bendScale: number;
        retriggerCount: number;
        retriggerSpacingMs: number;
        restartIfPlaying: boolean;
    } => {
        const bendScale = note.bend
            ? 1 - Math.min(0.3, Math.abs(note.bend.cents) / 1200)
            : 1;

        if (note.effect === "bitcrush") {
            return {
                gainMultiplier: 0.75,
                bendScale,
                retriggerCount: 1,
                retriggerSpacingMs: Math.max(10, Math.round(baseStepMs * 0.1)),
                restartIfPlaying: true,
            };
        }

        if (note.effect === "tremolo") {
            return {
                gainMultiplier: 0.88,
                bendScale,
                retriggerCount: 2,
                retriggerSpacingMs: Math.max(12, Math.round(baseStepMs * 0.2)),
                restartIfPlaying: false,
            };
        }

        if (note.effect === "vibrato") {
            return {
                gainMultiplier: 0.92,
                bendScale,
                retriggerCount: 1,
                retriggerSpacingMs: Math.max(10, Math.round(baseStepMs * 0.14)),
                restartIfPlaying: false,
            };
        }

        if (note.effect === "filter") {
            return {
                gainMultiplier: 0.84,
                bendScale,
                retriggerCount: 0,
                retriggerSpacingMs: 0,
                restartIfPlaying: true,
            };
        }

        if (note.effect === "send") {
            return {
                gainMultiplier: 0.9,
                bendScale,
                retriggerCount: 1,
                retriggerSpacingMs: Math.max(16, Math.round(baseStepMs * 0.3)),
                restartIfPlaying: false,
            };
        }

        return {
            gainMultiplier: 1,
            bendScale,
            retriggerCount: 0,
            retriggerSpacingMs: 0,
            restartIfPlaying: true,
        };
    };

    const getStepOverride = (stepIndex: number): StepOverride => {
        return (
            stepOverrides[stepIndex] ?? {
                muted: false,
                solo: false,
                channel: "music",
            }
        );
    };

    const patchStepOverride = (
        stepIndex: number,
        patch: Partial<StepOverride>,
    ) => {
        setStepOverrides((current) => {
            const base =
                current[stepIndex] ??
                ({
                    muted: false,
                    solo: false,
                    channel: "music",
                } satisfies StepOverride);

            return {
                ...current,
                [stepIndex]: {
                    ...base,
                    ...patch,
                },
            };
        });
    };

    const runPreview = () => {
        const parsedResult = parseJsonDocument<BgmToolDocument>(raw, {
            invalidJsonMessage: TOOL_JSON_MESSAGE.previewInvalidJson,
            validate: validateDocument,
        });
        if (!parsedResult.ok) {
            setStatus(
                withStatusPrefix("Preview failed: ", parsedResult.message),
            );
            return;
        }

        const document = parsedResult.value;
        const noteCount = document.sequence.length;
        if (noteCount <= 0) {
            setStatus("Preview skipped: sequence is empty.");
            return;
        }

        stopPreview();
        previewLoopActiveRef.current = true;

        const cueById = new Set(document.palette.map((entry) => entry.id));
        const baseStepMs = Number.isFinite(document.stepMs)
            ? Number(document.stepMs)
            : Math.round(60000 / Math.max(1, document.bpm));

        const previewChannel: AudioChannel = "music";
        const previewWindowStart = Math.max(0, document.loop.startStep);
        const previewWindowEnd = Math.max(
            previewWindowStart + 1,
            document.loop.endStep,
        );

        const scheduledNotes = document.sequence.filter((note) => {
            return (
                note.step >= previewWindowStart && note.step < previewWindowEnd
            );
        });

        const indexedScheduledNotes = document.sequence
            .map((note, index) => ({ note, index }))
            .filter(({ note }) => {
                return (
                    note.step >= previewWindowStart &&
                    note.step < previewWindowEnd
                );
            });

        const hasSolo = indexedScheduledNotes.some(({ index }) => {
            return getStepOverride(index).solo;
        });

        const playableNotes = indexedScheduledNotes.filter(
            ({ note, index }) => {
                if (!cueById.has(note.soundId)) {
                    return false;
                }

                const override = getStepOverride(index);
                if (override.muted) {
                    return false;
                }

                return hasSolo ? override.solo : true;
            },
        );

        const previewDurationMs = Math.max(
            1,
            Math.round((previewWindowEnd - previewWindowStart) * baseStepMs),
        );

        const scheduleCycle = (cycle: number) => {
            if (!previewLoopActiveRef.current) {
                return;
            }

            const cycleOffsetMs = cycle * previewDurationMs;

            for (const { note, index } of playableNotes) {
                const timeoutMs = Math.max(
                    0,
                    cycleOffsetMs +
                        Math.round(
                            (note.step - previewWindowStart) * baseStepMs,
                        ),
                );

                const timeoutId = window.setTimeout(() => {
                    if (!previewLoopActiveRef.current) {
                        return;
                    }

                    const override = getStepOverride(index);
                    const shape = resolvePreviewEffectShape(note, baseStepMs);

                    audioBus.play(note.soundId, {
                        channel: override.channel ?? previewChannel,
                        volume: shape.gainMultiplier * shape.bendScale,
                        restartIfPlaying: shape.restartIfPlaying,
                    });

                    for (
                        let retriggerIndex = 1;
                        retriggerIndex <= shape.retriggerCount;
                        retriggerIndex += 1
                    ) {
                        const retriggerTimeoutId = window.setTimeout(() => {
                            if (!previewLoopActiveRef.current) {
                                return;
                            }

                            audioBus.play(note.soundId, {
                                channel: override.channel ?? previewChannel,
                                volume:
                                    shape.gainMultiplier *
                                    shape.bendScale *
                                    Math.max(0.35, 1 - retriggerIndex * 0.2),
                                restartIfPlaying: false,
                            });
                        }, retriggerIndex * shape.retriggerSpacingMs);

                        previewTimeoutsRef.current.push(retriggerTimeoutId);
                    }
                }, timeoutMs);

                previewTimeoutsRef.current.push(timeoutId);
            }

            if (!loopPreviewEnabled) {
                const cleanupTimeoutId = window.setTimeout(
                    () => {
                        previewTimeoutsRef.current = [];
                        previewLoopActiveRef.current = false;
                        setStatus(
                            `Preview finished (${playableNotes.length} playable steps across ${previewDurationMs}ms).`,
                        );
                    },
                    cycleOffsetMs + previewDurationMs + 20,
                );
                previewTimeoutsRef.current.push(cleanupTimeoutId);
                return;
            }

            const nextCycleTimeoutId = window.setTimeout(() => {
                scheduleCycle(cycle + 1);
            }, cycleOffsetMs + previewDurationMs);
            previewTimeoutsRef.current.push(nextCycleTimeoutId);
        };

        scheduleCycle(0);

        setStatus(
            `Preview scheduled (${playableNotes.length} playable of ${scheduledNotes.length} window steps, ${previewDurationMs}ms window${
                loopPreviewEnabled ? ", looping on" : ""
            }).`,
        );
    };

    useEffect(() => {
        return () => {
            stopPreview();
        };
    }, []);

    useEffect(() => {
        if (!isDirty) {
            return;
        }

        const onBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = "";
        };

        window.addEventListener("beforeunload", onBeforeUnload);
        return () => {
            window.removeEventListener("beforeunload", onBeforeUnload);
        };
    }, [isDirty]);

    const recoverAutosaveSnapshot = useCallback(
        (options?: { silentMissing?: boolean }): boolean => {
            const loaded = loadToolRecoverySnapshot(BGM_RECOVERY_TOOL_KEY);
            if (!loaded.ok) {
                if (loaded.removeCorrupt) {
                    clearToolRecoverySnapshot(BGM_RECOVERY_TOOL_KEY);
                }

                if (!loaded.missing || !options?.silentMissing) {
                    setStatus(loaded.message);
                }

                if (loaded.missing) {
                    setLastAutosaveAt(null);
                }

                return false;
            }

            setLastAutosaveAt(loaded.envelope.savedAt);

            const autosaveRaw = loaded.envelope.payloadRaw;
            if (!autosaveRaw) {
                if (!options?.silentMissing) {
                    setStatus("Recovery snapshot ignored: payload is invalid.");
                }
                return false;
            }

            const parsed = parseJsonDocument<BgmToolDocument>(autosaveRaw, {
                invalidJsonMessage: "Recovery snapshot ignored: invalid JSON.",
                validate: validateDocument,
            });

            if (!parsed.ok) {
                clearToolRecoverySnapshot(BGM_RECOVERY_TOOL_KEY);
                setLastAutosaveAt(null);
                setStatus(
                    withStatusPrefix(
                        "Recovery snapshot ignored: ",
                        parsed.message,
                    ),
                );
                return false;
            }

            const nextRaw = stringifyJsonDocument(parsed.value);
            if (nextRaw === raw) {
                if (!options?.silentMissing) {
                    setStatus("Autosave snapshot is already applied.");
                }
                return false;
            }

            setRaw(nextRaw);
            setHistory({
                entries: [nextRaw],
                index: 0,
            });
            setActivePreset("custom");
            setStepOverrides({});
            setStatus("Recovered autosave snapshot.");
            return true;
        },
        [raw],
    );

    useEffect(() => {
        recoverAutosaveSnapshot({ silentMissing: true });
    }, [recoverAutosaveSnapshot]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            const persisted = persistToolRecoverySnapshot(
                BGM_RECOVERY_TOOL_KEY,
                raw,
            );

            if (!persisted.ok) {
                setStatus(persisted.message);
                setLastAutosaveAt(null);
                return;
            }

            setLastAutosaveAt(persisted.envelope.savedAt);
        }, 250);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [raw]);

    const loadPreset = (
        preset: "intro" | "loop-a" | "battle",
        document: BgmToolDocument,
    ) => {
        stopPreview();
        setActivePreset(preset);
        setStepOverrides({});
        const nextRaw = stringifyJsonDocument(document);
        updateRaw(nextRaw, { markSaved: true });
        setStatus(
            `Loaded ${
                preset === "intro"
                    ? "Intro"
                    : preset === "loop-a"
                      ? "Loop A"
                      : "Battle"
            } preset.`,
        );
    };

    const exportJsonFile = () => {
        const parsedName = parsedDocument?.name?.trim();
        const fileName = `${parsedName && parsedName.length > 0 ? parsedName : "bgm-composition"}.json`;

        const result = exportBrowserJsonFile(raw, fileName);
        if (!result.ok) {
            setStatus(result.message);
            return;
        }

        setSavedRaw(raw);
        setStatus(`Exported ${fileName}.`);
    };

    const onImportFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        try {
            const readResult = await readBrowserJsonFileText(file);
            if (!readResult.ok) {
                setStatus(readResult.message);
                return;
            }

            const parsedResult = parseJsonDocument<BgmToolDocument>(
                readResult.raw,
                {
                    invalidJsonMessage: TOOL_JSON_MESSAGE.importInvalidJsonFile,
                    validate: validateDocument,
                },
            );
            if (!parsedResult.ok) {
                setStatus(
                    withStatusPrefix("Import failed: ", parsedResult.message),
                );
                return;
            }

            stopPreview();
            const nextRaw = stringifyJsonDocument(parsedResult.value);
            updateRaw(nextRaw, { markSaved: true });
            setStepOverrides({});
            setActivePreset("custom");
            setStatus(`Imported ${file.name}.`);
        } finally {
            event.target.value = "";
        }
    };

    const onOpenRuntimePlaytest = () => {
        const parsed = parseJsonDocument<BgmToolDocument>(raw, {
            invalidJsonMessage: TOOL_JSON_MESSAGE.validationInvalidJson,
            validate: validateDocument,
        });
        if (!parsed.ok) {
            setStatus(
                withStatusPrefix("Playtest launch failed: ", parsed.message),
            );
            return;
        }

        const normalizedRaw = stringifyJsonDocument(parsed.value);
        const persisted = persistToolRecoverySnapshot(
            BGM_RECOVERY_TOOL_KEY,
            normalizedRaw,
        );
        if (!persisted.ok) {
            setStatus(persisted.message);
            setLastAutosaveAt(null);
            return;
        }

        setLastAutosaveAt(persisted.envelope.savedAt);
        setStatus(
            "Playtest launch: validation passed, opening runtime from current BGM state.",
        );

        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.delete("tool");
        window.open(nextUrl.toString(), "_self");
    };

    const onVerifyRoundTrip = () => {
        const startedAt = performance.now();
        const parsed = parseJsonDocument<BgmToolDocument>(raw, {
            invalidJsonMessage: TOOL_JSON_MESSAGE.validationInvalidJson,
            validate: validateDocument,
        });
        if (!parsed.ok) {
            setStatus(
                withStatusPrefix(
                    "Round-trip verification failed: ",
                    parsed.message,
                ),
            );
            return;
        }

        const normalizedRaw = stringifyJsonDocument(parsed.value);
        const reparsed = parseJsonDocument<BgmToolDocument>(normalizedRaw, {
            invalidJsonMessage: TOOL_JSON_MESSAGE.validationInvalidJson,
            validate: validateDocument,
        });
        if (!reparsed.ok) {
            setStatus(
                withStatusPrefix(
                    "Round-trip verification failed: ",
                    reparsed.message,
                ),
            );
            return;
        }

        const roundTrippedRaw = stringifyJsonDocument(reparsed.value);
        const noSemanticDrift = normalizedRaw === roundTrippedRaw;

        if (raw !== roundTrippedRaw) {
            updateRaw(roundTrippedRaw);
            setActivePreset("custom");
        }

        setStatus(
            noSemanticDrift
                ? "Round-trip verification passed: no semantic drift detected."
                : "Round-trip verification warning: semantic drift detected after re-import.",
        );
        setPerfDiagnostics({
            label: "Round-trip verification",
            durationMs: Math.round((performance.now() - startedAt) * 10) / 10,
            payloadBytes: new TextEncoder().encode(roundTrippedRaw).length,
        });
    };

    const onRunPerfDiagnostics = () => {
        const startedAt = performance.now();
        const parsed = parseJsonDocument<BgmToolDocument>(raw, {
            invalidJsonMessage: TOOL_JSON_MESSAGE.validationInvalidJson,
            validate: validateDocument,
        });
        if (!parsed.ok) {
            setStatus(
                withStatusPrefix("Perf diagnostics failed: ", parsed.message),
            );
            return;
        }

        const normalizedRaw = stringifyJsonDocument(parsed.value);
        const reparsed = parseJsonDocument<BgmToolDocument>(normalizedRaw, {
            invalidJsonMessage: TOOL_JSON_MESSAGE.validationInvalidJson,
            validate: validateDocument,
        });
        if (!reparsed.ok) {
            setStatus(
                withStatusPrefix("Perf diagnostics failed: ", reparsed.message),
            );
            return;
        }

        const durationMs =
            Math.round((performance.now() - startedAt) * 10) / 10;
        const payloadBytes = new TextEncoder().encode(normalizedRaw).length;

        setPerfDiagnostics({
            label: "Parse/validate smoke",
            durationMs,
            payloadBytes,
        });
        setStatus(
            `Perf diagnostics complete: parse/validate smoke in ${durationMs}ms.`,
        );
    };

    return (
        <section className="um-container um-stack" aria-label={title}>
            <SoundManager cues={registeredCues} />
            <h3 className="um-title">{title}</h3>
            <p className="um-help">
                Author chiptune-style motif data with palette order, cadence,
                note length, bend, and effect fields in deterministic JSON.
            </p>

            <div
                className="um-row"
                role="group"
                aria-label="BGM composer controls"
            >
                <button
                    type="button"
                    className={
                        activePreset === "intro"
                            ? "um-button um-button--primary"
                            : "um-button"
                    }
                    onClick={() => {
                        loadPreset("intro", INTRO_PRESET_DOCUMENT);
                    }}
                >
                    Preset: Intro
                </button>
                <button
                    type="button"
                    className={
                        activePreset === "loop-a"
                            ? "um-button um-button--primary"
                            : "um-button"
                    }
                    onClick={() => {
                        loadPreset("loop-a", LOOP_A_PRESET_DOCUMENT);
                    }}
                >
                    Preset: Loop A
                </button>
                <button
                    type="button"
                    className={
                        activePreset === "battle"
                            ? "um-button um-button--primary"
                            : "um-button"
                    }
                    onClick={() => {
                        loadPreset("battle", BATTLE_PRESET_DOCUMENT);
                    }}
                >
                    Preset: Battle
                </button>
                <button
                    type="button"
                    className="um-button"
                    onClick={() => {
                        setActivePreset("loop-a");
                        const nextRaw = stringifyJsonDocument(STARTER_DOCUMENT);
                        updateRaw(nextRaw, { markSaved: true });
                        setStepOverrides({});
                        setStatus("Loaded starter document.");
                    }}
                >
                    Reset starter JSON
                </button>
                <button
                    type="button"
                    className="um-button"
                    onClick={() => {
                        if (!canUndo) {
                            return;
                        }

                        const nextIndex = history.index - 1;
                        const nextRaw = history.entries[nextIndex];
                        setHistory((current) => ({
                            ...current,
                            index: nextIndex,
                        }));
                        setRaw(nextRaw);
                        setActivePreset("custom");
                        setStatus("Undo applied.");
                    }}
                    disabled={!canUndo}
                >
                    Undo
                </button>
                <button
                    type="button"
                    className="um-button"
                    onClick={() => {
                        if (!canRedo) {
                            return;
                        }

                        const nextIndex = history.index + 1;
                        const nextRaw = history.entries[nextIndex];
                        setHistory((current) => ({
                            ...current,
                            index: nextIndex,
                        }));
                        setRaw(nextRaw);
                        setActivePreset("custom");
                        setStatus("Redo applied.");
                    }}
                    disabled={!canRedo}
                >
                    Redo
                </button>
                <button
                    type="button"
                    className="um-button"
                    onClick={exportJsonFile}
                >
                    Export JSON file
                </button>
                <button
                    type="button"
                    className="um-button"
                    onClick={() => {
                        importFileInputRef.current?.click();
                    }}
                >
                    Import JSON file
                </button>
                <button
                    type="button"
                    className={
                        loopPreviewEnabled
                            ? "um-button um-button--primary"
                            : "um-button"
                    }
                    onClick={() => {
                        setLoopPreviewEnabled((current) => !current);
                    }}
                >
                    {loopPreviewEnabled
                        ? "Loop preview: on"
                        : "Loop preview: off"}
                </button>
                <button
                    type="button"
                    className="um-button um-button--primary"
                    onClick={() => {
                        const parsed = parseJsonDocument<BgmToolDocument>(raw, {
                            invalidJsonMessage:
                                TOOL_JSON_MESSAGE.validationInvalidJson,
                            validate: validateDocument,
                        });
                        if (!parsed.ok) {
                            setStatus(
                                withStatusPrefix(
                                    "Validation failed: ",
                                    parsed.message,
                                ),
                            );
                            return;
                        }

                        setStatus("Validation passed.");
                    }}
                >
                    Validate JSON
                </button>
                <button
                    type="button"
                    className="um-button um-button--primary"
                    onClick={runPreview}
                >
                    Preview sequence
                </button>
                <button
                    type="button"
                    className="um-button"
                    onClick={() => {
                        stopPreview("Preview stopped.");
                    }}
                >
                    Stop preview
                </button>
                <button
                    type="button"
                    className="um-button um-button--primary"
                    onClick={onOpenRuntimePlaytest}
                >
                    Open in runtime playtest
                </button>
                <button
                    type="button"
                    className="um-button"
                    onClick={onVerifyRoundTrip}
                >
                    Verify round-trip
                </button>
                <button
                    type="button"
                    className="um-button"
                    onClick={onRunPerfDiagnostics}
                >
                    Run perf diagnostics
                </button>
                <input
                    ref={importFileInputRef}
                    type="file"
                    accept="application/json,.json"
                    aria-label="Import BGM JSON file"
                    style={{ display: "none" }}
                    onChange={(event) => {
                        void onImportFileChange(event);
                    }}
                />
            </div>

            {parsedDocument ? (
                <div className="um-panel um-stack">
                    <p className="um-help">
                        Per-step playback overrides (mute/solo/channel) applied
                        during preview.
                    </p>
                    <div className="um-stack">
                        {parsedDocument.sequence.map((note, index) => {
                            const override = getStepOverride(index);

                            return (
                                <div
                                    key={`step-override-${index}`}
                                    className="um-row"
                                    role="group"
                                    aria-label={`Step ${index} overrides`}
                                >
                                    <span className="um-capsule">
                                        #{index} step {note.step} ·{" "}
                                        {note.soundId}
                                    </span>
                                    <button
                                        type="button"
                                        className="um-button"
                                        onClick={() => {
                                            patchStepOverride(index, {
                                                muted: !override.muted,
                                            });
                                        }}
                                    >
                                        {override.muted
                                            ? `Unmute step ${index}`
                                            : `Mute step ${index}`}
                                    </button>
                                    <button
                                        type="button"
                                        className={
                                            override.solo
                                                ? "um-button um-button--primary"
                                                : "um-button"
                                        }
                                        onClick={() => {
                                            patchStepOverride(index, {
                                                solo: !override.solo,
                                            });
                                        }}
                                    >
                                        {override.solo
                                            ? `Unsolo step ${index}`
                                            : `Solo step ${index}`}
                                    </button>
                                    <label
                                        className="um-label"
                                        htmlFor={`step-channel-${index}`}
                                    >
                                        Channel
                                    </label>
                                    <select
                                        id={`step-channel-${index}`}
                                        className="um-select"
                                        value={override.channel}
                                        onChange={(event) => {
                                            patchStepOverride(index, {
                                                channel: event.target
                                                    .value as AudioChannel,
                                            });
                                        }}
                                    >
                                        <option value="music">music</option>
                                        <option value="sfx">sfx</option>
                                        <option value="ui">ui</option>
                                    </select>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : null}

            <div className="um-panel um-stack">
                <label className="um-label" htmlFor="bgm-composer-json">
                    BGM composition JSON
                </label>
                <textarea
                    id="bgm-composer-json"
                    className="um-textarea"
                    value={raw}
                    onChange={(event) => {
                        setActivePreset("custom");
                        updateRaw(event.target.value);
                    }}
                    style={{ minHeight: "16rem" }}
                />
                <p className="um-help" aria-live="polite">
                    {status}
                </p>
                <div
                    className="um-row"
                    role="group"
                    aria-label="Recovery controls"
                >
                    <span className="um-capsule">
                        Last autosave: {lastAutosaveAt ?? "none"}
                    </span>
                    <button
                        type="button"
                        className="um-button"
                        onClick={() => {
                            recoverAutosaveSnapshot();
                        }}
                        disabled={!lastAutosaveAt}
                    >
                        Recover autosave
                    </button>
                    <button
                        type="button"
                        className="um-button"
                        onClick={() => {
                            clearToolRecoverySnapshot(BGM_RECOVERY_TOOL_KEY);
                            setLastAutosaveAt(null);
                            setStatus("Cleared autosave snapshot.");
                        }}
                        disabled={!lastAutosaveAt}
                    >
                        Clear autosave
                    </button>
                </div>
                <p className="um-help">
                    History: {history.index + 1}/{history.entries.length}.
                    Unsaved changes: {isDirty ? "Yes" : "No"}.
                </p>
                <p className="um-help">{summary}</p>
                <p className="um-help">
                    Perf: payload{" "}
                    {(new TextEncoder().encode(raw).length / 1024).toFixed(1)}
                    KB.
                    {perfDiagnostics
                        ? ` Last sample (${perfDiagnostics.label}): ${perfDiagnostics.durationMs}ms.`
                        : " Last sample: none."}
                </p>
            </div>
        </section>
    );
};

export default BgmComposerToolExample;
