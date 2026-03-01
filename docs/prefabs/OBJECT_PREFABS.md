# Object Prefabs Quick Reference

## Archetype table

| Archetype ID          | Helper call                                     | Typical role                    |
| --------------------- | ----------------------------------------------- | ------------------------------- |
| `loot-chest`          | `createObjectPrefabPack("loot-chest")`          | loot container                  |
| `shop-npc`            | `createObjectPrefabPack("shop-npc")`            | trade/vendor interaction        |
| `quest-board`         | `createObjectPrefabPack("quest-board")`         | quest list interaction          |
| `door-switch`         | `createObjectPrefabPack("door-switch")`         | switch-driven door control      |
| `checkpoint-statue`   | `createObjectPrefabPack("checkpoint-statue")`   | checkpoint activation           |
| `breakable-container` | `createObjectPrefabPack("breakable-container")` | destructible reward container   |
| `resource-node`       | `createObjectPrefabPack("resource-node")`       | gathering target                |
| `crafting-station`    | `createObjectPrefabPack("crafting-station")`    | crafting interface anchor       |
| `bank-stash`          | `createObjectPrefabPack("bank-stash")`          | storage/stash interaction       |
| `fast-travel-point`   | `createObjectPrefabPack("fast-travel-point")`   | travel unlock/use node          |
| `trap-floor`          | `createObjectPrefabPack("trap-floor")`          | damage trigger zone             |
| `switch-network`      | `createObjectPrefabPack("switch-network")`      | linked switch orchestration     |
| `locked-door`         | `createObjectPrefabPack("locked-door")`         | key-gated door                  |
| `escort-cart`         | `createObjectPrefabPack("escort-cart")`         | escort objective anchor         |
| `arena-trigger`       | `createObjectPrefabPack("arena-trigger")`       | encounter trigger object        |
| `quest-giver`         | `createObjectPrefabPack("quest-giver")`         | NPC quest assignment            |
| `follower-companion`  | `createObjectPrefabPack("follower-companion")`  | companion follow behavior       |
| `merchant-tiered`     | `createObjectPrefabPack("merchant-tiered")`     | tiered merchant catalog         |
| `trainer-skill-tree`  | `createObjectPrefabPack("trainer-skill-tree")`  | trainer/skill progression       |
| `faction-rep-agent`   | `createObjectPrefabPack("faction-rep-agent")`   | faction reputation interactions |
| `town-ambient-npc`    | `createObjectPrefabPack("town-ambient-npc")`    | ambient NPC interactions        |

## Starter wizard presets

| Preset ID                    |
| ---------------------------- |
| `object:loot-chest`          |
| `object:shop-npc`            |
| `object:quest-board`         |
| `object:door-switch`         |
| `object:checkpoint-statue`   |
| `object:breakable-container` |
| `object:resource-node`       |
| `object:crafting-station`    |
| `object:bank-stash`          |
| `object:fast-travel-point`   |
| `object:trap-floor`          |
| `object:switch-network`      |
| `object:locked-door`         |
| `object:escort-cart`         |
| `object:arena-trigger`       |
| `object:quest-giver`         |
| `object:follower-companion`  |
| `object:merchant-tiered`     |
| `object:trainer-skill-tree`  |
| `object:faction-rep-agent`   |
| `object:town-ambient-npc`    |

## Copy/paste snippets

### Build locked-door object pack

```ts
import { createDefaultPrefabRegistry } from "@/services/prefabRegistryDefaults";
import { createObjectPrefabPack } from "@/services/prefabPacks";

const registry = createDefaultPrefabRegistry();
const doorPack = createObjectPrefabPack("locked-door", {
    registry,
    blueprintId: "object-vault-door",
});
```

### Attach/detach object

```ts
const attach = doorPack.attachObject("door-01", {});
const detach = doorPack.detachObject("door-01", {});
```

### Override-heavy object tuning

```ts
const tunedDoor = createObjectPrefabPack("locked-door", {
    registry,
    blueprintId: "object-vault-door-tuned",
    overrides: {
        "object.core": {
            label: "Vault Gate",
            tags: ["dungeon", "critical-path"],
        },
        "object.interactable": {
            prompt: "Use rune key",
            cooldownMs: 450,
        },
        "object.locked-door": {
            keyId: "rune-key-alpha",
            consumeOnUse: false,
            autoCloseMs: 7000,
        },
    },
});
```

### Build object from wizard preset

```ts
import { createPrefabStarterWizardService } from "@/services/prefabStarterWizard";

const wizard = createPrefabStarterWizardService({ registry });
const build = wizard.buildFromPreset({
    presetId: "object:locked-door",
    blueprintId: "object-locked-door-wizard",
});
```
