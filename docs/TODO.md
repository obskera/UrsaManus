# UrsaManus TODO (Current Next)

This file tracks the immediate next systems planned for UrsaManus.

## Next Features

### P1 — Core runtime utilities

- [Completed] Prefab composition registry + builder API.
    - Goal: register reusable prefab modules and compose them into copy/paste-ready presets.
    - Deliverables:
        - `createPrefabRegistry(...)` for module registration + lookup by domain/category.
        - `createPrefabBuilder(...)` for deterministic compose/override/finalize flow.
        - Validation path for required module dependencies and conflicting attachments.
        - JSON-safe `exportPrefabBlueprint(...)` and `importPrefabBlueprint(...)` helpers.

- [Completed] Entity attachment runtime contract.
    - Goal: standardize “attach this system bundle to entity X” behavior for player, enemy, and object archetypes.
    - Deliverables:
        - `attachPrefabModules(entityId, modules, ctx)` and `detachPrefabModules(...)` lifecycle helpers.
        - Shared attach status/report payload (attached, skipped, failed) for tooling + QA.
        - Signal hooks for `prefab:attached`, `prefab:detached`, and `prefab:attach-failed`.

- [Completed] Prefab defaults + override merge utility.
    - Goal: allow users to start from prefab defaults and progressively override without rewriting everything.
    - Deliverables:
        - `mergePrefabConfig(base, overrides)` utility with deterministic key ordering.
        - Policy for array merge semantics (`replace` vs `append`) per module domain.
        - Guardrails for invalid override keys + actionable diagnostics.

- [Completed] Prefab contract harness expansion.
    - Goal: scale contract tests as prefab count grows.
    - Deliverables:
        - Extend `prefabContractHarness` for module attach/detach/override scenarios.
        - Add reusable fixture matrix for player/enemy/object prefab blueprints.
        - Add aggregate npm gate for prefab contract suite.
    - Status (2026-03-01): delivered via runtime contract suite support in `src/tests/contracts/prefabContractHarness.tsx`, fixture matrix in `src/tests/contracts/fixtures/prefabBlueprintMatrix.ts`, runtime contract coverage in `src/tests/contracts/prefabRuntimeContractHarness.test.ts`, and aggregate gate `npm run quality:prefab:contracts`.

### P2 — Simulation modules (small + composable)

- [Completed] RPG player preset bundle (copy/paste starter).
    - Goal: one-call starter that wires common RPG player systems together.
    - Includes:
        - Core stats + equipment aggregation.
        - Inventory + hotbar + ability cooldown/effects.
        - Checkpoint/respawn + objective + interaction prompt hooks.
    - Deliverables:
        - `createRpgPlayerPrefab(...)` preset builder.
        - Minimal “required inputs” contract and sane defaults for rapid bootstrapping.
        - Example usage in docs + dev example scene.

- [Completed] Enemy archetype preset packs.
    - Goal: prefab enemy bundles users can drop in and tune.
    - Initial packs:
        - `melee-chaser` (pathfinding + combat + short cooldown ability).
        - `ranged-kiter` (spacing behavior + projectile cadence contract).
        - `tank-bruiser` (high HP/resistance + low mobility).
        - `boss-phase` (entity state machine profile + phase transition hooks).
    - Deliverables:
        - `createEnemyPrefabPack(...)` and per-pack config presets.
        - Shared enemy tuning schema for health/speed/damage/reward curves.

- [Completed] Object/interaction prefab packs.
    - Goal: reusable world-object prefabs for common RPG interactions.
    - Initial packs:
        - `loot-chest`, `shop-npc`, `quest-board`, `door-switch`, `checkpoint-statue`.
    - Deliverables:
        - `createObjectPrefabPack(...)` with interaction contracts and marker integration.
        - Save/load-ready object state snapshots for opened/used/completed status.

- [Completed] Spawn-ready prefab blueprint catalog.
    - Goal: ship starter blueprint JSON that can be imported and modified.
    - Deliverables:
        - `src/prefabs/blueprints/*` catalog for player/enemy/object baseline templates.
        - Validation CLI extension to verify prefab blueprint schema/version compatibility.

### P3 — Integration + tooling

- [Completed] Prefab starter wizard (tool mode).
    - Goal: guided flow to generate an entity prefab from selected modules.
    - Steps:
        - Pick archetype (`player`, `enemy`, `object`).
        - Pick base preset.
        - Enable optional modules.
        - Export blueprint JSON + generated integration snippet.
    - Status (2026-03-01): delivered with starter wizard service (`src/services/prefabStarterWizard.ts`) plus standalone tool-mode shell via `?tool=prefab` in `src/App.tsx`, backed by `src/components/examples/PrefabStarterWizardToolExample.tsx` for archetype/preset selection, module selection, and blueprint/snippet export flow.

- [Completed] “Promote from prefab” workflow docs.
    - Goal: show users how to start simple and grow complexity safely.
    - Deliverables:
        - Quickstart path: base prefab -> tune overrides -> extract custom module.
        - “When to fork vs when to override” decision guide.
        - Troubleshooting guide for module conflicts and missing dependencies.
    - Status (2026-03-01): delivered in `docs/prefabs/PREFAB_WORKFLOW.md` and linked from `docs/USAGE.md`.

- [Completed] Prefab migration + compatibility policy.
    - Goal: prevent breaking changes as prefab schema evolves.
    - Deliverables:
        - Versioned prefab schema + migration utility.
        - Compatibility notes template for release artifacts.
        - Gate checks in release verification for prefab schema-change safety.
    - Status (2026-03-01): delivered via `src/services/prefabMigration.ts`, `scripts/prefabMigrationCheck.ts`, release gate wiring in `package.json` (`prefab:migration:check` included in `release:verify`), and compatibility notes template in `docs/prefabs/PREFAB_COMPATIBILITY_NOTES.md`.

- [Completed] Prefab observability/dev diagnostics.
    - Goal: make prefab composition failures easy to debug.
    - Deliverables:
        - Dev panel section showing attached modules and unresolved dependencies.
        - Structured telemetry events for attach/override/migration failures.
        - One-click “prefab health report” snapshot export.
    - Status (2026-03-01): delivered with diagnostics service + telemetry (`src/services/prefabDiagnostics.ts`), one-click health report export, and dev panel diagnostics section/actions in `src/App.tsx` (`Capture Prefab Health`, `Export Prefab Health Report`) showing attached modules and unresolved dependencies.

### P4 — Prefab variety expansion (next wave)

- [Completed] Player prefab pack expansion (high variety).
    - Goal: provide many ready-to-use player archetypes with minimal setup.
    - Candidate packs:
        - `arpg-player` (dash, stamina, i-frames, quick-slot actions).
        - `jrpg-party-lead` (turn-order hooks, party commands, status resist).
        - `survival-crafter` (hunger/thirst/stamina + gather/craft loops).
        - `twin-stick-shooter` (aim channel + weapon swap + recoil profile).
        - `stealth-infiltrator` (visibility/noise meters + takedown hooks).
        - `platformer-mobility` (double jump, coyote time, wall slide/jump).
    - Deliverables:
        - `createPlayerPrefabPack(...)` variants + typed defaults.
        - Profile cards documenting intended genre/use case + tuning knobs.
    - Status (2026-03-01): delivered via expanded `createPlayerPrefabPack(...)` archetypes in `src/services/prefabPacks.ts` (`arpg-player`, `jrpg-party-lead`, `survival-crafter`, `twin-stick-shooter`, `stealth-infiltrator`, `platformer-mobility`) plus focused coverage in `src/tests/prefabPacks.test.ts` and runtime contract matrix coverage in `src/tests/contracts/fixtures/prefabBlueprintMatrix.ts`.

- [Completed] Enemy prefab pack expansion (combat + AI roles).
    - Goal: drop-in enemy role variety for encounters and progression loops.
    - Candidate packs:
        - `swarm-rusher`, `elite-affix`, `summoner-controller`, `shield-guard`, `support-healer`, `sniper-kiter`, `turret-stationary`, `phase-boss-scripted`.
    - Deliverables:
        - Role-oriented behavior defaults (`aggro`, `spacing`, `cadence`, `retreat`, `support-priority`).
        - Reusable affix overlay modules (`enraged`, `vampiric`, `reflect`, `volatile`).
    - Status (2026-03-01): delivered with expanded `createEnemyPrefabPack(...)` archetypes in `src/services/prefabPacks.ts` (`swarm-rusher`, `support-healer`, `shield-guard`, `sniper-kiter`) and role modules (`enemy.swarm-rush`, `enemy.support-aura`, `enemy.shield-guard`, `enemy.sniper-profile`), plus coverage in `src/tests/prefabPacks.test.ts`, `src/tests/contracts/fixtures/prefabBlueprintMatrix.ts`, `src/services/prefabStarterWizard.ts`, and `src/tests/prefabStarterWizard.test.ts`.

