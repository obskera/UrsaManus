# AI Setup Guide (Repo-Aware Bootstrap)

Use this guide when you want an AI tool to inspect UrsaManus and configure a new/derived project with minimal back-and-forth.

## Goal

Help the AI do three things reliably:

1. Understand what UrsaManus is and where core systems live.
2. Gather your project-specific constraints before coding.
3. Produce a scoped implementation + config plan with tests/docs updates.

## Give the AI this context first

- Project intent (game/tool type, target platform, MVP scope)
- Input priorities (keyboard, pointer/tap, gamepad)
- Rendering expectations (side-scroller/top-down/custom)
- Save/load requirements (quick save only vs import/export)
- Non-goals (what should not be changed)

## Repo orientation (what AI should read in order)

1. `README.md` (project overview + docs map)
2. `docs/ARCHITECTURE.md` (module boundaries)
3. `docs/USAGE.md` (copy/paste APIs)
4. `docs/input/CHEATSHEET.md` (input mappings)
5. `docs/worldgen/CHEATSHEET.md` (deterministic worldgen + spawn payload patterns)
6. `docs/CONTRIBUTING.md` (guardrails and PR expectations)

Then inspect implementation entry points:

- `src/App.tsx`
- `src/components/gameModes/`
- `src/components/screenController/`
- `src/services/`

## AI bootstrap prompt template (copy/paste)

```txt
You are configuring a project based on the UrsaManus repository.

Objective:
- Configure this project for: [describe game/app]
- Keep scope to MVP only.

Hard constraints:
- Preserve architecture boundaries:
  - components/ = UI/render/input wiring
  - logic/ = pure reusable systems
  - services/ = stateful orchestration
- Reuse existing hooks/components before creating new primitives.
- Keep input semantics action-based (north/south/east/west/interact).
- Keep device mappings init-configurable.
- Update tests and docs for public behavior changes.

Please do the following:
1) Read README.md, docs/ARCHITECTURE.md, docs/USAGE.md, docs/input/CHEATSHEET.md, docs/CONTRIBUTING.md.
2) Propose a minimal implementation plan with exact files to edit.
3) Implement in small patches.
4) Run focused tests first, then broader tests.
5) Summarize what changed and what remains optional.

Non-goals:
- [list things to avoid]
```

## Configuration checklist the AI should complete

- [ ] Choose base mode preset (`SideScrollerCanvas` or `TopDownCanvas`) or justify custom.
- [ ] Configure input helpers (`createPlayerInputActions`, keyboard, pointer, gamepad as needed).
- [ ] Wire audio cues via scene audio + `AudioBus`.
- [ ] Confirm save/load behavior and user-facing triggers.
- [ ] Add/update focused tests near changed modules.
- [ ] Update docs snippets in `docs/USAGE.md` and relevant cheat sheets.
- [ ] Update `docs/AI_SETUP.md` whenever roadmap priorities or AI implementation expectations change.

## Prompt templates by task

Use these when you want the AI to execute a specific extension workflow with clear scope.

### 1) Add a new game mode preset

```txt
Implement a new game mode preset in this UrsaManus repo.

Target mode:
- [name + short behavior description]

Requirements:
- Reuse current mode architecture under src/components/gameModes/.
- Keep control semantics action-based (north/south/east/west/interact).
- Add a matching controls preset in src/components/screenController/ if needed.
- Keep canvas/render wiring compatible with current runtime path.

Deliverables:
1) New mode canvas preset component.
2) Optional matching controls preset.
3) Focused tests for mode behavior.
4) docs/USAGE.md snippet for copy/paste usage.

Validation:
- Run focused tests for the new mode and related controls.
- Report exact files changed.
```

### 2) Add or remap an input device

```txt
Extend input support in this UrsaManus repo.

Target device:
- [keyboard/pointer/gamepad/other]

Requirements:
- Keep gameplay logic in one action contract (north/south/east/west/interact).
- Keep mappings init-configurable.
- Reuse existing helpers in src/components/screenController first.
- Avoid duplicating movement logic across components.

Deliverables:
1) Input hook/adapter changes.
2) Focused tests for mapping behavior and edge cases.
3) docs/USAGE.md update if API changed.
4) docs/input/CHEATSHEET.md update with a remapping snippet.

Validation:
- Run focused input test files and summarize results.
```

### 3) Add a new HUD prefab/component

```txt
Add a reusable HUD prefab to this UrsaManus repo.

Component goal:
- [name + purpose]

Requirements:
- Build from existing UI primitives when possible.
- Keep props minimal and explicit.
- Add a demo entry under src/components/examples/ and ensure it can be mounted in app examples.

Deliverables:
1) New prefab component + styles (if needed).
2) Example component.
3) Focused tests for both prefab and example.
4) docs/USAGE.md copy/paste usage section.

Validation:
- Run focused tests for prefab/example behavior.
- Summarize API and default prop behavior.
```

### 4) Project bootstrap from template

```txt
Bootstrap a new project from this UrsaManus template.

Project profile:
- [genre/use-case]
- [platform + input priorities]
- [MVP scope]

Requirements:
- Update package metadata and project identity docs.
- Choose default mode preset(s) and input mappings.
- Configure save/load baseline (quick save only vs import/export).
- Keep changes minimal and avoid adding speculative features.

Deliverables:
1) Minimal project setup changes.
2) Updated docs map and getting-started snippets.
3) Focused tests for changed runtime behavior.

Validation:
- Run lint + tests and summarize any follow-up recommendations.
```

### 5) Implement entity behavior + animation state machines

```txt
Implement entity state machines in this UrsaManus repo.

Goal:
- Entities use one active state source for both behavior and animation.

Requirements:
- Use a state profile per entity archetype (`player`, `npc`, `boss`).
- Include baseline states: `idle`, `moving`, `attacking`, `damaged`, `stunned`, `dead`.
- Define guarded transitions + interrupt priorities (e.g., `damaged` interrupts `moving`/`attacking`).
- Keep behavior decisions and animation clip selection synchronized through the same state value.
- Add `onEnter`/`onExit` hooks for side effects.

Deliverables:
1) State profile definitions and transition rules.
2) Runtime wiring that drives both behavior and animation from shared state.
3) Focused tests for transition guards, interrupt rules, and deterministic ordering.
4) docs/USAGE.md update if any public usage contracts change.

Validation:
- Run focused tests for entity behavior/animation state transitions.
- Summarize exact files changed and remaining optional enhancements.
```

