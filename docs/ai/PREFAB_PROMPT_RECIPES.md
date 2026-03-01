# Prefab Prompt Recipes

Genre-oriented prompt templates with expected output shape.

## Recipe 1: ARPG player

```txt
Generate an ARPG player prefab variant focused on fast movement and cooldown-based combat.
Use modules: player.core, player.mobility, player.resources, player.combat.
Constraints:
- deterministic JSON
- no unknown modules
- include 3 balancing knobs (dash cooldown, stamina recovery, combo window)
Output format:
A) Blueprint JSON
B) Attach snippet for createPlayerPrefabPack(...)
C) 4-line tuning rationale
```

Expected output:

- Blueprint includes the 4 modules above.
- Defaults remain starter-safe.
- Snippet demonstrates attach + detach lifecycle.

## Recipe 2: JRPG party lead

```txt
Generate a JRPG party-lead player prefab.
Use modules: player.core, player.resources, player.party.
Constraints:
- party command defaults must be explicit
- status resist preset must be present
Output:
- Blueprint JSON
- Example of one override block for party behavior
```

Expected output:

- Includes turn-order and party command hooks.
- Keeps combat assumptions minimal.

## Recipe 3: Ranged elite enemy

```txt
Generate an enemy prefab for a ranged elite kiter.
Use modules: enemy.core, enemy.pathing, enemy.ranged-ability.
Constraints:
- preserve dependency integrity
- include reward tuning values
Output:
- Blueprint JSON
- Encounter-use guidance in 5 lines max
```

Expected output:

- Ready for drop-in encounter use.
- Cadence/range values are explicit and moderate.

## Recipe 4: Checkpoint object

```txt
Generate an object prefab for a checkpoint statue.
Use modules: object.core, object.interactable, object.checkpoint.
Constraints:
- include persistent state fields
- include restore-health behavior
Output:
- Blueprint JSON
- Snapshot export/import usage snippet
```

Expected output:

- Save-state semantics are clear.
- Integration path is copy/paste ready.

## Recipe 5: Migration-safe patch

```txt
Given this existing prefab JSON, generate a migration-safe patch.
Constraints:
- preserve schema version unless required by migration policy
- no unrelated key churn
- explain each changed key in one short bullet
Output:
- patched JSON
- change summary bullets
```

Expected output:

- Minimal-diff payload.
- Explanation tightly scoped to changed keys.