- [Completed] Object/world prefab pack expansion (systems-rich objects).
    - Goal: broad set of reusable world interactions and puzzle/economy props.
    - Candidate packs:
        - `breakable-container`, `resource-node`, `crafting-station`, `bank-stash`, `fast-travel-point`, `trap-floor`, `switch-network`, `locked-door`, `escort-cart`, `arena-trigger`.
    - Deliverables:
        - Persistent object-state contracts and save snapshot coverage.
        - Interaction-prompt + marker + objective tracker integration defaults.
    - Status (2026-03-01): delivered with expanded `createObjectPrefabPack(...)` archetypes in `src/services/prefabPacks.ts` covering `breakable-container`, `resource-node`, `crafting-station`, `bank-stash`, `fast-travel-point`, `trap-floor`, `switch-network`, `locked-door`, `escort-cart`, and `arena-trigger` (plus existing object presets), with coverage in `src/tests/prefabPacks.test.ts`, runtime fixture matrix in `src/tests/contracts/fixtures/prefabBlueprintMatrix.ts`, wizard preset integration in `src/services/prefabStarterWizard.ts`, and preset catalog tests in `src/tests/prefabStarterWizard.test.ts`.

- [Completed] NPC/social prefab packs.
    - Goal: richer non-combat prefab templates for quests and narrative.
    - Candidate packs:
        - `quest-giver`, `follower-companion`, `merchant-tiered`, `trainer-skill-tree`, `faction-rep-agent`, `town-ambient-npc`.
    - Deliverables:
        - Dialogue + objective + reward hooks prewired.
        - Reputation/faction hook points with deterministic state transitions.
    - Status (2026-03-01): delivered via expanded object-domain NPC/social archetypes in `src/services/prefabPacks.ts` (`quest-giver`, `follower-companion`, `merchant-tiered`, `trainer-skill-tree`, `faction-rep-agent`, `town-ambient-npc`) and modules (`object.npc.quest-giver`, `object.npc.follower-companion`, `object.npc.merchant-tiered`, `object.npc.trainer-skill-tree`, `object.npc.faction-rep-agent`, `object.npc.town-ambient`), plus coverage in `src/tests/prefabPacks.test.ts`, runtime contract fixture matrix additions in `src/tests/contracts/fixtures/prefabBlueprintMatrix.ts`, wizard preset integration in `src/services/prefabStarterWizard.ts`, and preset catalog tests in `src/tests/prefabStarterWizard.test.ts`.

- [Completed] Encounter scenario prefab bundles.
    - Goal: copy/paste encounter kits combining player/enemy/object prefabs.
    - Candidate bundles:
        - `starter-camp`, `dungeon-room-loop`, `boss-antechamber`, `survival-wave-field`, `town-social-hub`.
    - Deliverables:
        - Spawn-ready JSON bundle templates.
        - One-command validation + simulation smoke checks.
    - Status (2026-03-01): delivered with encounter bundle service + simulation runtime in `src/services/prefabEncounterBundles.ts`, spawn-ready templates in `src/prefabs/encounters/*.encounter.json` (`starter-camp`, `dungeon-room-loop`, `boss-antechamber`, `survival-wave-field`, `town-social-hub`), one-command smoke CLI `npm run prefab:encounter:smoke` via `scripts/prefabEncounterSmoke.ts`, and unit coverage in `src/tests/prefabEncounterBundles.test.ts`.

- [Completed] Builder helper: prefab variant/inheritance workflow.
    - Goal: derive variants without cloning full payloads.
    - Deliverables:
        - `extends`/`inherits` blueprint mechanism with override traceability.
        - Conflict detection for deep variant chains.
        - Resolved-view export for final flattened payloads.
    - Status (2026-03-01): delivered with variant resolver service in `src/services/prefabVariantInheritance.ts` supporting `extends`/`inherits` resolution, override trace lineage (`moduleSources` + `lineage`), deep chain cycle/domain/composition issue reporting, and flattened export via `exportResolvedPrefabVariantBlueprint(...)`; covered by `src/tests/prefabVariantInheritance.test.ts`.

- [Completed] Builder helper: batch tuning + balancing overlays.
    - Goal: tune many prefabs quickly and safely.
    - Deliverables:
        - Batch patch utility for scalar knobs (hp/damage/speed/reward curves).
        - Diff preview + rollback snapshots before apply.
        - Preset-based tuning modes (`easy`, `normal`, `hard`, `nightmare`).
    - Status (2026-03-01): delivered with `src/services/prefabBatchTuning.ts` (scalar knob overlay helper, diff preview reporting, in-memory snapshots + rollback, and preset modes), CLI command `npm run prefab:tuning:batch` via `scripts/prefabBatchTuning.ts` (preview-first flow with `--apply` filesystem rollback snapshots under `tmp/prefab-tuning-snapshots`), package script wiring in `package.json`, and focused coverage in `src/tests/prefabBatchTuning.test.ts`.

- [Completed] Builder helper: prefab dependency advisor.
    - Goal: help users discover missing modules and recommended add-ons.
    - Deliverables:
        - Recommendation engine for required/optional modules by archetype.
        - Explainability output (`why this module is recommended`).
        - Quick-fix actions in tool-mode wizard.
    - Status (2026-03-01): delivered with advisor service `src/services/prefabDependencyAdvisor.ts` (required/optional recommendation engine with explainability and quick-fix application), starter wizard integration in `src/services/prefabStarterWizard.ts` (`recommendModulesForSelection(...)`, `applyModuleQuickFix(...)`), and tool-mode quick-fix UX in `src/components/examples/PrefabStarterWizardToolExample.tsx`; covered by `src/tests/prefabDependencyAdvisor.test.ts`, `src/tests/prefabStarterWizard.test.ts`, and `src/tests/PrefabStarterWizardToolExample.test.tsx`.

- [Completed] Builder helper: prefab simulation sandbox.
    - Goal: instant sanity tests before runtime integration.
    - Deliverables:
        - Simulate attach/detach/update loops with deterministic seed.
        - Contract stress scenarios (conflicts, missing deps, migration edge cases).
        - Exportable diagnostics snapshots for CI artifacts.
    - Status (2026-03-01): delivered via simulation service `src/services/prefabSimulationSandbox.ts` with deterministic seeded scenarios, attach/detach/update-loop simulation, contract stress scenarios (`module-conflict`, `missing-dependency`), migration-edge scenarios (legacy + invalid payloads), and snapshot export (`um-prefab-simulation-sandbox-v1`); CLI command `npm run prefab:sandbox:simulate` in `scripts/prefabSimulationSandbox.ts`; focused coverage in `src/tests/prefabSimulationSandbox.test.ts`.

- [Completed] Robust prefab example matrix (beyond happy path).
    - Goal: ship usage examples that cover real-world integration depth.
    - Deliverables:
        - For each major prefab: `minimal`, `full-featured`, `override-heavy`, `migration/legacy` examples.
        - App examples tab entries + focused tests for each variant.
        - Example index docs linking source + expected outcomes.
    - Status (2026-03-01): delivered with matrix catalog service `src/services/prefabExampleMatrix.ts` covering player/enemy/object domains and all four variants (`minimal`, `full-featured`, `override-heavy`, `migration-legacy`) including legacy-v0 migration checks; surfaced in dev examples tab via `src/components/examples/PrefabExampleMatrixExample.tsx` and `src/App.tsx`; focused coverage added in `src/tests/prefabExampleMatrix.test.ts` and `src/tests/PrefabExampleMatrixExample.test.tsx`; index documentation added at `docs/prefabs/PREFAB_EXAMPLE_INDEX.md` and linked from `docs/prefabs/PREFAB_WORKFLOW.md`.

- [Completed] Copy-paste prefab cheatsheet pack.
    - Goal: make prefab adoption fast with direct drop-in snippets.
    - Deliverables:
        - `docs/prefabs/CHEATSHEET.md` (top 30 copy/paste snippets).
        - `docs/prefabs/PLAYER_PREFABS.md`, `ENEMY_PREFABS.md`, `OBJECT_PREFABS.md` quick-reference tables.
        - “Start here in 5 minutes” snippet flow (wizard + runtime attach + export/import).
    - Status (2026-03-01): delivered with snippet pack `docs/prefabs/CHEATSHEET.md` (30 copy/paste snippets, including 5-minute start flow from wizard build -> blueprint export/import -> runtime attach), plus domain reference tables in `docs/prefabs/PLAYER_PREFABS.md`, `docs/prefabs/ENEMY_PREFABS.md`, and `docs/prefabs/OBJECT_PREFABS.md`; linked from `docs/prefabs/PREFAB_WORKFLOW.md`.

- [Completed] AI prefab usage docs + prompt recipes.
    - Goal: make AI-assisted prefab authoring consistent and safe.
    - Deliverables:
        - `docs/ai/PREFAB_AI_QUICKSTART.md` (AI workflow entrypoint).
        - `docs/ai/PREFAB_PROMPT_CHEATSHEET.md` (copy/paste prompts by goal).
        - `docs/ai/PREFAB_PROMPT_RECIPES.md` (genre-specific prompt templates and expected outputs).
        - `docs/ai/PREFAB_GENERATION_GUARDRAILS.md` (schema/version safety, validation commands, anti-hallucination constraints).
        - `docs/ai/PREFAB_REVIEW_CHECKLIST.md` (AI output review rubric before merge).
    - Status (2026-03-01): delivered under `docs/ai/` with quickstart, copy/paste prompt cheatsheet, genre recipes, generation guardrails, and merge review checklist.