## Roadmap sync notes for AI agents (2026-02-28)

When planning or implementing new features, align with these active roadmap docs before coding:

- `docs/TODO.md` — source-of-truth priority list.
- `docs/USAGE.md` (“Planned system stubs”) — implementation placeholder expectations.
- `docs/AI_SETUP.md` — AI-agent workflow/source-of-truth for prompt templates and execution constraints.

Recent implementation note (accessibility QA matrix):

- Shared accessibility QA matrix validation service is available in `src/services/accessibilityQaMatrix.ts`.
- Report parser + evaluator entrypoints:
    - `parseAccessibilityQaMatrixReport(...)`
    - `evaluateAccessibilityQaMatrix(...)`
- Required checklist areas are enforced for release-readiness checks:
    - `keyboard-navigation`
    - `readability-contrast`
    - `reduced-motion`
    - `assist-timing`
- CLI + quality gate commands:
    - `npm run accessibility:qa`
    - `npm run quality:accessibility`

Recent implementation note (TextBox prefab):

- Spawnable TextBox prefab is available in `src/components/textBox/TextBox.tsx`.
- Supports coordinate placement (`x`, `y`), width/max-lines, static/typewriter reveal, optional portrait/icon slots, and close automation via `autoCloseMs`.
- Lifecycle hooks are available for `onOpen`, `onUpdate`, and `onClose` flows.
- Deterministic sequence helper is available in `src/components/textBox/createTextBoxQueue.ts` with both `queue` (FIFO) and `stack` (LIFO) policies.
- Dev example preview is available in `src/components/examples/TextBoxExample.tsx`.

Recent implementation note (Toasts prefab):

- Screen-space Toasts prefab is available in `src/components/toasts/Toasts.tsx`.
- Supports stacked anchor positioning (`top-left`, `top-right`, `bottom-left`, `bottom-right`) plus queue-driven rendering on UI overlay layer.
- Lifecycle hook `onDismiss` supports explicit reasoned dismissal for timed auto-dismiss and manual dismiss flows.
- Deterministic queue helper is available in `src/components/toasts/createToastQueue.ts` with `enqueue`, `dequeue`, `remove`, `peek`, and `clear` operations.
- Dev example preview is available in `src/components/examples/ToastsExample.tsx`.

Recent implementation note (dev state sanitize/reset):

- Development reset utility is available via `sanitizePersistedState(scope)` in `src/services/save/sanitize.ts`.
- Supported scopes:
    - `save-only` (quick-save key only)
    - `input-profiles` (keys prefixed by `ursa:input-profile`)
    - `all` (all `ursa:` localStorage keys)
- Default app dev shortcuts (confirmation-gated):
    - `Alt + Shift + Q` — sanitize quick-save state
    - `Alt + Shift + Y` — sanitize input profile state
    - `Alt + Shift + R` — sanitize local Ursa state

Recent implementation note (interaction system core):

- `DataBus` now exposes unified interaction contract APIs:
    - `setEntityInteractionContract(entityId, contract)`
    - `resolveEntityInteraction(entityId, inputMode?)`
    - `resolvePlayerInteraction(inputMode?)`
    - `interactWithEntity(entityId, inputMode?)`
    - `interactWithNearestTarget(inputMode?)`
- Contracts support `canInteract`, `interact`, and custom `blockedReason` callbacks.
- Runtime gating supports distance + line-of-sight raycast checks and returns input hint labels for keyboard/controller/pointer.

Recent implementation note (deterministic replay system):

- Replay capture service is available in `src/services/replay.ts` via `createDeterministicReplayRecorder(...)`.
- Replay payloads include deterministic seed snapshots plus ordered input/event records with time offsets.
- Import/export helpers are available for regression sharing workflows:
    - `exportReplayPayload(...)`
    - `parseReplayPayload(...)`
    - `validateReplayPayload(...)`
- Time-based playback can be driven using `createReplayCursor(...)`.

Recent implementation note (schema migration framework):

- Shared migration utility is available in `src/services/schemaMigration.ts` via `createVersionedSchemaMigration(...)`.
- Save schema now uses this pipeline in `src/services/save/schema.ts`:
    - `migrateSaveGame(...)` (version-aware migrate + validate)
    - `preflightSaveGameMigration(...)` (compatibility preflight)
- Save import path (`src/services/save/file.ts`) now validates through migration-aware parsing so older supported payloads can still load.

Recent implementation note (content hot-reload pipeline):

- Dev-oriented hot-reload service is available in `src/services/contentHotReload.ts`.
- Domain handlers support targeted runtime refresh for authored content domains:
    - `dialogue`, `quest`, `map`, `editor`
- Watcher path routing is supported through `requestReloadForPath(...)`.
- Default lifecycle and domain refresh signals:
    - `content:hot-reload:requested`
    - `content:hot-reload:applied`
    - `content:hot-reload:failed`
    - `content:refresh:<domain>`

Recent implementation note (unified marker/POI registry):

- Shared marker authority service is available in `src/services/markerRegistry.ts`.
- Registry supports typed marker categories, channel visibility rules, context predicate filtering, and stack-group priority resolution.
- Default singleton `markerRegistry` can be used as the single marker source across map/minimap/objective tracker/interaction prompt systems.
- Registry emits `markers:registry:changed` for subscriber-driven UI refresh.

Recent implementation note (camera system v2):

