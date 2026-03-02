# Prefab Copy/Paste Cheatsheet

Top 30 prefab snippets for fast authoring and integration.

## Start here in 5 minutes (wizard + runtime attach + export/import)

### 1) Create default registry

```ts
import { createDefaultPrefabRegistry } from "@/services/prefabRegistryDefaults";

const registry = createDefaultPrefabRegistry();
```

### 2) Build from preset using wizard

```ts
import { createPrefabStarterWizardService } from "@/services/prefabStarterWizard";

const wizard = createPrefabStarterWizardService({ registry });
const result = wizard.buildFromPreset({
    presetId: "player:rpg-starter",
    blueprintId: "player-main",
});
```

### 3) Export blueprint JSON

```ts
import { exportPrefabBlueprint } from "@/services/prefabCore";

const blueprintRaw = exportPrefabBlueprint(result.blueprint, { pretty: true });
```

### 4) Import blueprint JSON later

```ts
import { importPrefabBlueprint } from "@/services/prefabCore";

const parsed = importPrefabBlueprint(blueprintRaw);
if (!parsed.ok) {
    throw new Error(parsed.message);
}
```

### 5) Attach modules at runtime

```ts
import { createPrefabAttachmentRuntime } from "@/services/prefabCore";

const runtime = createPrefabAttachmentRuntime({ registry });
const report = runtime.attachPrefabModules(
    "player-1",
    parsed.value.modules.map((moduleEntry) => ({
        moduleId: moduleEntry.moduleId,
        config: moduleEntry.config,
    })),
    {},
);
```

## Core prefab snippets

### 6) Build manually with prefab builder

```ts
import { createPrefabBuilder } from "@/services/prefabCore";

const builder = createPrefabBuilder({
    registry,
    domain: "enemy",
    blueprintId: "enemy-custom",
});
builder.addModule("enemy.core");
builder.addModule("enemy.pathing", { behavior: "chase" });
const build = builder.buildBlueprint();
```

### 7) Set module overrides after add

```ts
builder.setModuleOverrides("enemy.core", {
    health: 160,
    damage: 16,
});
```

### 8) Validate build issues quickly

```ts
if (!build.ok) {
    console.error(build.issues.map((issue) => issue.message));
}
```

### 9) Finalize only when valid

```ts
const blueprint = builder.finalize();
if (!blueprint) {
    throw new Error("Blueprint is invalid.");
}
```

### 10) Emit attachment signals into your telemetry

```ts
const runtimeWithEmit = createPrefabAttachmentRuntime({
    registry,
    emit: (signal, payload) => {
        console.log(signal, payload);
    },
});
```

## Wizard and quick-fix snippets

### 11) List archetypes and presets

```ts
const archetypes = wizard.listArchetypes();
const enemyPresets = wizard.listPresets("enemy");
```

### 12) Build from module selection

```ts
const selection = wizard.buildFromSelection({
    archetype: "enemy",
    blueprintId: "enemy-selection",
    moduleIds: ["enemy.melee-ability"],
});
```

### 13) Ask for dependency recommendations

```ts
const advice = wizard.recommendModulesForSelection({
    archetype: "enemy",
    moduleIds: ["enemy.melee-ability"],
});
```

### 14) Apply required-module quick-fix

```ts
const quickFix = wizard.applyModuleQuickFix({
    archetype: "enemy",
    moduleIds: ["enemy.melee-ability"],
    includeOptional: false,
});
```

### 15) Build with quick-fix module IDs

```ts
const fixedBuild = wizard.buildFromSelection({
    archetype: "enemy",
    blueprintId: "enemy-selection-fixed",
    moduleIds: quickFix.moduleIds,
});
```

## Prefab pack snippets (drop-in)

### 16) Create player prefab pack

```ts
import { createPlayerPrefabPack } from "@/services/prefabPacks";

const playerPack = createPlayerPrefabPack("arpg-player", {
    registry,
    blueprintId: "player-arpg-main",
});
```

### 17) Attach and detach player pack

```ts
const playerReport = playerPack.attachPlayer("player-1", {});
playerPack.detachPlayer("player-1", {});
```

### 18) Create enemy prefab pack

