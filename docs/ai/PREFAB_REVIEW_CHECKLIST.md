# Prefab Review Checklist

Use this rubric before merging AI-generated prefab changes.

## Functional checks

- [ ] Blueprint JSON parses and uses expected schema version.
- [ ] Module set matches requested archetype/goal.
- [ ] Dependencies are satisfied and conflicts are absent.
- [ ] Attach/detach lifecycle behaves as expected in local tests.

## Safety checks

- [ ] No invented module IDs.
- [ ] No unrelated config churn.
- [ ] Defaults remain balanced for intended difficulty tier.
- [ ] Migration compatibility checks pass.

## Validation checks

- [ ] `npm run prefab:validate` passes.
- [ ] `npm run prefab:migration:check` passes.
- [ ] `npm run quality:prefab:contracts` passes.

## Documentation checks

- [ ] Prompt used is recorded or linked.
- [ ] Rationale for key module choices is included.
- [ ] Integration snippet is present and runnable.
- [ ] Any known limitations are documented.

## Merge decision

- Approve only if every item above is complete.
- If any item fails, reject and return exact failure reasons to the generation prompt.
