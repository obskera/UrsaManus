# Enemy Prefabs Quick Reference

## Archetype table

| Archetype ID     | Helper call                               | Typical role                             |
| ---------------- | ----------------------------------------- | ---------------------------------------- |
| `melee-chaser`   | `createEnemyPrefabPack("melee-chaser")`   | closes distance with melee pressure      |
| `ranged-kiter`   | `createEnemyPrefabPack("ranged-kiter")`   | keeps distance and attacks from range    |
| `tank-bruiser`   | `createEnemyPrefabPack("tank-bruiser")`   | durable frontliner with sustained threat |
| `boss-phase`     | `createEnemyPrefabPack("boss-phase")`     | multi-phase encounter anchor             |
| `swarm-rusher`   | `createEnemyPrefabPack("swarm-rusher")`   | burst pressure via swarm rush behavior   |
| `support-healer` | `createEnemyPrefabPack("support-healer")` | support aura / sustain unit              |
| `shield-guard`   | `createEnemyPrefabPack("shield-guard")`   | defensive guard specialist               |
| `sniper-kiter`   | `createEnemyPrefabPack("sniper-kiter")`   | high-range precision pressure            |

## Starter wizard presets

| Preset ID              | Archetype | Notes                      |
| ---------------------- | --------- | -------------------------- |
| `enemy:melee-chaser`   | `enemy`   | baseline melee enemy setup |
| `enemy:ranged-kiter`   | `enemy`   | range-focused baseline     |
| `enemy:tank-bruiser`   | `enemy`   | high durability baseline   |
| `enemy:boss-phase`     | `enemy`   | multi-phase boss baseline  |
| `enemy:swarm-rusher`   | `enemy`   | swarm pressure baseline    |
| `enemy:support-healer` | `enemy`   | support/healer baseline    |
| `enemy:shield-guard`   | `enemy`   | guard baseline             |
| `enemy:sniper-kiter`   | `enemy`   | sniper baseline            |

## Copy/paste snippets

### Build boss enemy pack

```ts
import { createDefaultPrefabRegistry } from "@/services/prefabRegistryDefaults";
import { createEnemyPrefabPack } from "@/services/prefabPacks";

const registry = createDefaultPrefabRegistry();
const bossPack = createEnemyPrefabPack("boss-phase", {
    registry,
    blueprintId: "enemy-boss-main",
});
```

### Attach/detach enemy

```ts
const attach = bossPack.attachEnemy("enemy-boss-01", {});
const detach = bossPack.detachEnemy("enemy-boss-01", {});
```

### Enemy override-heavy tuning

```ts
const tunedBoss = createEnemyPrefabPack("boss-phase", {
    registry,
    blueprintId: "enemy-boss-heroic",
    overrides: {
        "enemy.core": {
            health: 420,
            damage: 30,
            reward: {
                xp: 440,
                gold: 180,
            },
        },
        "enemy.pathing": {
            behavior: "dive-kite",
            preferredDistance: 3,
            leashDistance: 24,
        },
    },
});
```

### Build enemy from module selection + quick-fix

```ts
import { createPrefabStarterWizardService } from "@/services/prefabStarterWizard";

const wizard = createPrefabStarterWizardService({ registry });
const quickFix = wizard.applyModuleQuickFix({
    archetype: "enemy",
    moduleIds: ["enemy.melee-ability"],
});

const build = wizard.buildFromSelection({
    archetype: "enemy",
    blueprintId: "enemy-selection-fixed",
    moduleIds: quickFix.moduleIds,
});
```
