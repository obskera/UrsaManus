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
