# UrsaManus TODO (Current Next)

This file tracks the immediate next systems planned for UrsaManus.

## Next Features

### P1 — Core runtime utilities

### P2 — Simulation modules (small + composable)

### P3 — Integration + tooling

### Priority Expansion Backlog (2026-02-28)

#### P1 additions (high impact)

- Interaction system core.
    - Add unified interaction contract for world objects/NPCs (`canInteract`, `interact`, `blockedReason`).
    - Support distance/raycast gating and input hints for keyboard/controller/pointer.

#### P1 quick wins (stability + iteration)

- Deterministic replay system.
    - Add input/event capture with seed snapshots so gameplay bugs can be replayed exactly.
    - Support export/import replay payloads for regression reproduction.

- Schema migration framework.
    - Add versioned migration pipeline for save files and authored JSON assets (dialogue/quests/placements).
    - Provide preflight validation + fallback behavior for unsupported versions.
    - Keep this as the core migration/compat layer used by runtime loaders and tooling.

- Content hot-reload pipeline (dev).
    - Add development watcher/reload flow for authored JSON content without full app restart.
    - Trigger targeted runtime refresh events for dialogue/quest/map/editor data domains.

- Unified marker/POI registry.
    - Add shared marker source for map/minimap/objective tracker/interaction prompt systems.
    - Support typed marker categories, visibility rules, and priority stacking.
    - Avoid duplicate marker stores by making this the single marker authority.

- Accessibility runtime settings.
    - Add text scale, hold-vs-toggle controls, reduced flash/shake, and subtitle speed options.
    - Persist settings and expose a minimal settings UI prefab hook.

- Error telemetry + dev diagnostics.
    - Add structured runtime error events with context payloads (state phase, subsystem, entity refs).
    - Provide dev overlay/log hooks for quick triage.

- Performance budgets + alerts.
    - Add frame-time/entity/effects budget thresholds with development warnings.
    - Include simple per-subsystem timing summaries for hotspot detection.

- Prefab contract test harness.
    - Add reusable test helpers for prefab lifecycle/input/render assertions.
    - Use shared contract suites to keep new prefab additions consistent.

- Mod/plugin sandbox + capability permissions.
    - Add extension runtime sandbox boundaries with explicit capability grants (render hooks, data access, signal scope).
    - Prevent untrusted plugins from mutating restricted engine domains directly.

- Save slot manager + rollback snapshots.
    - Add multi-slot save profiles with metadata (`slot`, `timestamp`, `playtime`, `version`).
    - Support rollback snapshot restore flow for quick recovery after bad state transitions.

- Memory lifecycle management.
    - Add explicit allocate/dispose contracts for textures, audio buffers, emitters, and runtime caches.
    - Add leak-detection diagnostics for long-session playtests.

- Save/content import security hardening.
    - Enforce strict payload size limits, safe parsing paths, and schema-first validation for imported files.
    - Add guards against malformed/malicious content payloads before runtime apply.

- Observability baseline.
    - Define structured telemetry schema for crashes, perf regressions, and content-validation failures.
    - Expose baseline dashboards/report outputs for triage and trend tracking.

#### P2 additions (gameplay loop)

- Quest/mission system.
    - Add objective graph support with state transitions (`pending`, `active`, `completed`, `failed`) and reward hooks.
    - Emit progress/completion signals for HUD tracker + toast integrations.

- Combat core module.
    - Add hit/hurt handling (damage events, invulnerability windows, knockback, damage typing).
    - Keep combat resolution deterministic and decoupled from render concerns.

- Entity state machine system (behavior + animation).
    - Add per-entity state profiles (`idle`, `moving`, `attacking`, `damaged`, `stunned`, `dead`) with guarded transitions.
    - Bind behavior decisions and animation clip selection to the same active state source-of-truth.
    - Support transition priorities/interrupt rules (e.g., `damaged` can interrupt `moving`/`attacking`).
    - Expose `onEnter`/`onExit` hooks for gameplay side effects and deterministic transition tests.
    - Define state taxonomy profiles for `player`, `npc`, and `boss` archetypes to keep shared semantics consistent.
    - Baseline taxonomy example: `player` (`dodge`, `block`), `npc` (`patrol`, `flee`), `boss` (`phase-1`, `phase-2`).