```ts
import { createEnemyPrefabPack } from "@/services/prefabPacks";

const enemyPack = createEnemyPrefabPack("boss-phase", {
    registry,
    blueprintId: "enemy-boss-main",
});
```

### 19) Apply heavy enemy overrides

```ts
const tunedEnemyPack = createEnemyPrefabPack("boss-phase", {
    registry,
    overrides: {
        "enemy.core": {
            health: 420,
            damage: 28,
        },
        "enemy.pathing": {
            behavior: "dive-kite",
            leashDistance: 24,
        },
    },
});
```

### 20) Create object prefab pack

```ts
import { createObjectPrefabPack } from "@/services/prefabPacks";

const objectPack = createObjectPrefabPack("locked-door", {
    registry,
    blueprintId: "object-vault-door",
});
```

### 21) Attach and detach object pack

```ts
const objectReport = objectPack.attachObject("door-01", {});
objectPack.detachObject("door-01", {});
```

## Migration and legacy snippets

### 22) Preflight migration requirement

```ts
import { preflightMigratablePrefabBlueprint } from "@/services/prefabMigration";

const preflight = preflightMigratablePrefabBlueprint(legacyPayload);
```

### 23) Migrate legacy payload

```ts
import { migratePrefabBlueprint } from "@/services/prefabMigration";

const migrated = migratePrefabBlueprint(legacyPayload);
```

### 24) Convert migration result to current blueprint

```ts
import { toCurrentPrefabBlueprint } from "@/services/prefabMigration";

const current = toCurrentPrefabBlueprint(migrated);
```

### 25) Guard migration failures

```ts
if (!migrated.ok || !current) {
    throw new Error(migrated.message ?? "Migration failed.");
}
```

## Quality and tooling snippets

### 26) Validate prefab blueprints

```bash
npm run prefab:validate
```

### 27) Run migration checks

```bash
npm run prefab:migration:check
```

### 28) Run prefab quality gate

```bash
npm run quality:prefab:contracts
```

### 29) Run batch tuning helper

```bash
npm run prefab:tuning:batch -- --preset hard --preview
```

### 30) Run simulation sandbox helper

```bash
npm run prefab:sandbox:simulate -- --json
```

## Gameplay loop prefab snippets (movement + combat)

### 31) Grid movement + projectile + weapon prefab starter

```ts
import { createGridMovementService } from "@/services/gridMovement";
import { createProjectileService } from "@/services/projectiles";
import {
    createSingleShotWeaponPrefab,
    createWeaponPrefabRuntime,
} from "@/services/weaponPrefabs";

const grid = createGridMovementService();
const projectiles = createProjectileService();
const weapon = createWeaponPrefabRuntime({
    prefab: createSingleShotWeaponPrefab(),
    projectileService: projectiles,
});
```

### 32) Burst/auto weapon prefab variants

```ts
import {
    createAutoWeaponPrefab,
    createBurstWeaponPrefab,
    createWeaponPrefabRuntime,
} from "@/services/weaponPrefabs";

const burstWeapon = createWeaponPrefabRuntime({
    prefab: createBurstWeaponPrefab(),
    projectileService: projectiles,
});

const autoWeapon = createWeaponPrefabRuntime({
    prefab: createAutoWeaponPrefab(),
    projectileService: projectiles,
});
```

### 33) Spell prefab suite starter

```ts
import { createSpellPrefabService } from "@/services/spellPrefabs";

const spells = createSpellPrefabService({ projectileService: projectiles });

spells.cast("projectile-spell", {
    casterId: "player-1",
    x: 24,
    y: 24,
    directionX: 1,
    directionY: 0,
});
```

### 34) List and validate game starter packs

```ts
import {
    listGameStarterPacks,
    simulateGameStarterPack,
} from "@/services/gameStarterPacks";

const packs = listGameStarterPacks();
const report = simulateGameStarterPack(packs[0].id);

if (!report.ok) {
    console.error(report.issues);
}
```

## See also

- `docs/prefabs/PLAYER_PREFABS.md`
- `docs/prefabs/ENEMY_PREFABS.md`
- `docs/prefabs/OBJECT_PREFABS.md`
- `docs/prefabs/PREFAB_WORKFLOW.md`
- `docs/prefabs/PREFAB_EXAMPLE_INDEX.md`
- `docs/prefabs/GAME_STARTER_PACKS.md`
