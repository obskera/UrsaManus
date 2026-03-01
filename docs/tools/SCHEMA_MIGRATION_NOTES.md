# Tool Schema Migration Notes

This log tracks schema-facing changes that affect tool payload compatibility.

## Entry Template

Use this template for each schema-impacting release:

```markdown
## YYYY-MM-DD — <release tag>

- Affected tool(s): <tilemap|bgm|...>
- Schema surface changed:
    - <field added/removed/renamed>
    - <validation rule changes>
- Backward compatibility:
    - <compatible|requires migration>
- Forward compatibility:
    - <notes>
- Migration plan:
    - <runtime adapter, transform script, manual steps>
- Verification:
    - <tests/gates/docs updated>
```

## 2026-03-01 — baseline

- Affected tool(s): tilemap, bgm
- Schema surface changed:
    - Baseline established for `um-tilemap-v1` and `um-bgm-v1` contracts.
    - Added explicit cue-shape metadata behavior for BGM runtime expression hooks.
- Backward compatibility:
    - Compatible with current v1 payload contracts.
- Forward compatibility:
    - New schema keys must be documented and versioned before release promotion.
- Migration plan:
    - Any breaking shape change requires explicit migration notes entry plus compatibility updates.
- Verification:
    - Covered by golden contract tests + release schema guard.
