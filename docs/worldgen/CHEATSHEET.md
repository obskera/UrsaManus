# Worldgen Cheat Sheet

Quick reference for deterministic map generation, spawn anchors, and DataBus-ready spawn payloads.

## 1) One-call scenario bootstrap

```ts
import { createWorldgenScenario } from "@/logic/worldgen";

const scenario = createWorldgenScenario({
    map: {
        width: 48,
        height: 32,
        seed: "scenario-a1",
        roomCount: 10,
    },
    spawns: {
        enemyCount: 4,
        itemCount: 3,
        tileIds: {
            playerStart: 801,
            objective: 802,
            enemy: 803,
            item: 804,
        },
    },
    world: {
        tileWidth: 16,
        tileHeight: 16,
        anchor: "center",
    },
});

console.log(scenario.map.rooms.length);
console.log(scenario.worldAnchors.playerStart.worldX);
```

## 2) Convert world anchors to DataBus-ready payloads

```ts
import { createDataBusSpawnPayloads } from "@/logic/worldgen";

const payloads = createDataBusSpawnPayloads({
    anchors: scenario.worldAnchors,
    idPrefix: "run1",
    namePrefix: "run1",
    typeMap: {
        enemy: "enemy",
        item: "object",
    },
});

console.log(payloads[0].id, payloads[0].position);
```

Each payload includes:

- `id`
- `name`
- `type`
- `tag` (`player-start`, `objective`, `enemy`, `item`)
- `position` (`x`, `y` world coords)
- `roomIndex`
- optional `tileId`

## 3) Create id-keyed payload record

```ts
import { createDataBusSpawnPayloadRecord } from "@/logic/worldgen";

const byId = createDataBusSpawnPayloadRecord({
    anchors: scenario.worldAnchors,
    idPrefix: "run1",
});

console.log(Object.keys(byId));
```

Useful when you want direct `entitiesById` style merges.

## 4) Convert payloads to full Entity records

```ts
import {
    createDataBusSpawnPayloads,
    createWorldgenEntities,
} from "@/logic/worldgen";

const payloads = createDataBusSpawnPayloads({
    anchors: scenario.worldAnchors,
    idPrefix: "run1",
    namePrefix: "run1",
});

const worldgenEntities = createWorldgenEntities({
    payloads,
    byTypeVisual: {
        enemy: { scaler: 5 },
    },
});

console.log(worldgenEntities.playerId);
console.log(worldgenEntities.entitiesById);
```

`createWorldgenEntities` returns:

- `entities[]`
- `entitiesById`
- `playerId` (from `player-start` tag)

## 5) Apply generated entities to DataBus state

```ts
import {
    createApplyWorldgenEntitiesUpdater,
    createWorldgenEntities,
} from "@/logic/worldgen";
import { dataBus } from "@/services/DataBus";

const worldgenEntities = createWorldgenEntities({ payloads });

dataBus.setState(
    createApplyWorldgenEntitiesUpdater(worldgenEntities, {
        mode: "merge", // keep existing + add generated
        // mode: "replace", // replace entity set with generated entities
        syncCameraFollowTarget: true,
    }),
);
```

`replace` mode also clears world-bound ids by default to avoid stale references.

## 6) DataBus integration example (position patch)

```ts
import { dataBus } from "@/services/DataBus";
import { createDataBusSpawnPayloads } from "@/logic/worldgen";

const payloads = createDataBusSpawnPayloads({
    anchors: scenario.worldAnchors,
    idPrefix: "run1",
});

// Example: patch existing entities by id when they already exist
// (for full entity creation, map payloads into your entity factory first)
dataBus.setState((prev) => {
    const entitiesById = { ...prev.entitiesById };

    for (const payload of payloads) {
        const existing = entitiesById[payload.id];
        if (!existing) continue;

        entitiesById[payload.id] = {
            ...existing,
            position: {
                ...existing.position,
                x: payload.position.x,
                y: payload.position.y,
            },
        };
    }

    return {
        ...prev,
        entitiesById,
    };
});
```

## 7) Determinism tips

- Keep `map.seed` stable for stable room layout.
- Override `spawns.seed` only if you want same map with different spawn placement.
- Keep tile sizing (`tileWidth`, `tileHeight`) fixed across runs for stable world coordinates.
