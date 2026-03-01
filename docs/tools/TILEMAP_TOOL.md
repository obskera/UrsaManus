# Tile Map Placement Tool

This guide covers operator workflows for the tile map authoring tool.

## Launch

- Localhost page: `http://localhost:5173/?tool=tilemap`
- Alternate path: open app in dev mode and use the examples panel tool card.

## Core Workflow

1. Choose edit mode:
    - `Paint mode` places current brush tile id.
    - `Erase mode` writes tile id `0`.
    - `Pick mode` samples tile id from clicked cell, updates brush, then auto-returns to `Paint mode`.
    - `Overlay mode` places authored overlay entities (type/tag metadata) at clicked tile coordinates.
2. Set `Brush tile id`.
3. Click cells in the grid to place/erase.
    - Shortcut: hold `Alt` while clicking a cell to pick that tile id into the brush without switching modes.
4. Manage layers:
    - `Select layer`
    - `Add layer`
    - `Remove active layer`
    - `Toggle visibility`
    - `Lock layer` / `Unlock layer` (blocks paint/erase/clear on locked layers)
    - `Move layer up` / `Move layer down`
    - `Duplicate layer`
    - `Merge layer into...`
    - `Clear active layer`
5. Resize map if needed with `Resize map`.
6. Export/import payload:
    - `Refresh export` to sync text area.
    - `Import JSON` to load from text area.
    - `Export JSON file` and `Import JSON file` for file workflows.
7. Run in runtime with one click:
    - `Open in runtime playtest` saves current tilemap snapshot and opens the runtime view without `?tool=...`.
8. Verify payload stability:
    - `Verify round-trip` re-imports the current JSON payload and confirms no semantic drift after deterministic re-export.

## Overlay Entity Authoring

Use `Overlay mode` and the in-tool `Overlay controls` panel to create payload-linked overlay records for runtime bootstrap/spawn integration.

- Configure overlay metadata:
    - `Overlay id` (optional; auto-generated if empty)
    - `Overlay name`
    - `Type` (`object`, `enemy`, `player`)
    - `Tag` (`item`, `enemy`, `objective`, `player-start`)
    - optional `Room index` and `Tile id`
- Click a grid cell while `Overlay mode` is active to place an overlay at that tile coordinate.
- Remove authored overlays from the `Overlay entities` list.
- Exported payloads include an `overlays[]` array for runtime bootstrap consumption.

## Collision Profile Authoring

Use the in-tool `Collision profile` panel to author runtime solid-tile extraction rules that are stored in the exported tilemap payload.

- `Solid layer ids (comma-separated)`
    - Explicit layer ID allowlist for solid extraction (example: `collision,walls`).
- `Solid layer name contains (comma-separated)`
    - Case-insensitive layer-name keyword match when explicit IDs are not enough.
- `Solid tile ids (comma-separated)`
    - Optional tile-id allowlist. Leave empty to accept all non-zero tiles in matching layers.
- `Fallback to visible non-zero tiles`
    - When enabled, visible non-zero tiles can be treated as solid if semantic layers are absent.
- `Apply collision profile`
    - Writes current panel values into payload `collisionProfile` and refreshes export JSON.

## Expected Payload Shape

- Version: `um-tilemap-v1`
- Required fields:
    - `map.width`, `map.height`
    - `layers[]` with unique `id`
    - each layer has `tiles` sized to `width * height`
- Layer fields:
    - `visible`, `locked`, `tiles`
- Runtime linkage fields:
    - `collisionProfile`
    - `overlays[]`

## Troubleshooting

- `Import failed: invalid JSON.`
    - JSON text is malformed. Validate braces/quotes/commas.
- `Layer ... has invalid tile array length.`
    - each layer `tiles` array must exactly match `map.width * map.height`.
- Unable to remove layer:
    - base layer protection is expected; keep at least one layer.

## Accessibility and Keyboard Workflow

- Keyboard-only baseline:
    - Use `Tab` / `Shift+Tab` to move through mode buttons, layer controls, collision profile controls, and payload controls.
    - Use `Enter` or `Space` to activate buttons.
    - Grid cells are buttons (`Tile (x, y)`), so placement/erase/pick can be executed without pointer input.
- Non-pointer parity:
    - Pointer shortcut (`Alt` + click to pick tile) has equivalent keyboard path: switch to `Pick mode`, activate target tile button, then continue in `Paint mode`.
    - File import/export is keyboard-operable through `Import JSON file` and `Export JSON file` controls.
- Status visibility:
    - Validation/import/playtest/round-trip outcomes are surfaced in text status output for screen-reader and keyboard workflows.

## Runtime Integration Notes (Current)

- Export payloads are deterministic and schema-versioned (`um-tilemap-v1`).
- Runtime bootstrap wiring is available: when no quick-save restore is present, app startup reads the tilemap recovery snapshot and applies map dimensions to runtime world size/world bounds.
- Runtime bootstrap now also injects tile-based collision overlays as deterministic obstacle colliders.
- Runtime bootstrap now also injects authored tilemap overlay entities into runtime state with deterministic tile-to-world positioning.
- Tool includes a one-click runtime playtest launcher that persists latest authored state before opening runtime mode.
- Tool includes explicit round-trip verification to detect semantic drift after re-import/export normalization.
- Collision overlay extraction supports semantic profile rules:
    - solid layer matching by ID or layer-name keywords (example: `collision`, `solid`, `blocker`)
    - optional solid tile-id allowlist
    - optional fallback to visible non-zero tiles when semantic layers are absent
- Remaining integration depth: richer advanced layer tooling and deeper overlay gameplay behavior contracts.