- Shared camera v2 service is available in `src/services/cameraV2.ts`.
- Use `createCameraV2Service(...)` for isolated hosts/tests or `cameraV2` singleton for shared runtime usage.
- Follow behavior now supports dead-zone and velocity-aware look-ahead smoothing in a deterministic update loop.
- Camera state supports optional bounds clamping, layered timed shake channels, and scripted keyframe track playback for cinematic flows.
- Service emits lifecycle signals:
    - `camera:v2:updated`
    - `camera:v2:track:started`
    - `camera:v2:track:completed`
    - `camera:v2:shake:started`
    - `camera:v2:shake:completed`

Recent implementation note (pathfinding/navigation grid):

- Shared pathfinding/navigation service is available in `src/services/pathfindingNavigation.ts`.
- Use `createPathfindingNavigationService(...)` for isolated hosts/tests or `pathfindingNavigation` singleton for shared runtime usage.
- Deterministic A\* path queries are available via `findPath(start, goal, options?)`.
- Flow-field generation/consumption APIs are available via `buildFlowField(goal, options?)` and `getNextFlowStep(flowField, from)`.
- World/collision alignment helpers are available through `setWorldConfig(...)`, `worldToTile(...)`, and `tileToWorld(...)`.
- Service emits lifecycle signals:
    - `navigation:grid:updated`
    - `navigation:path:resolved`
    - `navigation:flow-field:resolved`

Recent implementation note (ability + cooldown effects system):

- Shared ability cooldown/effects service is available in `src/services/abilityCooldownEffects.ts`.
- Use `createAbilityCooldownEffectsService(...)` for isolated hosts/tests or `abilityCooldownEffects` singleton for shared runtime usage.
- Ability definitions support typed `active`/`passive` models with cast conditions, cost hooks, and shared cooldown groups.
- Runtime cast flow supports `canCast(...)`, `cast(...)`, deterministic cooldown progression via `tick(...)`, and snapshot projection via `getSnapshot()`.
- Active ability effect hook outputs support timed runtime expiry for buff/debuff/status/custom effect payload integration.
- Service emits lifecycle signals:
    - `ability:cast:applied`
    - `ability:cast:blocked`
    - `ability:cooldown:updated`
    - `ability:effect:applied`
    - `ability:effect:expired`

Recent implementation note (loot/progression economy system):

- Shared loot/progression economy service is available in `src/services/lootEconomy.ts`.
- Use `createLootEconomyService(...)` for isolated hosts/tests or `lootEconomy` singleton for shared runtime usage.
- Drop table resolution supports deterministic weighted roll outcomes with tier metadata, quantity ranges, and optional affix hook overrides.
- Reward bundles support reusable composition of static item/currency rewards plus referenced drop table rolls for quest/encounter/vendor flows.
- Economy pricing tables support deterministic item quote lookups (`quoteItem(...)`) for buy/sell tuning workflows.
- Service emits lifecycle signals:
    - `loot:drop:resolved`
    - `loot:bundle:resolved`
    - `loot:economy:table:updated`

Recent implementation note (world streaming/chunk loader):

- Shared world streaming service is available in `src/services/worldStreaming.ts`.
- Use `createWorldStreamingService(...)` for isolated hosts/tests or `worldStreaming` singleton for shared runtime usage.
- Streaming windows support deterministic active/preload chunk radius policies via `setLoadPolicy(...)` and focus updates via `updateFocus(...)`.
- Entity activation resolves deterministically from active chunk coverage with support for `alwaysActive` entity registration semantics.
- Runtime chunk controls support forced chunk preload/load pathways via `forceLoadChunk(...)` and `forceUnloadChunk(...)`.
- Service emits lifecycle signals:
    - `world:stream:chunk:loaded`
    - `world:stream:chunk:unloaded`
    - `world:stream:entity:activated`
    - `world:stream:entity:deactivated`
    - `world:stream:updated`

Recent implementation note (tutorial/onboarding state machine):

- Shared tutorial onboarding state machine service is available in `src/services/tutorialOnboarding.ts`.
- Use `createTutorialOnboardingService(...)` for isolated hosts/tests or `tutorialOnboarding` singleton for shared runtime usage.
- Flow definitions support deterministic step gating, progression, and runtime context-driven advancement checks.
- Prompt hooks are available via per-step `prompt` payloads and emitted tutorial prompt signals for dialogue/textbox/toast integration.
- Completion persistence is supported via `getPersistedState()` and `restorePersistedState(...)` with skip/resume state continuity.
- Service emits lifecycle signals:
    - `tutorial:onboarding:started`
    - `tutorial:onboarding:step:changed`
    - `tutorial:onboarding:step:blocked`
    - `tutorial:onboarding:step:completed`
    - `tutorial:onboarding:completed`
    - `tutorial:onboarding:skipped`
    - `tutorial:onboarding:resumed`
    - `tutorial:onboarding:prompt`

Recent implementation note (multiplayer readiness boundary):

- Shared multiplayer boundary contract service is available in `src/services/multiplayerBoundary.ts`.
- Use `createMultiplayerBoundaryService(...)` for isolated hosts/tests or `multiplayerBoundary` singleton for shared runtime usage.
- Deterministic simulation boundaries are modeled as explicit contracts with state-authority ownership (`server`, `client`, `shared`).
- Replication-safe API constraints are validated via `evaluateAction(...)` and `isApiReplicationSafe(...)` checks.
- Readiness reporting is available through `getReadinessReport()` to summarize deterministic coverage and non-deterministic contract risk.
- Service emits lifecycle signals:
    - `multiplayer:boundary:updated`
    - `multiplayer:boundary:evaluated`

Recent implementation note (visual world/entity placement tool):

- Shared world entity placement authoring service is available in `src/services/worldEntityPlacement.ts`.
- Use `createWorldEntityPlacementService(...)` for isolated hosts/tests or `worldEntityPlacement` singleton for shared editor/runtime usage.
- Placement workflows support world bounds validation and optional grid snap via `setWorldBounds(...)` and `setGridOptions(...)`.
- Lightweight gizmo-equivalent operations are available via `selectEntity(...)`, `moveSelected(...)`, and `duplicateSelected(...)`.
- Placement save/load workflows are available through deterministic JSON helpers `exportPayload(...)` and `importPayload(...)`.
- Service emits lifecycle signals:
    - `world:placement:changed`
    - `world:placement:selected`
    - `world:placement:invalid`
    - `world:placement:imported`

