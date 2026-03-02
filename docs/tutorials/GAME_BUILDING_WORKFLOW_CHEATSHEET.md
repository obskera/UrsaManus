# Game Building Workflow Cheatsheet

Quick order of operations for a playable loop.

## Build order

1. Set up grid movement (`createGridMovementService`).
2. Register player actor on grid (`registerActor`).
3. Wire input actions and adapters (`createPlayerInputActions`, `createInputComponentAdapters`).
4. Add virtual control stick + dpad mappings.
5. Add projectile runtime (`createProjectileService`).
6. Add weapon prefab runtime (`createWeaponPrefabRuntime`).
7. Add spell prefab runtime (`createSpellPrefabService`).
8. Update everything in your main tick.

## Copy/paste starter

```ts
const grid = createGridMovementService();
const projectiles = createProjectileService();
const weapon = createWeaponPrefabRuntime({
    prefab: createSingleShotWeaponPrefab(),
    projectileService: projectiles,
});
const spells = createSpellPrefabService({ projectileService: projectiles });
```

## Runtime tick starter

```ts
const tick = (deltaMs: number) => {
    weapon.tick(deltaMs);
    spells.tick(deltaMs);
    projectiles.tick(deltaMs, () => ({ hit: false }));
};
```

## Common troubleshooting

- Movement feels too fast -> raise `moveCadenceMs`.
- Stick input too sensitive -> raise `deadzone` or lower `sensitivity`.
- Weapon never fires -> check cooldown/reload/ammo state.
- Spell cast fails -> check mana and cooldown remaining.
- Projectiles disappear too early -> increase projectile lifetime.

## Verification quick run

```bash
npm run test:run -- src/tests/gridMovement.test.ts src/tests/VirtualControlStick.test.tsx src/tests/projectiles.test.ts src/tests/weaponPrefabs.test.ts src/tests/spellPrefabs.test.ts
```
