# BGM Composer Tool

This guide covers operator workflows for the chiptune-style BGM composer MVP.

## Launch

- Localhost page: `http://localhost:5173/?tool=bgm`

## Core Workflow

1. Pick a preset (`Intro`, `Loop A`, `Battle`) or `Reset starter JSON`.
2. Edit JSON in `BGM composition JSON` text area.
3. Run `Validate JSON`.
4. Preview audio:
    - `Preview sequence`
    - `Stop preview`
    - optional `Loop preview: on/off`
5. Apply per-step preview controls:
    - `Mute/Unmute step`
    - `Solo/Unsolo step`
    - per-step `Channel` (`music`, `sfx`, `ui`)
6. Persist payload:
    - `Export JSON file`
    - `Import JSON file`
7. Launch runtime playtest:
    - `Open in runtime playtest` validates current JSON, persists snapshot, and opens runtime mode.
8. Verify payload stability:
    - `Verify round-trip` validates current JSON, re-imports normalized payload state, and reports semantic drift if detected.

## Authoring Model

- Version: `um-bgm-v1`
- Palette entries define sound ids and file sources.
- Sequence entries define:
    - `step`
    - `soundId`
    - `lengthSteps`
    - optional `bend`
    - optional `effect` (`none`, `vibrato`, `tremolo`, `bitcrush`, `filter`, `send`)
- Loop window controlled by `loop.startStep` and `loop.endStep`.

## Troubleshooting

- `Validation failed: invalid JSON.`
    - JSON text syntax is invalid.
- `sequence references unknown soundId`
    - every sequence `soundId` must exist in `palette`.
- Preview silent:
    - verify browser/tab volume and autoplay policy state.
    - ensure palette `file` paths map to available assets.

## Accessibility and Keyboard Workflow

- Keyboard-only baseline:
    - Use `Tab` / `Shift+Tab` to move across preset, validate, preview, playtest, round-trip, and file controls.
    - Use `Enter` or `Space` to activate action buttons.
    - Per-step override buttons (`Mute`, `Solo`) and `Channel` selects are fully keyboard-operable.
- Non-pointer parity:
    - All core authoring actions (preset load, JSON edit, validate, preview, export/import, playtest launch, round-trip verify) have keyboard-only execution paths.
    - No pointer-only gesture is required for baseline composition workflows.
- Status visibility:
    - Validation, preview scheduling, playtest launch, and round-trip outcomes are surfaced as text status for assistive and non-pointer workflows.

## Advanced Composition Examples

### Motif Layering

- Keep `sq1` as lead melody and `sq2` as counter line on alternating steps.
- Use `tri` for low-end sustain every 2–4 steps to anchor the harmonic loop.
- Reserve `noise` for accents/fills at phrase boundaries.

### Loop Handoff

- Write a short intro phrase in early steps.
- Set `loop.startStep` after the intro so only the stable groove repeats.
- Keep `loop.endStep` aligned to phrase boundaries (for example 8, 16, 32 steps).

### Channel Role Patterns

- `music`: main sequence playback lane.
- `sfx`: temporary alternate lane for punch accents during previews.
- `ui`: lightweight metronome/click references when checking timing against menus.

## Runtime Integration Notes (Current)

- Preview scheduling is functional in-tool and routes via `audioBus` + `SoundManager`.
- Runtime bootstrap contract service is available in `src/services/bgmRuntimeBootstrap.ts`:
    - loads BGM recovery payload (`bgm` tool key)
    - validates schema/version
    - resolves deterministic runtime cue timeline (`atMs`, `durationMs`, `effect`, optional `bend`)
    - emits per-cue shape hooks (`gainMultiplier`, `bendScale`, retrigger pattern, restart policy) for richer playback integration.
- Playtest launch status in-tool reports validation outcome before runtime handoff.
- Tool includes explicit round-trip verification status to confirm deterministic JSON stability.
