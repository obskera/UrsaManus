# Tool Accessibility Baseline

This baseline defines minimum accessibility compliance for all authoring tools before certification pass.

## Scope

Applies to tool UIs under `src/components/examples/` and any standalone `?tool=...` route.

## Required Criteria

1. Keyboard-only operation
    - All core authoring actions must be reachable and executable with keyboard only.
    - No core workflow may require pointer-only gestures.
2. Focus order and visibility
    - Tabbing order must follow the visible workflow sequence.
    - Focus indicator must remain visible at all times.
3. Accessible naming
    - Inputs, buttons, and grouped controls must expose clear labels (`label`, `aria-label`, `aria-labelledby`).
    - File import controls must include explicit accessible names.
4. Status and error announcements
    - Validation/import/export/playtest status should be readable in text form.
    - Error states must be explicit and actionable.
5. Non-pointer parity
    - Pointer-enhanced shortcuts (for example modifier-click) require a keyboard-equivalent path.
    - Equivalent keyboard workflows must be documented in operator guides.
6. Reduced motion and flashing safety
    - Tool interactions should avoid unnecessary animation.
    - Any animation must not be required for task completion.
7. Contrast and readability
    - Use existing design tokens/components to preserve accessible contrast.
    - Do not introduce low-contrast custom color overrides.

## Certification Gate Expectation

- Certification reports must include `checks[].id = "accessibility-baseline"` with pass status.
- Release promotion fails if accessibility-baseline pass evidence is missing.

## Evidence Expectations

Required evidence per tool update:

- Keyboard walkthrough notes for create/edit/validate/export/import flow.
- Accessibility checklist confirmation in certification report.
- Updated operator guide section documenting non-pointer workflows.
