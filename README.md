# UrsaManus

UrsaManus is a lightweight, modular game engine foundation built with React and TypeScript.

It is designed for small projects that need a clean core today, with architecture that can scale into much larger systems over time.

## Vision

UrsaManus is intentionally small at its core:

- Small enough to understand quickly
- Structured enough to remain maintainable
- Flexible enough to grow without hard resets

The goal is to give React/TypeScript developers an engine-style foundation they can extend indefinitely with their own gameplay modules, systems, and tooling.

## Core Principles

- **React-first UI composition** for control and interface layers
- **TypeScript-first architecture** for reliable, explicit contracts
- **Separation of concerns** across components, logic, and services
- **System extensibility** through modular, pluggable building blocks
- **Testability by default** for both logic and UI behavior

## What UrsaManus Is (and Is Not)

UrsaManus is a micro-engine architecture for browser-based interactive projects.

It is not trying to replace full-scale AAA engines. Instead, it provides a practical, extensible base for smaller games/tools that can grow in sophistication as needed.

## Architecture Snapshot

`src/`

- `components/` — rendering and input/UI composition
- `logic/` — reusable game logic and collision utilities
- `services/` — stateful services (for example `DataBus`)
- `styles/` — styling layers
- `tests/` — unit/integration coverage for behavior and layout

## Why This Approach

Many TypeScript + React developers already have strong app architecture habits. UrsaManus uses that same discipline for game-like systems:

- React handles composition and mounting
- Service/logic layers handle simulation and state transitions
- Render layers consume normalized data and draw frames

This allows a project to start simple, then expand into custom systems without throwing away the original foundation.

## Save/Load Docs

Save/load documentation is split into quick-reference and implementation guides:

- [docs/save/CHEATSHEET.md](docs/save/CHEATSHEET.md) — one-page API and shortcut reference
- [docs/save/README.md](docs/save/README.md) — workflows, examples, and error-handling snippets
- [src/services/save/README.md](src/services/save/README.md) — module-level contributor notes

### Save Quick Start

```ts
import { quickLoad, quickSave } from "@/services/save";

const restored = quickLoad();
if (!restored) {
    // continue with default DataBus state
}

// later, after a meaningful state change:
quickSave();
```

## Where to Start

Use this quick docs map when onboarding or jumping into a subsystem:

- [README.md](README.md) — project overview and quick starts
- [docs/USAGE.md](docs/USAGE.md) — practical usage patterns and copy/paste examples
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — system responsibilities and lifecycle flow
- [docs/save/README.md](docs/save/README.md) — save/load workflows and integration snippets
- [docs/save/CHEATSHEET.md](docs/save/CHEATSHEET.md) — one-page save/load API reference

## Current Direction

Current direction is principle-led rather than milestone-led.

- Keep the core engine small and easy to reason about
- Expand via modular systems, not tightly coupled features
- Prioritize practical building blocks for small projects first
- Preserve strong TypeScript contracts and high test coverage as the project grows

## Modular Physics (Opt-In)

UrsaManus now includes a lightweight modular gravity/physics layer under `src/logic/physics`.

- Per-entity opt-in via `DataBus` (`enableEntityPhysics`, `disableEntityPhysics`)
- Configurable gravity and terminal velocity (`setPhysicsConfig`)
- Collision-aware stepping (`stepPhysics(deltaMs)`)
- Pure reusable helpers (`createPhysicsBody`, `stepEntityPhysics`)

## Prebuilt Game Modes

UrsaManus now includes prebuilt canvas + controls presets for two common genres:

- **SideScrollerCanvas + SideScrollerControls**
    - gravity-enabled movement and jump assists
    - up/space mapped to jump when gravity is active
- **TopDownCanvas + TopDownControls**
    - gravity-disabled top-down movement
    - supports 4-way or 8-way input via `allowDiagonal`

### Dev Landing Controls (Default App)

In development mode, the default landing page includes two capsule toggles:

- `Show/Hide debug outlines`
    - toggles render-frame debug outline and collider debug rectangles
- `Show/Hide dev controls`
    - opens a compact in-page hotkey/movement cheat sheet

These controls are UI wrappers around existing engine/dev functionality and do not change production behavior.

### Game Mode Cheat Sheet

| Goal                               | Canvas preset        | Controls preset        | Key options                                         |
| ---------------------------------- | -------------------- | ---------------------- | --------------------------------------------------- |
| Platformer/side-scroller feel      | `SideScrollerCanvas` | `SideScrollerControls` | gravity/jump already configured                     |
| Top-down (8-way)                   | `TopDownCanvas`      | `TopDownControls`      | `allowDiagonal={true}` (default)                    |
| Top-down (4-way only)              | `TopDownCanvas`      | `TopDownControls`      | `allowDiagonal={false}`                             |
| Share a demo with fixed start mode | either preset        | matching controls      | URL query `?mode=side-scroller` or `?mode=top-down` |

