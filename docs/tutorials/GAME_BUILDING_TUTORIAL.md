# End-to-End Game Building Tutorial

This tutorial walks through wiring a playable loop using the new systems:

- Grid movement
- Controller + virtual control stick input
- Projectile runtime
- Firing weapon prefabs
- Spell prefabs

## 1) Build the movement and combat runtime

```ts
import { createGridMovementService } from "@/services/gridMovement";
import { createProjectileService } from "@/services/projectiles";
import {
    createSingleShotWeaponPrefab,
    createWeaponPrefabRuntime,
} from "@/services/weaponPrefabs";
import { createSpellPrefabService } from "@/services/spellPrefabs";

const grid = createGridMovementService({
    config: {
        tileWidth: 16,
        tileHeight: 16,
        moveCadenceMs: 120,
        snapPolicy: "always",
        gridWidth: 64,
        gridHeight: 64,
    },
});

const projectiles = createProjectileService();

const weapon = createWeaponPrefabRuntime({
    prefab: createSingleShotWeaponPrefab(),
    projectileService: projectiles,
});

const spells = createSpellPrefabService({
    projectileService: projectiles,
    mana: 100,
});
```

## 2) Register your player on the grid

```ts
grid.registerActor("player-1", { x: 24, y: 24 });
```

## 3) Connect directional input to grid movement

```ts
const move = (direction: "up" | "down" | "left" | "right") => {
    grid.moveActor("player-1", direction);
};
```

## 4) Connect controls (keyboard/gamepad/touch)

```ts
import {
    createPlayerInputActions,
    createInputComponentAdapters,
} from "@/components/screenController";

const actions = createPlayerInputActions({
    onChanged: () => {
        // request UI refresh
    },
});

const adapters = createInputComponentAdapters(actions);

// virtual dpad usage
adapters.virtualDPad.onDirectionStart("right");

// virtual control stick usage (dominant direction mapping)
adapters.virtualControlStick.onVectorChange({
    x: 0.9,
    y: 0.1,
    magnitude: 0.9,
    active: true,
});
```

## 5) Fire weapon prefab

```ts
weapon.pullTrigger({
    ownerId: "player-1",
    x: 24,
    y: 24,
    directionX: 1,
    directionY: 0,
});
```

## 6) Cast spell prefab

```ts
spells.cast("projectile-spell", {
    casterId: "player-1",
    x: 24,
    y: 24,
    directionX: 1,
    directionY: 0,
});
```

## 7) Runtime update loop

```ts
const tick = (deltaMs: number) => {
    weapon.tick(deltaMs);
    spells.tick(deltaMs);
    projectiles.tick(deltaMs, (projectile) => {
        // plug in collision query
        return { hit: false };
    });
};
```

## Robust example variants

### Minimal

- Grid movement + single-shot weapon only.
- No spell casting.
- Basic projectile lifetime expiration.

### Full-featured

- Grid movement + gamepad + virtual control stick.
- Burst or auto weapon prefab + full reload flow.
- Projectile spell + aoe pulse + channel beam.
- Collision resolver path in projectile tick.

### Override-heavy

- Override grid cadence, tile size, and bounds.
- Override weapon prefab values (spread/cooldown/clip/reload).
- Override spell mana costs/cooldowns/range.

## Validation commands

- `npm run test:run -- src/tests/gridMovement.test.ts`
- `npm run test:run -- src/tests/VirtualControlStick.test.tsx`
- `npm run test:run -- src/tests/projectiles.test.ts`
- `npm run test:run -- src/tests/weaponPrefabs.test.ts`
- `npm run test:run -- src/tests/spellPrefabs.test.ts`