- Equipment + stats aggregation.
    - Add stat resolution pipeline (`base + gear + buffs/debuffs`) with typed modifiers.
    - Expose derived stats to combat/movement modules and HUD.

- Map + mini-map system.
    - Add world map data model (discovery/fog state, markers, points of interest, player position).
    - Add full-screen map view and HUD mini-map renderer with shared source-of-truth map data.
    - Support configurable marker layers (objectives, NPCs, checkpoints) and zoom/scale policies.
    - Integrate with worldgen/level data so authored + generated maps resolve consistently.

- Camera system v2.
    - Add dead-zone, look-ahead, room bounds, and shake layering for gameplay camera behavior.
    - Support scripted camera tracks for cutscene/cinematic steps.

- Pathfinding/navigation grid.
    - Add reusable pathfinding layer (A\*/flow-field friendly) for NPC patrol/chase/navigation queries.
    - Integrate with collision/world data and expose deterministic query APIs.

- Ability + cooldown effects system.
    - Add typed active/passive ability definitions with cast conditions, cost hooks, and shared cooldown groups.
    - Emit ability lifecycle signals for HUD/action button integration.

- Loot/progression economy system.
    - Add drop tiers/weights, affix hooks, and economy tables for progression balancing.
    - Support reusable reward bundles for quests/encounters/vendors.

- World streaming/chunk loader.
    - Add chunk/region load-unload lifecycle for large maps to reduce memory and update overhead.
    - Keep entity activation deterministic when crossing region boundaries.

- Tutorial/onboarding state machine.
    - Add step-driven onboarding flow with gating conditions, prompt hooks, and completion persistence.
    - Support skip/resume behavior and integration with dialogue/textbox systems.

- Multiplayer readiness boundary.
    - Define deterministic simulation boundaries and state-authority contracts, even for single-player-first architecture.
    - Identify APIs that must remain replication-safe for future networked expansion.

#### P3 additions (authoring + tooling)

- Visual world/entity placement tool (level authoring UI).
    - Add editor-mode UI to place, move, and delete entities directly on the canvas with snap/grid options.
    - Support save/export of authored placements to JSON for level bootstrap usage.
    - Include lightweight gizmos (select, drag, duplicate) and validation for out-of-bounds placement.

- Content validation CLI (authored JSON).
    - Add schema validation command for dialogue, quests, loot tables, and level placement files before runtime.
    - Build on the schema/migration framework so CLI and runtime checks stay consistent.
    - Surface actionable error paths/messages for fast content iteration.

- Localization/text key pipeline.
    - Add key-based text lookup service with fallback locale behavior.
    - Support dialogue/textbox/toast integration using localized key payloads.

- Encounter/content authoring presets.
    - Add reusable encounter templates (spawn packs, objective bundles, reward bundles) for fast level iteration.
    - Support import/export of preset files for team reuse.

- CI quality gates for content.
    - Add CI checks that fail on schema/migration/contract regressions for authored content.
    - Include fast pre-merge validation for dialogue/quests/placements + prefab contracts.

- Crash-safe recovery flow.
    - Add startup guard for corrupted persisted state with restore/reset options.
    - Capture recovery diagnostics to aid bug triage.

- Profiling snapshot tooling.
    - Add one-click dev snapshots for frame timing, entity counts, and active effects.
    - Support snapshot diff comparisons to detect performance regressions.

- Balancing simulator tooling.
    - Add batch simulation runner for combat/economy scenarios from authored config presets.
    - Output summary metrics/reports to speed up tuning passes.

