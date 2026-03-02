# Game Starter Packs

Copy/paste-first starter packs mapped to the current brainstorm roadmap.

## What this provides

- 11 ready-to-simulate starter pack definitions.
- P1/P2 tier labeling.
- Explicit done criteria per pack.
- Simulation helper to validate prefab compatibility before use.

Service: `src/services/gameStarterPacks.ts`

## Quick usage

```ts
import {
    listGameStarterPacks,
    getGameStarterPack,
    simulateGameStarterPack,
} from "@/services/gameStarterPacks";

const packs = listGameStarterPacks();
const topDown = getGameStarterPack("top-down-shooter-pack");
const report = simulateGameStarterPack("top-down-shooter-pack");

if (!report.ok) {
    throw new Error(report.issues.join("\n"));
}
```

## Pack index

### P1

- `combat-encounter-pack`
- `top-down-shooter-pack`
- `quest-starter-pack`
- `loot-economy-pack`
- `survival-pack`
- `puzzle-interaction-pack`
- `mobile-controls-pack`

### P2

- `tower-defense-pack`
- `dialogue-social-pack`
- `roguelite-run-pack`
- `traversal-pack`

## Validation

```bash
npm run test:run -- src/tests/gameStarterPacks.test.ts
```

This suite verifies all 11 packs simulate with no prefab attachment issues.
