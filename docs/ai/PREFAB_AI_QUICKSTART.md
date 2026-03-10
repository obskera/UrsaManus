# Prefab AI Quickstart

Use this guide to get reliable AI-assisted prefab generation with validation and contract safety.

## 1) Goal-first prompt pattern

Use this baseline prompt shape:

```txt
Create a [player|enemy|object] prefab for [genre/use case].
Constraints:
- Use existing registered modules only.
- Keep schema version as um-prefab-blueprint-v1.
- Prefer extending existing presets before inventing new modules.
- Provide output as blueprint JSON + short integration snippet.
```

## 2) Generate from existing presets first

Ask AI to start from known presets:

- `player:rpg-starter`
- `enemy:melee-chaser`
- `object:loot-chest`

Then request only targeted overrides.

## 3) Required verification sequence (always run)

```bash
npm run prefab:validate
npm run prefab:migration:check
npm run quality:prefab:contracts
```

If any command fails, reject AI output and request a corrected payload.

## 4) Safe prompt constraints (anti-hallucination)

Always include these constraints:

- “Do not invent module IDs not present in current registry.”
- “Do not change schema version from `um-prefab-blueprint-v1`.”
- “Do not remove required dependency modules.”
- “Return deterministic, pretty JSON only.”

## 5) Output checklist before merge

- Blueprint validates with `npm run prefab:validate`
- No migration preflight failures
- Contract suite passes
- Includes usage snippet and short rationale for chosen modules
- Uses domain-appropriate module bundle (player/enemy/object)

## 6) Fast recovery loop for bad AI output

When output is invalid:

1. Paste failing issue messages into the next prompt.
2. Instruct AI to apply minimal diffs only.
3. Re-run the 3-command verification sequence.
4. Repeat until all gates pass.

## 7) Recommended handoff format

Require AI responses to include:

- `Blueprint JSON`
- `Module rationale` (1 line per module)
- `Attach snippet` using `createPrefabAttachmentRuntime(...)`
- `Validation plan` (the three commands above)

This keeps AI output reviewable and immediately actionable.

## 8) Default app integration (current)

When AI suggests wiring prefab demos into the default app:

- Mount demo entries in `src/components/examples/ExamplePrefabsPanel.tsx`.
- Keep app-level shell composition in `src/components/app/` components (`AppMainTabs`, `ExampleGameToolbar`, `ExampleGameCanvasPanel`).
- Keep side-effect logic in `src/hooks/` (`useTopDownGameLoop`, `useStartScreenWorldPause`, `useAudioChannelState`) instead of adding large inline effects to `src/App.tsx`.
