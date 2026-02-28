# Save/Load Cheat Sheet

One-page reference for save/load APIs, behavior, and common actions.

## Core APIs

```ts
import {
    quickSave,
    quickLoad,
    clearQuickSave,
    createQuickSaveScheduler,
    exportSaveFile,
    importSaveFile,
    serializeGameState,
    rehydrateGameState,
} from "@/services/save";
```

## Quick Save (localStorage)

- Storage key: `ursa:quickSave:v1`
- `quickSave()` → `boolean`
- `quickLoad()` → `boolean`
- `clearQuickSave()` → `boolean`

## Scheduler Pattern

```ts
const scheduler = createQuickSaveScheduler({ waitMs: 700 });
scheduler.notifyChange();
// later
scheduler.dispose();
```

## File API Results

### Export

- `exportSaveFile()`
- Success: `{ ok: true, fileName }`
- Failure: `{ ok: false, code: "download-not-supported", message }`

### Import

- `await importSaveFile(file)`
- Success: `{ ok: true, fileName }`
- Failure: `{ ok: false, code, message }`

## Import Error Codes

- `file-read-failed`
- `empty-file`
- `invalid-json`
- `invalid-save-format`
- `rehydrate-failed`

## Save Payload Notes

- Versioned shape is `SaveGameV1`
- Entry points:
    - `parseSaveGame(input)` validates version + shape
    - `migrateSaveGame(input)` handles migration flow (currently v1 passthrough)

## Typical Integration Order

1. Startup: call `quickLoad()`
2. State changes: call `scheduler.notifyChange()`
3. Unmount/cleanup: call `scheduler.dispose()`
4. Dev/manual: wire quick save/load + export/import controls

## Dev Shortcut Keys

- `Alt + Shift + P` toggle world pause (dev reason)
