import { loadToolRecoverySnapshot } from "@/services/toolRecoverySnapshot";

const BGM_RECOVERY_TOOL_KEY = "bgm";

export type BgmRuntimeEffect =
    | "none"
    | "vibrato"
    | "tremolo"
    | "bitcrush"
    | "filter"
    | "send";

export type BgmRuntimeCue = {
    step: number;
    atMs: number;
    durationMs: number;
    soundId: string;
    effect: BgmRuntimeEffect;
    shape: {
        gainMultiplier: number;
        bendScale: number;
        retriggerCount: number;
        retriggerSpacingMs: number;
        restartIfPlaying: boolean;
    };
    bend?: {
        cents: number;
        curve: "linear" | "ease-in" | "ease-out";
    };
};

export type BgmRuntimeBootstrapPayload = {
    source: "bgm-recovery";
    name: string;
    bpm: number;
    stepMs: number;
    loop: {
        startStep: number;
        endStep: number;
        windowMs: number;
    };
    cues: BgmRuntimeCue[];
    palette: Array<{
        id: string;
        file: string;
        gain: number;
    }>;
};

export type BgmRuntimeBootstrapResult =
    | {
          ok: true;
          payload: BgmRuntimeBootstrapPayload;
      }
    | {
          ok: false;
          message: string;
          missing?: boolean;
      };

type BgmRuntimeDocument = {
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
        effect?: string;
    }>;
};

const isKnownEffect = (
    value: string | undefined,
): value is BgmRuntimeEffect => {
    return (
        value === "none" ||
        value === "vibrato" ||
        value === "tremolo" ||
        value === "bitcrush" ||
        value === "filter" ||
        value === "send"
    );
};

const normalizeEffect = (value: string | undefined): BgmRuntimeEffect => {
    if (!value) {
        return "none";
    }

    return isKnownEffect(value) ? value : "none";
};

