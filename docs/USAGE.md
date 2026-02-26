## UrsaManus Usage Guide

This guide explains how to use the main engine modules in the current codebase.

For system-level flow and responsibilities, see [ARCHITECTURE.md](ARCHITECTURE.md).

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

---

## 3) Rendering Sprites (`Render`)

`Render` in `src/components/Render/Render.tsx` draws game entities to a canvas.

### Props

- `items: RenderableItem[]` (required)
- `width?: number` (default `300`)
- `height?: number` (default `300`)

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

---

## 4) Game State + Movement (`DataBus`)

`src/services/DataBus.ts` owns the runtime state and movement/collision updates.

### Common methods

- `getState()` — read current `GameState`
- `movePlayerUp/Down/Left/Right()` — move player and run collisions
- `setWorldSize(width, height)` — updates world dimensions
- `setWorldBoundsEnabled(true|false)` — toggles world boundary entities
- `setPlayerCanPassWorldBounds(true|false)` — toggles player vs world collisions

### Usage pattern

Use `dataBus` as the single source of engine state in UI components:

```ts
dataBus.movePlayerRight();
const entities = Object.values(dataBus.getState().entitiesById);
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
- `CompassDirectionControl` — `N/S/E/W` buttons (currently console logging)

### Recommended composition

```tsx
<ScreenController className="snes-layout">
    <ArrowKeyControl onMove={() => force((n) => n + 1)} />
    <ScreenControlGroup className="dpad-group">
        <OnScreenArrowControl onMove={() => force((n) => n + 1)} />
    </ScreenControlGroup>
    <ScreenControlGroup className="face-button-group">
        <CompassDirectionControl />
    </ScreenControlGroup>
</ScreenController>
```

---

## 6) Screen Transition Effects (`components/effects`)

The transition system is signal-driven.

- `ScreenTransitionOverlay` renders the pixel transition above the game canvas.
- `playScreenTransition(payload)` emits a transition signal with full control.
- `playBlackFade(options)` is a preset helper for black transitions.

### Required app wiring

Mount `ScreenTransitionOverlay` in the same positioned container as `Render`.

```tsx
<div className="GameScreen">
    <Render
        items={Object.values(dataBus.getState().entitiesById)}
        width={400}
        height={300}
    />
    <ScreenTransitionOverlay width={400} height={300} />
</div>
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

### Transition payload reference

- `color: string` — fill color for transition boxes
- `from: "top-left" | "top-right" | "bottom-left" | "bottom-right"`
- `durationMs?: number` — per phase duration (cover and reveal)
- `stepMs?: number` — delay between diagonal wave cells
- `boxSize?: number` — pixel block size
- `onCovered?: () => void` — called when screen is fully covered
- `onComplete?: () => void` — called after reveal finishes

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
- Overlay is visual-only (`pointer-events: none`), so gameplay input still routes normally.
- Current `T`-key preview trigger in `App.tsx` is development-only.

---

## 7) Keyboard Hook (`useArrowKeys`)

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

## 8) Testing Conventions

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

## 9) Common Extension Tasks

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

## 10) Notes

- Canvas image loading in `Render` uses internal URL caching.
- `ArrowKeyControl` handles both Arrow keys and WASD.
- The controls shell currently uses a retro SNES-style left/right layout.
