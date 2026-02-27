## UrsaManus Architecture and Data Flow

This document explains how input, state, logic, and rendering flow through the current engine setup.

---

## 1) High-Level Flow

```mermaid
flowchart LR
    K[Keyboard: Arrow/WASD] --> AK[ArrowKeyControl]
    C[On-Screen D-Pad Clicks] --> OSC[OnScreenArrowControl]
    N[Compass N/S/E/W Clicks] --> CDC[CompassDirectionControl]
    D[Dev Keys: T/P/F] --> DE[setupDevEffectHotkeys]
    E[Game/Event Layer] --> SB[SignalBus]
    DE --> SB
    SB --> STP[ScreenTransitionCanvasPass]
    SB --> PTP[ParticleEmitterCanvasPass]

    AK --> DB[DataBus]
    OSC --> DB
    CDC --> LOG[Console Logs]

    DB --> CS[Collision System]
    CS --> DB

    DB --> APP[App.tsx force re-render]
    APP --> PHYS[Physics RAF Tick]
    PHYS --> DB
    APP --> RENDER[Render component]
    RENDER --> CANVAS[Canvas frame draw]
    STP --> CANVAS
    PTP --> CANVAS
```

---

## 2) Module Responsibilities

### UI composition (`App.tsx`)

- Selects active game mode (`side-scroller` / `top-down`) via local state.
- Syncs active mode to URL query (`?mode=...`) for shareable demos.
- Mounts matching prebuilt canvas + controls presets for the active mode.
- In development, exposes capsule toggles for:
    - `Show/Hide debug outlines`
    - `Show/Hide dev controls` (in-page cheat sheet panel)

### Game mode presets (`src/components/gameModes/`)

- `SideScrollerCanvas`
    - Configures world + gravity side-scroller tuning.
    - Starts/stops side-scroller scene music through `AudioBus`.
    - Passes scene/camera/entity inputs to `Render`.
    - Enables runtime effects via `includeEffects` and transition effects via `enableTransitionEffects`.
- `TopDownCanvas`
    - Configures world + disables player gravity/physics.
    - Starts/stops top-down scene music through `AudioBus`.
    - Passes scene/camera/entity inputs to `Render`.
    - Enables runtime effects via `includeEffects` and transition effects via `enableTransitionEffects`.
- `SoundManager`
    - Registers scene cue maps and subscribes to `AudioBus` events.
    - Resolves cue playback (tone/file) and channel-level stop/mute behavior.

### Input controls (`src/components/screenController/`)

- `ArrowKeyControl`
    - Subscribes to `keydown`.
    - Handles Arrow keys and WASD.
    - Calls `dataBus` movement methods.
- `OnScreenArrowControl`
    - Clickable D-pad buttons (`↑ ↓ ← →`).
    - Calls `dataBus` movement methods.
- `CompassDirectionControl`
    - Clickable `N/S/E/W` buttons.
    - Currently logs directions (reserved for future actions).
- `ScreenControl` / `ScreenControlGroup` / `ScreenController`
    - Visual primitives and layout wrappers for controller UI.
- `SideScrollerControls`
    - Prebuilt side-scroller control composition.
- `TopDownControls`
    - Prebuilt top-down control composition.

### State and simulation (`DataBus`)

- Holds authoritative `GameState`.
- Owns entity collection (`entitiesById`, `playerId`).
- Applies movement and collision resolution.
- Manages world bounds entities and collision masking.
- Exposes opt-in gravity/physics stepping per entity.

### Save services (`src/services/save/`)

- `schema.ts`
    - Defines versioned `SaveGameV1` payload contract.
    - Validates incoming save payloads and version compatibility.
- `state.ts`
    - Serializes `DataBus` `GameState` into JSON-safe save objects.
    - Rehydrates validated save payloads back into live `DataBus` state.
- `bus.ts`
    - Handles quick save/load persistence in localStorage (`ursa:quickSave:v1`).
    - Provides throttled autosave scheduler used by app runtime updates.
- `file.ts`
    - Exports save snapshots as downloadable `.json` files.
    - Imports user-provided `.json` files with structured error reporting.

### Audio services (`src/services/`)

- `AudioBus`
    - Registers cue definitions used by scenes/UI.
    - Emits typed play/stop/state audio events.
    - Stores global audio state (`enabled`, master volume/mute, per-channel mute).

### Save docs index

- [docs/save/CHEATSHEET.md](save/CHEATSHEET.md)
    - Fast API/shortcut/error-code reference for day-to-day use.
- [docs/save/README.md](save/README.md)
    - End-to-end save/load workflows with copy/paste snippets.
- [src/services/save/README.md](../src/services/save/README.md)
    - Module-level contributor notes for save internals.

### Physics (`src/logic/physics/`)

- `createPhysicsBody`
    - Builds typed physics bodies with sensible defaults.
- `stepEntityPhysics`
    - Integrates velocity/gravity using clamped delta time for stable frame behavior.
- `DEFAULT_GRAVITY_CONFIG`
    - Baseline gravity, terminal velocity, and max frame delta.

### Rendering (`Render`)

