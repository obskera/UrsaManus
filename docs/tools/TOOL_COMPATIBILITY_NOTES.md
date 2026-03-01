# Tool Compatibility Notes

This document records runtime/tool compatibility expectations and release rollback guidance.

## Compatibility Baseline

- Tilemap authoring/runtime contract: `um-tilemap-v1`
- BGM authoring/runtime contract: `um-bgm-v1`
- Recovery envelope contract: `um-tool-recovery-v1`

Any schema-affecting release must update this file and `SCHEMA_MIGRATION_NOTES.md`.

## Release Rollback Guidance (Tool Compatibility Regressions)

When release promotion fails due to tool-output compatibility regressions:

1. Stop promotion and preserve failing artifacts (`tool-certification-*`, release notes, dist manifest).
2. Identify affected tool payload contract fields and reproduce via golden-contract tests.
3. Decide fix path:
    - patch runtime/tool parser to restore compatibility, or
    - introduce version bump + migration adapter with notes.
4. Re-run gates:
    - `npm run quality:tool:certification`
    - `npm run release:tool:schema:guard`
    - `npm run release:verify`
5. If unresolved, re-promote previous known-good tag via manual `Release Pipeline` dispatch.

## 2026-03-01 — baseline

- Runtime compatibility confirmed for current tilemap and bgm recovery bootstrap paths.
- Certification status + schema guard checks enforced in release preflight.
