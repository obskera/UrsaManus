# Save Service Module

Internal README for the save stack in `src/services/save`.

## Files

- `schema.ts` — runtime validation for save payloads (`SaveGameV1`)
- `state.ts` — conversion between runtime `GameState` and save-safe JSON
- `bus.ts` — localStorage quick-save service + throttled scheduler
- `file.ts` — JSON file export/import service and structured error results
- `slots.ts` — multi-slot save profiles with rollback snapshot restore flow
- `index.ts` — barrel exports

## Public API Surface

```ts
import {
    SAVE_GAME_VERSION,
    QUICK_SAVE_STORAGE_KEY,
    serializeGameState,
    serializeDataBusState,
    rehydrateGameState,
    quickSave,
    quickLoad,
    clearQuickSave,
    createQuickSaveScheduler,
    createSaveSlotService,
    saveSlots,
    exportSaveFile,
    importSaveFile,
    parseSaveGame,
    migrateSaveGame,
} from "@/services/save";
```

## Design Rules

- Save payloads must be JSON-safe and versioned.
- Validation/migration happens before rehydration.
- File import/export should always return structured result objects.
- Side effects are isolated in service functions; React components remain thin wrappers.

## Minimal Usage Snippets

### Serialize current state

```ts
const save = serializeDataBusState();
```

### Rehydrate from parsed payload

```ts
const ok = rehydrateGameState(payload);
```

### Throttled autosave

```ts
const scheduler = createQuickSaveScheduler({ waitMs: 700 });
scheduler.notifyChange();
```

### File import with feedback

```ts
const result = await importSaveFile(file);
if (!result.ok) {
    console.error(result.code, result.message);
}
```

## Tests

Relevant test files:

- `src/tests/save.state.test.ts`
- `src/tests/save.bus.test.ts`
- `src/tests/save.file.test.ts`
- `src/tests/save.schema.test.ts`
- `src/tests/save.integration.test.ts`