Recent implementation note (prefab contract test harness):

- Shared prefab contract harness utility is available in `src/tests/contracts/prefabContractHarness.tsx`.
- Use `runPrefabContractSuite(...)` to keep prefab behavior checks consistent across render/lifecycle/input contracts.
- The contract runner supports required render assertions plus optional lifecycle and input contract hooks for incremental prefab adoption.
- Reference contract usage is available in `src/tests/prefabContractHarness.test.tsx` (currently covering `Toggle` and `HUDSlot`).

Recent implementation note (content validation CLI):

- Shared authored-content validation service is available in `src/services/contentValidation.ts` for `dialogue`, `quest`, `loot`, and `placement` domains.
- Version checks are migration-aware through `createVersionedSchemaMigration(...)` so CLI behavior follows schema evolution contracts.
- Domain validation reuses runtime registration/import validators (`createQuestMissionService(...)`, `createLootEconomyService(...)`, `createWorldEntityPlacementService(...)`) to keep runtime and tooling checks consistent.
- CLI command is available via `npm run content:validate` (optional `--domain` + explicit file paths) and reports actionable JSON-path error lines.

Recent implementation note (CI quality gates for content):

- Dedicated content quality gate scripts are available in `package.json`:
    - `npm run content:validate:gates`
    - `npm run test:content:gates`
    - `npm run quality:content`
- Gate scripts validate authored domains (`dialogue`, `quest`, `placement`) and run focused schema/content/prefab contract regression tests.
- CI workflow `.github/workflows/ci.yml` includes `content-quality-gates` job so pull requests fail on content schema/migration/contract regressions.

Recent implementation note (balancing simulator tooling):

- Deterministic balancing simulation service is available in `src/services/balancingSimulator.ts`.
- Use `createBalancingSimulatorService(...)` for isolated tuning hosts/tests or `balancingSimulator` singleton for shared workflows.
- Preset payload parser supports authored `version: 1` config shape with combat/economy scenario arrays.
- Batch report APIs include `runCombatScenario(...)`, `runEconomyScenario(...)`, and `runBatch(...)` for aggregate tuning summaries.
- CLI runner command is available in `scripts/balancingSimulate.ts` via `npm run balance:simulate` (supports `--seed`, `--json`, and explicit file paths).

Recent implementation note (release pipeline + versioning):

- Release automation workflow is available in `.github/workflows/release.yml` with semantic tag trigger (`v*.*.*`) and manual dispatch (`release_tag`, `promote_to`).
- Changelog generation is available in `scripts/releaseChangelog.ts` via `npm run release:changelog` and produces `release-notes.md` plus `CHANGELOG.md` section output.
- Artifact integrity verification is available in `scripts/releaseVerifyArtifacts.ts` via `npm run release:verify:artifacts` and writes `dist/SHA256SUMS.txt` + `dist/release-manifest.json`.
- Promotion gates run through staged environments (`release-staging`, `release-production`) before publishing GitHub releases.
- Rollback strategy uses manual workflow dispatch to re-promote a previously known-good tag through the same staged release gates.

Recent implementation note (asset pipeline tooling):

- Shared asset validation service is available in `src/services/assetValidation.ts`.
- Validation covers:
    - sprite/audio import and URL reference resolution (`@/assets/...` and `/...` public paths)
    - missing-asset detection
    - atlas/pack workflow checks (including missing atlas manifest detection when atlas refs exist)
    - asset byte budgets (total + sprite + audio + atlas)
- CLI command is available in `scripts/assetValidate.ts` via `npm run asset:validate`.
- Budget overrides are supported through `--max-total-bytes`, `--max-sprite-bytes`, `--max-audio-bytes`, and `--max-atlas-bytes`.

Recent implementation note (economy/content balancing governance):

- Shared balancing governance service is available in `src/services/balancingGovernance.ts`.
- Governance checks cover:
    - tuning ownership mapping for `combat` and `economy`
    - benchmark scenario metric threshold validation (min/max)
    - major-update signoff enforcement based on affected domains
- CLI command is available in `scripts/balanceGovernance.ts` via `npm run balance:governance`.
- Governance quality gate is available via `npm run quality:balance` and is included in release verification.

Recent implementation note (encounter/content authoring presets):

- Shared encounter preset authoring service is available in `src/services/encounterPresets.ts`.
- Use `createEncounterPresetService(...)` for isolated authoring hosts/tests or `encounterPresets` singleton for shared runtime/tooling usage.
- Authoring APIs support reusable composition for:
    - spawn packs (`registerSpawnPack(...)`)
    - objective bundles (`registerObjectiveBundle(...)`)
    - reward bundles (`registerRewardBundle(...)`)
    - encounter templates (`registerTemplate(...)`) with strict reference validation.
- Team preset file sharing is supported through deterministic JSON helpers `exportPayload(...)` and `importPayload(...)`.

Recent implementation note (localization/text key pipeline):

- Shared localization service is available in `src/services/localization.ts`.
- Use `createLocalizationService(...)` for isolated hosts/tests or `localizationService` singleton for shared runtime localization.
- Locale catalog APIs support fallback behavior through:
    - `registerCatalog(...)` / `unregisterCatalog(...)`
    - `setLocale(...)` / `getLocale()`
    - `setFallbackLocale(...)` / `getFallbackLocale()`
    - `translate(...)`
- Prompt localization helper `resolveLocalizedPromptMessage(...)` supports key payload routing for `dialogue`, `textbox`, and `toast` channels.
- Tutorial prompt flow can localize emitted prompt copy through `createTutorialOnboardingService({ localizePrompt })` resolver hooks.

Recent implementation note (accessibility runtime settings):