- Release pipeline + versioning.
    - Add semantic version/release workflow with changelog generation and build artifact verification.
    - Define rollback strategy and release promotion gates.

- Asset pipeline tooling.
    - Add sprite/audio import validation, atlas/pack workflow checks, and missing-asset detection.
    - Track asset size/compression budgets to prevent runtime bloat.

- Economy/content balancing governance.
    - Define tuning ownership workflow, benchmark scenarios, and acceptable balance metric thresholds.
    - Require balance-report signoff for major economy/combat table updates.

- Accessibility QA matrix.
    - Add repeatable QA checklist for keyboard-only navigation, readability/contrast, reduced motion, and assist timing options.
    - Integrate matrix checks into release readiness validation.

### Prefab Backlog (Plug-and-Play)

#### P2 candidates

- TextBox prefab.
    - Add spawnable canvas text box renderer with coordinate-based placement (`x`, `y`, width, max lines).
    - Support static text and animated typewriter reveal (character-by-character) with speed controls.
    - Include configurable text style, border, background, padding, alignment, and optional portrait/icon slot.
    - Add lifecycle hooks for open/update/close and optional auto-close timers.
    - Support queueing/stack policy so multiple text boxes can be sequenced deterministically.

- Toasts prefab (UI layer).
    - Add lightweight toast queue drawn on the screen UI layer (non-world space).
    - Support timed auto-dismiss, manual dismiss hook, and stacked positioning.
    - Include configurable variants for basic feedback states (info/success/warn/error).

- Cutscene sequence system.
    - Add timeline/step runner for cutscenes (text box, wait, signal, camera/pan hook, transition hook).
    - Support optional `awaitInput` per step so progression can be manual (`continue` key/button) or automatic.
    - Allow skip policy options (`disabled`, `hold-to-skip`, `instant`) and completion callbacks.
    - Integrate with `TextBox` + `Toasts` outputs without coupling to specific game mode logic.

- Dialogue system (JSON-driven for cutscenes).
    - Add parser/validator for JSON conversation payloads (example shape: `{ character, dialogues }`) with typed schema.
    - Extend schema with useful props: `id`, `speakerId`, `speakerName`, `portrait`, `emotion`, `voiceCue`, `awaitInput`, `speedMs`, `choices`, `next`, `tags`.
    - Support branching dialogue nodes and linear fallback when no branching is present.
    - Add conversion helpers from JSON -> cutscene steps so authored conversations can run through the cutscene system.

- Inventory core module + store.
    - Add typed slot/container/item schema (`stackable`, `maxStack`, `weight`, tags).
    - Support add/remove/split/merge/move operations with deterministic tests.

- Backpack UI prefab.
    - Add reusable grid container UI for inventory slots with compact + expanded variants.
    - Include keyboard/controller focus navigation and accessibility labels.

- Drag-and-drop inventory interactions.
    - Add pointer drag/drop for slot swaps, stack split, merge, and invalid-drop rollback.
    - Keep interaction logic modular so it works with inventory + hotbar + containers.

- Hotbar prefab.
    - Add 1–10 quick-slot bar with active index, cooldown/disabled visual hooks, and key bindings.
    - Support binding inventory items/actions to hotbar slots.

- Checkpoint/respawn prefab.
    - Add activate/checkpoint/save + respawn flow with optional transition/audio hooks.

- Wave spawner prefab.
    - Add spawn wave config (`count`, `cadence`, `maxActive`, tags) with simple difficulty scalar.

#### P3 candidates

- Loot/drop table prefab.
    - Add weighted drop table resolver + pickup radius integration hooks.

- Objective tracker prefab.
    - Add modular objective state machine (`pending`, `active`, `completed`, `failed`) with signals.

- Interaction prompt prefab.
    - Add proximity-driven prompt (`Press E`, etc.) with action gating and cooldown feedback.

- Dialogue/cutscene sequence prefab.
    - Add lightweight scripted step runner (text, wait, signal, transition, continue).