- [Completed] AI contract + verification flow for prefab generation.
    - Goal: guarantee AI-generated prefab payloads are production-safe.
    - Deliverables:
        - Standard command sequence for AI outputs: `prefab:validate` -> `prefab:migration:check` -> `quality:prefab:contracts`.
        - “Reject reasons” catalog for invalid AI output classes.
        - CI artifact report summarizing AI-generated prefab validation outcomes.
    - Status (2026-03-01): completed end-to-end with command sequence + reject-reasons catalog + artifact schema in `docs/ai/PREFAB_AI_VERIFICATION_FLOW.md`, automation script `scripts/prefabAiVerificationReport.ts`, npm command `npm run prefab:ai:verify`, and CI wiring in `.github/workflows/ci.yml` (artifact upload: `tmp/cert/prefab-ai-verification-report.json`).

- [Completed] Prefab docs quality gate.
    - Goal: ensure every new prefab ships with examples + docs parity.
    - Deliverables:
        - `npm run quality:prefab:docs` gate requiring: usage docs, cheatsheet snippet, and example test linkage.
        - Contributor checklist update enforcing prefab docs + AI docs updates for prefab PRs.
    - Status (2026-03-01): delivered with docs quality gate script `scripts/prefabDocsQuality.ts` and npm command `npm run quality:prefab:docs` (required prefab docs presence, cheatsheet snippet/5-minute flow checks, and example test linkage checks), plus PR checklist enforcement update in `docs/CONTRIBUTING.md`.

## Recently Completed

### 2026-03-01 (Backlog sweep)

#### P1 additions (high impact)

#### P1 quick wins (stability + iteration)

#### P2 additions (gameplay loop)

#### P3 additions (authoring + tooling)

#### Now batch (completed)

- [Completed] Bottable UI authoring components for level design (tile placement editor; MVP complete, integration pending).
    - Status (2026-03-01): MVP + runtime bootstrap integration implemented.
        - Added standalone tool-mode page (`?tool=tilemap`) with paint/erase grid editing, layer add/remove/select/visibility, clear layer, and map resize flows.
        - Added tile brush selection UX improvements: quick-select tile buttons, dedicated eyedropper `Pick mode` (auto-returns to paint), and `Alt+click` tile-pick shortcut.
        - Added deterministic JSON import/export (textarea + file import/export) backed by shared placement service + focused tests.
        - Added authored collision profile controls in tile tool export flow (layer IDs/name keywords/tile-ID allowlist/fallback toggle) with payload round-trip + runtime bootstrap consumption.
        - Added object/entity overlay authoring in tile tool (`Overlay mode`) with deterministic payload export/import linkage and runtime bootstrap injection.
        - Added advanced layer tooling in tile tool and service (`lock`, `reorder`, `duplicate`, `merge`) with deterministic payload support and regression coverage.
        - Added runtime bootstrap integration path that loads tilemap recovery payload into app startup world sizing/world-bounds when no quick-save restore is present.
        - Added tile-based runtime collision overlay injection as deterministic obstacle colliders at startup bootstrap.
        - Added collision semantics profile support (solid layer IDs/name rules + optional tile-id profile + visible-layer fallback toggle).
    - Remaining: none for current tilemap tooling baseline.

- [Completed] Robust documentation for tool usage + tool-builder workflows.
    - Status (2026-03-01): delivered for current documentation baseline.
        - Added localhost quickstart docs for standalone tool pages (`?tool=tilemap`, `?tool=bgm`) in `README.md` + `docs/USAGE.md`.
        - Added manual GitHub workflow run docs (no auto push/PR runs).
        - Added tools docs pack: `docs/tools/README.md`, `docs/tools/TILEMAP_TOOL.md`, `docs/tools/BGM_COMPOSER_TOOL.md`, `docs/tools/TOOL_BUILDER_GUIDE.md`.
        - Added starter + certification artifacts: `docs/tools/TOOL_STARTER_TEMPLATE.md`, `docs/tools/certification/example-tool-certification.report.json`, `docs/tools/certification/example-tool-certification.summary.md`.
        - Added operator walkthrough docs with screenshot/GIF checkpoints: `docs/tools/walkthroughs/TILEMAP_WALKTHROUGH.md`, `docs/tools/walkthroughs/BGM_COMPOSER_WALKTHROUGH.md`.
        - Added walkthrough media folder/assets (`docs/tools/walkthroughs/media/*`) and linked media guidance from walkthrough docs index.
        - Captured and committed walkthrough screenshot media assets for tilemap and BGM flows via automated capture pipeline (`scripts/captureToolWalkthroughMedia.ts`, `npm run tools:walkthrough:capture`) and marked checklist captures complete.
        - Expanded builder guide with concrete tool-type blueprints for audio, narrative, and economy workflows.
    - Remaining: none for current documentation baseline.

- [Completed] Plug-and-play tool certification gate.
    - Status (2026-03-01): significant progress delivered.
        - Added `scripts/recoveryContractCheck.ts` and npm command `npm run recovery:contract` to fail on autosave-contract bypass patterns.
        - Added focused policy/service tests: `src/tests/recoveryContractPolicy.test.ts`, `src/tests/toolRecoverySnapshot.test.ts`.
        - Added aggregate gate `npm run quality:recovery` and wired it into `npm run release:verify`.
        - Added concrete certification checklist artifact: `docs/tools/certification/TOOL_CERTIFICATION_CHECKLIST.md`.
        - Added golden-file contract suite and fixtures for representative tool payloads: `src/tests/contracts/toolPayloadGolden.contract.test.tsx` + `src/tests/contracts/fixtures/*`.
        - Added certification quality gate command `npm run quality:tool:certification` and wired it into manual CI + `release:verify`.
        - Added certification report helper command `npm run tool:certification:report` (`scripts/toolCertificationReport.ts`).
        - Wired release workflow to generate and upload certification artifacts (`tool-certification-<tag>`).
    - Remaining: none for current certification gate baseline.

- [Completed] Editor workflow resilience baseline (all authoring tools).
    - Status (2026-03-01): delivered for current authoring-tool baseline.
        - Added deterministic undo/redo history in tilemap and bgm authoring tools with bounded history depth.
        - Added dirty-state tracking + browser unload guard while unsaved edits are present in both tools.
        - Added autosave/recovery snapshots via localStorage for both tools to recover in-progress sessions.
        - Added shared cross-tool recovery snapshot envelope contract (`um-tool-recovery-v1`) + helper service (`src/services/toolRecoverySnapshot.ts`).
        - Added explicit recovery-state affordances in both tool UIs (last autosave timestamp display + manual recover/clear actions).
        - Documented recovery contract in `docs/tools/TOOL_BUILDER_GUIDE.md`.
        - Added deterministic action log output for core tilemap editing operations.
        - Added focused regression coverage for undo/redo, dirty-state unload guards, and autosave/recovery behavior in both tool test suites.
        - Added cross-tool regression coverage to enforce recovery helper/control presence for tool pages (`src/tests/toolRecoveryContractCoverage.test.ts`).
    - Remaining: none for current authoring-tool resilience baseline.

- [Completed] Source-control friendly authored-data workflow.
    - Status (2026-03-01): foundational pieces implemented.
        - Added shared JSON file helper + shared JSON parse/stringify/status utilities used by both tool MVPs.
        - Tool payloads currently export deterministic pretty JSON for cleaner diffs.
        - Added canonical payload field-order contract docs for tilemap/BGM payloads (`docs/tools/PAYLOAD_FIELD_ORDER.md`).
        - Added authored JSON merge-conflict repair guidance (`docs/tools/AUTHORED_DATA_CONFLICT_REPAIR.md`).
        - Added split-file export prototype + round-trip assemble parity utility for tilemaps (`src/services/tileMapSplitPayload.ts`, `scripts/tilemapSplitPayload.ts`, `src/tests/tileMapSplitPayload.test.ts`).
    - Remaining: none for current authored-data workflow baseline.

- [Completed] Chiptune-style micro BGM composer tool (NES-like motif sequencer; MVP complete, integration/docs expansion pending).
    - Status (2026-03-01): MVP implemented ahead of schedule.
        - Added standalone tool-mode page (`?tool=bgm`) with JSON authoring, schema validation, preset strip (`Intro`, `Loop A`, `Battle`), and file import/export.
        - Added preview playback scheduling through `audioBus` + `SoundManager`, including loop preview and per-step mute/solo/channel overrides.
        - Added runtime bootstrap contract service (`src/services/bgmRuntimeBootstrap.ts`) for deterministic cue resolution from BGM recovery payloads.
        - Expanded effect expression support to include `filter` + `send` in BGM payload/runtime cue normalization.
        - Added deterministic cue-shape hooks for effect/bend expression (`gainMultiplier`, `bendScale`, retrigger pattern, restart policy) in runtime bootstrap + preview scheduling.
        - Added focused tests for validation, presets, preview controls, and import behavior.
        - Added focused runtime contract tests (`src/tests/bgmRuntimeBootstrap.test.ts`).
    - Remaining: none for current BGM MVP/runtime-contract baseline.

#### Next batch (completed)

- [Completed] Authoring spec + docs for BGM composition JSON.
    - Status (2026-03-01): delivered.
        - Published full markdown spec (`docs/tools/BGM_JSON_SPEC.md`) with field-by-field guide, starter example, runtime contract notes, and common error catalog.
        - Expanded effect expression docs to include `filter` + `send` and cue-shape hook behavior.
    - Remaining: none for current BGM JSON authoring spec baseline.

