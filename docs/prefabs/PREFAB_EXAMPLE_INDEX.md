# Prefab Example Index

This index tracks robust prefab matrix examples and their expected outcomes.

## Source of Truth

- Matrix service definitions: `src/services/prefabExampleMatrix.ts`
- Dev examples tab card: `src/components/examples/PrefabExampleMatrixExample.tsx`
- Focused matrix tests:
    - `src/tests/prefabExampleMatrix.test.ts`
    - `src/tests/PrefabExampleMatrixExample.test.tsx`

## Matrix Variants by Domain

### Player

| Variant          | Entry ID                  | Expected outcomes                                          |
| ---------------- | ------------------------- | ---------------------------------------------------------- |
| minimal          | `player-minimal`          | smallest viable player prefab with stable attach lifecycle |
| full-featured    | `player-full-featured`    | production-style multi-module player composition           |
| override-heavy   | `player-override-heavy`   | deep config override coverage without module forking       |
| migration/legacy | `player-migration-legacy` | v0 payload migration into `um-prefab-blueprint-v1`         |

### Enemy

| Variant          | Entry ID                 | Expected outcomes                                        |
| ---------------- | ------------------------ | -------------------------------------------------------- |
| minimal          | `enemy-minimal`          | compact enemy baseline for contract checks               |
| full-featured    | `enemy-full-featured`    | boss-grade enemy composition with advanced modules       |
| override-heavy   | `enemy-override-heavy`   | nested tuning overrides with valid dependency resolution |
| migration/legacy | `enemy-migration-legacy` | legacy schema conversion with preserved enemy semantics  |

### Object

| Variant          | Entry ID                  | Expected outcomes                                     |
| ---------------- | ------------------------- | ----------------------------------------------------- |
| minimal          | `object-minimal`          | baseline object payload for placement/integration     |
| full-featured    | `object-full-featured`    | real interactive object composition for gameplay hubs |
| override-heavy   | `object-override-heavy`   | lock/interactable override stress scenario            |
| migration/legacy | `object-migration-legacy` | legacy object prefab migration to current schema      |
