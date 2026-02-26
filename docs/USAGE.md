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
- Variant helpers: `playVenetianBlindsTransition`, `playMosaicDissolveTransition`, `playIrisTransition`, `playDirectionalPushTransition`.

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
- Overlay is visual-only (`pointer-events: none`), so gameplay input still routes normally.
- Current `T`-key preview trigger in `App.tsx` is development-only.
- New effects can start from `src/components/effects/_template/`.

---

## 7) Particle Effects (`components/effects`)

The particle emitter is also signal-driven and renders on an overlay canvas.

- `ParticleEmitterOverlay` draws and updates active particles.
- `emitParticles(payload)` emits particle bursts through `SignalBus`.

### Required app wiring

Mount `ParticleEmitterOverlay` in the same positioned container as `Render`.

```tsx
<div className="GameScreen">
    <Render
        items={Object.values(dataBus.getState().entitiesById)}
        width={400}
        height={300}
    />
    <ParticleEmitterOverlay width={400} height={300} />
    <ScreenTransitionOverlay width={400} height={300} />
</div>
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
- `size?: number` — base particle size
- `sizeJitter?: number` — random size variance
- `emissionRadius?: number` — used by `circle` shape
- `emissionLength?: number` — used by `line` shape
- `gravity?: number` — vertical acceleration per second
- `drag?: number` — velocity damping factor

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
- Current `P`-key burst preview in `App.tsx` is development-only

### Effects API quick reference

| Effect                     | Trigger helper                  | Signal                           | Required payload fields                                               | Common optional fields                                                      |
| -------------------------- | ------------------------------- | -------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Screen transition          | `playScreenTransition(payload)` | `effects:screen-transition:play` | `color`, `from`                                                       | `durationMs`, `stepMs`, `boxSize`, `onCovered`, `onComplete`                |
| Screen transition (preset) | `playBlackFade(options)`        | `effects:screen-transition:play` | `from`                                                                | `durationMs`, `stepMs`, `boxSize`, `onCovered`, `onComplete`                |
| Particle emitter           | `emitParticles(payload)`        | `effects:particles:emit`         | `amount`, `location`, `direction`, `emissionShape`, `lifeMs`, `color` | `size`, `sizeJitter`, `emissionRadius`, `emissionLength`, `gravity`, `drag` |

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

## 11) Notes

- Canvas image loading in `Render` uses internal URL caching.
- `ArrowKeyControl` handles both Arrow keys and WASD.
- The controls shell currently uses a retro SNES-style left/right layout.