## Recently Completed

### 2026-02-28 (Latest)

- Dev-mode state sanitizer/reset completion:
    - expanded development sanitize utility scopes in `src/services/save/sanitize.ts` to support `save-only`, `input-profiles`, and `all`.
    - scoped `input-profiles` cleanup now targets only persisted keys prefixed by `ursa:input-profile`.
    - app-level sanitize actions are confirmation-gated and available via dev controls plus keyboard shortcuts (`Alt + Shift + Q`, `Alt + Shift + Y`, `Alt + Shift + R`).
    - focused coverage added in `src/tests/save.sanitize.test.ts` for scoped profile-only sanitize behavior.

- Game state flow controller completion:
    - added canonical runtime state flow service in `src/services/gameStateFlow.ts`.
    - supports guarded transitions across `boot`, `menu`, `play`, `pause`, `cutscene`, and `gameover`.
    - provides transition hooks via `subscribe(...)`, `onEnter(...)`, and `onExit(...)`.
    - blocked transition events are emitted for invalid state hops; focused coverage added in `src/tests/gameStateFlow.test.ts`.

- Next prefab wave completion:
    - added two HUD prefabs in `src/components/hudAnchor`: `SurvivalHUDPreset` and `BossEncounterHUDPreset`.
    - locked minimal props APIs for both prefabs and preserved slot override support through `createHudPresetSlots(...)`.
    - added example components in `src/components/examples`: `SurvivalHUDPresetExample` and `BossEncounterHUDPresetExample`.
    - added focused prefab/example tests in `src/tests/SurvivalHUDPreset.test.tsx`, `src/tests/BossEncounterHUDPreset.test.tsx`, `src/tests/SurvivalHUDPresetExample.test.tsx`, and `src/tests/BossEncounterHUDPresetExample.test.tsx`.

- Level/world generation expansion completion:
    - added biome/path composition helpers in `src/logic/worldgen/biomePathComposition.ts`.
    - composition now supports deterministic biome map generation, path carving, and sprite-tile palette rule output.
    - `createWorldgenScenario(...)` supports optional composition overlays and start-to-objective path linking.
    - added scene preset builders in `src/logic/worldgen/presets.ts` for fast generated run bootstraps (`compact-run`, `cavern-run`, `gauntlet-run`).
    - focused deterministic tests added in `src/tests/worldgenComposition.test.ts`, `src/tests/worldgenPresets.test.ts`, and `src/tests/worldgenScenario.test.ts`.

- Input systems expansion completion:
    - added input profile preset helpers in `src/components/screenController/inputProfiles.ts` for keyboard/gamepad/pointer composition.
    - supports optional profile persistence via `saveInputProfilePreset`, `loadInputProfilePreset`, and `clearInputProfilePreset`.
    - includes multi-device composition helper `createInputProfileBindings(...)` and hook wrapper `useInputProfileBindings(...)`.
    - focused deterministic tests added in `src/tests/inputProfiles.test.ts`.

- Status effect modifiers module completion:
    - added typed status-effects simulation utility in `src/logic/simulation/statusEffects.ts`.
    - supports `slow`, `haste`, `burn`, and `regen` with duration, stacking policy (`stack`/`refresh`/`replace`), and interval tick policies.
    - integrated with `DataBus` movement/physics flow via entity speed scaling and per-step status ticking.
    - emits deterministic status tick/expiry signals (`STATUS_EFFECT_TICK_SIGNAL`, `STATUS_EFFECT_EXPIRED_SIGNAL`) and includes focused coverage for stacking, refresh, and expiry rules.

- Environmental forces module completion:
    - added composable force-zone utility in `src/logic/simulation/environmentalForces.ts`.
    - supports area-based directional velocity modifiers and optional per-entity-type drag scaling.
    - integrated with `DataBus.stepPhysics(...)` so zones apply without render-engine rewrites.
    - deterministic coverage added in `src/tests/environmentalForces.test.ts` and `src/tests/DataBus.physics.test.ts`.