const resolveCueShape = (
    effect: BgmRuntimeEffect,
    bendCents: number,
    stepMs: number,
) => {
    const bendScale = 1 - Math.min(0.3, Math.abs(bendCents) / 1200);

    if (effect === "bitcrush") {
        return {
            gainMultiplier: 0.75,
            bendScale,
            retriggerCount: 1,
            retriggerSpacingMs: Math.max(10, Math.round(stepMs * 0.1)),
            restartIfPlaying: true,
        };
    }

    if (effect === "tremolo") {
        return {
            gainMultiplier: 0.88,
            bendScale,
            retriggerCount: 2,
            retriggerSpacingMs: Math.max(12, Math.round(stepMs * 0.2)),
            restartIfPlaying: false,
        };
    }

    if (effect === "vibrato") {
        return {
            gainMultiplier: 0.92,
            bendScale,
            retriggerCount: 1,
            retriggerSpacingMs: Math.max(10, Math.round(stepMs * 0.14)),
            restartIfPlaying: false,
        };
    }

    if (effect === "filter") {
        return {
            gainMultiplier: 0.84,
            bendScale,
            retriggerCount: 0,
            retriggerSpacingMs: 0,
            restartIfPlaying: true,
        };
    }

    if (effect === "send") {
        return {
            gainMultiplier: 0.9,
            bendScale,
            retriggerCount: 1,
            retriggerSpacingMs: Math.max(16, Math.round(stepMs * 0.3)),
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

const parseDocument = (raw: string): BgmRuntimeBootstrapResult => {
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return {
            ok: false,
            message: "BGM runtime bootstrap failed: invalid JSON.",
        };
    }

    if (!parsed || typeof parsed !== "object") {
        return {
            ok: false,
            message: "BGM runtime bootstrap failed: payload must be an object.",
        };
    }

    const document = parsed as Partial<BgmRuntimeDocument>;
    if (document.version !== "um-bgm-v1") {
        return {
            ok: false,
            message:
                'BGM runtime bootstrap failed: version must be "um-bgm-v1".',
        };
    }

    const name = String(document.name ?? "").trim();
    if (!name) {
        return {
            ok: false,
            message: "BGM runtime bootstrap failed: name is required.",
        };
    }

    const bpm = Number(document.bpm);
    if (!Number.isFinite(bpm) || bpm <= 0) {
        return {
            ok: false,
            message: "BGM runtime bootstrap failed: bpm must be positive.",
        };
    }

    const stepMs = Number(document.stepMs);
    if (!Number.isFinite(stepMs) || stepMs <= 0) {
        return {
            ok: false,
            message: "BGM runtime bootstrap failed: stepMs must be positive.",
        };
    }

    const palette = Array.isArray(document.palette) ? document.palette : [];
    if (palette.length === 0) {
        return {
            ok: false,
            message: "BGM runtime bootstrap failed: palette is required.",
        };
    }

    const sequence = Array.isArray(document.sequence) ? document.sequence : [];
    const soundIds = new Set<string>();
    const normalizedPalette = palette.map((entry) => {
        const id = String(entry.id ?? "").trim();
        const file = String(entry.file ?? "").trim();
        if (!id || !file || soundIds.has(id)) {
            throw new Error(
                "BGM runtime bootstrap failed: invalid palette entries.",
            );
        }

        soundIds.add(id);
        return {
            id,
            file,
            gain: Number.isFinite(entry.gain) ? Number(entry.gain) : 1,
        };
    });

    const loopStart = Math.max(
        0,
        Math.floor(Number(document.loop?.startStep) || 0),
    );
    const loopEnd = Math.max(
        loopStart + 1,
        Math.floor(Number(document.loop?.endStep) || loopStart + 1),
    );

    const cues: BgmRuntimeCue[] = [];
    for (const step of sequence) {
        const stepIndex = Math.floor(Number(step.step));
        const lengthSteps = Math.max(
            1,
            Math.floor(Number(step.lengthSteps) || 1),
        );
        const soundId = String(step.soundId ?? "").trim();

        if (!Number.isFinite(stepIndex) || stepIndex < 0) {
            return {
                ok: false,
                message:
                    "BGM runtime bootstrap failed: sequence step must be >= 0.",
            };
        }

        if (!soundIds.has(soundId)) {
            return {
                ok: false,
                message: `BGM runtime bootstrap failed: sequence references unknown soundId ${soundId}.`,
            };
        }

        cues.push({
            step: stepIndex,
            atMs: Math.round(stepIndex * stepMs),
            durationMs: Math.max(1, Math.round(lengthSteps * stepMs)),
            soundId,
            effect: normalizeEffect(step.effect),
            shape: resolveCueShape(
                normalizeEffect(step.effect),
                Number(step.bend?.cents) || 0,
                stepMs,
            ),
            ...(step.bend && Number.isFinite(step.bend.cents)
                ? {
                      bend: {
                          cents: Math.round(step.bend.cents),
                          curve:
                              step.bend.curve === "ease-in" ||
                              step.bend.curve === "ease-out"
                                  ? step.bend.curve
                                  : "linear",
                      },
                  }
                : {}),
        });
    }

    cues.sort((left, right) => left.step - right.step);

    return {
        ok: true,
        payload: {
            source: "bgm-recovery",
            name,
            bpm,
            stepMs,
            loop: {
                startStep: loopStart,
                endStep: loopEnd,
                windowMs: Math.max(
                    1,
                    Math.round((loopEnd - loopStart) * stepMs),
                ),
            },
            cues,
            palette: normalizedPalette,
        },
    };
};

export const resolveBgmRuntimeBootstrap = (): BgmRuntimeBootstrapResult => {
    const loaded = loadToolRecoverySnapshot(BGM_RECOVERY_TOOL_KEY);
    if (!loaded.ok) {
        return {
            ok: false,
            message: loaded.message,
            missing: loaded.missing,
        };
    }

    try {
        return parseDocument(loaded.envelope.payloadRaw);
    } catch {
        return {
            ok: false,
            message: "BGM runtime bootstrap failed: invalid palette entries.",
        };
    }
};
