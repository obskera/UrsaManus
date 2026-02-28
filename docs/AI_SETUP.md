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