- Growth/tick simulation module completion:
    - added deterministic growth tick utility in `src/logic/simulation/growthTick.ts` with stage flow `seed -> sprout -> mature`.
    - supports configurable stage durations, deterministic seed-based timing jitter, and pause/resume controls.
    - emits growth stage transition events via `GROWTH_STAGE_TRANSITION_SIGNAL`.
    - focused tests added in `src/tests/growthTick.test.ts`.

- NPC behavior module completion:
    - expanded NPC archetype presets in `DataBus` to include `idle-roam`, waypoint `patrol`, `chase`, plus `flee` override.
    - behavior updates remain modular in simulation path (`stepPhysics`) with no render coupling.
    - focused deterministic behavior tests added for roaming, waypoint patrol, chase distance gating, and flee override.

- Global world pause controller completion:
    - runtime pause reason stack now supports scoped pause/resume ordering with `pauseWorld(reason)` and `resumeWorld(reason)`.
    - world simulation and player gameplay input remain gated while paused.
    - pause lifecycle hooks are available via `onPause(...)` and `onResume(...)` callbacks.
    - deterministic edge-trigger tests validate freeze behavior plus pause/resume hook emission ordering.

- Screen-wide canvas effects baseline:
    - added stackable screen pass controller in `src/components/effects/screenPseudoShader/createScreenPseudoShaderCanvasPass.ts`.
    - supported post-process variants: `tint`, `monochrome`, `scanline`, `wavy`, `vhs`.
    - effects are configurable via registration helpers/signals (`set`, `push`, `remove`, `clear`) and preset apply events.
    - deterministic preset set added for mode/cutscene styling (`cutscene-warm`, `cutscene-cold`, `flashback-mono`, `vhs-noir`).
    - focused tests added in `src/tests/screenPseudoShaderCanvasPass.test.ts`.

- Canvas pseudo-shader effects baseline:
    - added reusable sprite post-process passes (`tint`, `flash`, `outline`, `desaturate`) in `src/components/effects/spritePseudoShader/spritePseudoShader.ts`.
    - effects are runtime/plugin-friendly through exported helpers and optional per-entity `spriteEffects` configs in `Render`/`SpriteBatch` flow.
    - focused visual math + sequencing tests added in `src/tests/spritePseudoShader.test.ts`.

- Animation state machine utility baseline:
    - added low-level FSM primitive in `src/logic/entity/animationStateMachine.ts` with guarded transition graph support.
    - transitions support both signal-triggered and time-based flow via `send(...)` and `update(...)`, plus `onEnter` / `onExit` hooks.
    - added entity-profile integration helper `createBasicEntityAnimationProfileStateMachine()` in `src/logic/entity/entityStateMachine.ts`.
    - focused tests added in `src/tests/animationStateMachine.test.ts` and docs now include runtime integration snippets.

- Sprite animation atlas + clip helper baseline:
    - added `createSpriteAnimationClips(...)` in `src/logic/entity/spriteAnimationAtlas.ts` for typed clip definitions from explicit `frames` or `range` metadata.
    - clip options now support per-clip/default `fps` and loop modes (`loop`, `once`, `ping-pong`) with deterministic frame sampling via `sampleSpriteClipFrame(...)`.
    - validation guards enforce non-empty/unique clip names and in-bounds frame coordinates against atlas tile dimensions.
    - focused tests added in `src/tests/spriteAnimationAtlas.test.ts` and usage docs include raw-metadata copy/paste examples.

- Timer signal helper baseline:
    - added typed timer service (`once`, `interval`, `cooldown`) in `src/services/timerSignals.ts` with signal-based payload emissions.
    - timers support pause/resume/cancel semantics and shared cancellation (`cancelAll`) for deterministic orchestration.
    - focused tests added in `src/tests/timerSignals.test.ts` and docs updated with scheduling snippets.

