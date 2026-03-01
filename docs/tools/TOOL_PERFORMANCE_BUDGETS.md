# Tool Performance Budgets

This document defines baseline performance budgets for authoring tools and the smoke workflow used to detect regressions.

## Baseline Budgets

### Tilemap tool

- `loadMs`: `<= 60`
- `interactionMs`: `<= 20`
- `exportMs`: `<= 45`
- `payloadBytes`: `<= 700000`

### BGM tool

- `loadMs`: `<= 35`
- `interactionMs`: `<= 12`
- `exportMs`: `<= 25`
- `payloadBytes`: `<= 350000`

## Synthetic Large Fixtures

- Fixture builders live in `src/tests/fixtures/toolPerfFixtures.ts`.
- They generate deterministic large payloads for:
    - tilemap (multi-layer, overlay-heavy, large map)
    - bgm (large palette + long sequence)

## Smoke Command

Run:

`npm run tool:perf:smoke`

Behavior:

- Generates large fixtures.
- Measures load/interaction/export metrics.
- Evaluates against baseline budgets.
- Exits non-zero when any budget is exceeded.

## CI/Quality Hook

- Aggregate command: `npm run quality:tool:perf`
- Intended use: pre-release and tuning-validation checks.

## In-Tool Diagnostics

- Tilemap and BGM tool UIs expose lightweight diagnostics:
    - payload size (KB)
    - last diagnostic sample label + duration
    - `Run perf diagnostics` action for quick local checks
