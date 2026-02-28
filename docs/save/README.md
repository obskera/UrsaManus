# Save/Load Guide

This guide documents how save/load works in UrsaManus and gives copy/paste snippets for common workflows.

## Scope

Save/load covers four layers:

- `schema.ts` — validates versioned save payloads (`SaveGameV1`)
- `state.ts` — serialize/rehydrate game state (`DataBus`)
- `bus.ts` — quick-save localStorage lifecycle
- `file.ts` — JSON export/import APIs

## Quick Start (copy/paste)

```ts
import { quickLoad, quickSave } from "@/services/save";

// startup restore
const restored = quickLoad();
if (!restored) {
    // continue with default state
}

// manual checkpoint
const didSave = quickSave();
```

## Autosave Scheduler

Use `createQuickSaveScheduler` when state updates can happen frequently:

```ts
import { createQuickSaveScheduler } from "@/services/save";

const scheduler = createQuickSaveScheduler({ waitMs: 700 });

function onGameStateChanged() {
    scheduler.notifyChange();
}

function cleanup() {
    scheduler.dispose();
}
```

## Save File Export/Import

```ts
import { exportSaveFile, importSaveFile } from "@/services/save";

const exportResult = exportSaveFile();
if (!exportResult.ok) {
    console.error(exportResult.code, exportResult.message);
}

async function onFileSelected(file: File) {
    const result = await importSaveFile(file);
    if (!result.ok) {
        console.error(result.code, result.message);
        return;
    }

    console.log(`Imported ${result.fileName}`);
}
```

## React Dev Controls Pattern

```tsx
import { useCallback, useRef } from "react";
import { importSaveFile, quickLoad, quickSave } from "@/services/save";

function SaveDevControls() {
    const importRef = useRef<HTMLInputElement | null>(null);

    const runQuickSave = useCallback(() => {
        quickSave();
    }, []);

    const runQuickLoad = useCallback(() => {
        quickLoad();
    }, []);

    const onImportChange = useCallback(
        async (event: React.ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            if (!file) return;

            await importSaveFile(file);
            event.target.value = "";
        },
        [],
    );

    return (
        <>
            <button onClick={runQuickSave}>Quick Save</button>
            <button onClick={runQuickLoad}>Quick Load</button>
            <button onClick={() => importRef.current?.click()}>
                Import Save
            </button>
            <input
                ref={importRef}
                type="file"
                accept="application/json,.json"
                onChange={onImportChange}
                hidden
            />
        </>
    );
}
```

## Error Handling Cheat Snippet

```ts
import type { SaveFileErrorCode } from "@/services/save/file";

const saveErrorCopy: Record<SaveFileErrorCode, string> = {
    "download-not-supported": "Export is not supported in this environment.",
    "file-read-failed": "Could not read that file.",
    "empty-file": "Selected file is empty.",
    "invalid-json": "File is not valid JSON.",
    "invalid-save-format": "Save version/shape is unsupported.",
    "rehydrate-failed": "Save could not be applied to this runtime state.",
};
```

## Keyboard Shortcuts (dev)

- `Alt + Shift + P` — Toggle World Pause (dev reason)

## Related Docs

- [Save Cheat Sheet](./CHEATSHEET.md)
- [Usage Guide](../USAGE.md)
- [Architecture](../ARCHITECTURE.md)