- [Completed] Release promotion enforcement for tool certification.
    - Status (2026-03-01): delivered for current promotion baseline.
        - Added certification status enforcement script (`scripts/certificationStatusCheck.ts`) and npm command `npm run tool:certification:status`.
        - Wired release workflow preflight to enforce no `fail` certification statuses before promotion artifact upload.
        - Added schema-change promotion guard (`scripts/releaseSchemaChangeGuard.ts`, `npm run release:tool:schema:guard`) and wired it into release preflight.
        - Added required migration + compatibility artifacts for schema-change releases (`docs/tools/SCHEMA_MIGRATION_NOTES.md`, `docs/tools/TOOL_COMPATIBILITY_NOTES.md`).
        - Added explicit rollback guidance for tool-output compatibility regressions in compatibility notes.
    - Remaining: none for current release promotion/certification enforcement baseline.

- [Completed] In-editor playtest and round-trip loop.
    - Status (2026-03-01): delivered for current playtest-loop baseline.
        - Added one-click runtime playtest launch actions in tilemap/BGM tools that persist current authored snapshot before opening runtime mode.
        - Added in-tool pre-launch validation/status summary for BGM playtest launch failures/success.
        - Added focused regression coverage for runtime playtest launch controls.
        - Added explicit round-trip verification controls in tilemap/BGM tools that re-import current payloads and report semantic drift status.
        - Added focused regression coverage for round-trip verification pass/fail paths.
        - Added consolidated post-launch runtime validation summary capture in runtime bootstrap handoff (loaded/warning/error counts), including persisted summary envelope.
    - Remaining: none for current in-editor playtest/round-trip baseline.

- [Completed] Authoring-tool accessibility baseline.
    - Status (2026-03-01): delivered for current accessibility baseline.
        - Published baseline requirements doc for tool accessibility (`docs/tools/TOOL_ACCESSIBILITY_BASELINE.md`) covering keyboard-only operation, focus order, labels, non-pointer parity, status visibility, reduced motion, and contrast expectations.
        - Added certification-gate enforcement requiring `accessibility-baseline` pass evidence in report checks (`scripts/certificationStatusCheck.ts`, `scripts/toolCertificationReport.ts`).
        - Updated certification checklist and example artifacts to align with required accessibility baseline pass criteria.
        - Added operator-facing non-pointer/keyboard workflow guidance in tool docs (`docs/tools/TILEMAP_TOOL.md`, `docs/tools/BGM_COMPOSER_TOOL.md`).
    - Remaining: none for current authoring-tool accessibility baseline.

#### Later batch (completed)

- [Completed] Tool scalability and performance budgets.
    - Status (2026-03-01): delivered for current performance-budget baseline.
        - Defined tool-runtime budget contracts for tilemap/BGM workflows (`src/services/toolPerformanceBudgets.ts`) and documented thresholds (`docs/tools/TOOL_PERFORMANCE_BUDGETS.md`).
        - Added synthetic large-project fixture builders for perf smoke checks (`src/tests/fixtures/toolPerfFixtures.ts`).
        - Added executable perf smoke command (`scripts/toolPerfSmoke.ts`, `npm run tool:perf:smoke`, `npm run quality:tool:perf`) with budget pass/fail gating.
        - Added lightweight in-tool diagnostics in tilemap/BGM UIs (payload size + last sample + `Run perf diagnostics` action).
    - Remaining: none for current tool scalability/performance budget baseline.

### 2026-03-01 (Prefab backlog sweep)

#### P2 delivered

- Cutscene sequence system.
    - Status (2026-03-01): delivered for current prefab baseline.
        - Added timeline/step runner service with `text`/`toast`/`wait`/`signal`/`camera`/`transition` steps (`src/services/cutsceneSequence.ts`).
        - Added optional `awaitInput` flow + timed update progression and explicit `continue()` control.
        - Added skip policy support (`disabled`, `hold-to-skip`, `instant`) and completion callback path.
        - Added decoupled `onText` + `onToast` hooks plus focused regression coverage (`src/tests/cutsceneSequence.test.ts`).

- Dialogue system (JSON-driven for cutscenes).
    - Status (2026-03-01): delivered for current prefab baseline.
        - Added parser/validator for typed dialogue payloads, including legacy `{ character, dialogues }` conversion (`src/services/dialogueCutscene.ts`).
        - Added extended node/choice schema support: `id`, `speakerId`, `speakerName`, `portrait`, `emotion`, `voiceCue`, `awaitInput`, `speedMs`, `choices`, `next`, `tags`.
        - Added branching path resolution with linear fallback when no branch target is selected.
        - Added conversion helpers from dialogue payloads to cutscene sequence steps and tests (`src/tests/dialogueCutscene.test.ts`).

- Inventory core module + store.
    - Status (2026-03-01): delivered for current prefab baseline.
        - Added typed inventory item/container/slot runtime schema and bounded container constraints (`src/services/inventoryCore.ts`).
        - Added deterministic add/remove/split/merge/move flows with stack/weight handling.
        - Added focused regression coverage (`src/tests/inventoryCore.test.ts`).

- Backpack UI prefab.
    - Status (2026-03-01): delivered for current prefab baseline.
        - Added reusable grid container component with compact + expanded variants (`src/components/backpack/Backpack.tsx`).
        - Added slot selection affordance and accessibility labels for non-pointer workflows.
        - Added focused component coverage (`src/tests/Backpack.test.tsx`).

- Drag-and-drop inventory interactions.
    - Status (2026-03-01): delivered for current prefab baseline.
        - Added modular drag session service for split/merge/swap workflows (`src/services/inventoryDragDrop.ts`).
        - Added deterministic invalid-drop rollback behavior and integration tests (`src/tests/inventoryCore.test.ts`).

- Hotbar prefab.
    - Status (2026-03-01): delivered for current prefab baseline.
        - Added hotbar runtime service with 1–10 slots, active index state, key mapping, and cooldown/disabled hooks (`src/services/hotbar.ts`).
        - Added item/action binding support and inventory item slot binding helper.
        - Added reusable hotbar UI component + tests (`src/components/hotbar/Hotbar.tsx`, `src/tests/hotbar.test.ts`, `src/tests/Hotbar.test.tsx`).

- Checkpoint/respawn prefab.
    - Status (2026-03-01): delivered for current prefab baseline.
        - Added checkpoint registration/activation service with snapshot export/import and respawn payload resolution (`src/services/checkpointRespawn.ts`).
        - Added optional transition/audio hook metadata in respawn results.
        - Added focused prefab coverage (`src/tests/prefabSystems.test.ts`).

- Wave spawner prefab.
    - Status (2026-03-01): delivered for current prefab baseline.
        - Added wave spawner service with `count`, `cadenceMs`, `maxActive`, `tags`, and `difficultyScalar` support (`src/services/waveSpawner.ts`).
        - Added deterministic update loop and completion tracking coverage (`src/tests/prefabSystems.test.ts`).

#### P3 delivered

- Loot/drop table prefab.
    - Status (2026-03-01): delivered in prior milestone via loot economy service baseline (`src/services/lootEconomy.ts`, `src/tests/lootEconomy.test.ts`).

- Objective tracker prefab.
    - Status (2026-03-01): delivered for current prefab baseline.
        - Added modular objective tracker service with `pending`/`active`/`completed`/`failed` states and status signals (`src/services/objectiveTracker.ts`).
        - Added focused objective signal/state regression coverage (`src/tests/prefabSystems.test.ts`).

- Interaction prompt prefab.
    - Status (2026-03-01): delivered for current prefab baseline.
        - Added proximity-driven interaction prompt service with action gating and cooldown feedback (`src/services/interactionPrompt.ts`).
        - Added focused proximity/cooldown behavior coverage (`src/tests/prefabSystems.test.ts`).

- Dialogue/cutscene sequence prefab.
    - Status (2026-03-01): delivered for current prefab baseline through `cutsceneSequence` + `dialogueCutscene` services and tests.

### 2026-03-01 (Additional completions)

- Toasts prefab completion:
    - added lightweight screen-space toast prefab in `src/components/toasts/Toasts.tsx` with anchored stacked positioning (`top-left`, `top-right`, `bottom-left`, `bottom-right`).
    - prefab supports deterministic toast list rendering with typed variants (`info`, `success`, `warn`, `error`) and optional per-variant icon/style slots.
    - lifecycle callback now supports timed auto-dismiss and manual dismiss flows through `onDismiss` with explicit dismiss reasons.
    - added deterministic queue helper in `src/components/toasts/createToastQueue.ts` with queue operations (`enqueue`, `dequeue`, `remove`, `peek`, `clear`).
    - added dev example in `src/components/examples/ToastsExample.tsx` and focused coverage in `src/tests/Toasts.test.tsx`, `src/tests/toastQueue.test.ts`, and `src/tests/ToastsExample.test.tsx`.