- Debug/perf helper panel baseline:
    - default app dev panel now includes live perf sampling (`fps`, smoothed `frameMs`) and entity counts (`total`, `enemy`).
    - canvas meta pills now include perf/entity counters for at-a-glance runtime checks.
    - implementation remains dev-only and does not alter production runtime flow.

### 2026-02-27

- Worldgen end-to-end baseline:
    - deterministic pipeline shipped for tile map -> room map -> spawn anchors -> world-space conversion -> DataBus payloads -> Entity bridge -> safe DataBus apply helpers.
    - sprite-tile-friendly options are supported throughout generation and spawn markers.
    - one-call scenario composition (`createWorldgenScenario`) is in place.
    - focused tests cover deterministic behavior and integration flow.
    - docs + cheat sheets include copy/paste examples (`docs/USAGE.md`, `docs/worldgen/CHEATSHEET.md`).

- Input controls baseline completion:
    - pointer tap tracking (`usePointerTapTracking`) + debug readout integrated.
    - app-level canvas tap feedback is live (8px red marker + `beep 1.wav`).
    - gamepad helper (`useGamepadInput`) supports init-time mapping, deadzone, and connect/disconnect callbacks.
    - docs + cheat sheets updated with copy/paste mapping patterns.

- App canvas click/tap feedback:
    - inside-canvas tap/click now renders an 8px red marker aligned to canvas-local coordinates (including container padding).
    - plays `ui:tap:beep` cue mapped to `/beep%201.wav`.
    - verified with full test run: 69 files passed, 289 tests passed.

- Pointer click/tap tracking foundation:
    - added reusable `usePointerTapTracking` helper with position payload (`client` + `local`) and inside/outside target bounds detection.
    - emits `POINTER_TAP_SIGNAL` (`input:pointer:tap`) and supports per-call callback handlers.
    - integrated tracking/debug readout in `DefaultInputStyleExample` with focused tests.

- Rendering/effects parity checkpoint:
    - ran `npm run test:run` on full suite.
    - result: 78 files passed, 320 tests passed.

- Render re-rig plan retirement:
    - removed `docs/RENDER_RERIG_PLAN.md` after architecture convergence and cleanup completion.
    - migration/completion history remains tracked in this file under completed milestones.

### Earlier Milestones

- AbilityBar prefab MVP:
    - added `AbilityBar` under `hudAnchor` using `ActionButton` cooldown/disabled behavior.
    - added `AbilityBarExample` in the dev examples panel.
    - added focused tests for prefab and example behavior.
    - documented usage in `docs/USAGE.md`.

- Effects canvas migration — Phase 6 legacy decommission:
    - removed `ScreenTransitionOverlay` and `ParticleEmitterOverlay` components and tests.
    - removed `useScreenTransitionCanvasPass` and `useParticleEmitterCanvasPass` legacy hook path.
    - removed legacy overlay/hook exports from effects barrel modules.
    - app now runs through runtime-owned effects/transition registration.

- Effects canvas migration — Phase 4 transition pass conversion:
    - transition signal subscription/update/draw now runs through a canvas stage pass (`createScreenTransitionCanvasPass`).
    - `Render` runtime registers and drives transition pass execution inside the main frame.
    - all transition variants and lifecycle callbacks (`onCovered`, `onComplete`) remain supported.
    - transitions are enabled by default in the runtime path.

- Effects canvas migration — Phase 3 particle pass conversion:
    - particle signal subscription/update/draw now runs through a canvas stage pass (`createParticleEmitterCanvasPass`).
    - `Render` runtime registers and drives particle pass execution inside the main frame.
    - particle signal API remains stable for callers.

- Effects canvas migration — Phase 2 render wiring:
    - `Render` accepted optional shared `effectsStage` during migration and executed it after world draw.
    - this path was superseded by runtime-owned pass registration in Phase 6.
    - overlay fallback wiring from migration is removed.

