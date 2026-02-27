# AI Setup Guide (Repo-Aware Bootstrap)

Use this guide when you want an AI tool to inspect UrsaManus and configure a new/derived project with minimal back-and-forth.

## Goal

Help the AI do three things reliably:

1. Understand what UrsaManus is and where core systems live.
2. Gather your project-specific constraints before coding.
3. Produce a scoped implementation + config plan with tests/docs updates.

## Give the AI this context first

- Project intent (game/tool type, target platform, MVP scope)
- Input priorities (keyboard, pointer/tap, gamepad)
- Rendering expectations (side-scroller/top-down/custom)
- Save/load requirements (quick save only vs import/export)
- Non-goals (what should not be changed)

## Repo orientation (what AI should read in order)

1. `README.md` (project overview + docs map)
2. `docs/ARCHITECTURE.md` (module boundaries)
3. `docs/USAGE.md` (copy/paste APIs)
4. `docs/input/CHEATSHEET.md` (input mappings)
5. `docs/worldgen/CHEATSHEET.md` (deterministic worldgen + spawn payload patterns)
6. `docs/CONTRIBUTING.md` (guardrails and PR expectations)

Then inspect implementation entry points:

- `src/App.tsx`
- `src/components/gameModes/`
- `src/components/screenController/`
- `src/services/`

## AI bootstrap prompt template (copy/paste)

```txt
You are configuring a project based on the UrsaManus repository.

Objective:
- Configure this project for: [describe game/app]
- Keep scope to MVP only.

Hard constraints:
- Preserve architecture boundaries:
  - components/ = UI/render/input wiring
  - logic/ = pure reusable systems
  - services/ = stateful orchestration
- Reuse existing hooks/components before creating new primitives.
- Keep input semantics action-based (north/south/east/west/interact).
- Keep device mappings init-configurable.
- Update tests and docs for public behavior changes.

Please do the following:
1) Read README.md, docs/ARCHITECTURE.md, docs/USAGE.md, docs/input/CHEATSHEET.md, docs/CONTRIBUTING.md.
2) Propose a minimal implementation plan with exact files to edit.
3) Implement in small patches.
4) Run focused tests first, then broader tests.
5) Summarize what changed and what remains optional.

Non-goals:
- [list things to avoid]
```

## Configuration checklist the AI should complete

- [ ] Choose base mode preset (`SideScrollerCanvas` or `TopDownCanvas`) or justify custom.
- [ ] Configure input helpers (`createPlayerInputActions`, keyboard, pointer, gamepad as needed).
- [ ] Wire audio cues via scene audio + `AudioBus`.
- [ ] Confirm save/load behavior and user-facing triggers.
- [ ] Add/update focused tests near changed modules.
- [ ] Update docs snippets in `docs/USAGE.md` and relevant cheat sheets.

## Prompt templates by task

Use these when you want the AI to execute a specific extension workflow with clear scope.

### 1) Add a new game mode preset

```txt
Implement a new game mode preset in this UrsaManus repo.

Target mode:
- [name + short behavior description]

Requirements:
- Reuse current mode architecture under src/components/gameModes/.
- Keep control semantics action-based (north/south/east/west/interact).
- Add a matching controls preset in src/components/screenController/ if needed.
- Keep canvas/render wiring compatible with current runtime path.

Deliverables:
1) New mode canvas preset component.
2) Optional matching controls preset.
3) Focused tests for mode behavior.
4) docs/USAGE.md snippet for copy/paste usage.

Validation:
- Run focused tests for the new mode and related controls.
- Report exact files changed.
```

### 2) Add or remap an input device

```txt
Extend input support in this UrsaManus repo.

Target device:
- [keyboard/pointer/gamepad/other]

Requirements:
- Keep gameplay logic in one action contract (north/south/east/west/interact).
- Keep mappings init-configurable.
- Reuse existing helpers in src/components/screenController first.
- Avoid duplicating movement logic across components.

Deliverables:
1) Input hook/adapter changes.
2) Focused tests for mapping behavior and edge cases.
3) docs/USAGE.md update if API changed.
4) docs/input/CHEATSHEET.md update with a remapping snippet.

Validation:
- Run focused input test files and summarize results.
```

### 3) Add a new HUD prefab/component

```txt
Add a reusable HUD prefab to this UrsaManus repo.

Component goal:
- [name + purpose]

Requirements:
- Build from existing UI primitives when possible.
- Keep props minimal and explicit.
- Add a demo entry under src/components/examples/ and ensure it can be mounted in app examples.

Deliverables:
1) New prefab component + styles (if needed).
2) Example component.
3) Focused tests for both prefab and example.
4) docs/USAGE.md copy/paste usage section.

Validation:
- Run focused tests for prefab/example behavior.
- Summarize API and default prop behavior.
```

### 4) Project bootstrap from template

```txt
Bootstrap a new project from this UrsaManus template.

Project profile:
- [genre/use-case]
- [platform + input priorities]
- [MVP scope]

Requirements:
- Update package metadata and project identity docs.
- Choose default mode preset(s) and input mappings.
- Configure save/load baseline (quick save only vs import/export).
- Keep changes minimal and avoid adding speculative features.

Deliverables:
1) Minimal project setup changes.
2) Updated docs map and getting-started snippets.
3) Focused tests for changed runtime behavior.

Validation:
- Run lint + tests and summarize any follow-up recommendations.
```

## Recommended mapping defaults

- Keyboard: `useActionKeyBindings(actions)`
- Pointer/tap: `usePointerTapTracking({ getTarget, onTap })`
- Gamepad: `useGamepadInput(actions, { deadzone, mapping })`

Keep gameplay logic in action handlers; keep device bindings declarative.

## “Done” definition for AI-driven changes

A change is done only when all of the following are true:

- Code compiles and lint passes.
- Focused tests for changed behavior pass.
- Any new public behavior has a usage snippet.
- Scope stayed within requested MVP.

## Bad prompt vs good prompt examples

Use these examples to keep AI requests specific, testable, and aligned with UrsaManus boundaries.

### Example A: Input feature request

Bad:

```txt
Add gamepad support.
```

Good:

```txt
Add gamepad input support using existing action semantics (north/south/east/west/interact).

Requirements:
- Use an init-configurable mapping API (axis/button/deadzone).
- Reuse existing screenController helpers before creating new primitives.
- Add focused tests for deadzone and remapping behavior.
- Update docs/USAGE.md and docs/input/CHEATSHEET.md with a copy/paste snippet.

Non-goals:
- Do not refactor unrelated input components.
```

### Example B: UI prefab request

Bad:

```txt
Make a cool HUD component.
```

Good:

```txt
Create a minimal HUD prefab named ResourceBar using existing primitives where possible.

Requirements:
- Keep props API minimal and typed.
- Add one example component under src/components/examples/.
- Add focused tests for prefab behavior and example rendering.
- Add docs/USAGE.md usage snippet.

Non-goals:
- No extra theme system or animation work.
```

### Example C: Project bootstrap request

Bad:

```txt
Set up my game from this repo.
```

Good:

```txt
Bootstrap a top-down MVP from this UrsaManus repo.

Project profile:
- Browser-only web game
- Keyboard + pointer now, gamepad later
- Quick save/load only for MVP

Requirements:
- Use TopDownCanvas + TopDownControls as baseline.
- Keep gameplay logic action-based.
- Add/update only files needed for MVP setup.
- Run lint and focused tests for changed behavior.
- Summarize exact files changed and optional next steps.

Non-goals:
- Do not add multiplayer, procedural worldgen, or extra menus.
```