- TextBox prefab completion:
    - added spawnable text box prefab in `src/components/textBox/TextBox.tsx` with coordinate placement (`x`, `y`), width, and max-lines clamp behavior.
    - prefab supports static and typewriter reveal modes, configurable alignment/surface/text slots, and optional portrait/icon rendering.
    - lifecycle callbacks now support open/update/close and auto-close timer-driven close behavior for deterministic flows.
    - added deterministic queue helper in `src/components/textBox/createTextBoxQueue.ts` with explicit `queue` (FIFO) and `stack` (LIFO) policies.
    - added dev example in `src/components/examples/TextBoxExample.tsx` and focused coverage in `src/tests/TextBox.test.tsx`, `src/tests/textBoxQueue.test.ts`, and `src/tests/TextBoxExample.test.tsx`.

- Accessibility QA matrix completion:
    - added shared accessibility QA matrix validation service in `src/services/accessibilityQaMatrix.ts` for repeatable keyboard-navigation, readability/contrast, reduced-motion, and assist-timing checklist enforcement.
    - added executable accessibility QA CLI in `scripts/accessibilityQaMatrix.ts` with npm command `npm run accessibility:qa` and optional JSON output (`--json --pretty`).
    - focused deterministic coverage added in `src/tests/accessibilityQaMatrix.test.ts` for required area/check coverage, failing-status handling, and version contract validation.
    - npm tooling now includes `npm run test:accessibility:qa` and aggregate gate `npm run quality:accessibility`, and release verification now includes accessibility QA gating.

- Economy/content balancing governance completion:
    - added shared governance evaluation service in `src/services/balancingGovernance.ts` for tuning ownership, benchmark threshold checks, and major-update signoff enforcement.
    - governance policy/report parsing now validates authored payload contracts (`version: 1`) before evaluation for deterministic tooling behavior.
    - added executable governance CLI in `scripts/balanceGovernance.ts` with npm command `npm run balance:governance` and optional policy override via `--policy`.
    - major update reports now require owner signoff coverage derived from affected domains (`combat`, `economy`) before passing governance checks.
    - focused deterministic coverage added in `src/tests/balancingGovernance.test.ts`, and npm tooling now includes `npm run test:balancing:governance` and aggregate gate `npm run quality:balance`.

- Asset pipeline tooling completion:
    - added shared asset validation service in `src/services/assetValidation.ts` for sprite/audio reference checks, atlas/pack workflow validation, and missing-asset detection.
    - validation now resolves both alias imports (`@/assets/...`) and public URL references (including URL-encoded paths such as `/beep%201.wav`) to runtime asset files.
    - added executable CLI command in `scripts/assetValidate.ts` with npm command `npm run asset:validate` and configurable byte-budget flags for total/sprite/audio/atlas sizes.
    - added focused deterministic coverage in `src/tests/assetValidation.test.ts` for missing references, budget enforcement, and atlas workflow mismatch reporting.
    - npm tooling includes focused test command `npm run test:asset:validation` in `package.json`.

- Release pipeline + versioning completion:
    - added release automation workflow in `.github/workflows/release.yml` for semantic version tags (`v*.*.*`) and manual promotion dispatch.
    - release flow now generates structured release notes/changelog sections via `scripts/releaseChangelog.ts` and npm command `npm run release:changelog`.
    - build artifact verification now validates dist outputs and writes integrity metadata (`SHA256SUMS.txt`, `release-manifest.json`) via `scripts/releaseVerifyArtifacts.ts`.
    - promotion gates are defined through staged environments (`release-staging`, `release-production`) with staged artifact manifest checks before publication.
    - rollback path is supported by manual workflow dispatch against a previously known-good release tag (`release_tag`) for controlled re-promotion.

- Balancing simulator tooling completion:
    - added deterministic balancing simulator service in `src/services/balancingSimulator.ts` for combat and economy scenario preset runs.
    - batch execution now supports authored preset payload parsing/validation (`version: 1`) and aggregate tuning report output.
    - added batch CLI runner in `scripts/balancingSimulate.ts` with seed control and optional JSON output for report automation workflows.
    - added focused deterministic coverage in `src/tests/balancingSimulator.test.ts` for combat/economy summaries plus payload validation behavior.
    - npm tooling includes `npm run balance:simulate` and `npm run test:balancing:simulator` in `package.json`.

- CI quality gates for content completion:
    - added dedicated npm gate scripts in `package.json` for domain-specific authored-content validation (`dialogue`, `quest`, `placement`) and focused contract/migration regression tests.
    - added aggregated content gate command `npm run quality:content` for deterministic pre-merge checks.
    - CI workflow in `.github/workflows/ci.yml` now includes a dedicated `content-quality-gates` job that fails on content schema/migration/contract regressions.
    - fast gate path now validates authored content plus prefab contract/migration regression suites before merge.

- Encounter/content authoring presets completion:
    - added reusable encounter preset service in `src/services/encounterPresets.ts` for spawn packs, objective bundles, reward bundles, and template composition.
    - template registration now validates bundle references so authored encounter presets remain self-consistent.
    - preset payload sharing now supports deterministic JSON import/export workflows through `exportPayload(...)` and `importPayload(...)`.
    - focused deterministic coverage added in `src/tests/encounterPresets.test.ts` for registration, reference checks, lifecycle signals, and round-trip payload handling.

- Localization/text key pipeline completion:
    - added shared localization service in `src/services/localization.ts` with locale + fallback locale catalogs and token interpolation support.
    - added prompt key-resolution helper for localized payload routing across `dialogue`, `textbox`, and `toast` channels.
    - tutorial prompt emission now supports localized prompt message resolution through `createTutorialOnboardingService(...)` resolver hooks.
    - focused deterministic coverage added in `src/tests/localization.test.ts` for locale fallback behavior and tutorial prompt integration.

- Content validation CLI (authored JSON) completion:
    - added shared authored-content validation service in `src/services/contentValidation.ts` for `dialogue`, `quest`, `loot`, and `placement` domains.
    - schema-version preflight/migration checks now run through `createVersionedSchemaMigration(...)` for content payload compatibility handling.
    - quest/loot/placement validation paths now reuse runtime registration/import contracts (`createQuestMissionService(...)`, `createLootEconomyService(...)`, `createWorldEntityPlacementService(...)`) to keep CLI/runtime behavior aligned.
    - added executable CLI command in `scripts/contentValidate.ts` with npm script `npm run content:validate` and actionable JSON-path failure output.
    - focused deterministic coverage added in `src/tests/contentValidation.test.ts`.

- Prefab contract test harness completion:
    - added reusable prefab contract test harness utility in `src/tests/contracts/prefabContractHarness.tsx`.
    - shared contract runner now supports render/lifecycle assertions and optional input contract checks via `runPrefabContractSuite(...)`.
    - representative prefab coverage now validates `Toggle` and `HUDSlot` contract compliance in `src/tests/prefabContractHarness.test.tsx`.
    - focused deterministic coverage confirms contract helper behavior and integration consistency for future prefab additions.

- Visual world/entity placement tool completion:
    - added world entity placement authoring service in `src/services/worldEntityPlacement.ts`.
    - editor-mode placement workflows now support place/move/delete operations with grid snap and world bounds validation.
    - lightweight gizmo-equivalent runtime controls are available for select, drag (`moveSelected(...)`), and duplicate (`duplicateSelected(...)`) actions.
    - save/export + import workflows are available through deterministic JSON payload helpers (`exportPayload(...)`, `importPayload(...)`).
    - focused deterministic coverage added in `src/tests/worldEntityPlacement.test.ts`.

- Multiplayer readiness boundary completion:
    - added multiplayer boundary contract service in `src/services/multiplayerBoundary.ts`.
    - deterministic simulation domains can now be declared with explicit state-authority ownership (`server`, `client`, `shared`).
    - replication-safe API lists are now validated through deterministic boundary evaluation checks.
    - readiness reporting now summarizes deterministic/non-deterministic contracts and replication-safe API coverage.
    - focused deterministic coverage added in `src/tests/multiplayerBoundary.test.ts`.

- Tutorial/onboarding state machine completion:
    - added tutorial onboarding state-machine service in `src/services/tutorialOnboarding.ts`.
    - step-driven onboarding flow now supports deterministic gate checks, step progression, and lifecycle signals.
    - runtime supports prompt hook payload emission for dialogue/textbox/toast integrations.
    - skip/resume semantics and persisted state export/restore are available for completion persistence workflows.
    - focused deterministic coverage added in `src/tests/tutorialOnboarding.test.ts`.

- World streaming/chunk loader completion:
    - added world streaming service in `src/services/worldStreaming.ts`.
    - chunk/region load-unload lifecycle now supports active radius and preload radius policies for deterministic streaming windows.
    - entity activation/deactivation now resolves deterministically from active chunk coverage, with support for always-active entities.
    - runtime supports manual forced chunk loading for controlled prewarm/load scenarios.
    - focused deterministic coverage added in `src/tests/worldStreaming.test.ts`.

- Loot/progression economy system completion:
    - added loot/progression economy service in `src/services/lootEconomy.ts`.
    - deterministic weighted drop table rolls now support tier metadata, quantity ranges, and affix pool hooks.
    - reusable reward bundles now compose static item/currency rewards with referenced drop table rolls.
    - economy table pricing lookups are available for balancing vendor buy/sell values by item id.
    - focused deterministic coverage added in `src/tests/lootEconomy.test.ts`.

