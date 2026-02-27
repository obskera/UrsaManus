# UrsaManus TODO (Current Next)

This file tracks the immediate next systems planned for UrsaManus.

## Next Features

### P1 — Core runtime utilities

- Canvas pseudo-shader effects (TypeScript + React Canvas2D, no WebGL).
    - Add reusable sprite post-process passes: `tint`, `flash`, `outline`, `desaturate`.
    - Keep API runtime/plugin-friendly and compatible with current canvas render flow.
    - Add focused visual math tests + usage snippets for per-entity effect configs.

- Screen-wide canvas effects (TypeScript + React Canvas2D, no WebGL).
    - Add post-process screen passes: `tint`, `monochrome`, `scanline`, `wavy`, `vhs`.
    - Keep effects configurable and stackable through runtime/plugin registration.
    - Add deterministic parameter presets + docs for mode transitions/cutscene styling.

- Sprite animation atlas + clip helper.
    - Add typed helper to define animations from sprite sheets (ranges, named clips, fps, loop modes).
    - Include validation for out-of-bounds frames and duplicate clip names.
    - Add copy/paste docs for quick setup from raw atlas metadata.

- Animation state machine utility.
    - Add transition graph helper (`idle/run/jump/attack`) with guard functions and callbacks.
    - Support time-based and signal-triggered transitions.
    - Add lightweight integration example with current render/runtime pipeline.

- Timer signal helper.
    - Add typed timers (`once`, `interval`, `cooldown`) that emit through signal bus.
    - Support pause/resume/cancel semantics and deterministic behavior tests.
    - Add docs for gameplay event scheduling (spawns, buffs, objective ticks).

### P2 — Simulation modules (small + composable)

- NPC behavior module (movement/chase/patrol).
    - Add behavior presets: idle roam, waypoint patrol, target chase, flee.
    - Keep AI updates modular and frame-safe (no hard coupling to render).
    - Add focused behavior tests + example scene wiring.

- Growth/tick simulation module (plants/crops/resources).
    - Add tick-driven state progression (`seed -> sprout -> mature`) with configurable intervals.
    - Support pause/resume and deterministic seed/timer behavior.
    - Expose signals/events for growth stage transitions.

- Environmental forces module (wind/current zones).
    - Add area-based force fields that can apply directional impulses/velocity modifiers.
    - Integrate with existing physics helpers without requiring WebGL or engine rewrite.
    - Include optional resistance/drag scaling by entity type.

- Status effect modifiers module.
    - Add typed effect stack helpers (`slow`, `haste`, `burn`, `regen`) with duration + tick policies.
    - Compose cleanly with movement/physics and timer signals.
    - Add deterministic tests for stacking, refresh, and expiry rules.

### P3 — Integration + tooling

- Input systems expansion (post-baseline).
    - Build optional remapping/profile persistence on top of keyboard + pointer + gamepad baselines.
    - Add higher-level composition helpers for multi-device presets.

- Level/world generation expansion (post-baseline).
    - Add biome/path composition layers over seeded tile + room generation.
    - Add palette/rules helpers for sprite-tile generation workflows.
    - Add preset scene builders for faster “generated run” bootstraps.

- Next prefab wave.
    - Draft next 1-2 gameplay/HUD prefabs and lock minimal props APIs.
    - Add docs + usage snippets + baseline tests for each new prefab.

- Debug/perf helper panel.
    - Add optional dev HUD for frame timing, active effects, and entity counts.
    - Keep it dev-only and non-invasive to production runtime.

### Prefab Backlog (Plug-and-Play)

#### P2 candidates

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

### 2026-02-27 (Latest)

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
