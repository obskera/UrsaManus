import {
    rehydrateGameState,
    serializeDataBusState,
} from "@/services/save/state";
import { parseSaveGame } from "@/services/save/schema";

export type SaveFileErrorCode =
    | "download-not-supported"
    | "invalid-json"
    | "invalid-save-format"
    | "rehydrate-failed"
    | "empty-file"
    | "file-read-failed";

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

export const importSaveFile = async (file: File): Promise<SaveFileResult> => {
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

    const parsedSave = parseSaveGame(parsed);
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