- Effects canvas migration — Phase 1 foundation:
    - shared canvas effects contract (`CanvasEffectPass`) with `isActive`, `update`, and `draw`
    - stage coordinator (`CanvasEffectsStage`) with deterministic layer order (`particles` -> `transition`)
    - contract exported from `@/components/effects` and documented in usage/architecture docs

- Sample sidescroller mini game MVP:
    - collect/avoid loop with win/lose states and restart flow (`SideScrollerMiniGameExample`)
    - scene assembled from `SideScrollerCanvas`, `SideScrollerControls`, `PlatformerHUDPreset`, and `DataBus` player-position checks
    - example entry added in dev examples tab + focused behavior tests

- Sample top-down mini game MVP:
    - objective loop with win/lose states and restart flow (`TopDownMiniGameExample`)
    - scene assembled from `TopDownCanvas`, `TopDownControls`, `TopDownHUDPreset`, and `DataBus` player-position checks
    - example entry added in dev examples tab + focused behavior tests

- AudioBus and scene audio prefab foundations:
    - typed `AudioBus` service (`play`, `stop`, channel/master mute + volume state)
    - `SoundManager` prefab that registers cues and plays tone/file cue definitions
    - scene wiring in `SideScrollerCanvas` + `TopDownCanvas` with looping music cues
    - usage docs added for AudioBus + SoundManager patterns

- UI menu templates and state-loop examples:
    - reusable menu components: `MainMenu`, `PauseMenu`, `GameOverScreen`
    - MVP flow examples for each menu type (navigation, actions, transitions)
    - focused behavior test coverage for each menu example

- UI primitives and HUD building blocks:
    - `LifeGauge`, `ActionButton`, `Toggle`, `CooldownIndicator`, `HUDSlot`, `HUDAnchor`
    - `QuickHUDLayout`, `PlatformerHUDPreset`, `TopDownHUDPreset`
    - shared slot resolver: `createHudPresetSlots`

- Mobile/input controls and navigation helpers:
    - `VirtualDPad`, `VirtualActionButton`
    - focus + keyboard navigation helpers (`getFocusableElements`, `handleArrowFocusNavigation`)
    - input mapping adapters for reusable components (`createInputComponentAdapters`)
    - input-mapping templates + cheat sheets for key/on-screen controls

- Examples, tests, and usage docs:
    - Example Components tab previews: `LifeGaugeExample`, `ActionButtonExample`, `CooldownIndicatorExample`, `AbilityBarExample`, `HUDSlotExample`, `HUDAnchorExample`, `QuickHUDLayoutExample`, `PlatformerHUDPresetExample`, `TopDownHUDPresetExample`
    - focused tests added for primitives, examples, and mode presets
    - expanded `docs/USAGE.md` copy/paste coverage, including `createHudPresetSlots` composition snippets

- Styling and save/load foundation:
    - default reusable style primitives (`um-*`) with baseline utility tokens/classes
    - save/load MVP implementation (quick save/load, import/export, UX wiring, hardening)
    - save docs pack: `docs/save/README.md`, `docs/save/CHEATSHEET.md`, `src/services/save/README.md`

## Documentation Map

- [USAGE.md](USAGE.md) — practical usage patterns and examples
- [ARCHITECTURE.md](ARCHITECTURE.md) — system responsibilities and lifecycle flow
- [AI_SETUP.md](AI_SETUP.md) — AI-assisted project bootstrap and prompt templates
- [input/CHEATSHEET.md](input/CHEATSHEET.md) — input mapping quick reference
- [worldgen/CHEATSHEET.md](worldgen/CHEATSHEET.md) — worldgen + spawn integration quick reference
- [save/README.md](save/README.md) — save/load implementation walkthrough
- [save/CHEATSHEET.md](save/CHEATSHEET.md) — save/load quick reference

## Notes

These items are intentionally scoped as modular additions so the engine remains small at its core and extensible over time.
