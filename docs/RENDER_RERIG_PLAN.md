# Sprite Rendering + Effects Re-rig Plan

This plan replaces incremental hardening with a clean, staged rebuild of render/effects/transition systems.

## Why reset now

- Current render loop mixes resource loading, frame scheduling, world draw, debug draw, and effects execution in one component.
- Effects are attached at mode level with duplicate hook wiring and partial enablement (`transitionEffectsEnabled = false`), which creates drift and confidence gaps.
- Signal-to-pass behavior is spread across per-feature modules, making transition correctness and lifecycle timing expensive to reason about.

## Re-rig goals

- Single source of truth for frame timing and draw order.
- Render pipeline that is deterministic, testable, and feature-flaggable.
- Effects/transitions implemented as explicit pipeline stages, not ad-hoc mode wiring.
- Stable public API for gameplay code (`emitParticles`, `playScreenTransition`) with internals replaceable behind adapters.

## Current status (implemented)

- `RenderRuntime` owns RAF lifecycle and plugin scheduling.
- `SpriteBatch` owns world sprite draw, animation frame resolve, and culling.
- `EffectGraph` is the effects plugin registry; `CanvasEffectsStage` remains as a compatibility adapter.
- `TransitionCoordinator` drives transition phase timing and callback guarantees.
- Mode canvases no longer register effect passes; `Render` owns runtime particle/transition pass registration.
- Legacy overlays and mode-level pass hooks were removed.

## Target architecture (clean baseline)

### 1) Runtime split

- `RenderRuntime`
    - owns RAF, delta clamp, frame clock, pause/resume.
- `SpriteBatch`
    - owns sprite atlas cache, animation frame resolve, viewport culling, world draw.
- `EffectGraph`
    - owns effect plugins, update/draw ordering, active/inactive state.
- `TransitionCoordinator`
    - owns transition lifecycle (`idle -> cover -> covered -> reveal -> done`) and callback execution.

### 2) Pipeline stages (fixed order)

1. `preUpdate` (time + viewport)
2. `simulate` (physics/game state updates from DataBus outputs)
3. `drawWorld` (sprites/tile layers)
4. `drawEffects:world-space`
5. `drawEffects:screen-space`
6. `drawDebug` (colliders, diagnostics)
7. `postFrame` (metrics/events)

### 3) Plugin contracts

- `RenderPlugin`
    - `id`, `phase`, `priority`, `isActive(frame)`, `update(frame)`, `draw(frame)`, `reset()`, `dispose()`
- `TransitionPlugin` (specialized)
    - state machine only, no direct signal subscriptions; receives normalized commands from coordinator.

### 4) Event boundary

- Keep existing public signals, but route through a narrow adapter layer:
    - `EffectsCommandBus` translates `signalBus` events to runtime-safe commands.
- Runtime never subscribes directly to application-wide buses.

## Migration strategy (no big-bang)

Status key: ✅ completed, 🔄 in progress

## Phase 0 ✅ — Freeze + baselines

- Freeze new effects feature work in current path.
- Snapshot baseline behavior for:
    - particle burst lifecycle,
    - transition callback ordering (`onCovered`, `onComplete`),
    - per-frame draw order expectations.
- Add “golden” frame tests for at least one particle and one transition preset.

Exit criteria:

- Baseline tests fail on regressions and pass on `main`.

## Phase 1 ✅ — Introduce runtime shell

- Add `RenderRuntime` and move RAF ownership out of `Render.tsx`.
- Keep existing world draw logic but call it through runtime stage hooks.
- Add frame metrics counters (dropped frames, plugin time) for local dev visibility.

Exit criteria:

- No visual change expected.
- Existing render tests pass.

## Phase 2 ✅ — Move sprites into `SpriteBatch`

- Extract image cache + animation tile resolve + culling from `Render.tsx`.
- Introduce atlas descriptors to decouple sprite source from entity shape.
- Keep current `RenderableItem` input temporarily via adapter.

Exit criteria:

- Pixel output equivalent for representative scenes.
- Tile/frame selection tests pass through new API.

## Phase 3 ✅ — Replace stage with plugin graph

- Replace `CanvasEffectsStage` with `EffectGraph` plugin registry.
- Port particle pass to plugin contract first.
- Keep signal API unchanged through adapter.

Exit criteria:

- Particle behavior parity (spawn/update/expire) confirmed by tests.
- No mode-level pass wiring required.

## Phase 4 ✅ — Transition coordinator rewrite

- Rebuild transitions as explicit state machine plugin.
- Centralize callback timing and completion guarantees.
- Enable transitions by default behind env flag `VITE_RENDER_V2_TRANSITIONS` (default `true`).

Exit criteria:

- `onCovered`/`onComplete` fire exactly once in all presets.
- Transition draw path no longer depends on legacy pass implementation.

## Phase 5 ✅ — Mode integration simplification

- Remove `useParticleEmitterCanvasPass` / `useScreenTransitionCanvasPass` from game mode components.
- Mode canvases provide only scene/camera/state inputs; runtime handles all effect plugin registration.

Exit criteria:

- `SideScrollerCanvas` and `TopDownCanvas` no longer contain effect wiring.

## Phase 6 🔄 — Decommission legacy path

- Completed:
    - Deleted compatibility shim overlays (`ScreenTransitionOverlay`, `ParticleEmitterOverlay`).
    - Deleted old mode-level pass hooks (`useScreenTransitionCanvasPass`, `useParticleEmitterCanvasPass`).
    - Removed obsolete overlay/hook exports from effects barrel modules.
- Remaining:
    - Remove/archive migration-only notes once docs fully converge.
    - Run full-suite parity pass and address any render/effects regressions.
    - Remove any now-unused compatibility code paths discovered during parity sweep.

Exit criteria:

- Single active rendering architecture in repo.

## Remaining cleanup backlog

1. Remove or archive migration-only notes once docs converge.
2. Keep full-suite parity green and continue focused rendering/effects checks on each cleanup slice.
3. Remove any now-unused compatibility code paths if discovered.

### Latest parity checkpoint

- 2026-02-27: `npm run test:run` passed.
- Result: 66 test files, 282 tests passed.

## Risk controls

- Feature flags:
    - `VITE_RENDER_V2_EFFECTS` (default `true`)
    - `VITE_RENDER_V2_TRANSITIONS` (default `true`)
- Keep signal APIs stable while cleanup completes.

## Definition of done

- One runtime owns frame lifecycle.
- One plugin graph owns all effects/transitions.
- No effect registration in mode components.
- Transition and particle APIs remain stable for callers.
- Existing and new tests pass with strict coverage gates.
