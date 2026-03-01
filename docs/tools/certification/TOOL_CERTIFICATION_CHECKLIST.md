# Tool Certification Checklist

Use this checklist for every new/updated authoring tool before merge/release.

## Required (Pass/Fail)

- [ ] UX parity confirmed for core create/edit/validate/export/import flow.
- [ ] Deterministic payload contract is versioned and documented.
- [ ] Runtime import/bootstrap compatibility validated (no manual transform step).
- [ ] Recovery contract conformance validated (`um-tool-recovery-v1` APIs only).
- [ ] Golden payload contract test added/updated and passing.
- [ ] Accessibility baseline compliance validated (keyboard-only operations, focus order, labels, non-pointer parity).
- [ ] Operator docs updated (`docs/tools/*`) with troubleshooting section.

## Recommended (Pass-with-warnings allowed)

- [ ] Walkthrough media captured and linked.
- [ ] Source-control ergonomics reviewed (stable field order / diff quality).

## Evidence Bundle

Attach these artifacts to verification/release outputs:

- `<tool-key>-certification.report.json`
- `<tool-key>-certification.summary.md`

Report statuses:

- `pass`
- `pass-with-warnings`
- `fail`