- Persisted accessibility settings service is available in `src/services/accessibilitySettings.ts`.
- Supported settings include text scale, hold/toggle control mode, reduced flash/shake toggles, and subtitle speed.
- Minimal prefab hook `useAccessibilitySettings(...)` is available in `src/components/screenController/useAccessibilitySettings.ts` for UI composition.

Recent implementation note (error telemetry + dev diagnostics):

- Runtime telemetry service is available in `src/services/errorTelemetry.ts`.
- Use `createErrorTelemetry(...)` for isolated service instances or `errorTelemetry` singleton for shared app diagnostics.
- Captured telemetry events include structured context payloads for triage (`severity`, `subsystem`, `statePhase`, `entityRefs`, optional `metadata`/`source`).
- Service emits lifecycle signals for integration hooks:
    - `error:telemetry:captured`
    - `error:telemetry:cleared`
- Dev log/overlay hooks are available through `subscribe(...)`, `createLogHook(...)`, and filtered snapshots via `getSnapshot(...)`.

Recent implementation note (performance budgets + alerts):

- Runtime performance budget service is available in `src/services/performanceBudgets.ts`.
- Use `createPerformanceBudgetService(...)` for isolated instances or `performanceBudgets` singleton for shared runtime budget checks.
- Budget thresholds support frame/entity/effect limits plus per-subsystem timing constraints.
- Service emits lifecycle signals for diagnostics integrations:
    - `performance:budget:evaluated`
    - `performance:budget:alert`
- Includes quick triage hooks via `subscribe(...)`, `createAlertLogHook(...)`, `getRecentReports(...)`, and `getSubsystemSummary(...)`.

Recent implementation note (crash-safe recovery flow):

- Startup recovery service is available in `src/services/save/recovery.ts`.
- Use `createSaveRecoveryService(...)` for startup checks and action flow integration, or `saveRecovery` singleton for shared usage.
- Startup checks (`inspectStartup()`) classify persisted state as `clean`, `recoverable`, `corrupted`, or `storage-unavailable` with structured diagnostics payloads.
- Recovery actions include `restorePersisted()` (attempt state apply) and `resetPersisted()` (clear persisted quick-save) for safe fallback UX.
- Service emits lifecycle diagnostics signals:
    - `save:recovery:startup-checked`
    - `save:recovery:restore-applied`
    - `save:recovery:reset-applied`
    - `save:recovery:failed`

Recent implementation note (profiling snapshot tooling):

- Profiling snapshots service is available in `src/services/profilingSnapshots.ts`.
- Use `createProfilingSnapshotService(...)` for isolated tool/test harness usage or `profilingSnapshots` singleton for shared diagnostics.
- Snapshot capture supports one-click metric capture (`frameMs`, `entityCount`, `activeEffects`, optional per-subsystem timings).
- Snapshot diffing is available via `compareSnapshots(...)` and `compareLatestToPrevious(...)` with threshold-based regression detection.
- Service emits lifecycle signals for tooling integrations:
    - `profiling:snapshot:captured`
    - `profiling:snapshot:compared`

Recent implementation note (mod/plugin sandbox + capability permissions):

- Plugin sandbox service is available in `src/services/pluginSandbox.ts`.
- Use `createPluginSandbox(...)` for isolated hosts or `pluginSandbox` singleton for shared runtime usage.
- Plugin manifests define explicit capability grants across render hooks, data access (read/write), and signal scopes (emit/subscribe).
- Runtime plugin access is mediated via `createRuntime(pluginId)` to enforce capability checks for all plugin actions.
- Writes to protected runtime domains are denied regardless of broad plugin write grants (default protected prefixes: `engine.`, `runtime.`, `services.`, `save.`, `state.`).
- Service emits lifecycle diagnostics signals:
    - `plugin:sandbox:action`
    - `plugin:sandbox:denied`

Recent implementation note (save slot manager + rollback snapshots):

- Save slot manager service is available in `src/services/save/slots.ts`.
- Use `createSaveSlotService(...)` for isolated hosts or `saveSlots` singleton for shared runtime usage.
- Slot metadata now tracks `slot`, `timestamp`, `playtime`, and `version` for multi-slot profile flows.
- Rollback snapshot flow is available through `listRollbackSnapshots(...)` and `restoreRollbackSnapshot(...)` to recover pre-overwrite slot state quickly.
- Service emits slot lifecycle diagnostics signals:
    - `save:slot:saved`
    - `save:slot:loaded`
    - `save:slot:deleted`
    - `save:slot:rollback:created`
    - `save:slot:rollback:restored`
    - `save:slot:failed`

Recent implementation note (memory lifecycle management):

- Memory lifecycle service is available in `src/services/memoryLifecycle.ts`.
- Use `createMemoryLifecycleService(...)` for isolated hosts or `memoryLifecycle` singleton for shared runtime usage.
- Explicit lifecycle contracts are available for allocation/disposal flows (`allocate`, `touch`, `dispose`, `disposeByType`) across textures, audio buffers, emitters, runtime caches, and custom resources.
- Leak diagnostics are available for long-session playtests via `scanForLeaks(...)` and `getLeakDiagnostics(...)`, with aggregate counters from `getSnapshot()`.
- Service emits lifecycle diagnostics signals:
    - `memory:lifecycle:allocated`
    - `memory:lifecycle:disposed`
    - `memory:lifecycle:leak-detected`
    - `memory:lifecycle:leak-scan-completed`

Recent implementation note (save/content import security hardening):

- Save import hardening is implemented in `src/services/save/file.ts`.
- `importSaveFile(file, options?)` supports configurable import guardrails (`maxBytes`, `maxJsonNodes`, `maxJsonDepth`).
- Oversized payloads are rejected early (`payload-too-large`) before runtime apply.
- Unsafe or potentially malicious payload shapes are rejected (`unsafe-payload`) before migration/rehydration.
- Schema-first apply remains enforced through `migrateSaveGame(...)` + `rehydrateGameState(...)`.

Recent implementation note (observability baseline):

