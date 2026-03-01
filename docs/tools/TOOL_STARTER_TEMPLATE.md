# Tool Starter Template

Use this template when creating a new plug-and-play authoring tool.

## 1) Tool Identity

- Tool key: `<tool-key>`
- Tool name: `<Tool Name>`
- Standalone URL: `http://localhost:5173/?tool=<tool-key>`
- Owner/team: `<owner>`

## 2) Payload Contract

Define and version your payload contract first.

```ts
export const TOOL_PAYLOAD_VERSION = "um-<tool-key>-v1" as const;

export type ToolPayload = {
    version: typeof TOOL_PAYLOAD_VERSION;
    // add tool-specific fields
};
```

Checklist:

- [ ] version constant is exported
- [ ] schema fields are typed
- [ ] deterministic serialization order is documented

## 3) Service Skeleton

Create a service with import/export + snapshot + validation.

```ts
export type ToolValidationResult =
    | { ok: true }
    | { ok: false; message: string };

export type ToolService = {
    exportPayload: (options?: { pretty?: boolean }) => string;
    importPayload: (raw: string) => ToolValidationResult;
    getSnapshot: () => unknown;
};
```

Checklist:

- [ ] `exportPayload(...)` returns deterministic JSON
- [ ] `importPayload(...)` returns actionable error messages
- [ ] `getSnapshot(...)` supports renderable UI state

## 4) UI Tool Skeleton

Suggested component flow:

1. Initialize service instance.
2. Render core controls for create/edit actions.
3. Add JSON text area + validate/import/export controls.
4. Add file import/export controls using shared browser helpers.

```tsx
const [raw, setRaw] = useState("{}");
const [status, setStatus] = useState("Ready.");
```

Checklist:

- [ ] localhost boot works via `?tool=<tool-key>`
- [ ] status messages are clear (`Validation failed: ...`, `Imported ...`)
- [ ] no unsafe destructive actions without confirmation

## 5) Standalone Route Wiring

In `src/App.tsx`:

- add `<tool-key>` to `DevToolMode`
- include normalize helper case
- render tool in standalone branch

Checklist:

- [ ] `?tool=<tool-key>` opens tool directly
- [ ] existing tool modes are unaffected

## 6) Tests Minimum

Add focused tests for service and UI.

Service tests:

- [ ] happy-path create/edit/export/import
- [ ] malformed payload handling
- [ ] version/schema mismatch handling

UI tests:

- [ ] key interactions (authoring controls)
- [ ] JSON validation/import/export flow
- [ ] file import path

## 7) Docs + Certification Artifacts

Required docs:

- [ ] operator guide in `docs/tools/<TOOL>.md`
- [ ] builder notes/link in `docs/tools/README.md`
- [ ] map links in `README.md` and `docs/USAGE.md`

Required certification artifacts:

- [ ] JSON report file (machine-readable)
- [ ] Markdown summary report (human-readable)

See examples:

- `docs/tools/certification/example-tool-certification.report.json`
- `docs/tools/certification/example-tool-certification.summary.md`
