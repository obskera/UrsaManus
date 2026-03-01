# Player Prefabs Quick Reference

## Archetype table

| Archetype ID          | Helper call                                     | Typical modules                                                       |
| --------------------- | ----------------------------------------------- | --------------------------------------------------------------------- |
| `arpg-player`         | `createPlayerPrefabPack("arpg-player")`         | `player.core`, `player.mobility`, `player.resources`, `player.combat` |
| `jrpg-party-lead`     | `createPlayerPrefabPack("jrpg-party-lead")`     | `player.core`, `player.resources`, `player.party`                     |
| `survival-crafter`    | `createPlayerPrefabPack("survival-crafter")`    | `player.core`, `player.resources`                                     |
| `twin-stick-shooter`  | `createPlayerPrefabPack("twin-stick-shooter")`  | `player.core`, `player.combat`, `player.aiming`                       |
| `stealth-infiltrator` | `createPlayerPrefabPack("stealth-infiltrator")` | `player.core`, `player.stealth`, `player.mobility`                    |
| `platformer-mobility` | `createPlayerPrefabPack("platformer-mobility")` | `player.core`, `player.mobility`                                      |

## Starter wizard preset

| Preset ID            | Archetype | Notes                                                  |
| -------------------- | --------- | ------------------------------------------------------ |
| `player:rpg-starter` | `player`  | wizard-first baseline that composes RPG player modules |

## Copy/paste snippets

### Build ARPG player pack

```ts
import { createDefaultPrefabRegistry } from "@/services/prefabRegistryDefaults";
import { createPlayerPrefabPack } from "@/services/prefabPacks";

const registry = createDefaultPrefabRegistry();
const pack = createPlayerPrefabPack("arpg-player", {
    registry,
    blueprintId: "player-main",
});
```

### Attach ARPG player to runtime

```ts
const report = pack.attachPlayer("player-1", {});
if (report.failed.length > 0) {
    console.error(report.failed);
}
```

### Build from player preset via wizard

```ts
import { createPrefabStarterWizardService } from "@/services/prefabStarterWizard";

const wizard = createPrefabStarterWizardService({ registry });
const build = wizard.buildFromPreset({
    presetId: "player:rpg-starter",
    blueprintId: "player-wizard-main",
});
```

### Override-heavy player tuning

```ts
const tuned = createPlayerPrefabPack("arpg-player", {
    registry,
    blueprintId: "player-heroic",
    overrides: {
        "player.core": {
            health: 180,
            speed: 130,
        },
        "player.resources": {
            healthMax: 180,
            staminaMax: 110,
        },
        "player.combat": {
            baseDamage: 22,
            attackCadenceMs: 380,
        },
    },
});
```

### Export player blueprint to JSON

```ts
import { exportPrefabBlueprint } from "@/services/prefabCore";

const raw = exportPrefabBlueprint(pack.blueprint, { pretty: true });
console.log(raw);
```