- Observability baseline service is available in `src/services/observabilityBaseline.ts`.
- Use `createObservabilityBaselineService(...)` for isolated hosts or `observabilityBaseline` singleton for shared runtime diagnostics.
- Structured baseline event schema supports crash, performance regression, and content-validation failure categories.
- Baseline reporting is available via `getSnapshot(...)` and `getBaselineReport(...)` for triage/trend workflows.
- Service emits baseline diagnostics lifecycle signals:
    - `observability:baseline:event-recorded`
    - `observability:baseline:report`

Recent implementation note (quest/mission system):

- Quest mission service is available in `src/services/questMissions.ts`.
- Use `createQuestMissionService(...)` for isolated flows/tests or `questMissions` singleton for shared runtime integration.
- Objective graphs support deterministic transition states (`pending`, `active`, `completed`, `failed`) with progression controlled through `activateMission(...)`, `setObjectiveProgress(...)`, and `completeObjective(...)`.
- Reward hooks can be bound through `rewardHandlers` or `setRewardHandler(...)` for objective/mission completion rewards.
- Service emits mission lifecycle diagnostics signals:
    - `quest:mission:progress`
    - `quest:mission:completed`
    - `quest:mission:failed`

Recent implementation note (combat core module):

- Combat core service is available in `src/services/combatCore.ts`.
- Use `createCombatCoreService(...)` for isolated workflows/tests or `combatCore` singleton for shared runtime integration.
- Hit/hurt resolution supports deterministic typed damage (`physical`, `magic`, `true`) with optional per-target resistance profiles.
- Invulnerability windows and knockback payload handling are integrated through `applyHit(...)` result flow.
- Service emits combat lifecycle diagnostics signals:
    - `combat:hit:applied`
    - `combat:hit:blocked`
    - `combat:entity:defeated`

Recent implementation note (entity state machine system):

- Entity behavior profile machine utilities are available in `src/logic/entity/entityStateMachine.ts`.
- Use `createEntityBehaviorStateMachine(archetype, hooks?)` for deterministic per-archetype behavior transitions.
- Transition priorities include interrupt-safe behavior (for example, `damaged` can preempt `moving`/`attacking`).
- Shared taxonomy profiles are available for:
    - `player` (`dodge`, `block`)
    - `npc` (`patrol`, `flee`)
    - `boss` (`phase-1`, `phase-2`)
- Behavior and animation stay aligned from one active state source using `getState()` plus `getAnimationClip()` / `resolveEntityAnimationClip(...)`.
- `onEnter` / `onExit` hooks are supported through animation-state-machine hook wiring for gameplay side effects.

Recent implementation note (equipment + stats aggregation):

- Equipment stats aggregation service is available in `src/services/equipmentStats.ts`.
- Use `createEquipmentStatsService(...)` for isolated hosts/tests or `equipmentStats` singleton for shared runtime integration.
- Stat resolution pipeline supports deterministic `base + gear + effects` composition with typed modifiers (`flat` + `percent`).
- Derived projection APIs expose integration-ready outputs for:
    - combat (`damageReduction` plus combat-facing totals)
    - movement (`maxSpeedScale`)
    - HUD snapshots (`getEntitySnapshot(...)`, `listEntitySnapshots(...)`)
- Service emits lifecycle diagnostics signals:
    - `stats:equipment:changed`
    - `stats:equipment:equipped`
    - `stats:equipment:effect-applied`

Recent implementation note (map + mini-map system):

- Shared map/minimap state service is available in `src/services/mapMiniMap.ts`.
- Use `createMapMiniMapService(...)` for isolated hosts/tests or `mapMiniMap` singleton for shared runtime integration.
- Service tracks one source-of-truth model for world map discovery/fog, player position, and per-channel map/minimap view state.
- Marker layer policies support objective/NPC/checkpoint workflows plus `poi`/`custom` routing with channel-specific visibility controls.
- Zoom/scale policy controls are available per channel (`setZoomPolicy(...)`, `setZoom(...)`) and minimap marker filtering applies deterministic player-relative radius behavior.
- Service emits lifecycle diagnostics signals:
    - `map:discovery:updated`
    - `map:player:updated`
    - `map:view:changed`

Recent implementation note (global world pause foundation):

- Runtime-level world pause API is available through `dataBus.pauseWorld(reason)` / `dataBus.resumeWorld(reason)`.
- `dataBus.stepPhysics(...)` now no-ops while paused, and player gameplay input is gated.
- Default app dev shortcut:
    - `Alt + Shift + P` — toggle world pause (`dev-toggle` reason)
    - `Alt + Shift + D` — toggle interact mode (`attack` / `dodge`)
    - `Alt + Shift + A` — trigger player `attacking` state
    - `Alt + Shift + Z` — trigger player `dodge` state
    - `Alt + Shift + X` — trigger player `block` state
    - `Alt + Shift + C` — trigger player `damaged` state
    - `Alt + Shift + V` — trigger player `stunned` state
    - `Alt + Shift + G` — trigger boss `phase-1` on selected enemy
    - `Alt + Shift + H` — trigger boss `phase-2` on selected enemy
    - `Alt + Shift + J` — cycle selected boss target enemy
    - `Alt + Shift + K` — cycle selected boss target enemy (reverse)

Recent implementation note (entity behavior + animation foundation):

