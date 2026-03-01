# Prefab Generation Guardrails

Safety constraints for AI-generated prefab payloads.

## Hard requirements

- Schema version must remain `um-prefab-blueprint-v1` unless a documented migration explicitly requires change.
- Module IDs must exist in the current prefab registry.
- Required dependencies must be present.
- Known conflicts must not be introduced.
- Output JSON must be deterministic and pretty-formatted.

## Prompt constraints to always include

```txt
Do not invent module IDs.
Do not remove required dependencies.
Do not change schema version.
Apply minimal diffs when correcting failures.
```

## Validation sequence (required)

```bash
npm run prefab:validate
npm run prefab:migration:check
npm run quality:prefab:contracts
```

Do not merge AI-generated prefab changes unless all three commands pass.

## Anti-hallucination strategy

- Reference known archetypes and existing starter blueprints first.
- Ask for explicit dependency listing in the AI response.
- Request a “changed keys only” summary for iterative corrections.
- Reject responses that include ambiguous or inferred module names.

## Common failure classes

- Unknown module IDs.
- Missing dependencies.
- Domain mismatches (`player` module in `enemy` blueprint, etc.).
- Conflicting modules attached together.
- Schema drift and accidental key removals.

## Remediation loop

1. Paste exact validator/migration failures into the next prompt.
2. Instruct AI to apply only minimal changes required to pass checks.
3. Re-run full validation sequence.
4. Repeat until clean.