- Ability + cooldown effects system completion:
    - added typed ability cooldown/effects service in `src/services/abilityCooldownEffects.ts`.
    - active/passive ability definitions now support cast conditions, resource cost hooks, and shared cooldown groups.
    - active ability casts support deterministic effect hook outputs and timed effect expiry lifecycle handling.
    - service emits cast/cooldown/effect lifecycle signals for HUD/action button/cooldown indicator integration.
    - focused deterministic coverage added in `src/tests/abilityCooldownEffects.test.ts`.

- Pathfinding/navigation grid completion:
    - added reusable pathfinding + navigation grid service in `src/services/pathfindingNavigation.ts`.
    - deterministic tile-grid A\* path queries now support NPC patrol/chase/navigation path resolution.
    - flow-field generation support is available for crowd/steering-friendly next-step lookups.
    - world-space to tile-space conversion helpers align path queries with collision/world tile coordinates.
    - focused deterministic coverage added in `src/tests/pathfindingNavigation.test.ts`.

- Camera system v2 completion:
    - added camera v2 service in `src/services/cameraV2.ts`.
    - gameplay follow behavior now supports dead-zone and velocity-based look-ahead smoothing.
    - configurable room/world bounds and layered shake channels are available for deterministic runtime camera control.
    - scripted camera tracks now support keyframe interpolation for cutscene/cinematic camera paths.
    - focused deterministic coverage added in `src/tests/cameraV2.test.ts`.

- Map + mini-map system completion:
    - added shared map/minimap state service in `src/services/mapMiniMap.ts`.
    - world map model now tracks discovery/fog state, player position, and map/minimap channel view state.
    - marker resolution supports configurable layer visibility (including objective/NPC/checkpoint workflows) plus per-channel zoom/scale policies.
    - minimap marker filtering applies deterministic player-relative radius behavior derived from zoom policy.
    - focused deterministic coverage added in `src/tests/mapMiniMap.test.ts`.

- Equipment + stats aggregation completion:
    - added equipment stats aggregation service in `src/services/equipmentStats.ts`.
    - stat resolution pipeline now supports deterministic `base + gear + effects` composition with typed stat modifiers.
    - exposes derived stat projections for combat (`damageReduction`, combat-facing totals), movement (`maxSpeedScale`), and HUD consumption via `getResolvedStats(...)` and snapshots.
    - emits stats lifecycle signals (`stats:equipment:changed`, `stats:equipment:equipped`, `stats:equipment:effect-applied`) for integration hooks.
    - focused deterministic coverage added in `src/tests/equipmentStats.test.ts`.

- Entity state machine system (behavior + animation) completion:
    - extended entity behavior state machine profiles in `src/logic/entity/entityStateMachine.ts`.
    - per-archetype guarded state transitions now cover core states (`idle`, `moving`, `attacking`, `damaged`, `stunned`, `dead`) plus taxonomy states for `player` (`dodge`, `block`), `npc` (`patrol`, `flee`), and `boss` (`phase-1`, `phase-2`).
    - behavior state and animation clip resolution are now bound to one source-of-truth through `resolveEntityAnimationClip(...)` and profile machine `getAnimationClip()`.
    - transition priorities/interrupt rules are enforced in profile transitions (including `damaged` interrupt behavior) with `onEnter`/`onExit` hook support.
    - focused deterministic coverage added in `src/tests/entityStateMachine.test.ts`.

- Combat core module completion:
    - added combat core service in `src/services/combatCore.ts`.
    - hit/hurt resolution now supports typed damage (`physical`, `magic`, `true`) with per-target resistance hooks.
    - invulnerability windows and knockback payload capture are integrated in `applyHit(...)` outcomes.
    - emits combat lifecycle signals (`combat:hit:applied`, `combat:hit:blocked`, `combat:entity:defeated`) for gameplay/UI integrations.
    - focused deterministic coverage added in `src/tests/combatCore.test.ts`.

- Quest/mission system completion:
    - added quest mission service in `src/services/questMissions.ts`.
    - supports objective graph transitions with deterministic runtime states (`pending`, `active`, `completed`, `failed`).
    - includes reward hook integration for objective-level and mission-level completion outcomes.
    - emits mission progress/completion/failure lifecycle signals (`quest:mission:progress`, `quest:mission:completed`, `quest:mission:failed`).
    - focused deterministic coverage added in `src/tests/questMissions.test.ts`.

- Observability baseline completion:
    - added observability baseline service in `src/services/observabilityBaseline.ts`.
    - structured telemetry schema now supports crash, perf-regression, and content-validation failure event categories.
    - baseline triage/trend reporting is available through `getSnapshot(...)` and `getBaselineReport(...)`.
    - emits baseline diagnostics signals (`observability:baseline:event-recorded`, `observability:baseline:report`).
    - focused deterministic coverage added in `src/tests/observabilityBaseline.test.ts`.

- Save/content import security hardening completion:
    - hardened import path in `src/services/save/file.ts` with strict size and parse guardrails.
    - import options now support configurable limits (`maxBytes`, `maxJsonNodes`, `maxJsonDepth`).
    - oversized payloads are rejected before apply (`payload-too-large`).
    - unsafe/malicious payload shapes are rejected before migration/rehydration (`unsafe-payload`).
    - focused coverage added for size-limit and unsafe-payload guards in `src/tests/save.file.test.ts`.

- Memory lifecycle management completion:
    - added memory lifecycle service in `src/services/memoryLifecycle.ts`.
    - explicit allocate/dispose contracts are available for textures, audio buffers, emitters, runtime caches, and custom resources.
    - long-session leak diagnostics are available through `scanForLeaks(...)`, `getLeakDiagnostics(...)`, and aggregate memory snapshots.
    - emits lifecycle diagnostics signals (`memory:lifecycle:allocated`, `memory:lifecycle:disposed`, `memory:lifecycle:leak-detected`, `memory:lifecycle:leak-scan-completed`).
    - focused deterministic coverage added in `src/tests/memoryLifecycle.test.ts`.

- Save slot manager + rollback snapshots completion:
    - added save slot manager service in `src/services/save/slots.ts`.
    - supports multi-slot profile persistence with metadata fields (`slot`, `timestamp`, `playtime`, `version`).
    - includes rollback snapshot capture on slot overwrite and restore flow via `restoreRollbackSnapshot(...)`.
    - emits slot lifecycle diagnostics signals for save/load/delete/rollback events.
    - focused deterministic coverage added in `src/tests/save.slots.test.ts`.

- Mod/plugin sandbox + capability permissions completion:
    - added plugin sandbox service in `src/services/pluginSandbox.ts`.
    - plugin manifests now support explicit capability grants for render hooks, data access scopes, and signal emit/subscribe scopes.
    - runtime plugin API is mediated by sandbox checks (`createRuntime(pluginId)`) to enforce granted boundaries.
    - protected engine/runtime write domains are denied by default even when plugins request broad write grants.
    - emits sandbox lifecycle signals (`plugin:sandbox:action`, `plugin:sandbox:denied`) for diagnostics integration.
    - focused deterministic coverage added in `src/tests/pluginSandbox.test.ts`.

- Profiling snapshot tooling completion:
    - added profiling snapshot service in `src/services/profilingSnapshots.ts`.
    - one-click capture supports frame timing, entity counts, active effects, and optional per-subsystem timing payloads.
    - snapshot comparison APIs (`compareSnapshots(...)`, `compareLatestToPrevious(...)`) provide delta output with threshold-based regression flags.
    - emits lifecycle signals (`profiling:snapshot:captured`, `profiling:snapshot:compared`) for diagnostics tooling integration.
    - focused deterministic coverage added in `src/tests/profilingSnapshots.test.ts`.

- Crash-safe recovery flow completion:
    - added startup recovery service in `src/services/save/recovery.ts`.
    - startup check pipeline (`inspectStartup()`) now classifies persisted save state and reports structured diagnostics for corrupted payloads.
    - restore/reset actions are available via `restorePersisted()` and `resetPersisted()` for safe user-facing fallback flows.
    - emits recovery lifecycle signals (`save:recovery:startup-checked`, `save:recovery:restore-applied`, `save:recovery:reset-applied`, `save:recovery:failed`).
    - focused deterministic coverage added in `src/tests/save.recovery.test.ts`.

- Performance budgets + alerts completion:
    - added runtime budget diagnostics service in `src/services/performanceBudgets.ts`.
    - supports frame/entity/effect thresholds plus per-subsystem timing thresholds with alert emission.
    - includes report history and subsystem hotspot summaries for quick triage (`getRecentReports(...)`, `getSubsystemSummary(...)`).
    - exposes lifecycle diagnostics signals (`performance:budget:evaluated`, `performance:budget:alert`) and log hooks.
    - focused deterministic coverage added in `src/tests/performanceBudgets.test.ts`.

- Error telemetry + dev diagnostics completion:
    - added structured runtime telemetry service in `src/services/errorTelemetry.ts`.
    - emits normalized runtime events with context payloads (`severity`, `subsystem`, `statePhase`, `entityRefs`, optional metadata/source).
    - includes dev diagnostics hooks through `subscribe(...)`, `createLogHook(...)`, and filtered `getSnapshot(...)` queries.
    - emits lifecycle signals (`error:telemetry:captured`, `error:telemetry:cleared`) for overlay/log integrations.
    - focused deterministic coverage added in `src/tests/errorTelemetry.test.ts`.