- Added shared behavior/animation state resolution in runtime path for player entities.
- `dataBus.getEntityBehaviorState(entityId)` exposes the active behavior state.
- `dataBus.markPlayerDamaged(durationMs?)` applies a timed `damaged` interrupt state.
- `dataBus.markPlayerAttacking(durationMs?)` and `dataBus.markPlayerStunned(durationMs?)` are available for timed action/control states.
- `dataBus.markPlayerDodging(durationMs?)` and `dataBus.markPlayerBlocking(durationMs?)` expose timed player taxonomy hooks.
- `dataBus.setEntityBossPhase(entityId, phase)` sets boss taxonomy states (`phase-1` / `phase-2`) and syncs animation.
- Default `interact` action mapping now triggers `markPlayerAttacking()` in the player input action flow.
- `createPlayerInputActions({ interactBehavior: "dodge" })` remaps `interact` to `markPlayerDodging()` for quick manual taxonomy testing.
- Default app dev controls now expose an interact-mode toggle that forwards `interactBehavior` into `SideScrollerControls` / `TopDownControls` action wiring.
- Default app dev controls include manual boss phase triggers wired through `dataBus.setEntityBossPhase(...)` against a selectable enemy target.
- Cycling boss target emits a dev status `(wrapped)` hint when it rolls from last target back to first.
- Reverse cycling boss target also emits `(wrapped)` when it rolls from first target back to last.
- Boss target cycle statuses use compact direction badges (`Boss tgt [next]` / `Boss tgt [prev]`).
- Boss phase trigger status uses compact labels (`Boss <id> -> p1|p2`).
- Default app dev controls include quick manual triggers for `markPlayerAttacking()`.
- Default app dev controls include quick manual triggers for `markPlayerDodging()` and `markPlayerBlocking()`.
- Default app dev controls include quick manual triggers for `markPlayerDamaged()` and `markPlayerStunned()`.
- `currentAnimation` is synchronized to the resolved behavior state for this foundation slice.
- App dev canvas meta now displays live `Player State` for quick transition debugging.
- App dev canvas meta also displays live `Interact Mode` (`attack` / `dodge`) from the dev toggle state.
- App dev canvas meta also displays live `Boss Target` selection (`id`, `index/total`, active phase).
- `dataBus.getEntityBehaviorTransitions(entityId, limit?)` exposes a recent transition trail for debugging.
- App dev canvas meta includes `Player Trail` (last 3 transitions).

Recent implementation note (NPC archetype profile baseline):

- `dataBus.setNpcArchetypeProfile(entityId, profile)` configures enemy archetype behavior.
- Baseline NPC profile supports `idle` and `patrol` modes with automatic `flee` override when near player.
- `dataBus.getNpcArchetypeProfile(...)` and clear-profile helpers are available for tooling/tests.
- App dev canvas meta now includes `NPC States` count, and a dev status line renders `NPC Behaviors` with truncated IDs plus last-2 transition trail context (timestamps rounded to nearest `10ms`, compact `·` trail separator, full values preserved in tooltip).

Recent implementation note (timer signal helper baseline):

- `createTimerSignals()` is available in `src/services/timerSignals.ts` for typed `once`, `interval`, and `cooldown` timers.
- Timers emit through signal bus-compatible payloads (`TimerSignalPayload`) with phase/state metadata (`started`, `tick`, `ready`, `blocked`, `cancelled`).
- All timer handles expose pause/resume/cancel semantics for deterministic overlay/menu flows.
- Shared helper controls include `cancelAll()` and `activeCount()` for test-safe teardown and orchestration checks.

Recent implementation note (sprite animation atlas + clip helper baseline):

- `createSpriteAnimationClips(...)` is available in `src/logic/entity/spriteAnimationAtlas.ts`.
- Clip definitions support explicit `frames` arrays or `range` metadata (`from` -> `to`) with atlas-bounds validation.
- Loop/fps policy is typed per clip with defaults (`loop`, `once`, `ping-pong`).
- `sampleSpriteClipFrame(...)` provides deterministic frame selection for custom clip loops.
- `clipsToSpriteAnimations(...)` bridges authored clip metadata into the existing entity `animations` runtime shape.

Recent implementation note (animation state machine utility baseline):

- `createAnimationStateMachine(...)` is available in `src/logic/entity/animationStateMachine.ts` as the shared low-level FSM primitive.
- Transition graphs support guarded callbacks with signal-triggered (`send`) and time-triggered (`update`) flow.
- Lifecycle hooks (`onEnter`, `onExit`) are available for gameplay side effects and deterministic assertions.
- `createBasicEntityAnimationProfileStateMachine()` in `src/logic/entity/entityStateMachine.ts` provides a baseline `idle/run/jump/attack` profile integration pattern.

Recent implementation note (canvas pseudo-shader effects baseline):

- Sprite post-process helpers are available in `src/components/effects/spritePseudoShader/spritePseudoShader.ts`.
- Supported effect kinds: `tint`, `flash`, `outline`, `desaturate`.
- `Render`/`SpriteBatch` now supports optional per-entity `spriteEffects` config in normal Canvas2D draw flow.
- Helpers are exported from `@/components/effects` for runtime/plugin-level composition.

Recent implementation note (screen-wide canvas effects baseline):

- Stackable screen passes are available via `createScreenPseudoShaderCanvasPass(...)`.
- Supported screen variants: `tint`, `monochrome`, `scanline`, `wavy`, `vhs`.
- Runtime registration is signal-driven (`setScreenPseudoShaderEffects`, `pushScreenPseudoShaderEffect`, `removeScreenPseudoShaderEffect`, `clearScreenPseudoShaderEffects`).
- Deterministic presets for mode/cutscene styling are available (`cutscene-warm`, `cutscene-cold`, `flashback-mono`, `vhs-noir`).

Recent implementation note (global world pause controller completion):

- `pauseWorld(reason)` / `resumeWorld(reason)` support scoped pause reason ordering.
- Gameplay simulation/input remains gated while world pause is active.
- Pause lifecycle callbacks are available via `onPause(handler)` and `onResume(handler)`.
- Callback emission is edge-triggered (pause-enter and pause-exit) with deterministic test coverage.

Recent implementation note (NPC behavior module completion):

- NPC archetype profiles now support `idle`, `idle-roam`, waypoint `patrol`, and `chase`, with near-player `flee` override.
- Archetype updates run in simulation-only path (`DataBus.stepPhysics`) and remain decoupled from rendering concerns.
- Baseline coverage includes deterministic tests for roaming motion, waypoint path progression, chase distance gating, and flee interruption.

Recent implementation note (growth/tick simulation module completion):

- `createGrowthTickSimulation(...)` is available in `src/logic/simulation/growthTick.ts`.
- Growth flow supports configurable stage progression (`seed -> sprout -> mature`) with deterministic seed-influenced timing.
- Module exposes `pause()` / `resume()` and transition events via `GROWTH_STAGE_TRANSITION_SIGNAL`.
- Focused deterministic tests cover stage progression, pause/resume behavior, and seed timing determinism.