### Copy/Paste: Side-Scroller Setup

```tsx
import { useCallback, useRef } from "react";
import { SideScrollerCanvas } from "@/components/gameModes";
import { SideScrollerControls } from "@/components/screenController";

export default function SideScrollerExample() {
    const gameScreenRef = useRef<HTMLDivElement | null>(null);

    const onMove = useCallback(() => {
        // optional UI updates when input occurs
    }, []);

    return (
        <>
            <SideScrollerCanvas
                width={400}
                height={300}
                containerRef={gameScreenRef}
                showDebugOutlines={import.meta.env.DEV}
            />
            <SideScrollerControls onMove={onMove} />
        </>
    );
}
```

### Copy/Paste: Top-Down Setup

```tsx
import { useCallback, useRef } from "react";
import { TopDownCanvas } from "@/components/gameModes";
import { TopDownControls } from "@/components/screenController";

export default function TopDownExample() {
    const gameScreenRef = useRef<HTMLDivElement | null>(null);

    const onMove = useCallback(() => {
        // optional UI updates when input occurs
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
                onMove={onMove}
                allowDiagonal={true}
                speedPxPerSec={220}
            />
        </>
    );
}
```

### URL Mode Query

The default app supports mode sharing via query param:

- `?mode=side-scroller`
- `?mode=top-down`

```tsx
import { SideScrollerCanvas, TopDownCanvas } from "@/components/gameModes";
import {
    SideScrollerControls,
    TopDownControls,
} from "@/components/screenController";

<SideScrollerCanvas width={400} height={300} />;
<SideScrollerControls onMove={handleMove} />;

<TopDownCanvas width={400} height={300} />;
<TopDownControls onMove={handleMove} allowDiagonal={true} />;
```

Default movement keys:

- `Arrow keys` / `WASD` move the player
- `Space` / `ArrowUp` triggers jump in side-scroller mode

## Effects Quick Start

UrsaManus includes signal-driven transition and particle effects.

1. Render with runtime effects enabled (default):

```tsx
<div className="GameScreen">
    <Render
        items={entities}
        width={400}
        height={300}
        includeEffects
        enableTransitionEffects
    />
</div>
```

If you are using `SideScrollerCanvas` / `TopDownCanvas`, runtime effects are already wired for you.

2. Trigger transitions from anywhere:

```ts
import { playBlackFade } from "@/components/effects";

playBlackFade({
    from: "top-left",
    durationMs: 500,
    stepMs: 16,
    boxSize: 16,
    onCovered: () => {
        // swap scene/map/state while fully covered
    },
});
```

3. Emit particles from anywhere:

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
});
```

4. (Optional) enable development effect hotkeys:

```ts
import { setupDevEffectHotkeys } from "@/components/effects";

setupDevEffectHotkeys({
    enabled: import.meta.env.DEV,
    width: 400,
    height: 300,
    getContainer: () => gameScreenRef.current,
});
```

Default dev keys:

- `T` cycles transition variants/corners
- `P` cycles particle presets
- `F` starts/repositions a torch emitter at mouse position (center fallback)
- `Shift+F` stops the torch emitter

### Effects API Cheat Sheet

| Effect                   | Helper                                   | Signal                           | Required fields                                                       | Common options                                                                    |
| ------------------------ | ---------------------------------------- | -------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Screen transition        | `playScreenTransition(payload)`          | `effects:screen-transition:play` | `color`, `from`                                                       | `durationMs`, `stepMs`, `boxSize`, `onCovered`, `onComplete`                      |
| Screen transition preset | `playBlackFade(options)`                 | `effects:screen-transition:play` | `from`                                                                | `durationMs`, `stepMs`, `boxSize`, `onCovered`, `onComplete`                      |
| Venetian blinds          | `playVenetianBlindsTransition(options)`  | `effects:screen-transition:play` | `from`                                                                | `color (default black)`, `venetianOrientation`, `durationMs`, `stepMs`, `boxSize` |
| Mosaic dissolve          | `playMosaicDissolveTransition(options)`  | `effects:screen-transition:play` | `from`                                                                | `color (default black)`, `mosaicSeed`, `durationMs`, `boxSize`                    |
| Iris                     | `playIrisTransition(options)`            | `effects:screen-transition:play` | `from`                                                                | `color (default black)`, `irisOrigin`, `durationMs`, `boxSize`                    |
| Directional push         | `playDirectionalPushTransition(options)` | `effects:screen-transition:play` | `from`                                                                | `color (default black)`, `pushFrom`, `durationMs`, `boxSize`                      |
| Particle emitter         | `emitParticles(payload)`                 | `effects:particles:emit`         | `amount`, `location`, `direction`, `emissionShape`, `lifeMs`, `color` | `size`, `sizeJitter`, `emissionRadius`, `emissionLength`, `gravity`, `drag`       |
| Particle presets         | `emitSmokeParticles(...)` etc.           | `effects:particles:emit`         | `location`                                                            | `ParticlePresetOptions` (`amount`, `lifeMs`, `colorPalette`, `sizeRange`)         |
| Torch emitter            | `startTorchFlameEmitter(...)`            | `effects:particles:emit`         | `id`, `location`                                                      | `intervalMs`, `amount`, `flameAmount`, `smokeAmount`, preset overrides            |

| `direction` field | Type     | Meaning                            |
| ----------------- | -------- | ---------------------------------- |
| `angleDeg`        | `number` | Base movement angle in degrees     |
| `speed`           | `number` | Base speed                         |
| `spreadDeg`       | `number` | Direction spread around `angleDeg` |
| `speedJitter`     | `number` | Random variation around `speed`    |

### Common Particle Presets

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

### Preset Helper Examples

```ts
import {
    emitBurningFlameParticles,
    emitDebrisParticles,
    emitMagicShimmerParticles,
    emitSmokeParticles,
    emitSparkParticles,
} from "@/components/effects";

