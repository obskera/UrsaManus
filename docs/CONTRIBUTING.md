## Contributing to UrsaManus

Thanks for contributing.

This project is built as a small, extensible TypeScript/React engine core. Contributions should preserve clarity, modularity, and long-term scalability.

---

## 1) Quick Start

1. Install dependencies:
    - `npm install`
2. Run lint:
    - `npm run lint`
3. Run tests:
    - `npm run test:run`
4. Run coverage when adding behavior:
    - `npm run test:coverage`

If this repository was used as a template for a new project, first update project identity docs (`README.md` and relevant `docs/*`) before opening feature PRs.

---

## 2) Development Expectations

- Keep changes focused and minimal.
- Prefer root-cause fixes over temporary patches.
- Preserve separation between:
    - `components/` (UI/render/input)
    - `logic/` (pure/reusable systems)
    - `services/` (stateful orchestration)
- Avoid coupling unrelated modules.

---

## 3) Code Style

- Use existing TypeScript style and naming conventions.
- Keep public interfaces explicit and typed.
- Avoid introducing `any` unless absolutely necessary.
- Keep components composable and small.

---

## 4) Testing Requirements

- Add or update tests for behavior changes.
- Maintain explicit Vitest imports in each test file.

Naming convention:

- Primary tests: `<subject>.test.ts(x)`
- Extended/edge scenarios: `<subject>.extended.test.ts(x)`

Recommended split for larger features:

- `*.behavior.test.tsx` for interaction/state behavior
- `*.layout.test.tsx` for rendering/layout wrappers

### Coverage goals (project-wide)

- Aim to keep overall coverage in the **low-to-mid 90s** whenever practical.
- Baseline target for strict gating:
    - Statements: `>= 90%`
    - Lines: `>= 90%`
    - Functions: `>= 90%`
    - Branches: `>= 85%`

Commands:

- Report-only coverage: `npm run test:coverage`
- Enforced thresholds: `npm run test:coverage:strict`

Notes:

- Barrel/type-only files are excluded from coverage gating (`index.ts`, `types.ts`, `*.d.ts`) to keep the metric focused on executable behavior.

---

## 5) Docs Requirements

Update docs whenever architecture, APIs, or workflows change:

- `README.md` for project-level messaging and setup
- `docs/USAGE.md` for practical usage/API patterns
- `docs/ARCHITECTURE.md` for system flow and responsibilities

---

## 6) Dev Preview Controls (Effects)

For local development, use the dev hotkey helper instead of wiring ad-hoc key listeners in `App`.

Source module:

- `src/components/effects/dev/devEffectHotkeys.ts`

Recommended setup:

```ts
import { setupDevEffectHotkeys } from "@/components/effects";

const cleanupDevHotkeys = setupDevEffectHotkeys({
    enabled: import.meta.env.DEV,
    width: 400,
    height: 300,
    getContainer: () => gameScreenRef.current,
});

// call cleanupDevHotkeys() on unmount
```

Default development keybinds:

- `T`: cycle transition variants/corners
- `P`: cycle particle presets
- `F`: start/reposition torch emitter at mouse position (center fallback)
- `Shift+F`: stop torch emitter

Default movement/testing keys in presets:

- `Arrow keys` / `WASD`: move player
- `Space` / `ArrowUp`: jump in side-scroller mode

Default app (dev-only) helper UI:

- `Show/Hide debug outlines` capsule (debug visual toggles)
- `Show/Hide dev controls` capsule (in-page controls/hotkeys tab)

Contributors adding/changing dev key behavior should:

- keep all logic in the `effects/dev` module (not in `App`),
- preserve cleanup behavior (remove listeners, stop emitters),
- update tests and docs in the same change.

---

## 7) Game Mode Presets

Prebuilt presets live in:

- `src/components/gameModes/` (canvas/runtime setup)
- `src/components/screenController/` (mode-matched controls)

Current preset pairs:

- `SideScrollerCanvas` + `SideScrollerControls`
- `TopDownCanvas` + `TopDownControls`

When changing one side of a preset pair, also verify:

- matching controls still feel correct for that mode,
- docs include copy/paste usage snippets,
- test coverage reflects expected mode behavior.

---

## 8) Pull Request Checklist

Before opening a PR:

- [ ] Lint passes (`npm run lint`)
- [ ] Tests pass (`npm run test:run`)
- [ ] Coverage still healthy (`npm run test:coverage` when relevant)
- [ ] Strict coverage gate still passes (`npm run test:coverage:strict`) when behavior changed
- [ ] Docs updated for behavioral/API changes
- [ ] Change is scoped to the stated objective
- [ ] GitHub Actions CI (`.github/workflows/ci.yml`) is green

---

## 9) Design Intent Reminder

UrsaManus is intentionally a **small core engine** that can be **extended indefinitely**.

When contributing, optimize for:

- long-term extensibility,
- strong TS contracts,
- maintainable module boundaries,
- practical usefulness for React + TypeScript developers.
