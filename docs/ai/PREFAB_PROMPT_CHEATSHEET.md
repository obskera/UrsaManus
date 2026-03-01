# Prefab Prompt Cheatsheet

Copy/paste prompts for common prefab-authoring goals.

## Starter prompts

### Build from existing starter

```txt
Use the existing starter blueprint as the base and produce a minimal override.
Base: [player.rpg.starter | enemy.melee-chaser.starter | object.loot-chest.starter]
Rules:
- Keep schema version as um-prefab-blueprint-v1.
- Use only known module IDs.
- Return JSON only for the override payload.
```

### Create player archetype variant

```txt
Create a player prefab variant for [archetype].
Must include:
- player.core
- any required dependencies for selected modules
Constraints:
- deterministic key order
- no invented module IDs
- include 5 tuning knobs at most
Output:
1) Blueprint JSON
2) Runtime attach snippet
```

### Create enemy role bundle

```txt
Create an enemy prefab bundle for role [swarm-rusher|shield-guard|sniper-kiter].
Constraints:
- Include enemy.core
- Resolve dependencies and conflicts
- Keep defaults conservative for starter difficulty
Output:
- Blueprint JSON
- One-paragraph tuning rationale
```

### Create object interaction prefab

```txt
Create an object prefab for [resource-node|crafting-station|checkpoint-like object].
Constraints:
- Include object.core and object.interactable
- Define save-state fields clearly
- Keep interaction radius and cooldown explicit
Output:
- Blueprint JSON
- Export/import snapshot usage note
```

## Repair prompts

### Fix invalid module IDs

```txt
The payload failed validation due to unknown modules.
Fix only module IDs and dependencies.
Do not change schema version or unrelated fields.
Return corrected JSON only.
```

### Fix dependency failures

```txt
The payload failed due to missing dependencies.
Add minimal required dependencies only.
Do not alter non-related module config values.
Return corrected JSON and list the dependency fixes.
```

### Fix migration compatibility

```txt
The payload failed migration preflight checks.
Apply the minimum schema-compatible changes.
Keep gameplay behavior equivalent when possible.
Return corrected JSON and a short migration rationale.
```

## Mandatory command footer

Append this to every generation prompt:

```txt
Validation plan:
1) npm run prefab:validate
2) npm run prefab:migration:check
3) npm run quality:prefab:contracts
```
