# UrsaManus TODO (Current Next)

This file tracks the immediate next systems planned for UrsaManus.

## Next Features

- Save/load system (MVP): autosave progress and restore on refresh

### Save/Load MVP Plan

### Phase 1 — Save data foundation (prerequisite)

**Goal:** establish a stable, versioned save format and safe state rehydration.

**Estimated effort:** Medium (1–2 focused sessions)

#### Tasks

- [x] Define `SaveGameV1` schema (versioned), including world/camera config, player state, entity state, and relevant runtime flags.
- [x] Add `serializeGameState(dataBus.getState())` that returns a plain JSON-safe object.
- [x] Add `rehydrateGameState(save)` that safely applies saved values to `DataBus`.
- [x] Add schema validation + migration entrypoint (reject invalid saves, future-proof with `version`).

### Phase 2 — Quick save (localStorage)

**Depends on:** Phase 1

**Goal:** enable frictionless local save/restore for immediate play continuity.

**Estimated effort:** Medium (1 session)

#### Tasks

- [x] Add `SaveBus`/service for quick save operations (`quickSave`, `quickLoad`, `clearQuickSave`).
- [x] Persist quick save to localStorage key (e.g., `ursa:quickSave:v1`).
- [x] Autosave on key state changes (throttled/debounced to avoid excessive writes).
- [x] Restore quick save on app startup when available (with graceful fallback to default state).

### Phase 3 — Persistent save files (export/import)

**Depends on:** Phase 1

**Goal:** allow user-managed save portability across sessions/devices.

**Estimated effort:** Medium (1 session)

#### Tasks

- [x] Add `exportSaveFile()` that downloads `SaveGameV1` as `.json` file.
- [x] Add `importSaveFile(file)` that reads JSON, validates, and rehydrates state.
- [x] Handle import errors (invalid JSON, unsupported version, failed validation) with user-facing feedback.
- [x] Keep import/export format stable and documented so users can move saves between sessions/devices.

### Phase 4 — Save UX wiring

**Depends on:** Phases 2–3

**Goal:** expose save/load actions through clear controls and status feedback.

**Estimated effort:** Small–Medium (0.5–1 session)

#### Tasks

- [x] Add dev-facing controls first: Quick Save, Quick Load, Export Save, Import Save.
- [x] Add keyboard shortcuts for save actions in dev mode (optional for MVP).
- [x] Surface save status feedback (saved/loaded/error) in existing meta/dev UI.

### Phase 5 — Hardening (tests + docs)

**Depends on:** Phases 1–4

**Goal:** lock behavior and document usage/architecture for contributors.

**Estimated effort:** Medium (1 session)

#### Tasks

- [x] Unit tests: serializer/rehydrator, localStorage service, file export/import parser.
- [x] Integration tests: quick save restore on startup and file import round-trip.
- [x] Update `docs/USAGE.md` with save/load usage + file format notes.
- [x] Update `docs/ARCHITECTURE.md` with save flow and service responsibilities.

### Suggested execution order

1. Phase 1 (foundation)
2. Phase 2 (quick save)
3. Phase 3 (file import/export)
4. Phase 4 (UI wiring)
5. Phase 5 (hardening)

## Recently Completed

- Added default reusable style primitives (`um-*`) with baseline utility tokens/classes for common UI elements.
- Added input-mapping templates + cheat sheets (docs + reusable helper APIs) for key/on-screen controls with compass-focused coverage.

## Notes

These items are intentionally scoped as modular additions so the engine remains small at its core and extensible over time.
