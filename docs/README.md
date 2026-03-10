# UrsaManus Documentation Hub

Use this page as the primary entrypoint for docs navigation.

## Start Here

- New to the repo: [../README.md](../README.md)
- Architecture boundaries and system flow: [ARCHITECTURE.md](ARCHITECTURE.md)
- Practical APIs and examples: [USAGE.md](USAGE.md)
- Active planning scope: [TODO.md](TODO.md)
- Completed planning archive: [TODO_COMPLETED_2026-03-02.md](TODO_COMPLETED_2026-03-02.md)

## Current App File Map

Use this when navigating the default app shell after recent extraction refactors:

- App orchestrator: [../src/App.tsx](../src/App.tsx)
- App shell components: [../src/components/app/](../src/components/app/)
    - [../src/components/app/AppMainTabs.tsx](../src/components/app/AppMainTabs.tsx)
    - [../src/components/app/ExampleGameToolbar.tsx](../src/components/app/ExampleGameToolbar.tsx)
    - [../src/components/app/ExampleGameCanvasPanel.tsx](../src/components/app/ExampleGameCanvasPanel.tsx)
- App runtime hooks: [../src/hooks/](../src/hooks/)
    - [../src/hooks/useTopDownGameLoop.ts](../src/hooks/useTopDownGameLoop.ts)
    - [../src/hooks/useStartScreenWorldPause.ts](../src/hooks/useStartScreenWorldPause.ts)
    - [../src/hooks/useAudioChannelState.ts](../src/hooks/useAudioChannelState.ts)

## Example Asset Attribution

Examples may use sprites from `public/Ninja Adventure - Asset Pack/`.

- Asset creators:
    - [Pixel-boy](https://pixel-boy.itch.io/)
    - [AAA](https://www.instagram.com/challenger.aaa/?hl=fr)
- License: CC0 1.0 Universal (`public/Ninja Adventure - Asset Pack/LICENSE.txt`)
- Attribution requirement: not required by CC0, but appreciated by the creators

Suggested attribution text for docs/videos/showcases:

`Ninja Adventure Asset Pack by Pixel-boy and AAA (CC0 1.0). Source: https://pixel-boy.itch.io/ninja-adventure-asset-pack`

## By Task

- Build a playable loop quickly:
    - [tutorials/GAME_BUILDING_TUTORIAL.md](tutorials/GAME_BUILDING_TUTORIAL.md)
    - [tutorials/GAME_BUILDING_WORKFLOW_CHEATSHEET.md](tutorials/GAME_BUILDING_WORKFLOW_CHEATSHEET.md)
- Input setup and remapping:
    - [input/CHEATSHEET.md](input/CHEATSHEET.md)
- Prefab authoring and starter packs:
    - [prefabs/CHEATSHEET.md](prefabs/CHEATSHEET.md)
    - [prefabs/PREFAB_WORKFLOW.md](prefabs/PREFAB_WORKFLOW.md)
    - [prefabs/GAME_STARTER_PACKS.md](prefabs/GAME_STARTER_PACKS.md)
- Save/load setup:
    - [save/README.md](save/README.md)
    - [save/CHEATSHEET.md](save/CHEATSHEET.md)

## AI Workflow Docs

- AI bootstrap and repo orientation: [AI_SETUP.md](AI_SETUP.md)
- AI prompts for gameplay/runtime tasks: [ai/ENGINE_AI_WORKFLOWS.md](ai/ENGINE_AI_WORKFLOWS.md)
- AI prefab generation workflow:
    - [ai/PREFAB_AI_QUICKSTART.md](ai/PREFAB_AI_QUICKSTART.md)
    - [ai/PREFAB_PROMPT_CHEATSHEET.md](ai/PREFAB_PROMPT_CHEATSHEET.md)
    - [ai/PREFAB_AI_VERIFICATION_FLOW.md](ai/PREFAB_AI_VERIFICATION_FLOW.md)

## Quality Gates

- Lint: `npm run lint`
- Full tests: `npm run test:run`
- Strict coverage: `npm run test:coverage:strict`
