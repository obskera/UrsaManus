# BGM Composer Tool Walkthrough (Operator)

This walkthrough is a step-by-step operator flow for composing and previewing BGM motifs.

## Launch

- Start dev server: `npm run dev`
- Open: `http://localhost:5173/?tool=bgm`

## Walkthrough A — Preset to Custom Edit

### Step 1: Load a preset

Actions:

1. Click `Preset: Intro`.
2. Confirm status update.

Expected:

- Status shows `Loaded Intro preset.`
- JSON payload reflects intro preset (`name: intro-fanfare-a`).

Capture checkpoint:

- [ ] Screenshot: `docs/tools/walkthroughs/media/bgm-step-1-preset.png`
- [x] Screenshot: `docs/tools/walkthroughs/media/bgm-step-2-preset-strip.png`

### Step 2: Validate JSON

Actions:

1. Click `Validate JSON`.

Expected:

- Status shows `Validation passed.`
- Summary displays palette/steps/tempo.

Capture checkpoint:

- [ ] Screenshot: `docs/tools/walkthroughs/media/bgm-step-2-validate.png`
- [x] Screenshot: `docs/tools/walkthroughs/media/bgm-step-1-launch.png`

### Step 3: Edit sequence entry

Actions:

1. Update one note in JSON (for example adjust `lengthSteps` or `effect`).
2. Click `Validate JSON` again.

Expected:

- Validation still passes.
- Summary remains available.

Capture checkpoint:

- [ ] GIF: `docs/tools/walkthroughs/media/bgm-step-3-edit-json.gif`
- [x] Screenshot: `docs/tools/walkthroughs/media/bgm-step-3-preview-controls.png`

## Walkthrough B — Preview Controls

### Step 4: Run preview

Actions:

1. Click `Preview sequence`.
2. Optionally toggle `Loop preview: on` and rerun.

Expected:

- Status shows preview scheduled with step/window info.
- Audio playback is audible in browser (if audio device and tab unmuted).

Capture checkpoint:

- [ ] GIF: `docs/tools/walkthroughs/media/bgm-step-4-preview.gif`
- [x] Screenshot: `docs/tools/walkthroughs/media/bgm-step-3-preview-controls.png`

### Step 5: Apply step overrides

Actions:

1. Toggle `Mute step <n>` on one step.
2. Toggle `Solo step <m>` on another step.
3. Change per-step `Channel`.
4. Click `Preview sequence`.

Expected:

- Status reflects playable step count reduction (when solo/mute active).
- Only expected step subset is scheduled.

Capture checkpoint:

- [ ] Screenshot: `docs/tools/walkthroughs/media/bgm-step-5-overrides.png`
- [x] Screenshot: `docs/tools/walkthroughs/media/bgm-step-4-step-overrides.png`

## Walkthrough C — File Workflow

### Step 6: Export and import

Actions:

1. Click `Export JSON file`.
2. Click `Import JSON file` and select a valid payload.

Expected:

- Export downloads `<composition-name>.json`.
- Status shows `Imported <file>.` after successful import.

Capture checkpoint:

- [ ] GIF: `docs/tools/walkthroughs/media/bgm-step-6-file-flow.gif`
- [x] Screenshot: `docs/tools/walkthroughs/media/bgm-step-5-export-json.png`

## Troubleshooting Quick Checks

- `Validation failed: invalid JSON.`
    - fix malformed JSON syntax.
- `sequence references unknown soundId`
    - ensure sequence sound ids exist in palette.
- Preview silent:
    - verify browser autoplay policy and audio permissions.
    - ensure palette file paths are valid and accessible.

## Operator Acceptance

- [ ] Can load preset and validate.
- [ ] Can preview and stop playback.
- [ ] Can use loop + per-step mute/solo/channel controls.
- [ ] Can export/import JSON files successfully.
- [ ] Walkthrough media captured under `docs/tools/walkthroughs/media/`.
