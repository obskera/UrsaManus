export type BrowserJsonFileResult =
    | {
          ok: true;
      }
    | {
          ok: false;
          code: "download-not-supported" | "file-read-failed";
          message: string;
      };

export const exportBrowserJsonFile = (
    payload: string,
    fileName: string,
): BrowserJsonFileResult => {
    if (
        typeof window === "undefined" ||
        typeof document === "undefined" ||
        !window.URL ||
        typeof window.URL.createObjectURL !== "function"
    ) {
        return {
            ok: false,
            code: "download-not-supported",
            message: "Export unavailable in this environment.",
        };
    }

    const blob = new Blob([payload], {
        type: "application/json",
    });
    const objectUrl = window.URL.createObjectURL(blob);

    try {
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = fileName;
        anchor.style.display = "none";
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
    } finally {
        window.URL.revokeObjectURL(objectUrl);
    }

    return {
        ok: true,
    };
};

export const readBrowserJsonFileText = async (
    file: File,
): Promise<
    | {
          ok: true;
          raw: string;
      }
    | {
          ok: false;
          code: "file-read-failed";
          message: string;
      }
> => {
    try {
        const raw = await file.text();
        return {
            ok: true,
            raw,
        };
    } catch {
        return {
            ok: false,
            code: "file-read-failed",
            message: "Could not read the selected JSON file.",
        };
    }
};
