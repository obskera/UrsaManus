# Plug-and-Play Tool Builder Guide

Use this guide when adding new authoring/editor tools that must integrate cleanly with runtime.

## Design Goals

- Deterministic output payloads
- Versioned schemas with compatibility policy
- Localhost standalone launch path
- Clear validation + actionable error messages
- Test coverage for critical authoring flows

## Required Contracts

Each new tool should define:

1. Payload version constant
2. Typed payload schema
3. Validation function(s)
4. Export API (string + file)
5. Import API (string + file)
6. Snapshot/read model for UI rendering
7. Recovery snapshot contract for autosave/restore

## Recovery Snapshot Contract (v1)

Use shared helper service `src/services/toolRecoverySnapshot.ts` for all tool autosave flows.

Envelope shape:

- `version`: `"um-tool-recovery-v1"`
- `toolKey`: unique tool key (`tilemap`, `bgm`, etc.)
- `savedAt`: ISO timestamp when snapshot was persisted
- `payloadRaw`: raw authored JSON string to restore

Implementation rules:

- Keep one storage key per tool via `buildToolRecoveryStorageKey(toolKey)` (`um:tools:<toolKey>:autosave:v1`).
- Persist snapshots on edit cadence (debounced is acceptable).
- Validate both envelope and tool payload before restore.
- Clear corrupt snapshots and surface actionable status messages.

## Registration + Launch Pattern

1. Add tool component under `src/components/examples/` (or dedicated tool module).
2. Add standalone query-mode route in `src/App.tsx` (`?tool=<key>`).
3. Add docs links in:
    - `docs/USAGE.md`
    - `README.md`
    - `docs/tools/README.md`

## Plug-and-Play Compatibility Checklist

- [ ] Output includes schema/version field
- [ ] Import rejects malformed payloads with explicit messages
- [ ] Export is deterministic (stable formatting/order)
- [ ] Runtime loader/parsing contract is documented
- [ ] Focused tests validate create/edit/import/export paths
- [ ] Manual localhost boot instructions are documented

## Testing Minimum

- Service tests:
    - validation
    - import/export round-trip
    - edge-case failures
- UI tests:
    - key authoring interactions
    - import/export controls
    - status/error reporting

## CI and Promotion Expectations

- New tool tests must be included in quality gates.
- Recovery contract gate (`npm run quality:recovery`) must pass for tool promotion readiness.
- Accessibility baseline requirements in `docs/tools/TOOL_ACCESSIBILITY_BASELINE.md` must be met and reflected in certification artifacts.
- Tool performance smoke budgets in `docs/tools/TOOL_PERFORMANCE_BUDGETS.md` should pass (`npm run quality:tool:perf`) before release promotion.
- Contract or schema changes must update:
    - `docs/tools/SCHEMA_MIGRATION_NOTES.md`
    - `docs/tools/TOOL_COMPATIBILITY_NOTES.md`
- Release schema guard (`npm run release:tool:schema:guard`) enforces these doc updates for promotion workflows.
- Release promotion should be blocked when tool-certification checks fail.

## Starter Template (Quick Skeleton)

1. Create typed document model and validator.
2. Build minimal tool UI with:
    - controls
    - JSON editor
    - validate/import/export actions
3. Add standalone launch mode (`?tool=<key>`).
4. Add tests and docs before marking as ready.

## Tool-Type Example Blueprints

Use these as concrete starting points when creating non-tilemap tools.

### Audio Tool Example (BGM/Loop Authoring)

- Tool key: `bgm`
- Version field: `version: "um-bgm-v1"`
- Core document sections:
    - `palette[]` (id/file/gain)
    - `sequence[]` (step/soundId/length/effects)
    - `loop` (start/end)
- Runtime compatibility target:
    - deterministic preview in tool
    - runtime loader accepts exported sequence without transform
- Minimum tests:
    - unknown `soundId` validation failure
    - loop bounds validation
    - round-trip export/import stability

### Narrative Tool Example (Dialogue/Cutscene Authoring)

- Tool key: `narrative`
- Suggested version field: `version: "um-dialogue-v1"`
- Core document sections:
    - `nodes[]` (id, speaker, lines)
    - branching links (`choices[].next`)
    - optional runtime metadata (`tags`, `voiceCue`, `emotion`)
- Runtime compatibility target:
    - parser converts authored nodes directly into cutscene/dialogue runner steps
- Minimum tests:
    - unreachable/invalid node references fail validation
    - cycles/branch integrity checks
    - deterministic import/export ordering of nodes/choices

### Economy Tool Example (Loot/Pricing Tables)

- Tool key: `economy`
- Suggested version field: `version: "um-economy-v1"`
- Core document sections:
    - `dropTables[]` (weighted entries)
    - `rewardBundles[]`
    - `pricing[]` by item id/tier
- Runtime compatibility target:
    - export payload consumed directly by `lootEconomy` registration/import contracts
- Minimum tests:
    - invalid/missing table references fail validation
    - weight totals and deterministic roll input validation
    - round-trip export/import + governance policy compatibility checks

Reference files:

- [Tool Starter Template](./TOOL_STARTER_TEMPLATE.md)
- [Authored Payload Field Order Contract](./PAYLOAD_FIELD_ORDER.md)
- [Certification Artifacts README](./certification/README.md)
- [Example Certification Report](./certification/example-tool-certification.report.json)
- [Example Certification Summary](./certification/example-tool-certification.summary.md)
