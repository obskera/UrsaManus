# Authored Payload Field Order Contract

Use this contract to keep authored JSON diffs stable and review-friendly.

## Tilemap (`um-tilemap-v1`)

Top-level order:

1. `version`
2. `map`
3. `selectedLayerId`
4. `layers`
5. `collisionProfile`
6. `overlays`

`map` order:

1. `width`
2. `height`

`layers[]` item order:

1. `id`
2. `name`
3. `visible`
4. `locked`
5. `tiles`

`collisionProfile` order:

1. `solidLayerIds`
2. `solidLayerNameContains`
3. `solidTileIds`
4. `fallbackToVisibleNonZero`

`overlays[]` item order:

1. `id`
2. `name`
3. `type`
4. `tag`
5. `x`
6. `y`
7. `roomIndex`
8. `tileId` (optional)

## BGM (`um-bgm-v1`)

Top-level order:

1. `version`
2. `name`
3. `bpm`
4. `stepMs`
5. `loop`
6. `palette`
7. `sequence`

`loop` order:

1. `startStep`
2. `endStep`

`palette[]` item order:

1. `id`
2. `file`
3. `gain` (optional)

`sequence[]` item order:

1. `step`
2. `soundId`
3. `lengthSteps`
4. `bend` (optional)
5. `effect` (optional)

`bend` order:

1. `cents`
2. `curve`

## Serialization Rule

- Use deterministic pretty JSON (`2` spaces).
- Keep arrays in deterministic logical order:
    - tilemap `layers` follow layer stack order;
    - tilemap `overlays` sorted by `id`;
    - BGM `sequence` sorted by `step`.