- Accessibility runtime settings completion:
    - added persisted accessibility settings service in `src/services/accessibilitySettings.ts`.
    - includes text scale, hold-vs-toggle control mode, reduced flash/shake toggles, and subtitle speed settings.
    - exposed minimal UI prefab hook `useAccessibilitySettings(...)` in `src/components/screenController/useAccessibilitySettings.ts`.
    - focused coverage added in `src/tests/accessibilitySettings.test.ts` and `src/tests/useAccessibilitySettings.test.tsx`.

- Unified marker/POI registry completion:
    - added shared marker authority service in `src/services/markerRegistry.ts`.
    - supports typed categories, channel visibility rules, context predicates, and priority stacking via stack groups.
    - resolves markers for map/minimap/objective-tracker/interaction-prompt consumers without duplicate stores.
    - emits registry change signal (`markers:registry:changed`) for UI/system subscribers.
    - focused deterministic coverage added in `src/tests/markerRegistry.test.ts`.

- Content hot-reload pipeline completion:
    - added dev-oriented hot-reload service in `src/services/contentHotReload.ts`.
    - supports domain-targeted reload handlers for `dialogue`, `quest`, `map`, and `editor` without full app restart.
    - watcher path routing can resolve file paths into domain reload requests with targeted runtime refresh signals.
    - emits lifecycle signals for requested/applied/failed reload events and per-domain refresh notifications.
    - focused coverage added in `src/tests/contentHotReload.test.ts`.

- Schema migration framework completion:
    - added reusable versioned migration utility in `src/services/schemaMigration.ts` (`createVersionedSchemaMigration(...)`).
    - utility provides preflight validation plus migration fallback outcomes for unsupported versions.
    - integrated save schema pipeline in `src/services/save/schema.ts` with legacy `v0 -> v1` migration support and `preflightSaveGameMigration(...)`.
    - runtime import path now accepts migratable saves through `migrateSaveGame(...)` in `src/services/save/file.ts`.
    - focused migration coverage added in `src/tests/schemaMigration.test.ts`, plus save migration assertions in `src/tests/save.schema.test.ts` and `src/tests/save.state.test.ts`.

- Deterministic replay system completion:
    - added deterministic replay capture service in `src/services/replay.ts`.
    - supports input/event timeline capture with seed snapshots through `createDeterministicReplayRecorder(...)`.
    - includes import/export helpers (`exportReplayPayload`, `parseReplayPayload`, `validateReplayPayload`) for regression reproduction payloads.
    - includes deterministic playback cursor utility `createReplayCursor(...)` for time-based event playback.
    - focused coverage added in `src/tests/replay.test.ts`.

- Interaction system core completion:
    - added a unified interaction contract in `DataBus` with `setEntityInteractionContract(...)`, `resolveEntityInteraction(...)`, `resolvePlayerInteraction(...)`, and interaction execution helpers.
    - contract supports `canInteract`, `interact`, and custom `blockedReason` callbacks with deterministic status output.
    - interaction resolution now includes distance gating, line-of-sight raycast gating, and input-mode hint labels for keyboard/controller/pointer.
    - focused coverage added in `src/tests/DataBus.interaction.test.ts`.

- Dev-mode state sanitizer/reset completion:
    - expanded development sanitize utility scopes in `src/services/save/sanitize.ts` to support `save-only`, `input-profiles`, and `all`.
    - scoped `input-profiles` cleanup now targets only persisted keys prefixed by `ursa:input-profile`.
    - app-level sanitize actions are confirmation-gated and available via dev controls plus keyboard shortcuts (`Alt + Shift + Q`, `Alt + Shift + Y`, `Alt + Shift + R`).
    - focused coverage added in `src/tests/save.sanitize.test.ts` for scoped profile-only sanitize behavior.

- Game state flow controller completion:
    - added canonical runtime state flow service in `src/services/gameStateFlow.ts`.
    - supports guarded transitions across `boot`, `menu`, `play`, `pause`, `cutscene`, and `gameover`.
    - provides transition hooks via `subscribe(...)`, `onEnter(...)`, and `onExit(...)`.
    - blocked transition events are emitted for invalid state hops; focused coverage added in `src/tests/gameStateFlow.test.ts`.

- Next prefab wave completion:
    - added two HUD prefabs in `src/components/hudAnchor`: `SurvivalHUDPreset` and `BossEncounterHUDPreset`.
    - locked minimal props APIs for both prefabs and preserved slot override support through `createHudPresetSlots(...)`.
    - added example components in `src/components/examples`: `SurvivalHUDPresetExample` and `BossEncounterHUDPresetExample`.
    - added focused prefab/example tests in `src/tests/SurvivalHUDPreset.test.tsx`, `src/tests/BossEncounterHUDPreset.test.tsx`, `src/tests/SurvivalHUDPresetExample.test.tsx`, and `src/tests/BossEncounterHUDPresetExample.test.tsx`.

- Level/world generation expansion completion:
    - added biome/path composition helpers in `src/logic/worldgen/biomePathComposition.ts`.
    - composition now supports deterministic biome map generation, path carving, and sprite-tile palette rule output.
    - `createWorldgenScenario(...)` supports optional composition overlays and start-to-objective path linking.
    - added scene preset builders in `src/logic/worldgen/presets.ts` for fast generated run bootstraps (`compact-run`, `cavern-run`, `gauntlet-run`).
    - focused deterministic tests added in `src/tests/worldgenComposition.test.ts`, `src/tests/worldgenPresets.test.ts`, and `src/tests/worldgenScenario.test.ts`.

- Input systems expansion completion:
    - added input profile preset helpers in `src/components/screenController/inputProfiles.ts` for keyboard/gamepad/pointer composition.
    - supports optional profile persistence via `saveInputProfilePreset`, `loadInputProfilePreset`, and `clearInputProfilePreset`.
    - includes multi-device composition helper `createInputProfileBindings(...)` and hook wrapper `useInputProfileBindings(...)`.
    - focused deterministic tests added in `src/tests/inputProfiles.test.ts`.

- Status effect modifiers module completion:
    - added typed status-effects simulation utility in `src/logic/simulation/statusEffects.ts`.
    - supports `slow`, `haste`, `burn`, and `regen` with duration, stacking policy (`stack`/`refresh`/`replace`), and interval tick policies.
    - integrated with `DataBus` movement/physics flow via entity speed scaling and per-step status ticking.
    - emits deterministic status tick/expiry signals (`STATUS_EFFECT_TICK_SIGNAL`, `STATUS_EFFECT_EXPIRED_SIGNAL`) and includes focused coverage for stacking, refresh, and expiry rules.

- Environmental forces module completion:
    - added composable force-zone utility in `src/logic/simulation/environmentalForces.ts`.
    - supports area-based directional velocity modifiers and optional per-entity-type drag scaling.
    - integrated with `DataBus.stepPhysics(...)` so zones apply without render-engine rewrites.
    - deterministic coverage added in `src/tests/environmentalForces.test.ts` and `src/tests/DataBus.physics.test.ts`.

- Growth/tick simulation module completion:
    - added deterministic growth tick utility in `src/logic/simulation/growthTick.ts` with stage flow `seed -> sprout -> mature`.
    - supports configurable stage durations, deterministic seed-based timing jitter, and pause/resume controls.
    - emits growth stage transition events via `GROWTH_STAGE_TRANSITION_SIGNAL`.
    - focused tests added in `src/tests/growthTick.test.ts`.

- NPC behavior module completion:
    - expanded NPC archetype presets in `DataBus` to include `idle-roam`, waypoint `patrol`, `chase`, plus `flee` override.
    - behavior updates remain modular in simulation path (`stepPhysics`) with no render coupling.
    - focused deterministic behavior tests added for roaming, waypoint patrol, chase distance gating, and flee override.

- Global world pause controller completion:
    - runtime pause reason stack now supports scoped pause/resume ordering with `pauseWorld(reason)` and `resumeWorld(reason)`.
    - world simulation and player gameplay input remain gated while paused.
    - pause lifecycle hooks are available via `onPause(...)` and `onResume(...)` callbacks.
    - deterministic edge-trigger tests validate freeze behavior plus pause/resume hook emission ordering.

- Screen-wide canvas effects baseline:
    - added stackable screen pass controller in `src/components/effects/screenPseudoShader/createScreenPseudoShaderCanvasPass.ts`.
    - supported post-process variants: `tint`, `monochrome`, `scanline`, `wavy`, `vhs`.
    - effects are configurable via registration helpers/signals (`set`, `push`, `remove`, `clear`) and preset apply events.
    - deterministic preset set added for mode/cutscene styling (`cutscene-warm`, `cutscene-cold`, `flashback-mono`, `vhs-noir`).
    - focused tests added in `src/tests/screenPseudoShaderCanvasPass.test.ts`.

- Canvas pseudo-shader effects baseline:
    - added reusable sprite post-process passes (`tint`, `flash`, `outline`, `desaturate`) in `src/components/effects/spritePseudoShader/spritePseudoShader.ts`.
    - effects are runtime/plugin-friendly through exported helpers and optional per-entity `spriteEffects` configs in `Render`/`SpriteBatch` flow.
    - focused visual math + sequencing tests added in `src/tests/spritePseudoShader.test.ts`.