Recent implementation note (environmental forces module completion):

- Composable zone utility is available in `src/logic/simulation/environmentalForces.ts`.
- Force zones support bounded directional velocity modifiers (`forcePxPerSec`) for wind/current style flows.
- Optional `dragScaleByType` enables per-entity-type horizontal resistance scaling.
- `DataBus.stepPhysics(...)` now applies active force zones during simulation updates; focused deterministic tests cover utility and integration behavior.

Recent implementation note (status effect modifiers module completion):

- Typed status-effects simulation utility is available in `src/logic/simulation/statusEffects.ts`.
- Effects supported: `slow`, `haste`, `burn`, `regen` with configurable duration, stack policies, and tick policies.
- `DataBus` integrates status effects through `applyEntitySlow/Haste/Burn/Regen`, per-step status ticking, and movement speed scaling.
- Tick and expiry lifecycle events are emitted via `STATUS_EFFECT_TICK_SIGNAL` and `STATUS_EFFECT_EXPIRED_SIGNAL` with deterministic test coverage.

Recent implementation note (input systems expansion completion):

- Input profile helpers are available in `src/components/screenController/inputProfiles.ts`.
- Preset-based composition supports keyboard/gamepad/pointer wiring through `createInputProfileBindings(...)` and `useInputProfileBindings(...)`.
- Profile persistence APIs (`saveInputProfilePreset`, `loadInputProfilePreset`, `clearInputProfilePreset`) provide local preference retention.
- Baseline presets include `default`, `left-handed`, and `gamepad-first`, with focused deterministic tests in `src/tests/inputProfiles.test.ts`.

Recent implementation note (level/world generation expansion completion):

- Biome/path composition helpers are available in `src/logic/worldgen/biomePathComposition.ts`.
- Composition includes deterministic biome maps, path carving, and palette-rule sprite tile outputs.
- `createWorldgenScenario(...)` now supports optional composition overlays and start/objective path linking.
- Preset scene builders are available in `src/logic/worldgen/presets.ts` for fast generated runs (`compact-run`, `cavern-run`, `gauntlet-run`).
- Focused deterministic coverage added for composition, presets, and scenario integration.

Recent implementation note (next prefab wave completion):

- Added two reusable HUD prefabs in `src/components/hudAnchor`: `SurvivalHUDPreset` and `BossEncounterHUDPreset`.
- Both prefabs keep minimal props APIs and support standard slot overrides via `createHudPresetSlots(...)`.
- Added matching examples in `src/components/examples` for quick integration (`SurvivalHUDPresetExample`, `BossEncounterHUDPresetExample`).
- Focused prefab and example tests validate rendering, interaction callbacks, and cooldown behavior.

Recent implementation note (game state flow controller completion):

- Added canonical runtime flow service in `src/services/gameStateFlow.ts`.
- Supported states: `boot`, `menu`, `play`, `pause`, `cutscene`, `gameover`.
- Guarded transitions now emit `blocked` events when invalid hops are attempted.
- Transition lifecycle hooks are available via `subscribe(...)`, `onEnter(...)`, and `onExit(...)`.
- Focused deterministic coverage added in `src/tests/gameStateFlow.test.ts`.

Current high-priority behavior rule:

- Entity behavior and animation should be state-based and share one active state source.
- Treat archetype taxonomies as first-class (`player`, `npc`, `boss`) and keep naming/transition semantics consistent.
- Default taxonomy baseline:
    - `player`: `dodge`, `block`
    - `npc`: `patrol`, `flee`
    - `boss`: `phase-1`, `phase-2`
- Avoid ad-hoc animation branching outside the state machine path.

## Recommended mapping defaults

- Keyboard: `useActionKeyBindings(actions)`
- Pointer/tap: `usePointerTapTracking({ getTarget, onTap })`
- Gamepad: `useGamepadInput(actions, { deadzone, mapping })`

Keep gameplay logic in action handlers; keep device bindings declarative.

## “Done” definition for AI-driven changes

A change is done only when all of the following are true:

- Code compiles and lint passes.
- Focused tests for changed behavior pass.
- Any new public behavior has a usage snippet.
- Scope stayed within requested MVP.

## Bad prompt vs good prompt examples

Use these examples to keep AI requests specific, testable, and aligned with UrsaManus boundaries.

### Example A: Input feature request

Bad:

```txt
Add gamepad support.
```

Good:

```txt
Add gamepad input support using existing action semantics (north/south/east/west/interact).

Requirements:
- Use an init-configurable mapping API (axis/button/deadzone).
- Reuse existing screenController helpers before creating new primitives.
- Add focused tests for deadzone and remapping behavior.
- Update docs/USAGE.md and docs/input/CHEATSHEET.md with a copy/paste snippet.

Non-goals:
- Do not refactor unrelated input components.
```

### Example B: UI prefab request

Bad:

```txt
Make a cool HUD component.
```

Good:

```txt
Create a minimal HUD prefab named ResourceBar using existing primitives where possible.

Requirements:
- Keep props API minimal and typed.
- Add one example component under src/components/examples/.
- Add focused tests for prefab behavior and example rendering.
- Add docs/USAGE.md usage snippet.

Non-goals:
- No extra theme system or animation work.
```

### Example C: Project bootstrap request

Bad:

```txt
Set up my game from this repo.
```

Good:

```txt
Bootstrap a top-down MVP from this UrsaManus repo.

Project profile:
- Browser-only web game
- Keyboard + pointer now, gamepad later
- Quick save/load only for MVP

Requirements:
- Use TopDownCanvas + TopDownControls as baseline.
- Keep gameplay logic action-based.
- Add/update only files needed for MVP setup.
- Run lint and focused tests for changed behavior.
- Summarize exact files changed and optional next steps.

Non-goals:
- Do not add multiplayer, procedural worldgen, or extra menus.
```
