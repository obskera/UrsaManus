# Authoring Tools Docs

This section covers tool operator usage and plug-and-play tool authoring standards.

## Tool Operator Guides

- [Tile Map Placement Tool](./TILEMAP_TOOL.md)
- [BGM Composer Tool](./BGM_COMPOSER_TOOL.md)
- [BGM Composition JSON Spec](./BGM_JSON_SPEC.md)

## Tool Builder Guide

- [Plug-and-Play Tool Builder Guide](./TOOL_BUILDER_GUIDE.md)
- [Tool Starter Template](./TOOL_STARTER_TEMPLATE.md)
- [Tool Accessibility Baseline](./TOOL_ACCESSIBILITY_BASELINE.md)
- [Tool Performance Budgets](./TOOL_PERFORMANCE_BUDGETS.md)
- [Authored Payload Field Order Contract](./PAYLOAD_FIELD_ORDER.md)
- [Authored JSON Conflict Repair Guide](./AUTHORED_DATA_CONFLICT_REPAIR.md)
- [Schema Migration Notes](./SCHEMA_MIGRATION_NOTES.md)
- [Tool Compatibility Notes](./TOOL_COMPATIBILITY_NOTES.md)

## Certification Artifacts

- [Certification Artifacts README](./certification/README.md)
- [Tool Certification Checklist](./certification/TOOL_CERTIFICATION_CHECKLIST.md)
- [Example Certification Report (JSON)](./certification/example-tool-certification.report.json)
- [Example Certification Summary (Markdown)](./certification/example-tool-certification.summary.md)

## Operator Walkthroughs

- [Walkthroughs Index](./walkthroughs/README.md)
- [Tile Map Walkthrough](./walkthroughs/TILEMAP_WALKTHROUGH.md)
- [BGM Composer Walkthrough](./walkthroughs/BGM_COMPOSER_WALKTHROUGH.md)

## Localhost Quickstart

1. Install dependencies:

`npm install`

2. Start dev server:

`npm run dev`

3. Open tool pages directly:

- Tile map tool: `http://localhost:5173/?tool=tilemap`
- BGM composer tool: `http://localhost:5173/?tool=bgm`
- Sprite pack generator tool: `http://localhost:5173/?tool=spritepack`

## Common Troubleshooting

- Tool page not loading:
    - confirm dev server is running on `localhost:5173`.
    - verify query key is exactly `?tool=tilemap`, `?tool=bgm`, or `?tool=spritepack`.
- Import failing:
    - ensure JSON file is valid UTF-8 text and matches expected schema.
    - run in-tool validation before import when available.
- No audio during BGM preview:
    - verify browser tab is not muted.
    - ensure audio permissions are allowed and output device is active.
    - trigger preview again after first user interaction (browser autoplay policies).
