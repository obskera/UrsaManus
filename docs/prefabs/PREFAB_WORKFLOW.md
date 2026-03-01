# Prefab Workflow (Starter to Custom)

This guide shows the fastest path from copy/paste prefab templates to custom gameplay modules.

## 1) Validate starter blueprint catalog

Run prefab blueprint validation:

`npm run prefab:validate`

- Validates schema/version (`um-prefab-blueprint-v1`)
- Checks module composition/dependencies
- Checks known-module compatibility against default prefab registry

## 2) Start from a shipped blueprint

Starter templates live in:

- `src/prefabs/blueprints/player.rpg.starter.json`
- `src/prefabs/blueprints/enemy.melee-chaser.starter.json`
- `src/prefabs/blueprints/object.loot-chest.starter.json`

Use these as baseline payloads and apply overrides incrementally.

## 3) Build from preset or module selection in code

Use the starter wizard service:

- `createPrefabStarterWizardService(...)` in `src/services/prefabStarterWizard.ts`
- `buildFromPreset(...)` for a quick archetype preset path
- `buildFromSelection(...)` for module-by-module composition

Example:

```ts
import { createPrefabStarterWizardService } from "@/services/prefabStarterWizard";

const wizard = createPrefabStarterWizardService();
const result = wizard.buildFromPreset({
    presetId: "player:rpg-starter",
    blueprintId: "player-main",
});

if (!result.ok) {
    console.error(result.issues);
}

console.log(result.integrationSnippet);
```

## 4) Attach modules at runtime

Use prefab runtime attach/detach helpers from `src/services/prefabCore.ts`:

- `createPrefabAttachmentRuntime(...)`
- `attachPrefabModules(entityId, requests, ctx)`
- `detachPrefabModules(entityId, moduleIds?, ctx)`

Attachment reports include:

- `attached`
- `skipped`
- `failed`

Signals emitted:

- `prefab:attached`
- `prefab:detached`
- `prefab:attach-failed`

## 5) Decide override vs fork

Use this rule of thumb:

- **Override** when you only need value tuning (numbers, labels, simple behavior flags).
- **Fork** when you need new lifecycle behavior, different dependencies, or conflict rules.

## 6) Troubleshooting

- Missing dependency: add required module listed in validation issue.
- Module conflict: remove one conflicting module from the same blueprint.
- Unknown module: register module in registry (or use default registry helpers).
- Invalid blueprint version: migrate payload to `um-prefab-blueprint-v1`.

## 7) Example matrix index

For robust variants beyond happy path (`minimal`, `full-featured`,
`override-heavy`, `migration/legacy`) across player/enemy/object domains,
see:

- `docs/prefabs/PREFAB_EXAMPLE_INDEX.md`

## 8) Copy/paste reference pack

For direct snippets and archetype reference tables, use:

- `docs/prefabs/CHEATSHEET.md`
- `docs/prefabs/PLAYER_PREFABS.md`
- `docs/prefabs/ENEMY_PREFABS.md`
- `docs/prefabs/OBJECT_PREFABS.md`
