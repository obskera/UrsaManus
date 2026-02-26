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

## Current Direction

Current direction is principle-led rather than milestone-led.

- Keep the core engine small and easy to reason about
- Expand via modular systems, not tightly coupled features
- Prioritize practical building blocks for small projects first
- Preserve strong TypeScript contracts and high test coverage as the project grows

## Effects Quick Start

UrsaManus includes signal-driven transition and particle effects.

1. Mount the overlay above your canvas render:

```tsx
<div className="GameScreen">
    <Render items={entities} width={400} height={300} />
    <ParticleEmitterOverlay width={400} height={300} />
    <ScreenTransitionOverlay width={400} height={300} />
</div>
```

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

## License

All Rights Reserved.

Usage is allowed with attribution and a free license from the project owner.
