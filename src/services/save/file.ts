import {
    rehydrateGameState,
    serializeDataBusState,
} from "@/services/save/state";
import { migrateSaveGame } from "@/services/save/schema";

export type SaveFileErrorCode =
    | "download-not-supported"
    | "payload-too-large"
    | "unsafe-payload"
    | "invalid-json"
    | "invalid-save-format"
    | "rehydrate-failed"
    | "empty-file"
    | "file-read-failed";

export type ImportSaveFileOptions = {
    maxBytes?: number;
    maxJsonNodes?: number;
    maxJsonDepth?: number;
};

export const DEFAULT_IMPORT_MAX_BYTES = 1024 * 1024;
export const DEFAULT_IMPORT_MAX_JSON_NODES = 50_000;
export const DEFAULT_IMPORT_MAX_JSON_DEPTH = 64;

export type SaveFileResult =
    | {
          ok: true;
          fileName: string;
      }
    | {
          ok: false;
          code: SaveFileErrorCode;
          message: string;
      };

type DownloadDeps = {
    createObjectURL: (blob: Blob) => string;
    revokeObjectURL: (url: string) => void;
    createElement: (tagName: string) => HTMLElement;
    appendChild: (element: HTMLElement) => void;
    removeChild: (element: HTMLElement) => void;
};

const defaultDownloadDeps = (): DownloadDeps | null => {
    if (typeof window === "undefined" || typeof document === "undefined") {
        return null;
    }

    if (!window.URL || typeof window.URL.createObjectURL !== "function") {
        return null;
    }

    return {
        createObjectURL: window.URL.createObjectURL.bind(window.URL),
        revokeObjectURL: window.URL.revokeObjectURL.bind(window.URL),
        createElement: document.createElement.bind(document),
        appendChild: (element: HTMLElement) => {
            document.body.appendChild(element);
        },
        removeChild: (element: HTMLElement) => {
            document.body.removeChild(element);
        },
    };
};

const toTimestamp = (value: string) => {
    return value.replace(/[:.]/g, "-");
};

export const buildSaveFileName = (isoDate: string) => {
    return `ursa-save-${toTimestamp(isoDate)}.json`;
};

export const exportSaveFile = (
    deps: DownloadDeps | null = defaultDownloadDeps(),
): SaveFileResult => {
    if (!deps) {
        return {
            ok: false,
            code: "download-not-supported",
            message: "Save export is not supported in this environment.",
        };
    }

    const save = serializeDataBusState();
    const fileName = buildSaveFileName(save.savedAt);

    const blob = new Blob([JSON.stringify(save, null, 2)], {
        type: "application/json",
    });

    const url = deps.createObjectURL(blob);
    const anchor = deps.createElement("a") as HTMLAnchorElement;

    anchor.href = url;
    anchor.download = fileName;
    anchor.style.display = "none";

    deps.appendChild(anchor);
    anchor.click();
    deps.removeChild(anchor);
    deps.revokeObjectURL(url);

    return {
        ok: true,
        fileName,
    };
};

const readFileText = async (file: File): Promise<string> => {
    try {
        return await file.text();
    } catch {
        throw new Error("file-read-failed");
    }
};

const normalizePositiveInt = (value: number | undefined, fallback: number) => {
    if (!Number.isFinite(value)) {
        return fallback;
    }

    return Math.max(1, Math.floor(value ?? fallback));
};

const hasUnsafeJsonPayload = (
    root: unknown,
    limits: {
        maxJsonNodes: number;
        maxJsonDepth: number;
    },
): boolean => {
    if (typeof root !== "object" || root === null || Array.isArray(root)) {
        return true;
    }

    const blockedKeys = new Set(["__proto__", "prototype", "constructor"]);
    const visited = new Set<unknown>();
    const stack: Array<{ value: unknown; depth: number }> = [
        { value: root, depth: 0 },
    ];

    let nodes = 0;

    while (stack.length > 0) {
        const next = stack.pop();
        if (!next) {
            continue;
        }

        const { value, depth } = next;
        if (typeof value !== "object" || value === null) {
            continue;
        }

        if (visited.has(value)) {
            continue;
        }
        visited.add(value);

        nodes += 1;
        if (nodes > limits.maxJsonNodes || depth > limits.maxJsonDepth) {
            return true;
        }

        if (Array.isArray(value)) {
            for (const item of value) {
                stack.push({ value: item, depth: depth + 1 });
            }
            continue;
        }

        const record = value as Record<string, unknown>;
        for (const key of Object.keys(record)) {
            if (blockedKeys.has(key)) {
                return true;
            }

            stack.push({ value: record[key], depth: depth + 1 });
        }
    }

    return false;
};

export const importSaveFile = async (
    file: File,
    options: ImportSaveFileOptions = {},
): Promise<SaveFileResult> => {
    const maxBytes = normalizePositiveInt(
        options.maxBytes,
        DEFAULT_IMPORT_MAX_BYTES,
    );
    const maxJsonNodes = normalizePositiveInt(
        options.maxJsonNodes,
        DEFAULT_IMPORT_MAX_JSON_NODES,
    );
    const maxJsonDepth = normalizePositiveInt(
        options.maxJsonDepth,
        DEFAULT_IMPORT_MAX_JSON_DEPTH,
    );

    if (Number.isFinite(file.size) && file.size > maxBytes) {
        return {
            ok: false,
            code: "payload-too-large",
            message: "Save file exceeds the configured size limit.",
        };
    }

    const raw = await readFileText(file).catch(() => null);
    if (raw === null) {
        return {
            ok: false,
            code: "file-read-failed",
            message: "Could not read the selected save file.",
        };
    }

    if (raw.trim().length === 0) {
        return {
            ok: false,
            code: "empty-file",
            message: "Save file is empty.",
        };
    }

    if (raw.length > maxBytes) {
        return {
            ok: false,
            code: "payload-too-large",
            message: "Save file exceeds the configured size limit.",
        };
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(raw) as unknown;
    } catch {
        return {
            ok: false,
            code: "invalid-json",
            message: "Save file is not valid JSON.",
        };
    }

    if (hasUnsafeJsonPayload(parsed, { maxJsonNodes, maxJsonDepth })) {
        return {
            ok: false,
            code: "unsafe-payload",
            message: "Save file payload is unsafe or exceeds parsing limits.",
        };
    }

    const parsedSave = migrateSaveGame(parsed);
    if (!parsedSave) {
        return {
            ok: false,
            code: "invalid-save-format",
            message: "Save file format is unsupported or invalid.",
        };
    }

    const rehydrated = rehydrateGameState(parsedSave);
    if (!rehydrated) {
        return {
            ok: false,
            code: "rehydrate-failed",
            message:
                "Save file could not be applied to the current game state.",
        };
    }

    return {
        ok: true,
        fileName: file.name,
    };
};
