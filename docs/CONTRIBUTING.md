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

---

## 5) Docs Requirements

Update docs whenever architecture, APIs, or workflows change:

- `README.md` for project-level messaging and setup
- `docs/USAGE.md` for practical usage/API patterns
- `docs/ARCHITECTURE.md` for system flow and responsibilities

---

## 6) Pull Request Checklist

Before opening a PR:

- [ ] Lint passes (`npm run lint`)
- [ ] Tests pass (`npm run test:run`)
- [ ] Coverage still healthy (`npm run test:coverage` when relevant)
- [ ] Docs updated for behavioral/API changes
- [ ] Change is scoped to the stated objective

---

## 7) Design Intent Reminder

UrsaManus is intentionally a **small core engine** that can be **extended indefinitely**.

When contributing, optimize for:

- long-term extensibility,
- strong TS contracts,
- maintainable module boundaries,
- practical usefulness for React + TypeScript developers.
