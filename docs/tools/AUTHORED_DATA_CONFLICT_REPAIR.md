# Authored JSON Merge-Conflict Repair Guide

Use this quick process when resolving merge conflicts in tool-authored payloads.

## 1) Resolve top-level contract first

For each conflicted payload, ensure these fields are valid before touching details:

- `version` matches expected schema (`um-tilemap-v1`, `um-bgm-v1`, etc.)
- required top-level sections are present
- no duplicate IDs in arrays that require uniqueness

## 2) Resolve deterministic order

After conflict markers are removed, re-order fields using:

- [PAYLOAD_FIELD_ORDER.md](./PAYLOAD_FIELD_ORDER.md)

This avoids future noisy diffs and makes review easier.

## 3) Domain-specific checks

### Tilemap

- `layers[].tiles.length` must equal `map.width * map.height`
- preserve intended layer stack order (top-to-bottom rendering semantics)
- ensure `collisionProfile` and `overlays[]` are valid after merges

### BGM

- every `sequence[].soundId` must exist in `palette[]`
- keep `sequence[]` sorted by `step`
- verify loop window (`startStep`, `endStep`) still encloses intended content

## 4) Validate with existing tool gates

Run local checks before commit:

```bash
npm run quality:tool:certification
npm run quality:recovery
```

If payload is domain-critical, also run:

```bash
npm run test:run
```

## 5) Document conflict decisions in PR

Add a short note in the PR description for non-trivial conflict choices:

- which side won for schema/contract changes
- any manual value merges (IDs, ordering, loop windows, collision rules)
- follow-up items if conflict surfaced a missing migration/tooling rule
