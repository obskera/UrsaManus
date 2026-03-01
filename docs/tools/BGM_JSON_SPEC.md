# BGM Composition JSON Spec (`um-bgm-v1`)

This document defines the authoring/runtime contract for BGM composition payloads.

## Top-Level Schema

```json
{
    "version": "um-bgm-v1",
    "name": "overworld-loop-a",
    "bpm": 132,
    "stepMs": 120,
    "loop": {
        "startStep": 0,
        "endStep": 16
    },
    "palette": [],
    "sequence": []
}
```

## Field-by-Field Reference

### `version`

- Type: string
- Required: yes
- Allowed value: `"um-bgm-v1"`

### `name`

- Type: string
- Required: yes
- Non-empty after trim
- Suggested: stable slug-like name (`battle-loop-b`)

### `bpm`

- Type: number
- Required: yes
- Constraint: positive finite number

### `stepMs`

- Type: number
- Required: yes
- Constraint: positive finite number
- Recommended: align with `bpm` and intended rhythmic grid

### `loop`

- Type: object
- Required: yes
- Fields:
    - `startStep` (integer, >= 0)
    - `endStep` (integer, > `startStep`)

### `palette[]`

- Type: array
- Required: yes
- Constraint: at least 1 entry
- Entry fields:
    - `id` (string, unique)
    - `file` (string path)
    - `gain` (optional number)

### `sequence[]`

- Type: array
- Required: yes
- Entry fields:
    - `step` (integer, >= 0)
    - `soundId` (must exist in `palette[].id`)
    - `lengthSteps` (integer, > 0)
    - `bend` (optional object)
        - `cents` (number)
        - `curve` (`linear` | `ease-in` | `ease-out`)
    - `effect` (optional)
        - `none` | `vibrato` | `tremolo` | `bitcrush` | `filter` | `send`

## Composition Workflow

1. Define `palette[]` IDs and files.
2. Set timing (`bpm`, `stepMs`, `loop`).
3. Author `sequence[]` with step positions and lengths.
4. Add expression (`bend`, `effect`) where needed.
5. Validate in tool and preview.
6. Export deterministic JSON.

## Runtime Contract Notes

Runtime bootstrap resolver: `src/services/bgmRuntimeBootstrap.ts`

- Reads autosave payload from tool recovery key (`bgm`).
- Validates payload contract.
- Emits deterministic cue timeline:
    - `atMs`
    - `durationMs`
    - `effect`
    - optional `bend`
    - cue `shape` metadata:
        - `gainMultiplier`
        - `bendScale`
        - `retriggerCount`
        - `retriggerSpacingMs`
        - `restartIfPlaying`

## Starter Example

```json
{
    "version": "um-bgm-v1",
    "name": "intro-fanfare-a",
    "bpm": 108,
    "stepMs": 140,
    "loop": {
        "startStep": 0,
        "endStep": 8
    },
    "palette": [
        { "id": "sq1", "file": "assets/audio/chiptune/sq1.wav", "gain": 0.85 },
        { "id": "tri", "file": "assets/audio/chiptune/tri.wav", "gain": 0.9 },
        {
            "id": "noise",
            "file": "assets/audio/chiptune/noise.wav",
            "gain": 0.55
        }
    ],
    "sequence": [
        { "step": 0, "soundId": "sq1", "lengthSteps": 2, "effect": "tremolo" },
        { "step": 2, "soundId": "tri", "lengthSteps": 2, "effect": "none" },
        {
            "step": 4,
            "soundId": "sq1",
            "lengthSteps": 2,
            "bend": { "cents": 120, "curve": "ease-out" }
        },
        {
            "step": 6,
            "soundId": "noise",
            "lengthSteps": 1,
            "effect": "bitcrush"
        }
    ]
}
```

## Common Validation Errors

- `Validation failed: invalid JSON.`
    - JSON syntax malformed.
- `version must be "um-bgm-v1".`
    - Wrong/missing version.
- `palette must include at least one sound.`
    - Empty/missing palette.
- `palette ids must be unique.`
    - Duplicate `palette[].id`.
- `sequence references unknown soundId: ...`
    - `sequence[].soundId` not found in palette.
- `each note step must be >= 0 integer.`
    - Invalid `step` value.
- `each note lengthSteps must be positive integer.`
    - Invalid note duration.

## Determinism Rules

- Keep stable field order per [PAYLOAD_FIELD_ORDER.md](./PAYLOAD_FIELD_ORDER.md).
- Keep sequence sorted by `step` where possible.
- Export with pretty JSON (2-space indent).
