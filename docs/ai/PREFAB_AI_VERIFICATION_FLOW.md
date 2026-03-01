# Prefab AI Verification Flow

Standard verification flow for AI-generated prefab payloads.

## Required command sequence

```bash
npm run prefab:validate
npm run prefab:migration:check
npm run quality:prefab:contracts
```

Run in the order above. Stop on first failure and route errors back into the next correction prompt.

For CI/local automation with artifact output, run:

```bash
npm run prefab:ai:verify -- --prefab-id <id> --generated-by ai --reviewer <name>
```

## Reject reasons catalog

Reject AI output when any of the following occurs:

- Unknown or misspelled module IDs.
- Missing dependency modules.
- Conflicting modules attached together.
- Schema version drift without migration justification.
- Non-deterministic key order or unnecessary key churn.
- Validation or migration command failures.
- Contract test regressions.

## Recommended CI artifact format

Publish a small JSON artifact per AI-generated prefab change:

```json
{
    "artifactVersion": "um-prefab-ai-verification-v1",
    "prefabId": "player-arpg-custom-01",
    "generatedBy": "ai",
    "commands": [
        { "name": "prefab:validate", "status": "pass" },
        { "name": "prefab:migration:check", "status": "pass" },
        { "name": "quality:prefab:contracts", "status": "pass" }
    ],
    "rejectReasons": [],
    "reviewer": "<name>",
    "timestamp": "<iso8601>"
}
```

## Operator loop

1. Generate payload with guardrails.
2. Run verification commands.
3. Capture artifact summary.
4. Approve or reject using review checklist.

## CI wiring

- Workflow step: `.github/workflows/ci.yml` (`Prefab AI verification flow`).
- Artifact path: `tmp/cert/prefab-ai-verification-report.json`.
- Uploaded artifact name: `prefab-ai-verification-report`.