- Animation state machine utility baseline:
    - added low-level FSM primitive in `src/logic/entity/animationStateMachine.ts` with guarded transition graph support.
    - transitions support both signal-triggered and time-based flow via `send(...)` and `update(...)`, plus `onEnter` / `onExit` hooks.
    - added entity-profile integration helper `createBasicEntityAnimationProfileStateMachine()` in `src/logic/entity/entityStateMachine.ts`.
    - focused tests added in `src/tests/animationStateMachine.test.ts` and docs now include runtime integration snippets.

- Sprite animation atlas + clip helper baseline:
    - added `createSpriteAnimationClips(...)` in `src/logic/entity/spriteAnimationAtlas.ts` for typed clip definitions from explicit `frames` or `range` metadata.
    - clip options now support per-clip/default `fps` and loop modes (`loop`, `once`, `ping-pong`) with deterministic frame sampling via `sampleSpriteClipFrame(...)`.
    - validation guards enforce non-empty/unique clip names and in-bounds frame coordinates against atlas tile dimensions.
    - focused tests added in `src/tests/spriteAnimationAtlas.test.ts` and usage docs include raw-metadata copy/paste examples.

- Timer signal helper baseline:
    - added typed timer service (`once`, `interval`, `cooldown`) in `src/services/timerSignals.ts` with signal-based payload emissions.
    - timers support pause/resume/cancel semantics and shared cancellation (`cancelAll`) for deterministic orchestration.
    - focused tests added in `src/tests/timerSignals.test.ts` and docs updated with scheduling snippets.

- Debug/perf helper panel baseline:
    - default app dev panel now includes live perf sampling (`fps`, smoothed `frameMs`) and entity counts (`total`, `enemy`).
    - canvas meta pills now include perf/entity counters for at-a-glance runtime checks.
    - implementation remains dev-only and does not alter production runtime flow.

### 2026-02-27

- Worldgen end-to-end baseline:
    - deterministic pipeline shipped for tile map -> room map -> spawn anchors -> world-space conversion -> DataBus payloads -> Entity bridge -> safe DataBus apply helpers.
    - sprite-tile-friendly options are supported throughout generation and spawn markers.
    - one-call scenario composition (`createWorldgenScenario`) is in place.
    - focused tests cover deterministic behavior and integration flow.
    - docs + cheat sheets include copy/paste examples (`docs/USAGE.md`, `docs/worldgen/CHEATSHEET.md`).

- Input controls baseline completion:
    - pointer tap tracking (`usePointerTapTracking`) + debug readout integrated.
    - app-level canvas tap feedback is live (8px red marker + `beep 1.wav`).
    - gamepad helper (`useGamepadInput`) supports init-time mapping, deadzone, and connect/disconnect callbacks.
    - docs + cheat sheets updated with copy/paste mapping patterns.

- App canvas click/tap feedback:
    - inside-canvas tap/click now renders an 8px red marker aligned to canvas-local coordinates (including container padding).
    - plays `ui:tap:beep` cue mapped to `/beep%201.wav`.
    - verified with full test run: 69 files passed, 289 tests passed.

- Pointer click/tap tracking foundation:
    - added reusable `usePointerTapTracking` helper with position payload (`client` + `local`) and inside/outside target bounds detection.
    - emits `POINTER_TAP_SIGNAL` (`input:pointer:tap`) and supports per-call callback handlers.
    - integrated tracking/debug readout in `DefaultInputStyleExample` with focused tests.

- Rendering/effects parity checkpoint:
    - ran `npm run test:run` on full suite.
    - result: 78 files passed, 320 tests passed.

- Render re-rig plan retirement:
    - removed `docs/RENDER_RERIG_PLAN.md` after architecture convergence and cleanup completion.
    - migration/completion history remains tracked in this file under completed milestones.

### Earlier Milestones

- AbilityBar prefab MVP:
    - added `AbilityBar` under `hudAnchor` using `ActionButton` cooldown/disabled behavior.
    - added `AbilityBarExample` in the dev examples panel.
    - added focused tests for prefab and example behavior.
    - documented usage in `docs/USAGE.md`.

- Effects canvas migration — Phase 6 legacy decommission:
    - removed `ScreenTransitionOverlay` and `ParticleEmitterOverlay` components and tests.
    - removed `useScreenTransitionCanvasPass` and `useParticleEmitterCanvasPass` legacy hook path.
    - removed legacy overlay/hook exports from effects barrel modules.
    - app now runs through runtime-owned effects/transition registration.

- Effects canvas migration — Phase 4 transition pass conversion:
    - transition signal subscription/update/draw now runs through a canvas stage pass (`createScreenTransitionCanvasPass`).
    - `Render` runtime registers and drives transition pass execution inside the main frame.
    - all transition variants and lifecycle callbacks (`onCovered`, `onComplete`) remain supported.
    - transitions are enabled by default in the runtime path.

- Effects canvas migration — Phase 3 particle pass conversion:
    - particle signal subscription/update/draw now runs through a canvas stage pass (`createParticleEmitterCanvasPass`).
    - `Render` runtime registers and drives particle pass execution inside the main frame.
    - particle signal API remains stable for callers.

- Effects canvas migration — Phase 2 render wiring:
    - `Render` accepted optional shared `effectsStage` during migration and executed it after world draw.
    - this path was superseded by runtime-owned pass registration in Phase 6.
    - overlay fallback wiring from migration is removed.

- Effects canvas migration — Phase 1 foundation:
    - shared canvas effects contract (`CanvasEffectPass`) with `isActive`, `update`, and `draw`
    - stage coordinator (`CanvasEffectsStage`) with deterministic layer order (`particles` -> `transition`)
    - contract exported from `@/components/effects` and documented in usage/architecture docs

- Sample sidescroller mini game MVP:
    - collect/avoid loop with win/lose states and restart flow (`SideScrollerMiniGameExample`)
    - scene assembled from `SideScrollerCanvas`, `SideScrollerControls`, `PlatformerHUDPreset`, and `DataBus` player-position checks
    - example entry added in dev examples tab + focused behavior tests

- Sample top-down mini game MVP:
    - objective loop with win/lose states and restart flow (`TopDownMiniGameExample`)
    - scene assembled from `TopDownCanvas`, `TopDownControls`, `TopDownHUDPreset`, and `DataBus` player-position checks
    - example entry added in dev examples tab + focused behavior tests

- AudioBus and scene audio prefab foundations:
    - typed `AudioBus` service (`play`, `stop`, channel/master mute + volume state)
    - `SoundManager` prefab that registers cues and plays tone/file cue definitions
    - scene wiring in `SideScrollerCanvas` + `TopDownCanvas` with looping music cues
    - usage docs added for AudioBus + SoundManager patterns

- UI menu templates and state-loop examples:
    - reusable menu components: `MainMenu`, `PauseMenu`, `GameOverScreen`
    - MVP flow examples for each menu type (navigation, actions, transitions)
    - focused behavior test coverage for each menu example

- UI primitives and HUD building blocks:
    - `LifeGauge`, `ActionButton`, `Toggle`, `CooldownIndicator`, `HUDSlot`, `HUDAnchor`
    - `QuickHUDLayout`, `PlatformerHUDPreset`, `TopDownHUDPreset`
    - shared slot resolver: `createHudPresetSlots`

- Mobile/input controls and navigation helpers:
    - `VirtualDPad`, `VirtualActionButton`
    - focus + keyboard navigation helpers (`getFocusableElements`, `handleArrowFocusNavigation`)
    - input mapping adapters for reusable components (`createInputComponentAdapters`)
    - input-mapping templates + cheat sheets for key/on-screen controls

- Examples, tests, and usage docs:
    - Example Components tab previews: `LifeGaugeExample`, `ActionButtonExample`, `CooldownIndicatorExample`, `AbilityBarExample`, `HUDSlotExample`, `HUDAnchorExample`, `QuickHUDLayoutExample`, `PlatformerHUDPresetExample`, `TopDownHUDPresetExample`
    - focused tests added for primitives, examples, and mode presets
    - expanded `docs/USAGE.md` copy/paste coverage, including `createHudPresetSlots` composition snippets

- Styling and save/load foundation:
    - default reusable style primitives (`um-*`) with baseline utility tokens/classes
    - save/load MVP implementation (quick save/load, import/export, UX wiring, hardening)
    - save docs pack: `docs/save/README.md`, `docs/save/CHEATSHEET.md`, `src/services/save/README.md`

## Documentation Map

- [USAGE.md](USAGE.md) — practical usage patterns and examples
- [ARCHITECTURE.md](ARCHITECTURE.md) — system responsibilities and lifecycle flow
- [AI_SETUP.md](AI_SETUP.md) — AI-assisted project bootstrap and prompt templates
- [input/CHEATSHEET.md](input/CHEATSHEET.md) — input mapping quick reference
- [worldgen/CHEATSHEET.md](worldgen/CHEATSHEET.md) — worldgen + spawn integration quick reference
- [save/README.md](save/README.md) — save/load implementation walkthrough
- [save/CHEATSHEET.md](save/CHEATSHEET.md) — save/load quick reference

## Notes

These items are intentionally scoped as modular additions so the engine remains small at its core and extensible over time.
