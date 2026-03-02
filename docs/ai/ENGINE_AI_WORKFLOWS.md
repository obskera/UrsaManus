# Engine AI Workflows

Copy/paste prompts and guardrails for AI-assisted work on runtime gameplay systems.

Use this file when the task is broader than prefab generation.

## Always Include These Constraints

```txt
Constraints:
- Keep architecture boundaries:
  - components/ = UI/render/input wiring
  - logic/ = pure reusable systems
  - services/ = stateful orchestration
- Reuse existing modules before creating new primitives.
- Keep changes minimal and scope-accurate.
- Update focused tests and relevant docs for public behavior changes.
```

## Prompt: Add/Extend Gameplay Loop System

```txt
Implement or extend a gameplay loop system in this UrsaManus repo.

Target system:
- [grid movement | projectiles | weapon prefabs | spell prefabs | input mapping]

Requirements:
- Keep deterministic service behavior and typed APIs.
- Keep input action semantics north/south/east/west/interact.
- Add focused tests near the changed modules.
- Update docs with copy/paste snippets.

Deliverables:
1) Minimal implementation changes.
2) Focused tests.
3) docs updates in USAGE/tutorials/cheatsheets.

Validation:
- npm run test:run -- src/tests/[focused test files]
- npm run lint
```

## Prompt: Add/Refresh Cheatsheet Snippets

```txt
Refresh docs snippets for [target subsystem] in this UrsaManus repo.

Requirements:
- Snippets must be copy/paste-usable (no placeholders like {…}).
- Include imports, initialization, and usage call flow.
- Keep examples minimal but runnable.
- Link from docs/USAGE.md so users can discover the page.

Deliverables:
1) Updated cheatsheet/tutorial docs.
2) Updated docs map references.
3) Short validation command block.
```

## Prompt: System Consistency Sweep

```txt
Do a docs consistency sweep for current runtime systems.

Check:
1) Navigation clarity (docs map and per-topic links).
2) Runtime system coverage (services + components + tests).
3) Copy/paste snippet quality and completeness.
4) AI workflow docs freshness.

Output:
- concise gap list
- exact files changed
- final validation command results
```

## Validation Command Sets

Focused gameplay loop set:

```bash
npm run test:run -- src/tests/gridMovement.test.ts src/tests/VirtualControlStick.test.tsx src/tests/inputMappingAdapters.test.ts src/tests/projectiles.test.ts src/tests/weaponPrefabs.test.ts src/tests/spellPrefabs.test.ts src/tests/gameStarterPacks.test.ts
```

Full quality set:

```bash
npm run lint
npm run test:run
```