- Delegates RAF and plugin scheduling to `RenderRuntime`.
- Delegates sprite draw/culling/frame resolution to `SpriteBatch`.
- Draws entities and runtime-owned effects in a single deterministic frame pipeline.
- Uses `includeEffects` and `enableTransitionEffects` to gate runtime effect plugins.
- Optionally draws collider debug rectangles (via `showDebugOutlines`).

### Effects (`src/components/effects/`)

- `EffectGraph`
    - Defines and executes ordered effect plugins with deterministic scheduling.
- `CanvasEffectsStage`
    - Compatibility adapter over `EffectGraph` for transitional usage.
- `createScreenTransitionCanvasPass` + `TransitionCoordinator`
    - Subscribes to transition play signals and normalizes payload into coordinator state.
    - Owns transition lifecycle and callback timing (`onCovered`, `onComplete`) in runtime effects stage.
- `screenTransitionSignal`
    - Defines the transition payload contract.
    - Emits the `effects:screen-transition:play` signal.
- `createParticleEmitterCanvasPass`
    - Subscribes to particle emit signals and owns particle lifecycle in runtime effects stage.
    - Draws particles in the same render frame/camera context as world draw.
- `particleEmitterSignal`
    - Defines particle burst payload contract.
    - Emits the `effects:particles:emit` signal.
- `dev/devEffectHotkeys`
    - Development-only keybind wiring for effect previews.
    - Emits transition and particle presets with `T`/`P`.
    - Controls continuous torch emitter lifecycle with `F` / `Shift+F`.

---

## 3) Frame Lifecycle

1. Input event occurs (keyboard or on-screen control).
2. Corresponding control calls `dataBus.movePlayer*`.
3. `DataBus` updates player position and resolves blocking collisions.
4. App triggers a re-render (`force` state increment).
5. `Render` receives updated entity data and paints next frame.

### Physics frame lifecycle (opt-in)

1. App RAF loop computes `deltaMs` and calls `dataBus.stepPhysics(deltaMs)`.
2. `DataBus` runs `stepEntityPhysics` for entities with physics bodies.
3. Axis movement is applied with collision checks (`isBlockedBySolid`).
4. Blocked axes are reverted and axis velocity is zeroed.
5. App re-renders only when physics reports position changes.

### Save/load lifecycle

1. App state changes (input, camera pan, physics movement).
2. Quick-save scheduler batches frequent updates.
3. Scheduler executes `quickSave()` to persist `SaveGameV1` in localStorage.
4. On startup, `quickLoad()` attempts to restore the latest quick save.
5. Optional manual export/import flows use `exportSaveFile()` / `importSaveFile(file)`.
6. Import path validates payload schema/version before rehydration into `DataBus`.

### Transition lifecycle (signal path)

1. Any module emits `effects:screen-transition:play` using `playScreenTransition` or `playBlackFade`.
2. Transition canvas pass receives payload and starts cover animation.
3. `onCovered` runs at full cover (safe point for scene/world swap).
4. Reveal phase runs.
5. `onComplete` runs after transition ends.

### Particle lifecycle (signal path)

1. Any module emits `effects:particles:emit` using `emitParticles`.
2. Particle canvas pass receives spawn payload and creates particle instances.
3. Pass updates apply velocity, drag, gravity, and life decay.
4. Runtime effects stage draws active particles in the `Render` frame.
5. Expired/out-of-bounds particles are removed from the simulation.

Migration status note: transition and particle trigger APIs remain signal-based while runtime/effects internals are fully plugin-driven.

### Dev preview lifecycle (development only)

1. `setupDevEffectHotkeys` attaches window key/mouse listeners.
2. Landing-page dev controls tab provides in-page hotkey/input reference.
3. `T` emits screen transition previews across variants/corners.
4. `P` emits particle preset previews at random in-bounds coordinates.
5. `F` starts/repositions a named torch emitter at mouse position (or center fallback).
6. `Shift+F` and teardown cleanup stop the named torch emitter.

---

## 4) Collision Pipeline (Current)

- Player movement attempts are axis-separated (`x` then `y`).
- `isBlockedBySolid` checks collision rules and blocks invalid movement.
- `CollisionSystem.update()` emits events for collision phases.
- Collision events are currently logged for visibility.

---

## 5) Extending the Architecture

### Add new input types

- Build a new control component under `src/components/screenController/`.
- Invoke `dataBus` methods (or future command/event layer) in handlers.
- Re-export in `screenController/index.ts` and mount in `App.tsx`.

### Add gameplay systems

- Add reusable logic under `src/logic/`.
- Keep state transitions centralized in `DataBus`.
- Feed renderable entities to `Render` without UI-specific coupling.

### Add new renderable entities

- Ensure entity shape matches `RenderableItem` requirements.
- Provide sprite sheet metadata and animation tiles.
- Add optional collider config for collision/debug draw.

---

## 6) Testing Strategy Mapping

- Behavior tests
    - Input effects (`ArrowKeyControl`, `OnScreenArrowControl`, `CompassDirectionControl`).
- Layout tests
    - Primitive wrappers (`ScreenControl`, `ScreenControlGroup`, `ScreenController`).
- Extended tests
    - Canvas/render edge cases and branch-heavy scenarios.

Current suite reaches 100% statement/branch/function/line coverage for included files.
