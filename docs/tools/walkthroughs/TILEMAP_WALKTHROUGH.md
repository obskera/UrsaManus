# Tile Map Tool Walkthrough (Operator)

This walkthrough is a step-by-step operator flow for the tile map authoring tool.

## Launch

- Start dev server: `npm run dev`
- Open: `http://localhost:5173/?tool=tilemap`

## Walkthrough A — Create a Small Map

### Step 1: Confirm default state

Expected:

- Tool loads with base layer selected.
- Grid is visible and editable.
- Status shows `Ready.`

Capture checkpoint:

- [ ] Screenshot: `docs/tools/walkthroughs/media/tilemap-step-1-default.png`
- [x] Screenshot: `docs/tools/walkthroughs/media/tilemap-step-1-launch.png`

### Step 2: Paint a pattern

Actions:

1. Keep `Paint mode` enabled.
2. Set `Brush tile id` to `3`.
3. Click several grid cells.

Expected:

- Clicked cells update to painted state.
- Status updates with last painted coordinate.

Capture checkpoint:

- [ ] GIF: `docs/tools/walkthroughs/media/tilemap-step-2-paint.gif`
- [x] Screenshot: `docs/tools/walkthroughs/media/tilemap-step-2-brush-pick.png`

### Step 3: Add and switch layers

Actions:

1. Enter `collision` in `New layer id`.
2. Click `Add layer`.
3. Confirm `Select layer` now includes `Base` and `collision`.
4. Toggle visibility on the active layer.

Expected:

- New layer is created and selected.
- Visibility toggle updates layer state.

Capture checkpoint:

- [ ] Screenshot: `docs/tools/walkthroughs/media/tilemap-step-3-layers.png`
- [x] Screenshot: `docs/tools/walkthroughs/media/tilemap-step-5-layer-advanced-tools.png`

## Walkthrough B — Export and Re-import

### Step 4: Export from text + file

Actions:

1. Click `Refresh export`.
2. Verify JSON appears in `Tile map JSON payload`.
3. Click `Export JSON file`.

Expected:

- JSON payload includes `version: "um-tilemap-v1"`.
- Browser downloads `tilemap-layout.json`.

Capture checkpoint:

- [ ] Screenshot: `docs/tools/walkthroughs/media/tilemap-step-4-export.png`
- [x] Screenshot: `docs/tools/walkthroughs/media/tilemap-step-6-export-json.png`

### Step 5: Import from file

Actions:

1. Click `Import JSON file`.
2. Select a valid tile map JSON file.

Expected:

- Status shows `Imported <file>.`
- Map dimensions/layers update to imported payload.

Capture checkpoint:

- [ ] GIF: `docs/tools/walkthroughs/media/tilemap-step-5-import.gif`
- [x] Screenshot: `docs/tools/walkthroughs/media/tilemap-step-4-overlay-mode.png`

## Troubleshooting Quick Checks

- Import fails with invalid JSON:
    - validate JSON syntax and payload fields.
- Layer mismatch or blank map:
    - verify `tiles.length == map.width * map.height` for each layer.
- Export not downloading:
    - verify browser allows downloads from localhost.

## Operator Acceptance

- [ ] Can paint/erase successfully.
- [ ] Can create/select/remove/toggle layers.
- [ ] Can export and re-import without data loss.
- [ ] Walkthrough media captured and stored under `docs/tools/walkthroughs/media/`.
