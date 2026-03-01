import { parseJsonDocument } from "@/services/toolJsonDocument";

export const TOOL_RECOVERY_SNAPSHOT_VERSION = "um-tool-recovery-v1" as const;
export const TOOL_RECOVERY_STORAGE_KEY_SUFFIX = "autosave:v1" as const;

export type ToolRecoverySnapshotEnvelope = {
    version: typeof TOOL_RECOVERY_SNAPSHOT_VERSION;
    toolKey: string;
    savedAt: string;
    payloadRaw: string;
};

export type ToolRecoverySnapshotLoadResult =
    | {
          ok: true;
          envelope: ToolRecoverySnapshotEnvelope;
      }
    | {
          ok: false;
          message: string;
          missing?: boolean;
          removeCorrupt?: boolean;
      };

export const buildToolRecoveryStorageKey = (toolKey: string): string => {
    return `um:tools:${toolKey}:${TOOL_RECOVERY_STORAGE_KEY_SUFFIX}`;
};

export const persistToolRecoverySnapshot = (
    toolKey: string,
    payloadRaw: string,
):
    | {
          ok: true;
          envelope: ToolRecoverySnapshotEnvelope;
      }
    | {
          ok: false;
          message: string;
      } => {
    try {
        const storageKey = buildToolRecoveryStorageKey(toolKey);
        const envelope: ToolRecoverySnapshotEnvelope = {
            version: TOOL_RECOVERY_SNAPSHOT_VERSION,
            toolKey,
            savedAt: new Date().toISOString(),
            payloadRaw,
        };

        window.localStorage.setItem(storageKey, JSON.stringify(envelope));

        return {
            ok: true,
            envelope,
        };
    } catch {
        return {
            ok: false,
            message: "Autosave unavailable in this browser session.",
        };
    }
};

export const loadToolRecoverySnapshot = (
    toolKey: string,
): ToolRecoverySnapshotLoadResult => {
    const storageKey = buildToolRecoveryStorageKey(toolKey);
    const rawEnvelope = window.localStorage.getItem(storageKey);
    if (!rawEnvelope) {
        return {
            ok: false,
            message: "No recovery snapshot found.",
            missing: true,
        };
    }

    const parsed = parseJsonDocument<ToolRecoverySnapshotEnvelope>(
        rawEnvelope,
        {
            invalidJsonMessage: "Recovery snapshot ignored: invalid JSON.",
        },
    );
    if (!parsed.ok) {
        return {
            ok: false,
            message: parsed.message,
            removeCorrupt: true,
        };
    }

    const envelope = parsed.value;

    if (envelope.version !== TOOL_RECOVERY_SNAPSHOT_VERSION) {
        return {
            ok: false,
            message: "Recovery snapshot ignored: unsupported version.",
            removeCorrupt: true,
        };
    }

    if (envelope.toolKey !== toolKey) {
        return {
            ok: false,
            message: "Recovery snapshot ignored: tool mismatch.",
            removeCorrupt: true,
        };
    }

    if (typeof envelope.payloadRaw !== "string") {
        return {
            ok: false,
            message: "Recovery snapshot ignored: payload is invalid.",
            removeCorrupt: true,
        };
    }

    if (typeof envelope.savedAt !== "string" || envelope.savedAt.length < 1) {
        return {
            ok: false,
            message: "Recovery snapshot ignored: timestamp is invalid.",
            removeCorrupt: true,
        };
    }

    return {
        ok: true,
        envelope,
    };
};

export const clearToolRecoverySnapshot = (toolKey: string): void => {
    const storageKey = buildToolRecoveryStorageKey(toolKey);
    window.localStorage.removeItem(storageKey);
};
