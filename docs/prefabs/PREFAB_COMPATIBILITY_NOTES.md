# Prefab Compatibility Notes

Use this file to document prefab schema compatibility changes for each release.

## Current schema

- Blueprint schema version: `um-prefab-blueprint-v1`
- Validation command: `npm run prefab:validate`
- Migration preflight command: `npm run prefab:migration:check`

## Release template

For releases that change prefab shape/contracts, add one section per release:

### vX.Y.Z

- **Schema impact**: (none | additive | breaking)
- **Affected archetypes**: (player/enemy/object list)
- **Migration required**: (yes/no)
- **Migration path**:
    - from: `vN`
    - to: `vN+1`
    - utility: `src/services/prefabMigration.ts`
- **Backward compatibility window**: (e.g. one minor release)
- **Operator action**:
    - run `npm run prefab:migration:check`
    - run `npm run prefab:validate`
- **Rollback guidance**:
    - restore previous blueprint artifacts
    - rerun validation/migration gates

## Notes

- Keep this document in sync with migration logic in `src/services/prefabMigration.ts`.
- Any schema change should include tests in `src/tests/prefabMigration.test.ts`.
