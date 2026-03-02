# UrsaManus TODO (Active)

This file tracks only active or upcoming work.

Completed history moved to:

- `docs/TODO_COMPLETED_2026-03-02.md`

## Current Sprint

### Recommended Build Order (Playable Loop First)

1. Grid-based movement foundation.
2. Controller support pass.
3. Virtual control stick (touch joystick) control.
4. Projectile systems.
5. Prefab firing weapons.
6. Spell prefab suite.
7. Grid/controller prefab pack + cheatsheet.
8. End-to-end game-building tutorial docs.

- [x] Grid-based movement foundation.
    - Deliverables:
        - tile/grid movement service (step + collision-aware movement).
        - deterministic movement config (tile size, move cadence, snap policy).
        - focused tests for movement rules and edge cases.

- [x] Controller support pass.
    - Deliverables:
        - gamepad/controller mapping presets for movement + interact + combat.
        - shared action mapping docs updates in `docs/USAGE.md` and `docs/input/CHEATSHEET.md`.
        - tests for default controller profile behavior.

- [x] Virtual control stick (touch joystick) control.
    - Deliverables:
        - reusable virtual analog stick component for movement input.
        - deadzone + sensitivity + optional snap-to-cardinal settings.
        - integration with shared action mapping and mobile input docs/snippets.
        - focused tests for drag, release, and direction output behavior.

- [x] Grid/controller prefab pack + cheatsheet.
    - Deliverables:
        - copy/paste prefabs for common movement/controller setups.
        - quick-reference tables and snippets in a cheatsheet doc.
        - docs links wired from `docs/USAGE.md`.

- [x] Projectile systems.
    - Deliverables:
        - projectile runtime service (spawn, travel, hit, despawn).
        - tuning knobs for speed, lifetime, spread, and collision behavior.
        - focused tests for deterministic projectile simulation.

- [x] Prefab firing weapons.
    - Deliverables:
        - drop-in weapon prefabs (single-shot, burst, auto).
        - ammo/cooldown/reload contract integration.
        - starter examples and tests.

- [x] Spell prefab suite.
    - Deliverables:
        - copy/paste spell prefabs (projectile spell, AoE pulse, channel beam).
        - effect/cooldown/resource contract hooks.
        - docs + usage snippets.

- [x] End-to-end game-building tutorial docs.
    - Deliverables:
        - step-by-step tutorial showing how to connect movement, controls, projectiles, weapons, and spells into a playable loop.
        - robust example set (minimal, full-featured, and override-heavy variants) with expected outcomes.
        - workflow cheatsheet covering build order, validation commands, and common troubleshooting paths.
        - cross-links from `docs/USAGE.md` and relevant cheatsheets.

## Next Up

- [x] Define next milestone scope (systems + docs + quality gates).
- [x] Break scope into P1/P2 deliverables.
- [x] Add explicit done criteria per deliverable.

### Milestone Scope (Defined)

#### P1 Deliverables

- Gameplay runtime baseline: `gridMovement`, `projectiles`, `weaponPrefabs`, `spellPrefabs`.
- Input baseline: controller presets + virtual control stick integration adapters.
- Starter content packs (P1):
    - `combat-encounter-pack`
    - `top-down-shooter-pack`
    - `quest-starter-pack`
    - `loot-economy-pack`
    - `survival-pack`
    - `puzzle-interaction-pack`
    - `mobile-controls-pack`
- Docs baseline: end-to-end tutorial + workflow cheatsheet + starter packs reference + prefab/input cheatsheet snippets.

#### P2 Deliverables

- Extended starter packs (P2):
    - `tower-defense-pack`
    - `dialogue-social-pack`
    - `roguelite-run-pack`
    - `traversal-pack`

#### Done Criteria (Explicit)

- Runtime/service criteria:
    - deterministic behavior covered by focused tests.
    - no compile/lint errors in changed files.
- Starter-pack criteria:
    - each pack has typed definition + tier + done criteria.
    - simulation report is `ok` with zero attach issues.
- Documentation criteria:
    - each new system is discoverable from `docs/USAGE.md`.
    - copy/paste snippets exist for setup + validation flow.
- Verification criteria:
    - focused suite passes for movement, controls, projectiles, weapons, spells, and starter packs.

## Prefab Brainstorm (Copy/Paste First)

### Combat

- [x] Combat encounter pack: wave spawner + elite/boss templates + objective hooks.
- [x] Top-down shooter pack: twin-stick player + weapon mods + enemy roles.
- [x] Tower-defense pack: turret prefab + path lanes + wave controller.

### Progression + Content

- [x] Quest starter pack: quest giver + tracker + rewards + completion UI.
- [x] Dialogue/NPC social pack: branching dialogue + merchant + faction rep hooks.
- [x] Loot/economy pack: chest + drop tables + vendor buy/sell + stash.
- [x] Roguelite run pack: room chain + meta currency + run summary flow.
- [x] Survival pack: hunger/thirst/stamina + gather/craft loop starter.

### World + Interaction

- [x] Puzzle/interaction pack: switches, doors, pressure plates, timed triggers.
- [x] Traversal pack: ladders, moving platforms, dash gates, teleports.

### UI + Input

- [x] Mobile controls starter pack: virtual stick + action buttons + responsive HUD layout presets.

## Parking Lot

- Add future ideas here when they are not yet committed to the current sprint.

## Update Rule

- Keep this file short.
- Move done items to the completed history file above.
