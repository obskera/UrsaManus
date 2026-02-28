## UrsaManus Usage Guide

This guide explains how to use the main engine modules in the current codebase.

For system-level flow and responsibilities, see [ARCHITECTURE.md](ARCHITECTURE.md).

### Documentation Map

- [ARCHITECTURE.md](ARCHITECTURE.md) — system flow and module responsibilities
- [AI_SETUP.md](AI_SETUP.md) — AI bootstrap/configuration guide for repo-based project setup
- [input/CHEATSHEET.md](input/CHEATSHEET.md) — quick keyboard/pointer/gamepad input mapping reference
- [worldgen/CHEATSHEET.md](worldgen/CHEATSHEET.md) — deterministic worldgen + spawn payload quick reference
- [save/README.md](save/README.md) — save/load workflows and implementation snippets
- [save/CHEATSHEET.md](save/CHEATSHEET.md) — quick save/load API and shortcut reference
- [../src/services/save/README.md](../src/services/save/README.md) — contributor notes for save internals

### UI Primitives Index

Quick links for reusable, copy/paste-friendly UI building blocks:

- [Default style primitives (`um-*`)](#default-style-primitives-srcstylesdefaultscss)
- [Reusable input helpers (keys + compass)](#reusable-input-helpers-keys--compass)
- [LifeGauge UI primitive (default + skinnable)](#lifegauge-ui-primitive-default--skinnable)
- [ActionButton UI primitive (pressed + cooldown)](#actionbutton-ui-primitive-pressed--cooldown)
- [Toggle UI primitive (on/off state)](#toggle-ui-primitive-onoff-state)
- [VirtualActionButton UI primitive (mobile action)](#virtualactionbutton-ui-primitive-mobile-action)
- [VirtualDPad UI primitive (mobile movement)](#virtualdpad-ui-primitive-mobile-movement)
- [CooldownIndicator UI primitive](#cooldownindicator-ui-primitive)
- [HUDSlot UI primitive](#hudslot-ui-primitive)
- [HUDAnchor UI primitive](#hudanchor-ui-primitive)
- [AbilityBar prefab](#abilitybar-prefab)
- [SurvivalHUDPreset starter](#survivalhudpreset-starter)
- [BossEncounterHUDPreset starter](#bossencounterhudpreset-starter)
- [HUD preset composition helper](#hud-preset-composition-helper)
- [Interaction system core](#interaction-system-core)
- [Dev-mode state sanitizer/reset](#dev-mode-state-sanitizerreset)
- [Deterministic replay system](#deterministic-replay-system)
- [Schema migration framework](#schema-migration-framework)
- [Content hot-reload pipeline](#content-hot-reload-pipeline)
- [Unified marker/POI registry](#unified-markerpoi-registry)
- [Accessibility runtime settings](#accessibility-runtime-settings)
- [Visual world/entity placement tool (planned)](#planned-visual-worldentity-placement-tool)
- [LifeGauge full example component](../src/components/examples/LifeGaugeExample.tsx)
- [AbilityBar full example component](../src/components/examples/AbilityBarExample.tsx)

---

## 1) Project Structure

- `src/components/` — React UI and render/controller components
- `src/logic/` — reusable gameplay logic and collision utilities
- `src/services/` — stateful engine services (`DataBus`, buses)
- `src/tests/` — unit/integration tests

---

## 2) Running the Project

Install dependencies:

`npm install`

Start dev server:

`npm run dev`

Run tests:

`npm run test:run`

Run coverage:

`npm run test:coverage`

Run lint:

`npm run lint`

### Template Post-Clone Checklist

If you started from this repository as a template, complete this once before feature work:

- [ ] Update `package.json` metadata (`name`, `version`)
- [ ] Replace README project identity and summary
- [ ] Review `docs/ARCHITECTURE.md` assumptions against your project scope
- [ ] Run and pass local gates:
    - `npm run lint`
    - `npm run test:run`
    - `npm run test:coverage:strict`
- [ ] Confirm CI passes in GitHub Actions after first push

### Planned system stubs (TODO-aligned)

These are implementation placeholders to keep usage docs aligned with active TODO items.

#### P1 — Core runtime + reliability

- [ ] `Global world pause` controller
    - Freeze simulation updates (physics/movement/AI/ticks) while paused.
    - Block gameplay controls while allowing pause-menu and cutscene-continue input.
    - Support scoped pause reasons (`pause-menu`, `cutscene`) with deterministic resume behavior.

<a id="dev-mode-state-sanitizerreset"></a>

- [x] `Dev-mode state sanitizer/reset`
    - Add a development-only reset path for persisted runtime state (`localStorage`, quick-save keys, dev toggles).
    - Support reset scopes (`save-only`, `input-profiles`, `all`) with confirmation guard.
    - Expose a debug shortcut and optional dev-panel action for rapid recovery from bad state.

<a id="interaction-system-core"></a>

- [x] `Interaction system core`
    - Add unified interaction contract for world objects/NPCs through `setEntityInteractionContract(...)`.
    - Resolve nearest interaction targets with distance + line-of-sight gating via `resolvePlayerInteraction(...)` / `resolveEntityInteraction(...)`.
    - Return input hints for keyboard/controller/pointer and execute contracts through `interactWithNearestTarget(...)`.

- [x] `Deterministic replay system`
    - Record input/events with seed snapshots to allow exact gameplay bug reproduction.
    - Support replay export/import for regression validation.

<a id="deterministic-replay-system"></a>

- Replay capture and playback APIs are available in `src/services/replay.ts`:
    - `createDeterministicReplayRecorder(...)`
    - `exportReplayPayload(...)`
    - `parseReplayPayload(...)` / `validateReplayPayload(...)`
    - `createReplayCursor(...)`
- Payloads include deterministic seed snapshot metadata and ordered input/event records with millisecond offsets.

- [x] `Schema migration framework`
    - Add versioned migrations for save files and authored JSON assets.
    - Validate and migrate payloads before runtime apply.
    - Use this as the shared compatibility layer for runtime + tooling checks.

<a id="schema-migration-framework"></a>

- Shared migration utility is available in `src/services/schemaMigration.ts` via `createVersionedSchemaMigration(...)`.
- Save pipeline uses this utility in `src/services/save/schema.ts` with:
    - `migrateSaveGame(...)`
    - `preflightSaveGameMigration(...)`
- Runtime loaders can preflight payload versions for compatibility checks before full migration/rehydration.

- [x] `Content hot-reload pipeline (dev)`
    - Reload authored JSON domains in development without full app restart.
    - Trigger targeted refresh for dialogue/quest/map/editor data.

<a id="content-hot-reload-pipeline"></a>

- Dev reload pipeline is available in `src/services/contentHotReload.ts`.
- Use `createContentHotReloadPipeline(...)` to register domain handlers and process manual/watcher refresh requests.
- Runtime signals emitted by default:
    - `content:hot-reload:requested`
    - `content:hot-reload:applied`
    - `content:hot-reload:failed`
    - `content:refresh:<domain>` for targeted refresh fan-out.

- [x] `Unified marker/POI registry`
    - Use one source-of-truth marker feed for map, mini-map, objectives, and prompts.
    - Support typed marker categories, visibility rules, and priority.
    - Prevent per-system marker duplication by centralizing marker ownership.

<a id="unified-markerpoi-registry"></a>

- Shared marker authority is available in `src/services/markerRegistry.ts`.
- Use `createMarkerRegistry(...)` for isolated registries or `markerRegistry` singleton for app-wide usage.
- Marker resolution supports:
    - typed categories (`objective`, `poi`, `interaction`, `navigation`, `custom`)
    - channel visibility (`map`, `minimap`, `objective-tracker`, `interaction-prompt`)
    - context predicates and stack-group priority winner selection.

- [x] `Accessibility runtime settings`
    - Add text scale, hold/toggle input options, reduced flash/shake, and subtitle speed.
    - Persist user preferences and expose settings hooks.

<a id="accessibility-runtime-settings"></a>

- Accessibility settings service is available in `src/services/accessibilitySettings.ts`.
- Includes persisted settings for:
    - `textScale`
    - `controlMode` (`hold` or `toggle`)
    - `reducedFlash`
    - `reducedShake`
    - `subtitleSpeed` (`slow`, `normal`, `fast`)
- Minimal prefab hook is available as `useAccessibilitySettings(...)` in `src/components/screenController/useAccessibilitySettings.ts`.

- [x] `Error telemetry + dev diagnostics`
    - Emit structured runtime errors with subsystem/context payloads.
    - Provide debug overlays/log hooks for fast triage.

<a id="error-telemetry-dev-diagnostics"></a>

- Runtime telemetry service is available in `src/services/errorTelemetry.ts`.
- Use `createErrorTelemetry(...)` for isolated instances or `errorTelemetry` singleton for shared diagnostics.
- Captured events include structured context payloads:
    - `severity` (`error`, `warning`, `info`)
    - `subsystem`
    - `statePhase`
    - `entityRefs`
    - optional `metadata` / `source`
- Default lifecycle signals emitted by the service:
    - `error:telemetry:captured`
    - `error:telemetry:cleared`
- Dev log hooks are available through `createLogHook(...)`, and snapshot queries support severity/subsystem/phase filtering for overlays.

- [x] `Performance budgets + alerts`
    - Define frame/entity/effect budget thresholds with dev warnings.
    - Surface simple subsystem timing summaries.

<a id="performance-budgets-alerts"></a>

- Performance budget service is available in `src/services/performanceBudgets.ts`.
- Use `createPerformanceBudgetService(...)` for scoped instances or `performanceBudgets` singleton for shared runtime checks.
- Frame evaluation supports budget thresholds for:
    - `frameMs`
    - `entityCount`
    - `effectCount`
    - per-subsystem timing (`subsystemMs` map)
- Default lifecycle signals emitted by the service:
    - `performance:budget:evaluated`
    - `performance:budget:alert`
- Alert tooling support includes `subscribe(...)`, `createAlertLogHook(...)`, report history via `getRecentReports(...)`, and hotspot summaries via `getSubsystemSummary(...)`.

- [x] `Crash-safe recovery flow`
    - Add startup recovery checks for corrupted persisted state.
    - Offer restore/reset flows with clear diagnostics.

<a id="crash-safe-recovery-flow"></a>

- Crash-safe save recovery service is available in `src/services/save/recovery.ts`.
- Use `createSaveRecoveryService(...)` for isolated startup flows or `saveRecovery` singleton for shared runtime usage.
- Startup validation entrypoint: `inspectStartup()`.
    - Returns status `clean`, `recoverable`, `corrupted`, or `storage-unavailable`.
    - Includes structured diagnostics (`code`, `message`, `atMs`, `storageKey`, optional `payloadBytes`).
- Recovery actions:
    - `restorePersisted()` applies validated persisted quick-save state.
    - `resetPersisted()` clears persisted quick-save state for safe fallback.
- Default lifecycle signals:
    - `save:recovery:startup-checked`
    - `save:recovery:restore-applied`
    - `save:recovery:reset-applied`
    - `save:recovery:failed`

- [x] `Profiling snapshot tooling`
    - Capture dev snapshots for frame timing, entity counts, and active effects.
    - Compare snapshots to identify performance regressions.

<a id="profiling-snapshot-tooling"></a>

- Profiling snapshot service is available in `src/services/profilingSnapshots.ts`.
- Use `createProfilingSnapshotService(...)` for isolated workflows or `profilingSnapshots` singleton for shared diagnostics.
- One-click capture entrypoint: `captureSnapshot(...)`.
    - Captures `frameMs`, `entityCount`, `activeEffects`, and optional per-subsystem timings.
- Snapshot diff APIs:
    - `compareSnapshots(baseId, targetId, options?)`
    - `compareLatestToPrevious(options?)`
- Diff results return normalized deltas and threshold-based regression flags for quick triage.
- Default lifecycle signals:
    - `profiling:snapshot:captured`
    - `profiling:snapshot:compared`

- [x] `Mod/plugin sandbox + capability permissions`
    - Define extension sandbox boundaries and explicit capability grants.
    - Restrict direct writes to protected engine/runtime domains.

<a id="modplugin-sandbox-capability-permissions"></a>

- Plugin sandbox service is available in `src/services/pluginSandbox.ts`.
- Use `createPluginSandbox(...)` for isolated hosts or `pluginSandbox` singleton for shared runtime integration.
- Capability grants are explicit per plugin manifest:
    - `renderHooks`
    - `dataRead`
    - `dataWrite`
    - `signalEmit`
    - `signalSubscribe`
- Runtime plugin API is scoped and guarded through `createRuntime(pluginId)`:
    - `registerRenderHook(...)`
    - `readData(...)` / `writeData(...)`
    - `emitSignal(...)` / `subscribeSignal(...)`
- Protected write domains are denied even when broad grants exist (default prefixes include `engine.`, `runtime.`, `services.`, `save.`, `state.`).
- Default lifecycle signals:
    - `plugin:sandbox:action`
    - `plugin:sandbox:denied`

- [x] `Save slot manager + rollback snapshots`
    - Support multi-slot save profiles with metadata and version tracking.
    - Provide rollback snapshot restore for rapid state recovery.

<a id="save-slot-manager-rollback-snapshots"></a>

- Save slot manager service is available in `src/services/save/slots.ts`.
- Use `createSaveSlotService(...)` for isolated test/runtime hosts or `saveSlots` singleton for shared app usage.
- Slot metadata fields include:
    - `slot`
    - `timestamp`
    - `playtime`
    - `version`
- Core slot APIs:
    - `saveSlot(...)`
    - `loadSlot(...)`
    - `deleteSlot(...)`
    - `listSlots(...)`
    - `getSlot(...)`
- Rollback APIs:
    - `listRollbackSnapshots(slot)`
    - `restoreRollbackSnapshot(slot, snapshotId)`
- Lifecycle signals:
    - `save:slot:saved`
    - `save:slot:loaded`
    - `save:slot:deleted`
    - `save:slot:rollback:created`
    - `save:slot:rollback:restored`
    - `save:slot:failed`

- [x] `Memory lifecycle management`
    - Define explicit allocate/dispose contracts for runtime resources.
    - Add leak-detection diagnostics for long sessions.

<a id="memory-lifecycle-management"></a>

- Memory lifecycle service is available in `src/services/memoryLifecycle.ts`.
- Use `createMemoryLifecycleService(...)` for isolated environments or `memoryLifecycle` singleton for shared runtime tracking.
- Explicit lifecycle contract APIs:
    - `allocate(...)`
    - `touch(...)`
    - `dispose(...)`
    - `disposeByType(...)`
- Runtime diagnostics APIs:
    - `getSnapshot()` for active/disposed counts and byte totals by resource type
    - `scanForLeaks(...)` for long-session leak checks
    - `getLeakDiagnostics(...)` for recent leak history
- Supported baseline resource categories: `texture`, `audio-buffer`, `emitter`, `runtime-cache`, `custom`.
- Lifecycle signals:
    - `memory:lifecycle:allocated`
    - `memory:lifecycle:disposed`
    - `memory:lifecycle:leak-detected`
    - `memory:lifecycle:leak-scan-completed`

- [x] `Save/content import security hardening`
    - Enforce strict size limits, safe parsing, and schema-first validation for imports.
    - Reject malformed/malicious payloads before runtime apply.

<a id="savecontent-import-security-hardening"></a>

- Save import hardening is enforced in `src/services/save/file.ts`.
- `importSaveFile(file, options?)` now supports security limits:
    - `maxBytes`
    - `maxJsonNodes`
    - `maxJsonDepth`
- Imports reject oversized payloads (`payload-too-large`) before runtime parse/apply.
- Imports reject unsafe payload structures (`unsafe-payload`) including blocked prototype-style keys and JSON complexity over limits.
- Schema-first runtime apply remains enforced through migration + rehydrate checks (`migrateSaveGame(...)` then `rehydrateGameState(...)`).

- [x] `Observability baseline`
    - Define structured telemetry schema for crashes, perf regressions, and content-validation failures.
    - Surface baseline dashboards/reports for triage and trend tracking.

<a id="observability-baseline"></a>

- Observability baseline service is available in `src/services/observabilityBaseline.ts`.
- Use `createObservabilityBaselineService(...)` for isolated hosts or `observabilityBaseline` singleton for shared runtime diagnostics.
- Structured baseline event categories:
    - `crash`
    - `perf-regression`
    - `content-validation-failure`
- Event ingestion APIs:
    - `recordEvent(...)`
    - `recordCrash(...)`
    - `recordPerfRegression(...)`
    - `recordContentValidationFailure(...)`
- Baseline reporting APIs:
    - `getSnapshot(...)`
    - `getBaselineReport(...)`
- Lifecycle signals:
    - `observability:baseline:event-recorded`
    - `observability:baseline:report`

- [x] `Quest/mission system`
    - Add objective graph support with state transitions (`pending`, `active`, `completed`, `failed`) and reward hooks.
    - Emit progress/completion signals for HUD tracker + toast integrations.

<a id="questmission-system"></a>

- Quest mission service is available in `src/services/questMissions.ts`.
- Use `createQuestMissionService(...)` for isolated hosts/tests or `questMissions` singleton for shared runtime usage.
- Mission lifecycle APIs:
    - `registerMission(...)`
    - `activateMission(...)`
    - `completeObjective(...)`
    - `setObjectiveProgress(...)`
    - `setMissionFailed(...)`
- Objective graph transitions support runtime states `pending`, `active`, `completed`, and `failed`.
- Reward hooks are supported through `rewardHandlers` at creation time or `setRewardHandler(rewardId, handler)` at runtime.
- Default lifecycle signals:
    - `quest:mission:progress`
    - `quest:mission:completed`
    - `quest:mission:failed`

- [x] `Combat core module`
    - Add hit/hurt handling (damage events, invulnerability windows, knockback, damage typing).
    - Keep combat resolution deterministic and decoupled from render concerns.

<a id="combat-core-module"></a>

- Combat core service is available in `src/services/combatCore.ts`.
- Use `createCombatCoreService(...)` for isolated hosts/tests or `combatCore` singleton for shared runtime usage.
- Combatant lifecycle APIs:
    - `registerCombatant(...)`
    - `applyHit(...)`
    - `setInvulnerableUntil(...)`
    - `reviveCombatant(...)`
    - `listCombatants(...)`
- `applyHit(...)` supports typed damage (`physical`, `magic`, `true`), deterministic invulnerability windows, and optional knockback payloads.
- Default lifecycle signals:
    - `combat:hit:applied`
    - `combat:hit:blocked`
    - `combat:entity:defeated`

#### P2 — Gameplay systems + player experience

- [x] `TextBox` prefab (canvas draw)
    - Spawn at canvas coordinates (`x`, `y`) with width/max-lines constraints.
    - Render text + border + background, with static or typewriter reveal mode.
    - Optional open/update/close lifecycle callbacks, auto-close timers, and deterministic queue/stack sequencing.

<a id="textbox-prefab"></a>

- TextBox prefab is available in `src/components/textBox/TextBox.tsx`.
- Use `TextBox` props for runtime placement and render behavior:
    - `x`, `y`, `width`, `maxLines`
    - `revealMode` (`static` or `typewriter`)
    - `typewriterCharsPerSecond`, `autoCloseMs`, `open`
    - `align`, `portrait`, `icon`, `panelStyle`, `textStyle`
    - lifecycle hooks: `onOpen`, `onUpdate`, `onClose`
- Deterministic queue utility is available in `src/components/textBox/createTextBoxQueue.ts`:
    - `createTextBoxQueue("queue" | "stack")`
    - `enqueue(...)`, `dequeue()`, `getActive()`, `clear()`, `size()`, `list()`
- Dev example is available in `src/components/examples/TextBoxExample.tsx` and rendered in the App example-components tab.

- [x] `Toasts` prefab (UI layer draw)
    - Render toast stack in screen-space overlay (non-world coordinates).
    - Support queueing, timed auto-dismiss, manual dismiss, and per-variant styling.

<a id="toasts-prefab"></a>

- Toasts prefab is available in `src/components/toasts/Toasts.tsx`.
- Use `Toasts` props for runtime screen-space UI feedback:
    - `toasts` list (`id`, `message`, optional `variant`, optional `autoDismissMs`)
    - `anchor` (`top-left`, `top-right`, `bottom-left`, `bottom-right`) for stacked positioning
    - `maxVisible`, `gapPx`, `dismissible`
    - style slots: `style`, `listStyle`, `itemStyle`, `variantStyles`, `variantIcons`
    - dismiss lifecycle hook: `onDismiss` with `reason` (`auto-dismiss`, `manual-dismiss`)
- Deterministic queue utility is available in `src/components/toasts/createToastQueue.ts`:
    - `createToastQueue()`
    - `enqueue(...)`, `dequeue()`, `remove(id)`, `peek()`, `clear()`, `size()`, `list()`
- Dev example is available in `src/components/examples/ToastsExample.tsx` and rendered in the App example-components tab.

- [ ] `Cutscene` sequence system
    - Provide step runner with text/wait/signal/transition hooks.
    - Support per-step progression mode (`awaitInput` or timed auto-advance) and skip policy.

- [ ] `Dialogue` JSON format + runtime bridge
    - Accept authored conversation payloads and validate them before runtime.
    - Convert dialogue nodes into cutscene steps consumable by the sequence system.

- [x] `Map + mini-map system`
    - Add shared map state model for discovery/fog, player location, and marker layers.
    - Provide full-screen map view and HUD mini-map from the same source-of-truth data.
    - Support objective/NPC/checkpoint markers with configurable zoom/scale behavior.

<a id="map-mini-map-system"></a>

- Map/minimap shared state service is available in `src/services/mapMiniMap.ts`.
- Use `createMapMiniMapService(...)` for isolated hosts/tests or `mapMiniMap` singleton for shared runtime usage.
- Core map state APIs:
    - `setWorld(...)`
    - `setPlayerPosition(...)`
    - `discoverTile(...)` / `discoverAtWorldPosition(...)` / `discoverAroundWorldPosition(...)`
    - `isDiscoveredTile(...)`
- View/layer policy APIs:
    - `setLayerVisibility(channel, layer, visible)`
    - `setZoomPolicy(channel, patch)`
    - `setZoom(channel, value)`
- Marker resolution API:
    - `resolveMarkers({ channel: "map" | "minimap", context? })`
    - honors marker layers (`objective`, `npc`, `checkpoint`, `poi`, `custom`) and minimap radius filtering derived from zoom policy.
- Snapshot API:
    - `getSnapshot()` exposes world model, discovered tile count, player position, zoom state, and layer visibility for HUD/full-map consumers.
- Default lifecycle signals:
    - `map:discovery:updated`
    - `map:player:updated`
    - `map:view:changed`

- [x] `Camera system v2`
    - Add dead-zone, look-ahead, bounds, shake layering, and scripted camera track support.
    - Expose camera behaviors consumable by gameplay and cutscene flows.

<a id="camera-system-v2"></a>

- Camera v2 service is available in `src/services/cameraV2.ts`.
- Use `createCameraV2Service(...)` for isolated hosts/tests or `cameraV2` singleton for shared runtime usage.
- Core camera configuration APIs:
    - `setViewport(...)`
    - `setPosition(...)`
    - `setBounds(...)`
    - `setDeadZone(...)`
    - `setLookAhead(...)`
- Runtime camera behavior APIs:
    - `update(deltaMs, target?)` for deterministic follow/track progression
    - `startShake(...)` for layered timed shake channels
    - `playTrack(...)` / `stopTrack(...)` for scripted camera track control
    - `getSnapshot()` for gameplay/HUD/render consumers
- Default lifecycle signals:
    - `camera:v2:updated`
    - `camera:v2:track:started`
    - `camera:v2:track:completed`
    - `camera:v2:shake:started`
    - `camera:v2:shake:completed`

- [x] `Pathfinding/navigation grid`
    - Add reusable path query layer for NPC patrol/chase/navigation.
    - Integrate with collision/world data and deterministic query behavior.

<a id="pathfinding-navigation-grid"></a>

- Pathfinding/navigation service is available in `src/services/pathfindingNavigation.ts`.
- Use `createPathfindingNavigationService(...)` for isolated hosts/tests or `pathfindingNavigation` singleton for shared runtime usage.
- Grid/world setup APIs:
    - `setGrid(...)`
    - `setWalkableTileValues(...)`
    - `setWorldConfig(...)`
    - `setDynamicBlocker(...)` / `clearDynamicBlockers()`
- Deterministic query APIs:
    - `findPath(start, goal, options?)` for A\* route resolution
    - `buildFlowField(goal, options?)` for flow-field cost/next-step generation
    - `getNextFlowStep(flowField, from)` for steering/runtime next-cell lookup
    - `isWalkable(...)`, `worldToTile(...)`, `tileToWorld(...)` for collision/world alignment
    - `getSnapshot()` for diagnostics and UI tooling
- Default lifecycle signals:
    - `navigation:grid:updated`
    - `navigation:path:resolved`
    - `navigation:flow-field:resolved`

- [x] `Ability + cooldown effects system`
    - Define typed active/passive ability payloads with costs and cooldown groups.
    - Emit lifecycle signals for HUD/action button/cooldown UI integration.

<a id="ability-cooldown-effects-system"></a>

- Ability cooldown/effects service is available in `src/services/abilityCooldownEffects.ts`.
- Use `createAbilityCooldownEffectsService(...)` for isolated hosts/tests or `abilityCooldownEffects` singleton for shared runtime usage.
- Ability/runtime setup APIs:
    - `registerAbility(...)` / `unregisterAbility(...)`
    - `setResource(...)` / `getResource(...)`
    - `getAbility(...)` / `listAbilities(...)`
- Cast/cooldown/effect APIs:
    - `canCast(abilityId, context?)` for deterministic cast guard diagnostics
    - `cast(abilityId, context?)` for cost spend + cooldown + effect application
    - `tick(deltaMs)` for cooldown/effect progression and expiry
    - `getSnapshot()` for HUD/action button/cooldown indicator state projection
- Active/passive definition hooks:
    - `castCondition(...)`
    - `resolveCosts(...)`
    - `resolveEffects(...)`
- Default lifecycle signals:
    - `ability:cast:applied`
    - `ability:cast:blocked`
    - `ability:cooldown:updated`
    - `ability:effect:applied`
    - `ability:effect:expired`

- [x] `Entity state machine system (behavior + animation)`
    - Define per-entity state profiles (`idle`, `moving`, `attacking`, `damaged`, `stunned`, `dead`) with guarded transitions.
    - Keep behavior logic and animation selection synchronized through one active state source.
    - Support interrupt priorities and `onEnter`/`onExit` hooks for gameplay events.
    - Define `player`/`npc`/`boss` state taxonomies with shared naming/transition conventions.
    - Baseline taxonomy example: `player` (`dodge`, `block`), `npc` (`patrol`, `flee`), `boss` (`phase-1`, `phase-2`).

<a id="entity-state-machine-system-behavior-animation"></a>

- Entity state profile machine utilities are available in `src/logic/entity/entityStateMachine.ts`.
- Use `createEntityBehaviorStateMachine(archetype, hooks?)` for deterministic per-archetype behavior flow.
- Transition signals are exposed via `ENTITY_BEHAVIOR_SIGNAL` (`attack`, `damaged`, `stunned`, `dodge`, `block`, `patrol`, `flee`, `phase-2`).
- Behavior/animation synchronization is sourced from the same active state via:
    - machine `getState()` for behavior logic
    - machine `getAnimationClip()` or `resolveEntityAnimationClip(state)` for animation selection
- Archetype taxonomy coverage:
    - `player`: includes `dodge`, `block` interrupt transitions
    - `npc`: includes `patrol`, `flee` transitions
    - `boss`: includes `phase-1`, `phase-2` transitions

- [x] `Equipment + stats aggregation`
    - Add stat resolution pipeline (`base + gear + buffs/debuffs`) with typed modifiers.
    - Expose derived stats to combat/movement modules and HUD.

<a id="equipment-stats-aggregation"></a>

- Equipment stats aggregation service is available in `src/services/equipmentStats.ts`.
- Use `createEquipmentStatsService(...)` for isolated hosts/tests or `equipmentStats` singleton for shared runtime usage.
- Entity stat lifecycle APIs:
    - `registerEntity(...)`
    - `setBaseStats(...)`
    - `equipItem(...)` / `unequipItem(...)`
    - `applyEffect(...)` / `removeEffect(...)`
    - `getResolvedStats(...)`
- Derived projections are exposed for downstream systems:
    - combat: `maxHealth`, `attackPower`, `defense`, `critChance`, `damageReduction`
    - movement: `moveSpeed`, `maxSpeedScale`
    - HUD snapshot access through `getEntitySnapshot(...)` / `listEntitySnapshots(...)`
- Default lifecycle signals:
    - `stats:equipment:changed`
    - `stats:equipment:equipped`
    - `stats:equipment:effect-applied`

- [x] `Loot/progression economy system`
    - Add weighted drops, tier tables, and reward bundle composition hooks.
    - Support balancing-friendly data tables for progression tuning.

<a id="loot-progression-economy-system"></a>

- Loot/progression economy service is available in `src/services/lootEconomy.ts`.
- Use `createLootEconomyService(...)` for isolated hosts/tests or `lootEconomy` singleton for shared runtime usage.
- Authoring/registration APIs:
    - `registerDropTable(...)`
    - `registerAffixPool(...)`
    - `registerEconomyTable(...)`
    - `registerRewardBundle(...)`
- Runtime resolution APIs:
    - `resolveDropTable(tableId, options?)` for deterministic weighted drop results
    - `resolveRewardBundle(bundleId, options?)` for static + table-composed reward resolution
    - `quoteItem(tableId, itemId)` for buy/sell pricing lookups
    - `getSnapshot()` for diagnostics and tooling counters
- Default lifecycle signals:
    - `loot:drop:resolved`
    - `loot:bundle:resolved`
    - `loot:economy:table:updated`

- [x] `World streaming/chunk loader`
    - Load/unload world chunks dynamically for large map support.
    - Keep region-boundary activation deterministic.

<a id="world-streaming-chunk-loader"></a>

- World streaming service is available in `src/services/worldStreaming.ts`.
- Use `createWorldStreamingService(...)` for isolated hosts/tests or `worldStreaming` singleton for shared runtime usage.
- World and policy APIs:
    - `setWorld(...)`
    - `setLoadPolicy(...)`
    - `updateFocus(...)`
- Entity/chunk lifecycle APIs:
    - `registerEntity(...)` / `unregisterEntity(...)`
    - `updateEntityPosition(...)`
    - `forceLoadChunk(...)` / `forceUnloadChunk(...)`
    - `isEntityActive(...)`
    - `getSnapshot()`
- Default lifecycle signals:
    - `world:stream:chunk:loaded`
    - `world:stream:chunk:unloaded`
    - `world:stream:entity:activated`
    - `world:stream:entity:deactivated`
    - `world:stream:updated`

- [x] `Tutorial/onboarding state machine`
    - Add gated tutorial step flow with prompt + completion tracking.
    - Support skip/resume behaviors.

<a id="tutorial-onboarding-state-machine"></a>

- Tutorial onboarding service is available in `src/services/tutorialOnboarding.ts`.
- Use `createTutorialOnboardingService(...)` for isolated hosts/tests or `tutorialOnboarding` singleton for shared runtime usage.
- Flow/runtime APIs:
    - `registerFlow(...)` / `unregisterFlow(...)`
    - `start(flowId, options?)`
    - `canAdvance()` / `advance()`
    - `skip()` / `resume()`
    - `setContext(...)` / `resetContext()`
    - `getSnapshot()`
- Completion persistence APIs:
    - `getPersistedState()`
    - `restorePersistedState(...)`
- Prompt integration:
    - step definitions support `prompt` payloads with `dialogue` / `textbox` / `toast` / `custom` channels.
- Default lifecycle signals:
    - `tutorial:onboarding:started`
    - `tutorial:onboarding:step:changed`
    - `tutorial:onboarding:step:blocked`
    - `tutorial:onboarding:step:completed`
    - `tutorial:onboarding:completed`
    - `tutorial:onboarding:skipped`
    - `tutorial:onboarding:resumed`
    - `tutorial:onboarding:prompt`

- [x] `Multiplayer readiness boundary`
    - Define deterministic simulation and state-authority boundaries for future networking.
    - Keep core APIs replication-safe where practical.

<a id="multiplayer-readiness-boundary"></a>

- Multiplayer boundary service is available in `src/services/multiplayerBoundary.ts`.
- Use `createMultiplayerBoundaryService(...)` for isolated hosts/tests or `multiplayerBoundary` singleton for shared runtime usage.
- Contract and validation APIs:
    - `registerContract(...)` / `unregisterContract(...)`
    - `getContract(...)` / `listContracts()`
    - `isApiReplicationSafe(contractId, api)`
    - `evaluateAction({ contractId, api, actor })`
    - `getReadinessReport()`
- Authority and replication model:
    - contracts declare deterministic domain ownership (`server`, `client`, `shared`)
    - evaluations block actor-authority mismatch and non-replication-safe API usage
- Default lifecycle signals:
    - `multiplayer:boundary:updated`
    - `multiplayer:boundary:evaluated`

#### P3 — Tooling + authoring

<a id="planned-visual-worldentity-placement-tool"></a>

- [x] `Visual world/entity placement tool`
    - Add editor-mode UI to place/move/delete entities directly on the canvas.
    - Support snap/grid placement, selection/drag helpers, and basic bounds validation.
    - Export/import placement payloads as JSON for level bootstrap workflows.

<a id="visual-worldentity-placement-tool"></a>

- World entity placement authoring service is available in `src/services/worldEntityPlacement.ts`.
- Use `createWorldEntityPlacementService(...)` for isolated hosts/tests or `worldEntityPlacement` singleton for shared editor/runtime usage.
- Placement authoring APIs:
    - `setWorldBounds(...)`
    - `setGridOptions(...)`
    - `placeEntity(...)`
    - `moveEntity(...)`
    - `deleteEntity(...)`
- Lightweight gizmo/workflow APIs:
    - `selectEntity(...)`
    - `moveSelected(...)`
    - `duplicateSelected(...)`
- Placement persistence APIs:
    - `exportPayload(...)`
    - `importPayload(...)`
    - `getSnapshot()`
- Default lifecycle signals:
    - `world:placement:changed`
    - `world:placement:selected`
    - `world:placement:invalid`
    - `world:placement:imported`

- [x] `Encounter/content authoring presets`
    - Define reusable templates for spawn packs, objectives, and rewards.
    - Support preset import/export for fast iteration.

- Encounter preset authoring service is available in `src/services/encounterPresets.ts`.
- Use `createEncounterPresetService(...)` for isolated hosts/tests or `encounterPresets` singleton for shared tooling/runtime usage.
- Core authoring registration APIs:
    - `registerSpawnPack(...)` / `unregisterSpawnPack(...)`
    - `registerObjectiveBundle(...)` / `unregisterObjectiveBundle(...)`
    - `registerRewardBundle(...)` / `unregisterRewardBundle(...)`
    - `registerTemplate(...)` / `unregisterTemplate(...)`
- Template retrieval and expansion APIs:
    - `getTemplate(...)`
    - `resolveTemplate(...)`
- Preset sharing APIs:
    - `exportPayload(...)`
    - `importPayload(...)`
    - `getSnapshot()`
- Default lifecycle signals:
    - `encounter:preset:changed`
    - `encounter:preset:invalid`
    - `encounter:preset:imported`

- [x] `Localization/text key pipeline`
    - Add key-based text lookup service with fallback locale behavior.
    - Support dialogue/textbox/toast integration using localized key payloads.

- Localization service is available in `src/services/localization.ts`.
- Use `createLocalizationService(...)` for scoped hosts/tests or `localizationService` singleton for shared runtime usage.
- Core localization APIs:
    - `registerCatalog(...)` / `unregisterCatalog(...)`
    - `setLocale(...)` / `getLocale()`
    - `setFallbackLocale(...)` / `getFallbackLocale()`
    - `translate(...)`
- Prompt key payload resolution helper:
    - `resolveLocalizedPromptMessage(...)` supports `dialogueKey` / `textboxKey` / `toastKey` and generic `textKey` payload fallback.
    - parameter payload keys support channel-specific (`dialogueParams` / `textboxParams` / `toastParams`) and generic (`textParams`) variants.
- Tutorial prompt integration:
    - `createTutorialOnboardingService(...)` now supports `localizePrompt` resolver hooks for localized prompt emission.

- [x] `Content validation CLI (authored JSON)`
    - Validate dialogue/quest/loot/placement authored JSON files before runtime apply.
    - Reuse schema migration + runtime registration/import contracts for consistency.

- Content validation command is available via `npm run content:validate`.
- Optional domain filter: `npm run content:validate -- --domain dialogue`.
- File targeting supports explicit JSON paths: `npm run content:validate -- content/dialogue/intro.json content/quest/main.json`.
- Default discovery (when no files are passed) scans `content/`, `data/`, and `public/content/` for `.json` files.
- Validation output includes file-relative path plus JSON-path issue lines for actionable fixes.

- [x] `Prefab contract test harness`
    - Provide reusable lifecycle/input/render contract tests for prefabs.
    - Keep new prefab additions consistent through shared test suites.

- Shared prefab contract harness is available in `src/tests/contracts/prefabContractHarness.tsx`.
- Use `runPrefabContractSuite(...)` to apply standardized contract checks for:
    - render invariants (`assertRender`)
    - lifecycle/update invariants (`assertUpdate`)
    - optional input interactions (`inputContract.run` + `inputContract.assert`)
- Reference usage is available in `src/tests/prefabContractHarness.test.tsx` for `Toggle` and `HUDSlot` prefab contract coverage.

- [x] `CI quality gates for content`
    - Fail CI when content schemas/migrations/contracts regress.
    - Run fast validation for authored data and prefab contracts on pull requests.

- Content quality gate commands are available in `package.json`:
    - `npm run content:validate:gates` (domain checks for `dialogue`, `quest`, `placement`)
    - `npm run test:content:gates` (focused migration + content validation + prefab contract suites)
    - `npm run quality:content` (combined pre-merge gate command)
- CI workflow integration is available in `.github/workflows/ci.yml` through the `content-quality-gates` job.
- The gate fails when authored content schema/migration checks or prefab contract checks regress.

- [x] `Balancing simulator tooling`
    - Run batch combat/economy simulations from config presets.
    - Emit summary reports for tuning workflows.

- Balancing simulator service is available in `src/services/balancingSimulator.ts`.
- Use `createBalancingSimulatorService(...)` for isolated tuning jobs/tests or `balancingSimulator` singleton for shared tooling usage.
- Preset payloads support `version: 1` with `combatScenarios` and/or `economyScenarios` arrays.
- Batch report APIs:
    - `parsePresetPayload(...)`
    - `runCombatScenario(...)`
    - `runEconomyScenario(...)`
    - `runBatch(...)`
- CLI runner command is available via `npm run balance:simulate`.
    - Optional deterministic seed: `npm run balance:simulate -- --seed 1337`
    - Optional JSON output: `npm run balance:simulate -- --json --pretty`
    - Optional explicit files: `npm run balance:simulate -- content/balancing/combat-baseline.json`

- [x] `Release pipeline + versioning`
    - Define semantic version workflow, changelog automation, and artifact verification.
    - Include rollback and promotion gate policies.

- Release pipeline workflow is available in `.github/workflows/release.yml`.
    - Tag trigger: push semantic tags (`v*.*.*`) to run release verification + staged promotion.
    - Manual trigger: `workflow_dispatch` with `release_tag` and `promote_to` (`staging` or `production`).
- Changelog tooling command:
    - `npm run release:changelog -- --version 0.1.0 --to HEAD --notes release-notes.md`
- Artifact verification commands:
    - `npm run build`
    - `npm run release:verify:artifacts -- --version 0.1.0`
    - writes `dist/SHA256SUMS.txt` + `dist/release-manifest.json`.
- Full release gate command:
    - `npm run release:verify`
    - runs content quality gates, lint, tests, strict coverage, build, and artifact verification.
- Rollback strategy:
    - dispatch the release workflow with `release_tag` set to a previously known-good tag (example: `v0.2.3`).
    - set `promote_to=production` to re-promote previously verified artifacts through the same staged gates.

- [x] `Asset pipeline tooling`
    - Validate sprite/audio imports, atlas pack workflows, and missing-asset conditions.
    - Track asset size/compression budgets.

- Asset validation service is available in `src/services/assetValidation.ts`.
- Use `validateAssetPipeline(...)` for deterministic validation reports in tooling/tests.
- CLI command is available via `npm run asset:validate`.
    - Optional JSON output: `npm run asset:validate -- --json --pretty`
    - Optional budget overrides (bytes):
        - `--max-total-bytes`
        - `--max-sprite-bytes`
        - `--max-audio-bytes`
        - `--max-atlas-bytes`
    - Optional explicit source files: `npm run asset:validate -- src/components/gameModes/sceneAudio.ts`
- Validation resolves both:
    - alias asset imports (`@/assets/...` => `src/assets/...`)
    - public URL asset refs (`/foo/bar.png` => `public/foo/bar.png`, including URL-encoded paths)

- [x] `Economy/content balancing governance`
    - Define tuning ownership workflow and accepted balance metrics.
    - Require signoff criteria for major economy/combat table updates.

- Balancing governance service is available in `src/services/balancingGovernance.ts`.
- Use `evaluateBalancingGovernance(...)` to validate report benchmark metrics and required owner signoffs.
- CLI command is available via `npm run balance:governance`.
    - Optional policy override: `npm run balance:governance -- --policy content/balancing/governance.policy.json`
    - Optional JSON output: `npm run balance:governance -- --json --pretty`
    - Optional explicit report files: `npm run balance:governance -- content/balancing/reports/combat-major-update.json`
- Quality gate command is available via `npm run quality:balance`.
    - Includes governance validation (`--allow-empty`) plus focused deterministic tests.

- [x] `Accessibility QA matrix`
    - Define repeatable QA checks for keyboard-only, readability/contrast, reduced motion, and assist timing.
    - Integrate matrix checks into release readiness.

- Accessibility QA matrix service is available in `src/services/accessibilityQaMatrix.ts`.
- Use `evaluateAccessibilityQaMatrix(...)` to validate required checklist areas/checks and release-pass status output.
- CLI command is available via `npm run accessibility:qa`.
    - Optional JSON output: `npm run accessibility:qa -- --json --pretty`
    - Optional explicit report files: `npm run accessibility:qa -- content/accessibility/qa-matrix/main-release.json`
- Quality gate command is available via `npm run quality:accessibility`.
    - Includes accessibility QA matrix report validation (`--allow-empty`) plus focused deterministic tests.
- Release verification gate (`npm run release:verify`) now includes `quality:accessibility`.

Draft JSON shape for accessibility QA matrix report:

```json
{
    "version": 1,
    "runId": "qa-2026-02-28-main",
    "executedAt": "2026-02-28T12:00:00.000Z",
    "areas": [
        {
            "id": "keyboard-navigation",
            "checks": [
                { "id": "focus-order", "status": "pass" },
                { "id": "focus-visible", "status": "pass" },
                { "id": "primary-actions-reachable", "status": "pass" }
            ]
        },
        {
            "id": "readability-contrast",
            "checks": [
                { "id": "text-scale-legible", "status": "pass" },
                { "id": "contrast-aa", "status": "pass" }
            ]
        },
        {
            "id": "reduced-motion",
            "checks": [
                { "id": "reduced-flash-toggle", "status": "pass" },
                { "id": "reduced-shake-toggle", "status": "pass" }
            ]
        },
        {
            "id": "assist-timing",
            "checks": [
                { "id": "hold-toggle-option", "status": "pass" },
                { "id": "subtitle-speed-options", "status": "pass" }
            ]
        }
    ]
}
```

Draft JSON shape for authored dialogue:

```json
{
    "id": "intro-village",
    "start": "n1",
    "nodes": [
        {
            "id": "n1",
            "speakerId": "elder",
            "speakerName": "Village Elder",
            "portrait": "elder-neutral",
            "emotion": "neutral",
            "dialogues": [
                "Welcome, traveler.",
                "The forest path is dangerous after dusk."
            ],
            "voiceCue": "npc:elder:line1",
            "speedMs": 28,
            "awaitInput": true,
            "next": "n2",
            "tags": ["intro", "tutorial"]
        },
        {
            "id": "n2",
            "speakerName": "Village Elder",
            "dialogues": ["Will you help us?"],
            "choices": [
                {
                    "id": "accept",
                    "label": "I will help.",
                    "next": "accept-node"
                },
                {
                    "id": "decline",
                    "label": "Not right now.",
                    "next": "decline-node"
                }
            ]
        }
    ]
}
```

### Default style primitives (`src/styles/defaults.css`)

Engine default classes are globally loaded in `src/main.tsx` to help extensions stay visually consistent.

Think of these as lightweight engine utility classes (similar to Bootstrap utility/components, but scoped to UrsaManus defaults).

Use these class groups:

- Containers/layout: `um-container`, `um-panel`, `um-stack`, `um-row`
- Text/meta: `um-title`, `um-text`, `um-help`, `um-label`
- Buttons: `um-button`, `um-button--primary`, `um-button--ghost`, `um-button--capsule`
- Capsules/pills: `um-capsule`
- Inputs: `um-input`, `um-select`, `um-textarea`
- Checkbox/radio: `um-choice-group`, `um-choice`, `um-checkbox`, `um-radio`
- Lists: `um-list`, `um-list-item`, `um-list--plain`, `um-list--inline`

### Class reference (quick lookup)

| Class                | Purpose                                     | Typical element(s)                       |
| -------------------- | ------------------------------------------- | ---------------------------------------- |
| `um-container`       | Primary boxed section wrapper               | `section`, `div`                         |
| `um-panel`           | Nested boxed region inside container        | `div`                                    |
| `um-stack`           | Vertical layout with consistent spacing     | `div`, `section`, `form`                 |
| `um-row`             | Inline row layout with wrapping and spacing | `div`                                    |
| `um-title`           | Section title text style                    | `h2`, `h3`, `p`                          |
| `um-text`            | Standard muted body text                    | `p`, `span`                              |
| `um-help`            | Small helper/supporting text                | `p`, `small`                             |
| `um-label`           | Label style with aligned content            | `label`                                  |
| `um-button`          | Base button style                           | `button`                                 |
| `um-button--primary` | Primary action button variant               | `button`                                 |
| `um-button--ghost`   | Low-emphasis transparent button variant     | `button`                                 |
| `um-button--capsule` | Pill-shaped button variant                  | `button`                                 |
| `um-capsule`         | Small metadata/status capsule               | `span`, `div`                            |
| `um-input`           | Text-like input field style                 | `input[type=text]`, `input[type=number]` |
| `um-select`          | Select field style                          | `select`                                 |
| `um-textarea`        | Multiline text field style                  | `textarea`                               |
| `um-choice-group`    | Inline grouping for radio/checkbox sets     | `div`, `fieldset`                        |
| `um-choice`          | Label wrapper for one checkbox/radio choice | `label`                                  |
| `um-checkbox`        | Checkbox accent styling hook                | `input[type=checkbox]`                   |
| `um-radio`           | Radio accent styling hook                   | `input[type=radio]`                      |
| `um-list`            | Default styled list container               | `ul`, `ol`                               |
| `um-list-item`       | List line-height/readability style          | `li`                                     |
| `um-list--plain`     | Remove bullets and left indent              | `ul`, `ol`                               |
| `um-list--inline`    | Inline/wrapping list layout                 | `ul`, `ol`                               |

Recommended approach:

- Start with `um-container` + `um-stack` for section structure.
- Add semantic HTML first, then attach `um-*` classes.
- Layer feature-specific classes after `um-*` classes when customization is needed.

### Usage model (Bootstrap-like)

- Compose classes on plain HTML elements (`div`, `button`, `input`, `ul`, etc.).
- Start with structure classes (`um-container`, `um-stack`, `um-row`).
- Add component classes (`um-button`, `um-input`, `um-capsule`).
- Add variants only when needed (`um-button--primary`, `um-button--capsule`).

### Common combinations

- Card/panel: `um-container um-stack`
- Toolbar row: `um-row` + `um-button` variants
- Labeled form field: `um-stack` + `um-label` + `um-input`
- Choice sets: `um-choice-group` + `um-choice`
- Status tags: `um-capsule`
- Inline metadata list: `um-list um-list--inline`

Copy/paste starter:

```tsx
<section className="um-container um-stack">
    <h3 className="um-title">Panel title</h3>
    <p className="um-text">Consistent default styling for extensions.</p>

    <div className="um-row">
        <button className="um-button">Default</button>
        <button className="um-button um-button--primary">Primary</button>
        <button className="um-button um-button--capsule">Capsule</button>
        <span className="um-capsule">Status</span>
    </div>

    <label className="um-label" htmlFor="name-input">
        Name
    </label>
    <input id="name-input" className="um-input" placeholder="Type..." />

    <div className="um-choice-group" role="group" aria-label="Options">
        <label className="um-choice">
            <input type="checkbox" className="um-checkbox" /> Enable SFX
        </label>
        <label className="um-choice">
            <input type="radio" name="difficulty" className="um-radio" />
            Normal
        </label>
    </div>

    <ul className="um-list">
        <li className="um-list-item">First item</li>
        <li className="um-list-item">Second item</li>
    </ul>
</section>
```

### Recipe: compact action toolbar

```tsx
<div className="um-row">
    <button className="um-button um-button--primary">Save</button>
    <button className="um-button">Reset</button>
    <button className="um-button um-button--ghost">Advanced</button>
    <span className="um-capsule">Draft</span>
</div>
```

### Recipe: list + empty state container

```tsx
<section className="um-container um-stack">
    <h3 className="um-title">Inventory</h3>

    <ul className="um-list">
        <li className="um-list-item">Potion</li>
        <li className="um-list-item">Torch</li>
        <li className="um-list-item">Map</li>
    </ul>

    <p className="um-help">No more items available.</p>
</section>
```

### Recipe: radio + checkbox filter bar

```tsx
<div className="um-container um-stack">
    <p className="um-title">Filters</p>

    <div className="um-choice-group" role="group" aria-label="Difficulty">
        <label className="um-choice">
            <input type="radio" name="difficulty" className="um-radio" />
            Easy
        </label>
        <label className="um-choice">
            <input
                type="radio"
                name="difficulty"
                className="um-radio"
                defaultChecked
            />
            Normal
        </label>
        <label className="um-choice">
            <input type="radio" name="difficulty" className="um-radio" />
            Hard
        </label>
    </div>

    <label className="um-choice">
        <input type="checkbox" className="um-checkbox" defaultChecked />
        Show completed quests
    </label>
</div>
```

### Notes

- `um-button` styles are intentionally generic; apply game/mode-specific classes on top when needed.
- `um-checkbox` / `um-radio` rely on native inputs with engine accent color for accessibility and browser consistency.
- Utilities are globally available once `src/styles/defaults.css` is imported in `src/main.tsx`.

### Migration examples (plain HTML → `um-*`)

#### 1) Buttons + status capsule

Before:

```tsx
<div>
    <button>Save</button>
    <button>Cancel</button>
    <span>Draft</span>
</div>
```

After:

```tsx
<div className="um-row">
    <button className="um-button um-button--primary">Save</button>
    <button className="um-button">Cancel</button>
    <span className="um-capsule">Draft</span>
</div>
```

#### 2) Form block

Before:

```tsx
<div>
    <label htmlFor="name">Name</label>
    <input id="name" />
</div>
```

After:

```tsx
<div className="um-container um-stack">
    <label className="um-label" htmlFor="name">
        Name
    </label>
    <input id="name" className="um-input" />
</div>
```

#### 3) Checkbox/radio options

Before:

```tsx
<div>
    <label>
        <input type="checkbox" /> Enable audio
    </label>
    <label>
        <input type="radio" name="mode" /> Arcade
    </label>
</div>
```

After:

```tsx
<div className="um-choice-group" role="group" aria-label="Settings">
    <label className="um-choice">
        <input type="checkbox" className="um-checkbox" /> Enable audio
    </label>
    <label className="um-choice">
        <input type="radio" className="um-radio" name="mode" /> Arcade
    </label>
</div>
```

#### 4) Lists

Before:

```tsx
<ul>
    <li>Potion</li>
    <li>Map</li>
</ul>
```

After:

```tsx
<ul className="um-list">
    <li className="um-list-item">Potion</li>
    <li className="um-list-item">Map</li>
</ul>
```

#### 5) Container + helper text

Before:

```tsx
<div>
    <h3>Settings</h3>
    <p>Adjust options below.</p>
</div>
```

After:

```tsx
<section className="um-container um-stack">
    <h3 className="um-title">Settings</h3>
    <p className="um-help">Adjust options below.</p>
</section>
```

### Reusable input helpers (keys + compass)

UrsaManus now includes helper utilities in `@/components/screenController` so you can assign gameplay behavior once and reuse it across keyboard + compass controls:

- `createPlayerInputActions(options)`
- `useActionKeyBindings(actions, options)`
- `useGamepadInput(actions, options)`
- `CompassActionControl`

Copy/paste starter:

```tsx
import {
    CompassActionControl,
    createPlayerInputActions,
    useActionKeyBindings,
} from "@/components/screenController";

function InputModule({ onChanged }: { onChanged?: () => void }) {
    const actions = createPlayerInputActions({
        onChanged,
        interactBehavior: "dodge", // optional: "attack" (default) | "dodge"
        onInteract: () => {
            // custom interact behavior
        },
    });

    useActionKeyBindings(actions, {
        enabled: true,
        preventDefault: true,
    });

    return <CompassActionControl actions={actions} />;
}
```

Tip: treat `actions` as your semantic gameplay contract (`north/south/east/west/interact`) and keep device bindings (`WASD`, arrows, on-screen buttons) thin.
Use `interactBehavior: "dodge"` when you want quick player dodge-state validation without introducing a new action key.

#### Gamepad mapping helper (init-time remap)

Use `useGamepadInput` when you want to map a standard controller into the same action contract at startup.

```tsx
import {
    createPlayerInputActions,
    useActionKeyBindings,
    useGamepadInput,
} from "@/components/screenController";

function InputWithGamepad({ onChanged }: { onChanged?: () => void }) {
    const actions = createPlayerInputActions({ onChanged });

    useActionKeyBindings(actions);

    useGamepadInput(actions, {
        deadzone: 0.24,
        mapping: {
            axis: {
                north: { axis: 1, direction: "negative" },
                south: { axis: 1, direction: "positive" },
                west: { axis: 0, direction: "negative" },
                east: { axis: 0, direction: "positive" },
            },
            button: {
                interact: 0,
            },
        },
        onConnected: (pad) => {
            console.log("Gamepad connected", pad.id);
        },
        onDisconnected: (pad) => {
            console.log("Gamepad disconnected", pad.id);
        },
    });

    return null;
}
```

Use this API when you want remapping to be easy for users at app init time (e.g., from persisted settings or per-platform defaults).

#### Input profile presets + persistence helper

Use `createInputProfileBindings` (or `useInputProfileBindings`) when you want one profile object to drive keyboard + gamepad + pointer options together.

```tsx
import {
    createPlayerInputActions,
    createInputProfileBindings,
    loadInputProfilePreset,
    saveInputProfilePreset,
    useActionKeyBindings,
    useGamepadInput,
} from "@/components/screenController";

const savedProfile = loadInputProfilePreset();

const bindings = createInputProfileBindings({
    profile: savedProfile ?? "default",
});

const actions = createPlayerInputActions();

useActionKeyBindings(actions, bindings.keyBindings);
useGamepadInput(actions, bindings.gamepad);

saveInputProfilePreset({
    ...bindings.profile,
    deadzone: 0.26,
});
```

#### Pointer click/tap tracking helper

Use `usePointerTapTracking` to capture click/tap coordinates and whether the pointer is inside or outside a target render area.

```tsx
import { useCallback, useRef } from "react";
import {
    POINTER_TAP_SIGNAL,
    usePointerTapTracking,
    type PointerTapPayload,
} from "@/components/screenController";

function PointerModule() {
    const areaRef = useRef<HTMLDivElement | null>(null);

    const onTap = useCallback((payload: PointerTapPayload) => {
        console.log(payload.clientX, payload.clientY, payload.insideTarget);
    }, []);

    usePointerTapTracking({
        enabled: true,
        getTarget: () => areaRef.current,
        onTap,
    });

    return <div ref={areaRef}>Render area</div>;
}
```

Signal emitted on each tap: `POINTER_TAP_SIGNAL` (`input:pointer:tap`).

### Full reference component (end-to-end)

If you want a complete starter that combines:

- `um-*` default style classes,
- shared player input action map,
- keyboard bindings,
- compass on-screen controls,

use:

- `DefaultInputStyleExample` from `src/components/examples/DefaultInputStyleExample.tsx`

Import:

```tsx
import { DefaultInputStyleExample } from "@/components/examples";

<DefaultInputStyleExample
    onChanged={() => {
        // force render or sync UI state
    }}
    onInteract={() => {
        // custom interaction behavior
    }}
/>;
```

### LifeGauge UI primitive (default + skinnable)

Use `LifeGauge` from `@/components/lifeGauge` when you want a health/energy meter with:

- default plug-and-play skin,
- headless render state for custom skin overrides,
- built-in clamping + tone thresholds (`healthy` / `warning` / `critical`).

#### Default skin (quickest)

```tsx
import { LifeGauge } from "@/components/lifeGauge";

function Hud() {
    return <LifeGauge value={64} max={100} label="Player HP" />;
}
```

#### Custom text formatting

```tsx
import { LifeGauge } from "@/components/lifeGauge";

function Hud() {
    return (
        <LifeGauge
            value={42}
            max={100}
            label="Shield"
            formatValueText={(state) => `${state.percentage}%`}
        />
    );
}
```

#### Full custom skin (render override)

```tsx
import { LifeGauge } from "@/components/lifeGauge";

function CustomHud() {
    return (
        <LifeGauge
            value={28}
            max={100}
            label="Player HP"
            render={(state) => (
                <div
                    role="meter"
                    aria-label={state.ariaLabel}
                    aria-valuemin={state.min}
                    aria-valuemax={state.max}
                    aria-valuenow={state.clampedValue}
                    aria-valuetext={state.valueText}
                    data-tone={state.tone}
                    className="um-panel um-stack"
                >
                    <div className="um-row">
                        <span className="um-capsule">{state.tone}</span>
                        <span className="um-text">{state.valueText}</span>
                    </div>

                    <div
                        style={{
                            height: "0.5rem",
                            borderRadius: "999px",
                            overflow: "hidden",
                            border: "1px solid var(--um-border-soft)",
                            background: "var(--um-surface-base)",
                        }}
                        aria-hidden="true"
                    >
                        <div
                            style={{
                                width: `${state.percentage}%`,
                                height: "100%",
                                background: "var(--um-accent)",
                            }}
                        />
                    </div>
                </div>
            )}
        />
    );
}
```

#### Full reference example component

Use the full demo component if you want side-by-side default and custom skins with built-in controls:

- `LifeGaugeExample` from `src/components/examples/LifeGaugeExample.tsx`

```tsx
import { LifeGaugeExample } from "@/components/examples";

<LifeGaugeExample title="LifeGauge preview" />;
```

### ActionButton UI primitive (pressed + cooldown)

Use `ActionButton` from `@/components/actionButton` when you need a gameplay action trigger with:

- explicit pressed/disabled states,
- cooldown lockout behavior,
- default skin plus full render override support.

#### Default usage (quickest)

```tsx
import { ActionButton } from "@/components/actionButton";

<ActionButton
    label="Dash"
    onClick={() => {
        // trigger action
    }}
/>;
```

#### Controlled pressed/cooldown

```tsx
import { ActionButton } from "@/components/actionButton";

<ActionButton
    label="Dash"
    pressed={isDashQueued}
    cooldownRemainingMs={dashCooldownRemainingMs}
    cooldownTotalMs={dashCooldownMs}
    onClick={attemptDash}
/>;
```

#### Custom cooldown text

```tsx
import { ActionButton } from "@/components/actionButton";

<ActionButton
    label="Pulse"
    cooldownRemainingMs={900}
    cooldownTotalMs={1200}
    formatCooldownText={(state) => `${state.cooldownPercentage}%`}
/>;
```

#### Full custom skin (render override)

```tsx
import { ActionButton } from "@/components/actionButton";

<ActionButton
    label="Dash"
    cooldownRemainingMs={1400}
    cooldownTotalMs={2000}
    render={(state) => (
        <button
            type="button"
            className="um-button"
            disabled={!state.canActivate}
            aria-disabled={!state.canActivate}
            data-status={state.status}
        >
            Dash {state.isCoolingDown ? `(${state.cooldownText})` : ""}
        </button>
    )}
/>;
```

### Toggle UI primitive (on/off state)

Use `Toggle` from `@/components/toggle` when you need a compact switch-style on/off control with:

- controlled checked state,
- disabled lockout,
- default skin plus full render override support.

#### Default usage (quickest)

```tsx
import { Toggle } from "@/components/toggle";

<Toggle label="SFX" checked={sfxEnabled} onChange={setSfxEnabled} />;
```

#### Disabled state

```tsx
import { Toggle } from "@/components/toggle";

<Toggle label="Online" checked disabled />;
```

#### Full custom skin (render override)

```tsx
import { Toggle } from "@/components/toggle";

<Toggle
    label="Stealth"
    checked={isStealthEnabled}
    onChange={setIsStealthEnabled}
    render={(state) => (
        <button
            type="button"
            className="um-button"
            aria-pressed={state.checked}
            disabled={!state.canToggle}
        >
            Stealth: {state.checked ? "Enabled" : "Disabled"}
        </button>
    )}
/>;
```

### VirtualActionButton UI primitive (mobile action)

Use `VirtualActionButton` from `@/components/virtualActionButton` when you need a touch-friendly action control with:

- hold lifecycle callbacks,
- cooldown lockout support,
- default skin plus full render override support.

#### Default usage (quickest)

```tsx
import { VirtualActionButton } from "@/components/virtualActionButton";

<VirtualActionButton
    label="A"
    onActivate={() => {
        // trigger action
    }}
/>;
```

#### Hold lifecycle + cooldown

```tsx
import { VirtualActionButton } from "@/components/virtualActionButton";

<VirtualActionButton
    label="A"
    cooldownRemainingMs={900}
    cooldownTotalMs={1200}
    onPressStart={() => {
        // start hold intent
    }}
    onPressEnd={() => {
        // clear hold intent
    }}
    onActivate={() => {
        // activate when ready
    }}
/>;
```

#### Full custom skin (render override)

```tsx
import { VirtualActionButton } from "@/components/virtualActionButton";

<VirtualActionButton
    label="Skill"
    cooldownRemainingMs={600}
    cooldownTotalMs={1200}
    render={(state) => (
        <button
            type="button"
            className="um-button"
            disabled={!state.canActivate}
            aria-disabled={!state.canActivate}
        >
            Skill {state.isCoolingDown ? `(${state.cooldownText})` : ""}
        </button>
    )}
/>;
```

### VirtualDPad UI primitive (mobile movement)

Use `VirtualDPad` from `@/components/virtualDPad` when you need an on-screen directional pad with:

- controlled/uncontrolled pressed state,
- direction start/end callbacks,
- default skin plus full render override support.

#### Default usage (quickest)

```tsx
import { VirtualDPad } from "@/components/virtualDPad";

<VirtualDPad
    label="Movement DPad"
    onPressedChange={(next) => {
        // next.up / next.down / next.left / next.right
    }}
/>;
```

#### Controlled state

```tsx
import { useState } from "react";
import {
    VirtualDPad,
    type VirtualDPadPressedState,
} from "@/components/virtualDPad";

function MovementPad() {
    const [pressed, setPressed] = useState<VirtualDPadPressedState>({
        up: false,
        down: false,
        left: false,
        right: false,
    });

    return <VirtualDPad pressed={pressed} onPressedChange={setPressed} />;
}
```

#### Full custom skin (render override)

```tsx
import { VirtualDPad } from "@/components/virtualDPad";

<VirtualDPad
    pressed={{ right: true }}
    render={(state) => (
        <output className="um-capsule">
            Vector: {state.vectorX},{state.vectorY}
        </output>
    )}
/>;
```

### CooldownIndicator UI primitive

Use `CooldownIndicator` from `@/components/cooldownIndicator` as a reusable cooldown visual for any action/widget.

#### Default usage

```tsx
import { CooldownIndicator } from "@/components/cooldownIndicator";

<CooldownIndicator label="Dash cooldown" remainingMs={900} totalMs={1800} />;
```

#### Hide text + custom text formatting

```tsx
import { CooldownIndicator } from "@/components/cooldownIndicator";

<CooldownIndicator
    remainingMs={1200}
    totalMs={2000}
    showText={false}
    formatText={(state) => `${state.percentage}%`}
/>;
```

### HUDSlot UI primitive

Use `HUDSlot` from `@/components/hudSlot` for compact HUD items with icon + label + optional badge and cooldown hookup.

#### Default usage

```tsx
import { HUDSlot } from "@/components/hudSlot";

<HUDSlot label="Health" value="84/100" icon="❤" badge="Buffed" />;
```

#### With cooldown hookup

```tsx
import { HUDSlot } from "@/components/hudSlot";

<HUDSlot
    label="Ammo"
    value="12/30"
    icon="✦"
    cooldownRemainingMs={900}
    cooldownTotalMs={1800}
    showCooldownText
/>;
```

#### Full custom render override

```tsx
import { HUDSlot } from "@/components/hudSlot";

<HUDSlot
    label="Artifact"
    value="Ready"
    render={(state) => (
        <output>
            {state.label}: {state.value}
        </output>
    )}
/>;
```

#### Composition recipe: ability slot (`HUDSlot` + `ActionButton`)

```tsx
import { useState } from "react";
import { HUDSlot } from "@/components/hudSlot";
import { ActionButton } from "@/components/actionButton";

function AbilitySlot() {
    const [cooldownRemainingMs, setCooldownRemainingMs] = useState(0);

    return (
        <HUDSlot
            label="Ability"
            value="Blink"
            icon="✧"
            render={(state) => (
                <div
                    className="um-panel um-stack"
                    role="group"
                    aria-label={state.ariaLabel}
                >
                    <div className="um-row">
                        <span className="um-capsule">{state.label}</span>
                        <span className="um-text">{state.value}</span>
                    </div>

                    <ActionButton
                        label="Blink"
                        cooldownRemainingMs={cooldownRemainingMs}
                        cooldownTotalMs={2000}
                        onClick={() => {
                            setCooldownRemainingMs(2000);
                        }}
                    />
                </div>
            )}
        />
    );
}
```

### HUDAnchor UI primitive

Use HUDAnchor from @/components/hudAnchor to pin HUD content to top-left, top-right, bottom-left, or bottom-right with safe-area-aware offsets.

#### Default usage

```tsx
import { HUDAnchor } from "@/components/hudAnchor";

<div style={{ position: "relative", minHeight: 220 }}>
    <HUDAnchor anchor="top-left">
        <span className="um-capsule">Top Left</span>
    </HUDAnchor>
</div>;
```

#### Safe-area + offsets

```tsx
import { HUDAnchor } from "@/components/hudAnchor";

<HUDAnchor anchor="bottom-right" safeArea offsetX={12} offsetY={12}>
    <span className="um-capsule">Skills</span>
</HUDAnchor>;
```

#### Full custom render override

```tsx
import { HUDAnchor } from "@/components/hudAnchor";

<HUDAnchor
    anchor="top-right"
    render={(state) => <output>{state.anchor}</output>}
/>;
```

### QuickHUDLayout preset

Use QuickHUDLayout from @/components/hudAnchor for a fast default HUD shell:

- top-left health slot
- top-right minimap slot
- safe-area + shared offsets built in

#### Default usage

```tsx
import { QuickHUDLayout } from "@/components/hudAnchor";

<QuickHUDLayout healthValue="90/100" minimapValue="Zone 3" />;
```

#### Custom slot override

```tsx
import { QuickHUDLayout } from "@/components/hudAnchor";

<QuickHUDLayout
    leftSlot={<span className="um-capsule">HP Custom</span>}
    rightSlot={<span className="um-capsule">Map Custom</span>}
/>;
```

### PlatformerHUDPreset starter

Use PlatformerHUDPreset from @/components/hudAnchor for a ready-made platformer HUD built from existing primitives.

#### Default usage

```tsx
import { PlatformerHUDPreset } from "@/components/hudAnchor";

<PlatformerHUDPreset
    healthValue="92/100"
    minimapValue="Stage 1-1"
    coinsValue={12}
    livesValue={3}
/>;
```

#### With jump action cooldown

```tsx
import { PlatformerHUDPreset } from "@/components/hudAnchor";

<PlatformerHUDPreset
    jumpLabel="Jump"
    jumpCooldownRemainingMs={900}
    jumpCooldownTotalMs={1200}
    onJump={() => {
        // trigger jump/ability
    }}
/>;
```

### TopDownHUDPreset starter

Use TopDownHUDPreset from @/components/hudAnchor for a ready-made top-down HUD with objective + stance slots and an interact action.

#### Default usage

```tsx
import { TopDownHUDPreset } from "@/components/hudAnchor";

<TopDownHUDPreset
    healthValue="76/100"
    minimapValue="Sector B4"
    objectivesValue="2/5"
    stanceValue="Stealth"
/>;
```

#### With interact cooldown

```tsx
import { TopDownHUDPreset } from "@/components/hudAnchor";

<TopDownHUDPreset
    interactLabel="Interact"
    interactCooldownRemainingMs={700}
    interactCooldownTotalMs={1000}
    onInteract={() => {
        // trigger interaction
    }}
/>;
```

### SurvivalHUDPreset starter

Use SurvivalHUDPreset from @/components/hudAnchor for a ready-made survival HUD with hunger + temperature status slots and a craft action.

#### Default usage

```tsx
import { SurvivalHUDPreset } from "@/components/hudAnchor";

<SurvivalHUDPreset
    healthValue="90/100"
    minimapValue="Camp 01"
    hungerValue="74%"
    temperatureValue="Warm"
/>;
```

#### With craft cooldown

```tsx
import { SurvivalHUDPreset } from "@/components/hudAnchor";

<SurvivalHUDPreset
    craftLabel="Craft"
    craftCooldownRemainingMs={850}
    craftCooldownTotalMs={1100}
    onCraft={() => {
        // trigger crafting action
    }}
/>;
```

### BossEncounterHUDPreset starter

Use BossEncounterHUDPreset from @/components/hudAnchor for a ready-made boss encounter HUD with boss metadata and a special action cooldown.

#### Default usage

```tsx
import { BossEncounterHUDPreset } from "@/components/hudAnchor";

<BossEncounterHUDPreset
    healthValue="66/100"
    minimapValue="Arena"
    bossNameValue="Warden"
    bossPhaseValue="Phase 1"
/>;
```

#### With special action cooldown

```tsx
import { BossEncounterHUDPreset } from "@/components/hudAnchor";

<BossEncounterHUDPreset
    specialLabel="Special"
    specialCooldownRemainingMs={700}
    specialCooldownTotalMs={1200}
    onSpecial={() => {
        // trigger special action
    }}
/>;
```

### AbilityBar prefab

Use `AbilityBar` from `@/components/hudAnchor` for a compact action row that preserves `ActionButton` cooldown and disabled behavior.

#### Default usage

```tsx
import { AbilityBar } from "@/components/hudAnchor";

<AbilityBar />;
```

#### With custom abilities

```tsx
import { AbilityBar } from "@/components/hudAnchor";

<AbilityBar
    abilities={[
        {
            id: "dash",
            label: "Dash",
            cooldownRemainingMs: 450,
            cooldownTotalMs: 700,
            onTrigger: () => {
                // trigger dash ability
            },
        },
        {
            id: "blink",
            label: "Blink",
            disabled: false,
            onTrigger: () => {
                // trigger blink ability
            },
        },
    ]}
    onAbilityTrigger={(abilityId) => {
        console.log("ability fired", abilityId);
    }}
/>;
```

### HUD preset composition helper

Use `createHudPresetSlots` from `@/components/hudAnchor` to keep slot override handling consistent when you build new mode presets.

```tsx
import { type ReactNode } from "react";
import { ActionButton } from "@/components/actionButton";
import { HUDSlot } from "@/components/hudSlot";
import { createHudPresetSlots } from "@/components/hudAnchor";

type MyHUDPresetProps = {
    topLeftSlot?: ReactNode;
    topRightSlot?: ReactNode;
    bottomLeftSlot?: ReactNode;
    bottomRightSlot?: ReactNode;
};

function MyHUDPreset({
    topLeftSlot,
    topRightSlot,
    bottomLeftSlot,
    bottomRightSlot,
}: MyHUDPresetProps) {
    const slots = createHudPresetSlots(
        {
            topLeftSlot,
            topRightSlot,
            bottomLeftSlot,
            bottomRightSlot,
        },
        {
            topLeft: <HUDSlot label="Health" value="100/100" icon="❤" />,
            topRight: <HUDSlot label="Minimap" value="Zone A" icon="⌖" />,
            bottomLeft: (
                <HUDSlot label="Objective" value="Find beacon" icon="◎" />
            ),
            bottomRight: <ActionButton label="Interact" />,
        },
    );

    return (
        <>
            {slots.topLeft}
            {slots.topRight}
            {slots.bottomLeft}
            {slots.bottomRight}
        </>
    );
}
```

#### Dev tab location (default app)

In the default app (`src/App.tsx`), both component demos are grouped under one expandable dev section:

- toggle button: **Show example components**
- panel title: **Example components**
- included demos:
    - `LifeGaugeExample` (`src/components/examples/LifeGaugeExample.tsx`)
    - `ActionButtonExample` (`src/components/examples/ActionButtonExample.tsx`)
    - `ToggleExample` (`src/components/examples/ToggleExample.tsx`)
    - `VirtualActionButtonExample` (`src/components/examples/VirtualActionButtonExample.tsx`)
    - `VirtualDPadExample` (`src/components/examples/VirtualDPadExample.tsx`)
    - `CooldownIndicatorExample` (`src/components/examples/CooldownIndicatorExample.tsx`)
    - `HUDSlotExample` (`src/components/examples/HUDSlotExample.tsx`)
    - `HUDAnchorExample` (`src/components/examples/HUDAnchorExample.tsx`)
    - `QuickHUDLayoutExample` (`src/components/examples/QuickHUDLayoutExample.tsx`)
    - `PlatformerHUDPresetExample` (`src/components/examples/PlatformerHUDPresetExample.tsx`)
    - `TopDownHUDPresetExample` (`src/components/examples/TopDownHUDPresetExample.tsx`)
    - `TopDownMiniGameExample` (`src/components/examples/TopDownMiniGameExample.tsx`)
    - `SideScrollerMiniGameExample` (`src/components/examples/SideScrollerMiniGameExample.tsx`)

---

## 3) Rendering Sprites (`Render`)

`Render` in `src/components/Render/Render.tsx` draws game entities to a canvas.

### Props

- `items: RenderableItem[]` (required)
- `width?: number` (default `300`)
- `height?: number` (default `300`)
- `cameraX?: number` (default `0`) — viewport left edge in world space
- `cameraY?: number` (default `0`) — viewport top edge in world space
- `showDebugOutlines?: boolean` (default `true`) — toggles collider debug draw + debug frame style

### `RenderableItem` essentials

- `spriteImageSheet` — URL/path to sprite sheet
- `spriteSize` — source tile size (px)
- `spriteSheetTileWidth`, `spriteSheetTileHeight` — sheet bounds in tiles
- `characterSpriteTiles` — animation frames as tile coordinates
- `scaler` — draw scale multiplier
- `position` — world position
- `fps` (optional) — animation speed
- `collider` (optional) — rectangle collider data for debug draw

### Example

```tsx
<Render
    items={Object.values(dataBus.getState().entitiesById)}
    width={400}
    height={300}
/>
```

### Prebuilt game-mode canvas presets

Use these for faster setup without manually wiring mode-specific `DataBus` config:

- `SideScrollerCanvas` — enables gravity + side-scroller movement tuning
- `TopDownCanvas` — disables player gravity/physics for top-down movement
- `SoundManager` — scene-level audio prefab that listens to `AudioBus`

Both presets now support separating world size from canvas size:

- `width` / `height` = canvas viewport size
- `worldWidth` / `worldHeight` = full world bounds size
- `cameraMode` = `"follow-player"` or `"manual"`
- `cameraClampToWorld` = clamps viewport to world edges
- `manualCameraStartX` / `manualCameraStartY` = starting viewport origin for manual mode

```tsx
import { SideScrollerCanvas, TopDownCanvas } from "@/components/gameModes";

<SideScrollerCanvas
    width={400}
    height={300}
    worldWidth={500}
    worldHeight={500}
    cameraMode="follow-player"
    showDebugOutlines={import.meta.env.DEV}
/>;
<TopDownCanvas
    width={400}
    height={300}
    worldWidth={500}
    worldHeight={500}
    cameraMode="manual"
    manualCameraStartX={50}
    manualCameraStartY={50}
    showDebugOutlines={import.meta.env.DEV}
/>;
```

### AudioBus + SoundManager prefab

Use `AudioBus` to emit audio cues from gameplay/UI code, then mount one
`SoundManager` in the scene to resolve and play those cues.

```tsx
import { SideScrollerCanvas, SoundManager } from "@/components/gameModes";
import { audioBus } from "@/services/AudioBus";

const cues = {
    "scene:music": {
        kind: "tone",
        frequencyHz: 196,
        durationMs: 400,
        gain: 0.08,
        waveform: "triangle",
    },
    "ui:confirm": {
        kind: "tone",
        frequencyHz: 720,
        durationMs: 70,
        gain: 0.05,
        waveform: "square",
    },
} as const;

export function SceneWithAudio() {
    return (
        <>
            <SoundManager cues={cues} />
            <SideScrollerCanvas width={400} height={300} />
            <button
                onClick={() => {
                    audioBus.play("ui:confirm", { channel: "ui" });
                }}
            >
                Confirm
            </button>
        </>
    );
}
```

Audio control helpers:

- `audioBus.play(cueId, options)`
- `audioBus.stop(cueId?)`
- `audioBus.stopChannel(channel)`
- `audioBus.setMasterMuted(boolean)`
- `audioBus.setChannelMuted(channel, boolean)`
- `audioBus.setMasterVolume(0..1)`

### Game state flow controller

Use `GameStateFlowController` when you want canonical runtime states with guarded transitions and transition lifecycle hooks.

```ts
import { GameStateFlowController } from "@/services/gameStateFlow";

const flow = new GameStateFlowController("boot");

flow.transition("menu", { reason: "boot-complete" });
flow.transition("play", { reason: "new-game" });

const offEnterPause = flow.onEnter("pause", (event) => {
    // event.from === "play"
});

const offAny = flow.subscribe((event) => {
    if (event.type === "blocked") {
        // invalid transition attempt
    }
});

flow.transition("pause", { reason: "pause-key" });

offEnterPause();
offAny();
```

Singleton runtime helper is also available as `gameStateFlow`.

### Global app-level world/camera config

Default app wiring uses `src/config/gameViewConfig.ts` so both modes share one camera/world definition.

```ts
export const GAME_VIEW_CONFIG = {
    canvas: { width: 400, height: 300 },
    world: { width: 500, height: 500 },
    camera: {
        mode: "follow-player",
        clampToWorld: true,
        manualStart: { x: 0, y: 0 },
        panStepPx: 24,
        fastPanMultiplier: 3,
    },
};
```

For manual camera movement at runtime, use `DataBus` camera methods:

- `dataBus.setCameraMode("manual")`
- `dataBus.setCameraPosition(x, y)`
- `dataBus.moveCameraBy(dx, dy)`

Pair them with matching control presets from `@/components/screenController`:

- `SideScrollerControls`
- `TopDownControls`

### Game mode presets cheat sheet

| Mode             | Canvas               | Controls               | Input model                      |
| ---------------- | -------------------- | ---------------------- | -------------------------------- |
| Side scroller    | `SideScrollerCanvas` | `SideScrollerControls` | smooth horizontal + gravity jump |
| Top-down (8-way) | `TopDownCanvas`      | `TopDownControls`      | hold-based 8-way movement        |
| Top-down (4-way) | `TopDownCanvas`      | `TopDownControls`      | set `allowDiagonal={false}`      |

### Copy/paste: side-scroller module wiring

```tsx
import { useCallback, useRef } from "react";
import { SideScrollerCanvas } from "@/components/gameModes";
import { SideScrollerControls } from "@/components/screenController";

export function SideScrollerModule() {
    const gameScreenRef = useRef<HTMLDivElement | null>(null);
    const handleMove = useCallback(() => {
        // optional UI updates
    }, []);

    return (
        <>
            <SideScrollerCanvas
                width={400}
                height={300}
                containerRef={gameScreenRef}
                showDebugOutlines={import.meta.env.DEV}
            />
            <SideScrollerControls onMove={handleMove} />
        </>
    );
}
```

### Copy/paste: top-down module wiring

```tsx
import { useCallback, useRef } from "react";
import { TopDownCanvas } from "@/components/gameModes";
import { TopDownControls } from "@/components/screenController";

export function TopDownModule() {
    const gameScreenRef = useRef<HTMLDivElement | null>(null);
    const handleMove = useCallback(() => {
        // optional UI updates
    }, []);

    return (
        <>
            <TopDownCanvas
                width={400}
                height={300}
                containerRef={gameScreenRef}
                showDebugOutlines={import.meta.env.DEV}
            />
            <TopDownControls
                onMove={handleMove}
                allowDiagonal={true}
                speedPxPerSec={220}
            />
        </>
    );
}
```

### Copy/paste: switch between both modes in one app

```tsx
import { useState } from "react";

type Mode = "side-scroller" | "top-down";
const [mode, setMode] = useState<Mode>("side-scroller");

return mode === "side-scroller" ? (
    <>
        <SideScrollerCanvas width={400} height={300} />
        <SideScrollerControls />
    </>
) : (
    <>
        <TopDownCanvas width={400} height={300} />
        <TopDownControls allowDiagonal />
    </>
);
```

### URL mode query in the default app

`App.tsx` supports mode selection via URL query:

- `?mode=side-scroller`
- `?mode=top-down`

### Timer signal helper (`once` / `interval` / `cooldown`)

Use `createTimerSignals` to run deterministic gameplay timers that emit typed payloads through the signal bus.

```tsx
import { createTimerSignals } from "@/services/timerSignals";
import { signalBus } from "@/services/signalBus";

const timers = createTimerSignals();

signalBus.on("timer:spawn", (payload) => {
    // payload.phase: "started" | "tick" | "cancelled"
});

timers.once({
    id: "spawn-wave-1",
    delayMs: 1500,
    signal: "timer:spawn",
    data: { wave: 1 },
});
```

```tsx
const objectiveTick = timers.interval({
    id: "objective-tick",
    intervalMs: 1000,
    signal: "timer:objective",
    data: { objectiveId: "harvest" },
});

// pause/resume for overlays or menus
objectiveTick.pause();
objectiveTick.resume();
```

```tsx
const dashCooldown = timers.cooldown({
    id: "dash",
    cooldownMs: 850,
    signal: "timer:dash",
});

const canDash = dashCooldown.trigger({ source: "input" });
// `false` means blocked and an optional `phase: "blocked"` event is emitted.
```

### Growth/tick simulation (`seed -> sprout -> mature`)

Use `createGrowthTickSimulation` for deterministic crop/resource progression with pause/resume controls and stage transition signals.

```tsx
import {
    createGrowthTickSimulation,
    GROWTH_STAGE_TRANSITION_SIGNAL,
} from "@/logic/simulation";
import { signalBus } from "@/services/signalBus";

const growth = createGrowthTickSimulation({ initialNowMs: 0 });

growth.addNode({
    id: "crop:carrot:1",
    seed: 42,
    profile: {
        durations: {
            seedToSproutMs: 4000,
            sproutToMatureMs: 7000,
        },
        jitterRatio: 0.15,
    },
});

const offGrowth = signalBus.on(GROWTH_STAGE_TRANSITION_SIGNAL, (event) => {
    // event.from / event.to / event.atMs
});

growth.tick(1000);
growth.pause();
growth.resume();
growth.tick(3000);

offGrowth();
```

### Environmental forces (`wind` / `current` zones)

Use force zones to apply directional velocity modifiers inside bounded world areas. Optional `dragScaleByType` lets you increase or reduce horizontal resistance by entity type.

```tsx
import { dataBus } from "@/services/DataBus";

dataBus.setEnvironmentalForceZone({
    id: "river-current",
    bounds: { x: 320, y: 120, width: 280, height: 96 },
    forcePxPerSec: { x: 140, y: 0 },
    dragScaleByType: {
        player: 1.25,
        enemy: 0.9,
    },
});

// inside your simulation loop
dataBus.stepPhysics(16);

const zones = dataBus.getEnvironmentalForceZoneProfiles();
dataBus.removeEnvironmentalForceZone("river-current");
dataBus.clearEnvironmentalForceZones();
```

### Status effect modifiers (`slow` / `haste` / `burn` / `regen`)

Use status helpers to apply typed effects with deterministic duration + tick behavior. Movement speed scaling composes directly with `DataBus` physics updates.

```tsx
import {
    STATUS_EFFECT_EXPIRED_SIGNAL,
    STATUS_EFFECT_TICK_SIGNAL,
    type StatusEffectTickEvent,
} from "@/logic/simulation";
import { dataBus } from "@/services/DataBus";
import { signalBus } from "@/services/signalBus";

const player = dataBus.getPlayer();

dataBus.applyEntitySlow(player.id, {
    durationMs: 1200,
    magnitude: 0.25,
});

dataBus.applyEntityBurn(player.id, {
    durationMs: 3000,
    magnitude: 2,
    tickIntervalMs: 1000,
});

const offTick = signalBus.on<StatusEffectTickEvent>(
    STATUS_EFFECT_TICK_SIGNAL,
    (event) => {
        // burn/regen periodic tick payload
    },
);

const offExpired = signalBus.on(STATUS_EFFECT_EXPIRED_SIGNAL, (event) => {
    // effect expiry payload
});

dataBus.stepPhysics(16);
const scale = dataBus.getEntityMovementSpeedScale(player.id);
const active = dataBus.getEntityStatusEffects(player.id);

offTick();
offExpired();
```

### Sprite animation atlas + clip helper

Use `createSpriteAnimationClips` to define named animation clips from raw atlas metadata with built-in validation for duplicate names and out-of-bounds frame coordinates.

```tsx
import {
    clipsToSpriteAnimations,
    createSpriteAnimationClips,
    sampleSpriteClipFrame,
} from "@/logic/entity/spriteAnimationAtlas";

const rawAtlas = {
    image: "/spriteSheet.png",
    tileWidth: 49,
    tileHeight: 22,
};

const clips = createSpriteAnimationClips({
    spriteSheet: rawAtlas.image,
    tileWidth: rawAtlas.tileWidth,
    tileHeight: rawAtlas.tileHeight,
    defaultFps: 10,
    defaultLoop: "loop",
    clips: [
        {
            name: "idle",
            frames: [
                [7, 19],
                [8, 19],
            ],
        },
        {
            name: "run",
            range: {
                from: [0, 19],
                to: [5, 19],
            },
            fps: 14,
            loop: "ping-pong",
        },
    ],
});

const animations = clipsToSpriteAnimations(clips);
```

```tsx
// Sample the current frame for non-standard loop behavior (`once` / `ping-pong`)
const runClip = clips.find((clip) => clip.name === "run");

if (runClip) {
    const elapsedMs = performance.now() - animationStartedAtMs;
    const sampled = sampleSpriteClipFrame(runClip, elapsedMs);
    const frame = sampled.frame;
    // frame -> [tileX, tileY]
}
```

### Animation state machine utility

Use `createAnimationStateMachine` as a low-level primitive for entity animation/behavior profiles with guarded transitions, lifecycle hooks, and mixed signal/time triggers.

```tsx
import { createAnimationStateMachine } from "@/logic/entity/animationStateMachine";

const machine = createAnimationStateMachine<
    "idle" | "run" | "jump" | "attack",
    { hasMoveIntent: boolean; isGrounded: boolean }
>({
    initialState: "idle",
    transitions: [
        { from: "*", to: "attack", signal: "attack", priority: 20 },
        {
            from: ["idle", "run"],
            to: "jump",
            signal: "jump",
            priority: 15,
        },
        {
            from: "jump",
            to: "run",
            guard: ({ context }) => context.isGrounded && context.hasMoveIntent,
        },
        {
            from: "jump",
            to: "idle",
            guard: ({ context }) =>
                context.isGrounded && !context.hasMoveIntent,
        },
        {
            from: "idle",
            to: "run",
            guard: ({ context }) => context.hasMoveIntent,
        },
        {
            from: "run",
            to: "idle",
            guard: ({ context }) => !context.hasMoveIntent,
        },
    ],
});
```

```tsx
// Lightweight runtime integration pattern
// 1) signal-based transition (input/events)
machine.send("attack", nowMs, {
    hasMoveIntent,
    isGrounded,
});

// 2) time/guard-based transition (per-frame update)
const state = machine.update(nowMs, {
    hasMoveIntent,
    isGrounded,
});

entity.currentAnimation = state;
```

```tsx
import { createBasicEntityAnimationProfileStateMachine } from "@/logic/entity/entityStateMachine";

const profileMachine = createBasicEntityAnimationProfileStateMachine();
```

### Sprite pseudo-shader effects (`tint` / `flash` / `outline` / `desaturate`)

Attach optional `spriteEffects` to render items/entities to apply pseudo-shader-like post-process passes in the default Canvas2D sprite flow.

```tsx
const enemy = {
    id: "enemy-1",
    spriteImageSheet: "/spriteSheet.png",
    spriteSize: 16,
    spriteSheetTileWidth: 49,
    spriteSheetTileHeight: 22,
    characterSpriteTiles: [[3, 19]],
    scaler: 4,
    position: { x: 120, y: 90 },
    spriteEffects: [
        { kind: "tint", color: "#7c3aed", alpha: 0.28 },
        { kind: "outline", color: "#111827", width: 2, alpha: 0.9 },
    ],
};
```

```tsx
// Flash + desaturate damage style (time-varying flash pulse)
entity.spriteEffects = [
    { kind: "flash", color: "#ffffff", strength: 0.75, pulseHz: 10 },
    { kind: "desaturate", amount: 0.35 },
];
```

```tsx
import {
    applySpritePseudoShaderEffects,
    computeFlashAlpha,
} from "@/components/effects";

// utility exports are available for custom runtime/plugin usage as needed
const alpha = computeFlashAlpha({ nowMs: performance.now(), pulseHz: 8 });
```

### Screen-wide canvas effects (`tint` / `monochrome` / `scanline` / `wavy` / `vhs`)

Register stackable full-screen effects through the screen pseudo-shader signal helpers.

```tsx
import {
    setScreenPseudoShaderEffects,
    pushScreenPseudoShaderEffect,
    removeScreenPseudoShaderEffect,
    clearScreenPseudoShaderEffects,
} from "@/components/effects";

setScreenPseudoShaderEffects([
    { id: "scene-tint", kind: "tint", color: "#38bdf8", alpha: 0.12 },
    { id: "scene-scan", kind: "scanline", lineAlpha: 0.08, lineSpacing: 3 },
]);

pushScreenPseudoShaderEffect({
    id: "scene-wave",
    kind: "wavy",
    amplitudePx: 1.5,
    frequency: 2,
    speedHz: 0.6,
});

removeScreenPseudoShaderEffect("scene-wave");
clearScreenPseudoShaderEffects();
```

```tsx
import {
    applyScreenPseudoShaderPreset,
    createScreenPseudoShaderPreset,
} from "@/components/effects";

// deterministic preset for cutscene styling
applyScreenPseudoShaderPreset("cutscene-warm");

// inspect preset payload if needed for custom tooling
const presetEffects = createScreenPseudoShaderPreset("vhs-noir");
```

### Dev landing controls (default app)

In development mode, the default landing page includes capsule toggles for debugging/help:

- `Show/Hide debug outlines` toggles frame/collider debug visuals.
- `Show/Hide dev controls` opens a compact in-page controls/hotkeys tab.
- Canvas meta pills include live `Player State` from `DataBus` behavior/animation state resolution.
- Canvas meta pills include live `Player Trail` (last 3 transitions) for transition-order debugging.
- Canvas meta pills include live `Interact Mode` (`attack` / `dodge`) from the default app dev toggle state.
- Canvas meta pills include live `Boss Target` (`id`, `index/total`, and active phase) from selected boss-target state.
- Canvas meta pills include live `Perf` (`fps`, smoothed `frameMs`) and `Entities` (`total`, `enemy`) counters for quick runtime checks.
- Canvas meta shows `NPC States` count and an `NPC Behaviors` line when enemies are present (truncated `enemyId:state` plus last 2 transitions with timestamps rounded to nearest `10ms`, compact `·` trail separator, full values on hover tooltip).
- Dev controls include an `Interact` mode toggle (`attack` / `dodge`) that forwards into default control action mapping.
- Dev controls include `Boss Phase 1` / `Boss Phase 2` triggers for the selected boss target, plus `Cycle Boss Target`.
- Boss-target cycle dev status uses compact labels (`Boss tgt [next|prev] ...`) and `(wrap)` when selection wraps around.
- Boss phase trigger status uses compact labels (`Boss <id> -> p1|p2`).
- Dev controls include quick trigger buttons for `Player Attack`, `Player Dodge`, and `Player Block` taxonomy states.
- Dev controls status lines include `Perf` and `Entities` readouts for quick frame/runtime triage without opening extra tooling.

### Dev + Input Cheat Sheet

| Key / Control         | Action                                      |
| --------------------- | ------------------------------------------- |
| `Arrow keys` / `WASD` | Move player                                 |
| `Space` / `ArrowUp`   | Jump (side-scroller mode)                   |
| `T`                   | Cycle screen transition previews            |
| `P`                   | Spawn/cycle particle presets                |
| `F`                   | Start torch flame at mouse/center fallback  |
| `Shift+F`             | Stop torch flame emitter                    |
| `I/J/K/L`             | Pan camera (manual camera mode)             |
| `Shift+I/J/K/L`       | Pan camera faster (manual camera mode)      |
| `Show/Hide debug...`  | Toggle debug outlines in landing page       |
| `Show/Hide dev...`    | Toggle landing-page dev controls help panel |

### Quick recipes (copy/paste)

- Platformer starter (`SideScrollerCanvas` + `SideScrollerControls`):

```tsx
<SideScrollerCanvas width={400} height={300} />
<SideScrollerControls onMove={handleMove} />
```

- Dungeon crawler (4-way, `TopDownCanvas` + `TopDownControls`):

```tsx
<TopDownCanvas width={400} height={300} />
<TopDownControls onMove={handleMove} allowDiagonal={false} />
```

- Action RPG (8-way, `TopDownCanvas` + `TopDownControls`):

```tsx
<TopDownCanvas width={400} height={300} />
<TopDownControls onMove={handleMove} allowDiagonal speedPxPerSec={240} />
```

- Shareable start-mode links:
    - side scroller: `?mode=side-scroller`
    - top down: `?mode=top-down`

### Full starter file: `App.tsx` (side scroller)

```tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { SideScrollerControls } from "@/components/screenController";
import { SideScrollerCanvas } from "@/components/gameModes";
import { dataBus } from "@/services/DataBus";
import "./App.css";

export default function App() {
    const [, force] = useState(0);
    const gameScreenRef = useRef<HTMLDivElement | null>(null);

    const handleMove = useCallback(() => {
        force((n) => n + 1);
    }, []);

    useEffect(() => {
        let rafId = 0;
        let lastFrame = performance.now();

        const tick = (now: number) => {
            const deltaMs = now - lastFrame;
            lastFrame = now;

            if (dataBus.stepPhysics(deltaMs)) {
                force((n) => n + 1);
            }

            rafId = requestAnimationFrame(tick);
        };

        rafId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafId);
    }, []);

    return (
        <div className="GameContainer">
            <SideScrollerCanvas
                width={400}
                height={300}
                containerRef={gameScreenRef}
                showDebugOutlines={import.meta.env.DEV}
            />
            <SideScrollerControls onMove={handleMove} />
        </div>
    );
}
```

### Full starter file: `App.tsx` (top down)

```tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { TopDownControls } from "@/components/screenController";
import { TopDownCanvas } from "@/components/gameModes";
import { dataBus } from "@/services/DataBus";
import "./App.css";

export default function App() {
    const [, force] = useState(0);
    const gameScreenRef = useRef<HTMLDivElement | null>(null);

    const handleMove = useCallback(() => {
        force((n) => n + 1);
    }, []);

    useEffect(() => {
        let rafId = 0;
        let lastFrame = performance.now();

        const tick = (now: number) => {
            const deltaMs = now - lastFrame;
            lastFrame = now;

            if (dataBus.stepPhysics(deltaMs)) {
                force((n) => n + 1);
            }

            rafId = requestAnimationFrame(tick);
        };

        rafId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafId);
    }, []);

    return (
        <div className="GameContainer">
            <TopDownCanvas
                width={400}
                height={300}
                containerRef={gameScreenRef}
                showDebugOutlines={import.meta.env.DEV}
            />
            <TopDownControls
                onMove={handleMove}
                allowDiagonal={true}
                speedPxPerSec={220}
            />
        </div>
    );
}
```

### Full starter file: `App.css` (works for both presets)

```css
.GameContainer {
    width: min(100%, 980px);
    margin: 0 auto;
    padding: 2.25rem 1rem 1.5rem;
    display: grid;
    gap: 1rem;
}

.GameSurface {
    border-radius: 18px;
    border: 1px solid rgba(148, 163, 184, 0.25);
    background: rgba(15, 23, 42, 0.72);
    padding: 1rem;
    display: grid;
    gap: 1rem;
}

.GameScreen {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    width: fit-content;
    padding: 1.5rem;
    border-radius: 12px;
    background: linear-gradient(
        180deg,
        rgba(15, 23, 42, 0.92) 0%,
        rgba(2, 6, 23, 0.92) 100%
    );
    box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.35);
    overflow: hidden;
}
```

---

## 4) Game State + Movement (`DataBus`)

`src/services/DataBus.ts` owns the runtime state and movement/collision updates.

### Common methods

- `getState()` — read current `GameState`
- `movePlayerUp/Down/Left/Right()` — move player and run collisions
- `setWorldSize(width, height)` — updates world dimensions
- `setWorldBoundsEnabled(true|false)` — toggles world boundary entities
- `setPlayerCanPassWorldBounds(true|false)` — toggles player vs world collisions
- `setPlayerMoveInput(inputX)` — smooth horizontal input (`-1` to `1`)
- `pauseWorld(reason?)` / `resumeWorld(reason?)` — pause/resume simulation by reason
- `isWorldPaused()` / `getWorldPauseReasons()` — pause state inspection helpers
- `onPause(handler)` / `onResume(handler)` — subscribe to pause lifecycle edge events
- `setPhysicsConfig(config)` — configure gravity/terminal velocity/frame clamp
- `enableEntityPhysics(entityId, bodyOverrides?)` — opt an entity into gravity/physics
- `disableEntityPhysics(entityId)` — opt an entity out
- `enablePlayerPhysics(bodyOverrides?)` — player convenience wrapper
- `enablePlayerGravity(bodyOverrides?)` — one-line player gravity setup
- `disablePlayerPhysics()` — player convenience wrapper
- `setPlayerMovementConfig(config)` — tune horizontal accel/decel and jump velocity
- `setPlayerJumpAssistConfig(config)` — tune coyote time / jump buffer
- `setEntityVelocity(entityId, x, y)` — set per-entity velocity
- `isEntityGrounded(entityId, probeDistance?)` — grounded check helper
- `isPlayerGrounded(probeDistance?)` — player grounded check helper
- `jumpEntity(entityId, jumpVelocity?)` — grounded-gated jump helper
- `jumpPlayer(jumpVelocity?)` — one-line player jump helper
- `requestPlayerJump()` — buffered jump request (consumed in `stepPhysics`)
- `markPlayerDamaged(durationMs?)` — apply timed `damaged` interrupt state
- `markPlayerAttacking(durationMs?)` — apply timed `attacking` state
- `markPlayerStunned(durationMs?)` — apply timed `stunned` interrupt state
- `markPlayerDodging(durationMs?)` — apply timed `dodge` state
- `markPlayerBlocking(durationMs?)` — apply timed `block` state
- `getEntityBehaviorState(entityId)` — read shared behavior/animation state (`idle`, `moving`, etc.)
- `getEntityBehaviorTransitions(entityId, limit?)` — read recent behavior-state transitions for debug tooling
- `setEntityBossPhase(entityId, phase)` — assign persistent boss taxonomy state (`phase-1` / `phase-2`)
- `setNpcArchetypeProfile(entityId, profile)` — configure NPC archetype behavior (`idle`, `idle-roam`, waypoint `patrol`, `chase`, with flee override)
- `getNpcArchetypeProfile(entityId)` — inspect resolved NPC archetype profile
- `clearNpcArchetypeProfile(entityId)` / `clearNpcArchetypeProfiles()` — clear one/all NPC profiles
- In dev mode, default app HUD surfaces per-enemy behavior via `dataBus.getEntityBehaviorState(...)`.
- `stepPhysics(deltaMs)` — advance physics and return whether positions changed

### Usage pattern

Use `dataBus` as the single source of engine state in UI components:

```ts
dataBus.movePlayerRight();
const entities = Object.values(dataBus.getState().entitiesById);
```

### Gravity/physics (opt-in)

Physics is modular and disabled per entity until enabled.

```ts
const player = dataBus.getPlayer();

dataBus.setPhysicsConfig({
    gravityPxPerSec2: 1600,
    terminalVelocityPxPerSec: 900,
    maxDeltaMs: 50,
});

dataBus.enableEntityPhysics(player.id, {
    gravityScale: 1,
    velocity: { x: 0, y: 0 },
    dragX: 0,
});

// Example jump impulse
dataBus.setEntityVelocity(player.id, 0, -520);

// Called each animation frame; returns true when entities moved
const didMove = dataBus.stepPhysics(deltaMs);
```

Player shortcut:

```ts
dataBus.enablePlayerGravity({
    gravityScale: 1,
    velocity: { x: 0, y: 0 },
});

if (dataBus.isPlayerGrounded()) {
    dataBus.jumpPlayer(520);
}

// smooth movement input loop (keyboard/controller)
dataBus.setPlayerMoveInput(1); // move right

// buffered jump input for coyote-time flows
dataBus.requestPlayerJump();

// timed behavior interrupt + shared animation state
dataBus.markPlayerAttacking(180);
dataBus.markPlayerDamaged(240);
dataBus.markPlayerStunned(280);
const playerState = dataBus.getEntityBehaviorState(dataBus.getState().playerId);
const trail = dataBus.getEntityBehaviorTransitions(
    dataBus.getState().playerId,
    3,
);

// npc archetype profile (enemy)
dataBus.setNpcArchetypeProfile("enemy-1", {
    mode: "patrol",
    waypoints: [
        { x: 180, y: 120 },
        { x: 240, y: 120 },
        { x: 240, y: 180 },
    ],
    waypointTolerancePx: 6,
    patrolSpeedPxPerSec: 120,
    fleeDistancePx: 40,
    fleeSpeedPxPerSec: 160,
});

dataBus.setNpcArchetypeProfile("enemy-chaser", {
    mode: "chase",
    chaseDistancePx: 180,
    chaseStopDistancePx: 10,
    chaseSpeedPxPerSec: 150,
    fleeDistancePx: 36,
    fleeSpeedPxPerSec: 170,
});

// global simulation pause controller
dataBus.pauseWorld("cutscene");
const paused = dataBus.isWorldPaused();
dataBus.resumeWorld("cutscene");

const offPause = dataBus.onPause((event) => {
    // event.reason, event.reasons, event.paused === true
});

const offResume = dataBus.onResume((event) => {
    // event.reason, event.reasons, event.paused === false
});

offPause();
offResume();
```

Input note:

- The default `interact` action path now triggers `dataBus.markPlayerAttacking()` as part of the behavior+animation state-machine foundation.

NPC note:

- Enemy entities with an archetype profile resolve behavior states to `idle`, `patrol`, `chase`, or `flee` (with timed states like `damaged` still able to interrupt).

### Reusable physics module

Import from `src/logic/physics` when you want physics behavior outside `DataBus`:

- `createPhysicsBody(overrides?)`
- `stepEntityPhysics(entityLike, deltaMs, config?)`
- `DEFAULT_GRAVITY_CONFIG`

### Reusable world generation module

Import from `src/logic/worldgen` when you want deterministic tile scaffolding based on a seed:

- `generateSeededTileMap(options)`
- `generateSeededRoomMap(options)`
- `generateSpawnAnchors(options)`
- `tileToWorldPosition(tileX, tileY, options)`
- `spawnAnchorToWorld(anchor, options)`
- `spawnAnchorsToWorld(anchors, options)`
- `createWorldgenScenario(options)`
- `createBiomePathComposition(options)`
- `createWorldgenScenePresetOptions(presetId, overrides?)`
- `createWorldgenScenePreset(presetId, overrides?)`
- `createDataBusSpawnPayloads(options)`
- `createDataBusSpawnPayloadRecord(options)`
- `createWorldgenEntities(options)`
- `applyWorldgenEntitiesToState(state, worldgen, options)`
- `createApplyWorldgenEntitiesUpdater(worldgen, options)`

Copy/paste starter:

```ts
import { generateSeededTileMap } from "@/logic/worldgen";

const map = generateSeededTileMap({
    width: 24,
    height: 16,
    seed: "mvp-overworld-01",
    fillProbability: 0.32,
    borderSolid: true,
});

console.log(map.tiles[0][0]); // solid border tile
console.log(map.solidCount, map.emptyCount);
```

Use the same `seed + config` combination to get the same output every run.

Sprite-tile-friendly room map starter:

```ts
import { generateSeededRoomMap } from "@/logic/worldgen";

const roomMap = generateSeededRoomMap({
    width: 48,
    height: 32,
    seed: "dungeon-a1",
    roomCount: 10,
    roomMinSize: 4,
    roomMaxSize: 9,
    wallTileValue: 101,
    roomFloorTileValue: 201,
    corridorTileValue: 202,
    borderSolid: true,
});

console.log(roomMap.rooms.length);
console.log(roomMap.tiles[0][0]);
```

Using tile IDs directly makes it easier to map generated layouts to sprite-sheet tile indices later.

Spawn-anchor starter (player/enemy/item/objective):

```ts
import { generateSeededRoomMap, generateSpawnAnchors } from "@/logic/worldgen";

const roomMap = generateSeededRoomMap({
    width: 48,
    height: 32,
    seed: "dungeon-a1",
    roomCount: 10,
});

const anchors = generateSpawnAnchors({
    rooms: roomMap.rooms,
    seed: "dungeon-a1",
    enemyCount: 4,
    itemCount: 3,
    tileIds: {
        playerStart: 601,
        objective: 602,
        enemy: 603,
        item: 604,
    },
});

console.log(anchors.playerStart, anchors.objective);
console.log(anchors.enemySpawns.length, anchors.itemSpawns.length);
```

Anchors include room index + center point so they can be translated into world-space or sprite-tile marker layers.

Tile-to-world conversion starter:

```ts
import { generateSpawnAnchors, spawnAnchorToWorld } from "@/logic/worldgen";

const anchors = generateSpawnAnchors({
    rooms: roomMap.rooms,
    seed: "dungeon-a1",
});

const playerWorldAnchor = spawnAnchorToWorld(anchors.playerStart, {
    tileWidth: 16,
    tileHeight: 16,
    originX: 0,
    originY: 0,
    anchor: "center",
});

console.log(playerWorldAnchor.worldX, playerWorldAnchor.worldY);
```

Use `anchor: "center"` when placing entities by pivot, or `"top-left"` for tile-aligned placement.

Batch conversion (all spawn anchors in one call):

```ts
import { generateSpawnAnchors, spawnAnchorsToWorld } from "@/logic/worldgen";

const anchors = generateSpawnAnchors({
    rooms: roomMap.rooms,
    seed: "dungeon-a1",
    enemyCount: 4,
    itemCount: 3,
});

const worldAnchors = spawnAnchorsToWorld(anchors, {
    tileWidth: 16,
    tileHeight: 16,
    anchor: "center",
});

console.log(worldAnchors.playerStart.worldX, worldAnchors.playerStart.worldY);
console.log(worldAnchors.enemySpawns.length, worldAnchors.itemSpawns.length);
```

One-call scenario composition (map + anchors + world anchors):

```ts
import { createWorldgenScenario } from "@/logic/worldgen";

const scenario = createWorldgenScenario({
    map: {
        width: 48,
        height: 32,
        seed: "scenario-a1",
        roomCount: 10,
    },
    spawns: {
        enemyCount: 4,
        itemCount: 3,
    },
    world: {
        tileWidth: 16,
        tileHeight: 16,
        anchor: "center",
    },
});

console.log(scenario.map.rooms.length);
console.log(scenario.anchors.playerStart);
console.log(scenario.worldAnchors.playerStart.worldX);
```

DataBus-ready spawn payload starter:

```ts
import {
    createDataBusSpawnPayloadRecord,
    createWorldgenScenario,
} from "@/logic/worldgen";

const scenario = createWorldgenScenario({
    map: { width: 48, height: 32, seed: "scenario-a1" },
});

const spawnById = createDataBusSpawnPayloadRecord({
    anchors: scenario.worldAnchors,
    idPrefix: "run1",
});

console.log(Object.keys(spawnById));
```

Worldgen payload -> Entity bridge starter:

```ts
import {
    createDataBusSpawnPayloads,
    createWorldgenEntities,
    createWorldgenScenario,
} from "@/logic/worldgen";

const scenario = createWorldgenScenario({
    map: { width: 48, height: 32, seed: "scenario-a1" },
});

const payloads = createDataBusSpawnPayloads({
    anchors: scenario.worldAnchors,
    idPrefix: "run1",
    namePrefix: "run1",
});

const worldgenEntities = createWorldgenEntities({ payloads });

console.log(worldgenEntities.playerId);
console.log(Object.keys(worldgenEntities.entitiesById));
```

DataBus apply helper starter (`merge`/`replace`):

```ts
import {
    createApplyWorldgenEntitiesUpdater,
    createWorldgenEntities,
} from "@/logic/worldgen";
import { dataBus } from "@/services/DataBus";

const worldgenEntities = createWorldgenEntities({ payloads });

dataBus.setState(
    createApplyWorldgenEntitiesUpdater(worldgenEntities, {
        mode: "merge", // or "replace"
        syncCameraFollowTarget: true,
    }),
);
```

---

## 5) Screen Controls System

All screen controls are under `src/components/screenController/` and re-exported by `index.ts`.

### Exports

- `ScreenController` — container
- `ScreenControl` — base button primitive
- `ScreenControlGroup` — grouped/labeled section wrapper
- `ArrowKeyControl` — keyboard listener control (Arrow keys + WASD)
- `OnScreenArrowControl` — clickable arrow buttons (movement)
- `CompassDirectionControl` — `N/S/E/W` buttons (`log` mode or `player-actions` mode)
- `CompassActionControl` — compass control that directly consumes a provided action map
- `createPlayerInputActions` — reusable gameplay action map factory
- `useActionKeyBindings` — reusable keyboard-to-action binding hook
- `useGamepadInput` — reusable gamepad-to-action binding hook with init-time axis/button mapping
- `getFocusableElements` / `handleArrowFocusNavigation` — lightweight focus + arrow-key navigation helpers
- `createInputComponentAdapters` — adapter factory for reusing one action map across multiple input components

### Recommended composition

```tsx
<ScreenController className="snes-layout">
    <ArrowKeyControl onMove={() => force((n) => n + 1)} />
    <ScreenControlGroup className="dpad-group">
        <OnScreenArrowControl onMove={() => force((n) => n + 1)} />
    </ScreenControlGroup>
    <ScreenControlGroup className="face-button-group">
        <CompassDirectionControl mode="player-actions" />
    </ScreenControlGroup>
</ScreenController>
```

Default keyboard controls:

- Movement: Arrow keys / `WASD`
- Jump: `Space`

### Input mapping template (copy/paste)

Use the built-in helpers when you want one place to map gameplay actions to both keys and on-screen buttons.

```tsx
import {
    CompassDirectionControl,
    createPlayerInputActions,
    useActionKeyBindings,
} from "@/components/screenController";

function ControlsModule({ onChanged }: { onChanged?: () => void }) {
    const actions = createPlayerInputActions({
        onChanged,
        onInteract: () => {
            // your interaction logic
        },
    });

    useActionKeyBindings(actions, {
        enabled: true,
        preventDefault: true,
    });

    return <CompassDirectionControl mode="player-actions" onMove={onChanged} />;
}
```

### Focus + keyboard navigation helpers

Use `getFocusableElements` and `handleArrowFocusNavigation` from `@/components/screenController` to add simple roving focus in button groups, menus, or control clusters.

```tsx
import {
    getFocusableElements,
    handleArrowFocusNavigation,
} from "@/components/screenController";

function FocusableActionRow() {
    return (
        <div
            role="group"
            aria-label="Quick actions"
            onKeyDown={(event) => {
                handleArrowFocusNavigation(
                    event.nativeEvent,
                    event.currentTarget,
                    {
                        orientation: "horizontal",
                        wrap: true,
                    },
                );
            }}
        >
            <button type="button">Save</button>
            <button type="button">Load</button>
            <button type="button">Reset</button>
        </div>
    );
}

// Programmatic access when needed
const focusables = getFocusableElements(document.body);
console.log(focusables.length);
```

### Input mapping adapters (reuse one action map across components)

Use `createInputComponentAdapters` when you want one `InputActionMap` to drive multiple controls (keyboard, compass buttons, virtual DPad, action buttons) without duplicating wiring.

```tsx
import {
    CompassActionControl,
    createInputComponentAdapters,
    createPlayerInputActions,
    useActionKeyBindings,
} from "@/components/screenController";
import { VirtualDPad } from "@/components/virtualDPad";
import { VirtualActionButton } from "@/components/virtualActionButton";

function MobileControls() {
    const actions = createPlayerInputActions({
        onChanged: () => {
            // trigger render sync
        },
    });

    const adapters = createInputComponentAdapters(actions);
    useActionKeyBindings(actions);

    return (
        <div className="um-row">
            <CompassActionControl actions={adapters.compassActions} />
            <VirtualDPad
                onDirectionStart={adapters.virtualDPad.onDirectionStart}
            />
            <VirtualActionButton
                label="A"
                onActivate={adapters.actionButton.onActivate}
            />
        </div>
    );
}
```

### Compass buttons template (primary)

`CompassDirectionControl` supports both modes:

- `mode="log"` (default) for quick demo logging
- `mode="player-actions"` for gameplay movement/jump behavior via `DataBus`

```tsx
import { ScreenControl } from "@/components/screenController";

type CompassActions = {
    north: () => void;
    south: () => void;
    east: () => void;
    west: () => void;
};

export function GameCompass({ actions }: { actions: CompassActions }) {
    return (
        <div className="compass-direction-control">
            <ScreenControl
                label="N"
                className="compass-button north"
                onActivate={actions.north}
            />
            <ScreenControl
                label="W"
                className="compass-button west"
                onActivate={actions.west}
            />
            <ScreenControl
                label="E"
                className="compass-button east"
                onActivate={actions.east}
            />
            <ScreenControl
                label="S"
                className="compass-button south"
                onActivate={actions.south}
            />
        </div>
    );
}
```

### Key assignment template

Use this when you need custom keys beyond default `ArrowKeyControl` behavior.

```tsx
import { useEffect } from "react";

type InputActions = {
    north: () => void;
    south: () => void;
    east: () => void;
    west: () => void;
    interact: () => void;
};

export function useKeyBindings(actions: InputActions, enabled: boolean = true) {
    useEffect(() => {
        if (!enabled) return;

        const onKeyDown = (event: KeyboardEvent) => {
            const key = event.key.toLowerCase();

            if (key === "w" || key === "arrowup") actions.north();
            if (key === "s" || key === "arrowdown") actions.south();
            if (key === "d" || key === "arrowright") actions.east();
            if (key === "a" || key === "arrowleft") actions.west();
            if (key === "e") actions.interact();
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [actions, enabled]);
}
```

### Quick cheat sheet: assign once, reuse everywhere

- Define action map once (`north/south/east/west/interact`).
- Feed the same actions into compass `ScreenControl` buttons.
- Feed the same actions into keyboard bindings.
- Keep `onChanged` callback centralized to force render only where needed.
- Prefer action names (`north`, `interact`) instead of input names (`w`, `buttonA`) so you can remap later.

---

## 6) Screen Transition Effects (`components/effects`)

### Canvas effects plugin contract (advanced)

The current runtime path uses `EffectGraph` internally. `CanvasEffectsStage` remains available as a compatibility adapter over the same pass contract:

- `EffectGraph`
- `CanvasEffectsStage`
- `CanvasEffectPass`
- `CanvasEffectFrame`
- `CanvasEffectLayer`
- `CANVAS_EFFECT_LAYER_ORDER`

Contract summary:

- Each pass declares `id`, `layer`, `isActive`, `update(deltaMs)`, and `draw(frame)`.
- Stage ordering is deterministic by layer (`particles` -> `transition`) and then pass id.
- Signal trigger APIs stay unchanged (`playScreenTransition`, `emitParticles`).

```ts
import { EffectGraph, type CanvasEffectPass } from "@/components/effects";

const graph = new EffectGraph();

const pass: CanvasEffectPass = {
    id: "example-pass",
    layer: "particles",
    isActive: () => true,
    update: (deltaMs) => {
        void deltaMs;
    },
    draw: ({ ctx, width, height }) => {
        void ctx;
        void width;
        void height;
    },
};

graph.upsertPlugin(pass);
```

Current runtime behavior note: effects and transitions are runtime-owned in `Render` (no mode-level pass hooks or overlay shims).

The transition system is signal-driven and runs through the `Render` runtime effects stage.

- `createScreenTransitionCanvasPass` owns transition update/draw lifecycle.
- `TransitionCoordinator` guarantees phase timing and callback ordering.
- `playScreenTransition(payload)` emits a transition signal with full control.
- `playBlackFade(options)` is a preset helper for black transitions.
- Variant helpers: `playVenetianBlindsTransition`, `playMosaicDissolveTransition`, `playIrisTransition`, `playDirectionalPushTransition`.
- `setupDevEffectHotkeys(options)` wires development preview keys (`T`, `P`, `F`, `Shift+F`, `I/J/K/L`, `Shift+I/J/K/L`).

### Required app wiring

Use `Render` with runtime effects enabled (default behavior).

```tsx
return (
    <div className="GameScreen">
        <Render
            items={Object.values(dataBus.getState().entitiesById)}
            width={400}
            height={300}
            includeEffects
            enableTransitionEffects
        />
    </div>
);
```

### Trigger a transition

```ts
import { playScreenTransition } from "@/components/effects";

playScreenTransition({
    color: "#000",
    from: "top-left",
    durationMs: 500,
    stepMs: 16,
    boxSize: 16,
});
```

Biome/path composition overlay for sprite-tile workflows:

```ts
import {
    createBiomePathComposition,
    generateSeededRoomMap,
} from "@/logic/worldgen";

const roomMap = generateSeededRoomMap({
    width: 40,
    height: 24,
    seed: "biome-run",
    roomCount: 8,
});

const composed = createBiomePathComposition({
    tiles: roomMap.tiles,
    seed: "biome-run",
    pathStart: { x: 6, y: 6 },
    pathEnd: { x: 30, y: 14 },
    pathTileValue: 9,
});

console.log(composed.biomeMap[6][6]);
console.log(composed.spriteTiles[6][6]);
```

Preset scenario builders for generated runs:

```ts
import {
    createWorldgenScenePreset,
    createWorldgenScenePresetOptions,
} from "@/logic/worldgen";

const options = createWorldgenScenePresetOptions("compact-run", {
    map: { seed: "compact-run:custom" },
    spawns: { enemyCount: 6 },
});

const scenario = createWorldgenScenePreset("compact-run", {
    map: { seed: "compact-run:custom" },
    spawns: { enemyCount: 6 },
});

console.log(options.map.width, scenario.map.rooms.length);
```

### Trigger with black preset

```ts
import { playBlackFade } from "@/components/effects";

playBlackFade({
    from: "bottom-right",
    durationMs: 500,
    stepMs: 16,
    boxSize: 16,
});
```

### Trigger a specific variant

```ts
import {
    playDirectionalPushTransition,
    playIrisTransition,
    playMosaicDissolveTransition,
    playVenetianBlindsTransition,
} from "@/components/effects";

playVenetianBlindsTransition({
    color: "#2f3e46",
    from: "top-left",
    venetianOrientation: "horizontal",
});

playMosaicDissolveTransition({
    color: "#5e548e",
    from: "top-left",
    mosaicSeed: 42,
});

playIrisTransition({
    color: "#2a9d8f",
    from: "top-left",
    irisOrigin: "center",
});

playDirectionalPushTransition({
    color: "#bc4749",
    from: "top-left",
    pushFrom: "right",
});
```

### Transition payload reference

- `color: string` — fill color for transition boxes
- `from: "top-left" | "top-right" | "bottom-left" | "bottom-right"`
- `durationMs?: number` — per phase duration (cover and reveal)
- `stepMs?: number` — delay between diagonal wave cells
- `boxSize?: number` — pixel block size
- `variant?: "diagonal" | "venetian-blinds" | "mosaic-dissolve" | "iris" | "directional-push"`
- `venetianOrientation?: "horizontal" | "vertical"` (venetian only)
- `mosaicSeed?: number` (mosaic only)
- `irisOrigin?: "center" | TransitionCorner` (iris only)
- `pushFrom?: "left" | "right" | "top" | "bottom"` (directional push only)
- `onCovered?: () => void` — called when screen is fully covered
- `onComplete?: () => void` — called after reveal finishes

Variant helper note: `playVenetianBlindsTransition`, `playMosaicDissolveTransition`, `playIrisTransition`, and `playDirectionalPushTransition` now accept optional `color` and default to `"black"` when omitted.

### Recommended scene-swap flow

Use `onCovered` to swap world/screen state while the transition is opaque:

```ts
playBlackFade({
    from: "top-right",
    onCovered: () => {
        // swap map/screen/entities here
    },
    onComplete: () => {
        // optional post-transition work
    },
});
```

### Notes

- Transition signal: `effects:screen-transition:play`
- Development hotkeys now live in `src/components/effects/dev/devEffectHotkeys.ts`.
- New effects can start from `src/components/effects/_template/`.

### Dev hotkeys setup (optional)

Use this helper in development to preview transitions and particles quickly.

```ts
import { setupDevEffectHotkeys } from "@/components/effects";

const cleanup = setupDevEffectHotkeys({
    enabled: import.meta.env.DEV,
    width: 400,
    height: 300,
    getContainer: () => gameScreenRef.current,
});

// call cleanup() on unmount
```

Default keybinds:

- `T` — cycle transition variants/corners
- `P` — cycle particle presets at random in-bounds positions
- `F` — start/reposition a continuous torch emitter at mouse position (or center fallback)
- `Shift+F` — stop the torch emitter
- `I/J/K/L` — pan camera in manual mode
- `Shift+I/J/K/L` — pan camera faster in manual mode

Contributor workflow notes for these controls are documented in [CONTRIBUTING.md](CONTRIBUTING.md#6-dev-preview-controls-effects).

---

## 7) Particle Effects (`components/effects`)

The particle emitter is signal-driven and renders through the `Render` runtime effects stage.

- `createParticleEmitterCanvasPass` owns particle spawn/update/draw lifecycle.
- `emitParticles(payload)` emits particle bursts through `SignalBus`.

### Required app wiring

Use `Render` with runtime effects enabled (default behavior).

```tsx
return (
    <div className="GameScreen">
        <Render
            items={Object.values(dataBus.getState().entitiesById)}
            width={400}
            height={300}
            includeEffects
        />
    </div>
);
```

### Emit particles from anywhere

```ts
import { emitParticles } from "@/components/effects";

emitParticles({
    amount: 40,
    location: { x: 200, y: 150 },
    direction: {
        angleDeg: 270,
        speed: 160,
        spreadDeg: 360,
        speedJitter: 80,
    },
    emissionShape: "point",
    lifeMs: 700,
    color: "#ffd166",
    size: 2,
    sizeJitter: 1,
    gravity: 120,
    drag: 0.15,
});
```

### Particle payload reference

- `amount: number` — number of particles to spawn
- `location: { x, y }` — emission origin
- `direction: { angleDeg, speed, spreadDeg?, speedJitter? }`
- `emissionShape: "point" | "circle" | "line"`
- `lifeMs: number` — lifetime per particle
- `color: string` — fill color
- `colorPalette?: string[]` — optional random palette per particle
- `size?: number` — base particle size
- `sizeJitter?: number` — random size variance
- `sizeRange?: { min: number; max: number }` — optional min/max random size
- `emissionRadius?: number` — used by `circle` shape
- `emissionLength?: number` — used by `line` shape
- `gravity?: number` — vertical acceleration per second
- `drag?: number` — velocity damping factor

### Preset helpers

Use these for faster setup before fine-tuning with `emitParticles`:

- `emitSmokeParticles(location, options?)`
- `emitSparkParticles(location, options?)`
- `emitMagicShimmerParticles(location, options?)`
- `emitDebrisParticles(location, options?)`
- `emitBurningFlameParticles(location, options?)` (flame + smoke combo)

```ts
import {
    emitBurningFlameParticles,
    emitSmokeParticles,
    startTorchFlameEmitter,
    stopTorchFlameEmitter,
} from "@/components/effects";

emitSmokeParticles({ x: 180, y: 170 });

emitBurningFlameParticles(
    { x: 200, y: 190 },
    {
        flameAmount: 20,
        smokeAmount: 10,
    },
);

const stopTorch = startTorchFlameEmitter(
    "campfire",
    { x: 220, y: 210 },
    {
        intervalMs: 100,
        amount: 14,
    },
);

// later
stopTorch();
stopTorchFlameEmitter("campfire");
```

### Emission shape notes

- `point`: all particles spawn exactly at `location`
- `circle`: particles spawn randomly inside `emissionRadius`
- `line`: particles spawn across a horizontal line using `emissionLength`

### Common presets (copy/paste)

```ts
import { emitParticles } from "@/components/effects";

// Dust puff (ground hit)
emitParticles({
    amount: 22,
    location: { x: 160, y: 220 },
    direction: { angleDeg: 270, speed: 80, spreadDeg: 80, speedJitter: 30 },
    emissionShape: "line",
    emissionLength: 20,
    lifeMs: 380,
    color: "#c2b280",
    size: 2,
    sizeJitter: 1,
    gravity: 160,
    drag: 0.25,
});

// Spark burst (impact)
emitParticles({
    amount: 34,
    location: { x: 200, y: 120 },
    direction: { angleDeg: 270, speed: 190, spreadDeg: 360, speedJitter: 90 },
    emissionShape: "point",
    lifeMs: 320,
    color: "#ffd166",
    size: 2,
    sizeJitter: 1,
    gravity: 90,
    drag: 0.1,
});

// Explosion (area burst)
emitParticles({
    amount: 65,
    location: { x: 220, y: 140 },
    direction: { angleDeg: 270, speed: 220, spreadDeg: 360, speedJitter: 120 },
    emissionShape: "circle",
    emissionRadius: 14,
    lifeMs: 700,
    color: "#ff7b00",
    size: 3,
    sizeJitter: 2,
    gravity: 130,
    drag: 0.12,
});
```

### Particle tuning by feel

| Feel                | Increase                             | Decrease                   | Typical ranges                                                                  |
| ------------------- | ------------------------------------ | -------------------------- | ------------------------------------------------------------------------------- |
| Soft / floaty       | `lifeMs`, `drag`                     | `gravity`, `speed`         | `lifeMs: 500-1200`, `drag: 0.18-0.35`, `gravity: 20-120`                        |
| Punchy / impact     | `amount`, `speed`, `spreadDeg`       | `lifeMs`                   | `amount: 20-50`, `speed: 140-280`, `spreadDeg: 180-360`, `lifeMs: 180-450`      |
| Heavy / debris      | `size`, `gravity`                    | `spreadDeg`, `speedJitter` | `size: 2-5`, `gravity: 140-260`, `spreadDeg: 60-200`                            |
| Chaotic / explosive | `spreadDeg`, `speedJitter`, `amount` | `drag`                     | `spreadDeg: 300-360`, `speedJitter: 80-180`, `amount: 40-90`, `drag: 0.05-0.18` |

Quick tip: if particles feel too “stiff,” raise `speedJitter`; if they feel too “noisy,” lower `spreadDeg` first.

### Notes

- Particle signal: `effects:particles:emit`
- Overlay is visual-only (`pointer-events: none`)
- Torch helpers: `startTorchFlameEmitter(id, location, options?)`, `stopTorchFlameEmitter(id)`, `stopAllTorchFlameEmitters()`
- Development particle/transition previews are handled by `setupDevEffectHotkeys` in development mode

### Effects API quick reference

| Effect                     | Trigger helper                  | Signal                           | Required payload fields                                               | Common optional fields                                                      |
| -------------------------- | ------------------------------- | -------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Screen transition          | `playScreenTransition(payload)` | `effects:screen-transition:play` | `color`, `from`                                                       | `durationMs`, `stepMs`, `boxSize`, `onCovered`, `onComplete`                |
| Screen transition (preset) | `playBlackFade(options)`        | `effects:screen-transition:play` | `from`                                                                | `durationMs`, `stepMs`, `boxSize`, `onCovered`, `onComplete`                |
| Particle emitter           | `emitParticles(payload)`        | `effects:particles:emit`         | `amount`, `location`, `direction`, `emissionShape`, `lifeMs`, `color` | `size`, `sizeJitter`, `emissionRadius`, `emissionLength`, `gravity`, `drag` |
| Particle presets           | `emitSmokeParticles(...)` etc.  | `effects:particles:emit`         | `location`                                                            | `ParticlePresetOptions` (`amount`, `lifeMs`, `colorPalette`, `sizeRange`)   |
| Torch emitter              | `startTorchFlameEmitter(...)`   | `effects:particles:emit`         | `id`, `location`                                                      | `intervalMs`, `amount`, `flameAmount`, `smokeAmount`, preset overrides      |

| Particle `direction` field | Type     | Meaning                            |
| -------------------------- | -------- | ---------------------------------- |
| `angleDeg`                 | `number` | Base movement angle in degrees     |
| `speed`                    | `number` | Base speed                         |
| `spreadDeg`                | `number` | Direction spread around `angleDeg` |
| `speedJitter`              | `number` | Random variation around `speed`    |

---

## 8) Keyboard Hook (`useArrowKeys`)

`src/logic/useArrowKeys.ts` is a reusable hook for directional keyboard input.

### API

- `onDirection(direction)` — callback with `"up" | "down" | "left" | "right"`
- `preventDefault?: boolean` (default `true`)
- `enabled?: boolean` (default `true`)

### Example

```ts
useArrowKeys({
    onDirection: (dir) => {
        if (dir === "left") dataBus.movePlayerLeft();
    },
});
```

---

## 9) Testing Conventions

- Use explicit Vitest imports in every test file (`describe`, `it`, `expect`, `vi`, etc.)
- Naming convention:
    - primary tests: `<subject>.test.ts(x)`
    - additional/edge scenarios: `<subject>.extended.test.ts(x)`

Current examples:

- `screenController.behavior.test.tsx`
- `screenController.layout.test.tsx`
- `Render.extended.test.tsx`
- `useArrowKeys.extended.test.tsx`

---

## 10) Common Extension Tasks

### Add a new control

1. Create a component in `src/components/screenController/`
2. Re-export it from `src/components/screenController/index.ts`
3. Mount it in `App.tsx` inside `ScreenController`
4. Add behavior/layout tests in `src/tests/`

### Add a new entity type

1. Create/update entity data shape in logic/entity layer
2. Add entity to `DataBus` state
3. Ensure it has render-required fields (`spriteImageSheet`, tiles, etc.)
4. Add collider when collision participation is required

---

## 11) Save File Import/Export

Reference docs:

- Full guide: [save/README.md](save/README.md)
- One-page quick ref: [save/CHEATSHEET.md](save/CHEATSHEET.md)
- Module internals: [../src/services/save/README.md](../src/services/save/README.md)

### Quick save (localStorage)

Quick save APIs are available in `src/services/save/bus.ts`:

- `quickSave()` stores current state in localStorage key `ursa:quickSave:v1`.
- `quickLoad()` restores that snapshot when present/valid.
- `clearQuickSave()` removes the stored snapshot.
- `sanitizePersistedState(scope)` removes persisted local state in development (`save-only`, `input-profiles`, or `all`).

Default app behavior in development:

- App startup attempts `quickLoad()` automatically.
- Runtime state changes trigger throttled autosave via `createQuickSaveScheduler`.

Dev shortcuts (when dev mode is enabled):

- `Alt + Shift + S` — Quick Save
- `Alt + Shift + L` — Quick Load
- `Alt + Shift + E` — Export Save File
- `Alt + Shift + I` — Import Save File
- `Alt + Shift + M` — Toggle Audio Mute
- `Alt + Shift + N` — Toggle Music Mute
- `Alt + Shift + B` — Toggle SFX Mute
- `Alt + Shift + P` — Toggle World Pause (Dev Reason)
- `Alt + Shift + D` — Toggle Interact Mode (Attack/Dodge)
- `Alt + Shift + A` — Trigger Player Attack State
- `Alt + Shift + Z` — Trigger Player Dodge State
- `Alt + Shift + X` — Trigger Player Block State
- `Alt + Shift + C` — Trigger Player Damaged State
- `Alt + Shift + V` — Trigger Player Stunned State
- `Alt + Shift + G` — Trigger Boss Phase-1 on Selected Enemy
- `Alt + Shift + H` — Trigger Boss Phase-2 on Selected Enemy
- `Alt + Shift + J` — Cycle Boss Target Enemy
- `Alt + Shift + K` — Cycle Boss Target Enemy (Reverse)
- `Alt + Shift + Q` — Sanitize Quick-Save State
- `Alt + Shift + Y` — Sanitize Input Profiles
- `Alt + Shift + R` — Sanitize Local Ursa State

Save file APIs live in `src/services/save/file.ts` and use the versioned `SaveGameV1` schema from `src/services/save/schema.ts`.

### Startup restore snippet

```ts
import { quickLoad } from "@/services/save";

const didRestore = quickLoad();
if (!didRestore) {
    // keep default state
}
```

### Throttled autosave snippet

```ts
import { createQuickSaveScheduler } from "@/services/save";

const scheduler = createQuickSaveScheduler({ waitMs: 700 });

function onStateChanged() {
    scheduler.notifyChange();
}

function cleanup() {
    scheduler.dispose();
}
```

### Export

- Call `exportSaveFile()` to download a `.json` snapshot of current `DataBus` state.
- Filename format: `ursa-save-<timestamp>.json` (see `buildSaveFileName`).
- Return shape:
    - success: `{ ok: true, fileName }`
    - error: `{ ok: false, code, message }`

### Import

- Call `importSaveFile(file)` with a user-selected `.json` file.
- Import validates JSON, validates save schema/version, and then rehydrates state.
- Return shape:
    - success: `{ ok: true, fileName }`
    - error: `{ ok: false, code, message }`

Supported import error codes:

- `file-read-failed`
- `empty-file`
- `invalid-json`
- `invalid-save-format`
- `rehydrate-failed`

### Import error copy map snippet

```ts
import type { SaveFileErrorCode } from "@/services/save/file";

const saveErrorCopy: Record<SaveFileErrorCode, string> = {
    "download-not-supported": "Export is not supported in this environment.",
    "file-read-failed": "Could not read that save file.",
    "empty-file": "The selected save file is empty.",
    "invalid-json": "The selected file is not valid JSON.",
    "invalid-save-format": "Unsupported save version or schema.",
    "rehydrate-failed":
        "Save could not be applied to the current runtime state.",
};
```

### Save shortcut cheat sheet

| Action                    | Shortcut          |
| ------------------------- | ----------------- |
| Quick Save                | `Alt + Shift + S` |
| Quick Load                | `Alt + Shift + L` |
| Export Save               | `Alt + Shift + E` |
| Import Save               | `Alt + Shift + I` |
| Audio Mute                | `Alt + Shift + M` |
| Music Mute                | `Alt + Shift + N` |
| SFX Mute                  | `Alt + Shift + B` |
| Toggle World Pause        | `Alt + Shift + P` |
| Toggle Interact Mode      | `Alt + Shift + D` |
| Trigger Player Attack     | `Alt + Shift + A` |
| Trigger Player Dodge      | `Alt + Shift + Z` |
| Trigger Player Block      | `Alt + Shift + X` |
| Trigger Player Damaged    | `Alt + Shift + C` |
| Trigger Player Stunned    | `Alt + Shift + V` |
| Trigger Boss Phase-1      | `Alt + Shift + G` |
| Trigger Boss Phase-2      | `Alt + Shift + H` |
| Cycle Boss Target         | `Alt + Shift + J` |
| Cycle Boss Target (Rev)   | `Alt + Shift + K` |
| Sanitize Save State       | `Alt + Shift + Q` |
| Sanitize Input Profiles   | `Alt + Shift + Y` |
| Sanitize Local Ursa State | `Alt + Shift + R` |

The import/export format is intentionally tied to `version` in schema so future migrations can be added without breaking existing save files.

---

## 12) Notes

- Canvas image loading in `Render` uses internal URL caching.
- `ArrowKeyControl` handles both Arrow keys and WASD.
- The controls shell currently uses a retro SNES-style left/right layout.
