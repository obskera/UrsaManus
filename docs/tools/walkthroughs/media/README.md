# Walkthrough Media Assets

This folder stores committed media used by tool operator walkthroughs.

## Included assets

- `tilemap-walkthrough-frame.svg` — starter visual for tilemap flow references.
- `bgm-walkthrough-frame.svg` — starter visual for BGM flow references.

## Capture checklist

- [CAPTURE_CHECKLIST.md](./CAPTURE_CHECKLIST.md)

## Capture guidance

1. Replace starter SVGs with real screenshots/GIFs captured from localhost tool routes.
2. Keep stable naming so walkthrough docs can link persistently.
3. Prefer short GIFs for interaction-heavy steps (pick/paint, preview/playback, import/export).
4. Keep file size reasonable for docs rendering.

## Automated screenshot capture

Generate baseline walkthrough screenshots with:

`npm run tools:walkthrough:capture`

By default, capture expects localhost at `http://127.0.0.1:5173`; set `TOOL_CAPTURE_BASE_URL` when using a different port.