emitSmokeParticles({ x: 180, y: 180 });
emitSparkParticles({ x: 220, y: 140 });
emitMagicShimmerParticles({ x: 140, y: 120 });
emitDebrisParticles({ x: 200, y: 210 });
emitBurningFlameParticles({ x: 200, y: 190 });
```

### Torch Emitter Example

```ts
import {
    startTorchFlameEmitter,
    stopTorchFlameEmitter,
} from "@/components/effects";

const stopTorch = startTorchFlameEmitter(
    "left-wall-torch",
    { x: 72, y: 104 },
    { intervalMs: 100, amount: 14 },
);

// either stop by cleanup callback
stopTorch();

// or stop by id elsewhere
stopTorchFlameEmitter("left-wall-torch");
```

### Particle Tuning by Feel

| Feel                | Increase                             | Decrease                   | Typical ranges                                                                  |
| ------------------- | ------------------------------------ | -------------------------- | ------------------------------------------------------------------------------- |
| Soft / floaty       | `lifeMs`, `drag`                     | `gravity`, `speed`         | `lifeMs: 500-1200`, `drag: 0.18-0.35`, `gravity: 20-120`                        |
| Punchy / impact     | `amount`, `speed`, `spreadDeg`       | `lifeMs`                   | `amount: 20-50`, `speed: 140-280`, `spreadDeg: 180-360`, `lifeMs: 180-450`      |
| Heavy / debris      | `size`, `gravity`                    | `spreadDeg`, `speedJitter` | `size: 2-5`, `gravity: 140-260`, `spreadDeg: 60-200`                            |
| Chaotic / explosive | `spreadDeg`, `speedJitter`, `amount` | `drag`                     | `spreadDeg: 300-360`, `speedJitter: 80-180`, `amount: 40-90`, `drag: 0.05-0.18` |

Quick tip: if particles feel too “stiff,” raise `speedJitter`; if they feel too “noisy,” lower `spreadDeg` first.

For full API and architecture details, see:

- [docs/USAGE.md](docs/USAGE.md)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Testing Standards

UrsaManus uses:

- Vitest
- React Testing Library
- `jsdom`

Test conventions:

- Explicit Vitest imports in each test file (`describe`, `it`, `expect`, `vi`, etc.)
- File naming:
    - primary tests: `<subject>.test.ts(x)`
    - extended/edge cases: `<subject>.extended.test.ts(x)`

## Documentation

- Usage guide: [docs/USAGE.md](docs/USAGE.md)
- Architecture and data flow: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Contributor quickstart: [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)
- Current next items: [docs/TODO.md](docs/TODO.md)

## Getting Started

Install dependencies:

`npm install`

Start development:

`npm run dev`

Run tests:

`npm run test:run`

Run coverage:

`npm run test:coverage`

Run lint:

`npm run lint`

Open Vitest UI:

`npm run test:ui`

## Template Quick Start

This repository is set up to be used as a starter template.

After creating a new repository from this template:

1. Rename project metadata:
    - update `package.json` (`name`, `version`, and any project-specific fields)
2. Replace identity text:
    - update this `README.md`
    - review `docs/` for naming or project-specific assumptions
3. Validate quality gates locally:
    - `npm run lint`
    - `npm run test:run`
    - `npm run test:coverage:strict`
4. Push to your default branch and confirm GitHub Actions CI passes.

### Template Setup Checklist

- [ ] Project name and metadata updated
- [ ] README intro + goals updated
- [ ] Docs reviewed (`docs/USAGE.md`, `docs/ARCHITECTURE.md`, `docs/CONTRIBUTING.md`)
- [ ] Lint/tests/strict coverage all pass
- [ ] First CI run is green on GitHub

## CI (GitHub Actions)

CI runs on push and pull request using `.github/workflows/ci.yml`:

- `npm ci`
- `npm run lint`
- `npm run test:run`
- `npm run test:coverage:strict`

## License

All Rights Reserved.

Usage is allowed with attribution and a free license from the project owner.
