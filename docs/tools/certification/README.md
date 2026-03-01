# Tool Certification Artifacts

This folder contains certification artifact examples for plug-and-play tool gates.

## Files

- `example-tool-certification.report.json` — machine-readable report
- `example-tool-certification.summary.md` — human-readable summary
- `TOOL_CERTIFICATION_CHECKLIST.md` — required checklist used per tool PR/release

## Expected Usage

When certifying a new tool, produce both files and attach/archive them in release verification outputs.

Recommended naming pattern:

- `<tool-key>-certification.report.json`
- `<tool-key>-certification.summary.md`

## Status Values

- `pass`
- `pass-with-warnings`
- `fail`

## Local Report Helper

Generate a report/summary scaffold locally:

```bash
npm run tool:certification:report -- --tool tilemap --status pass
```

The command prints report JSON to stdout and summary markdown to stderr (after `---SUMMARY---`).
