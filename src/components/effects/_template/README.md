# Effect Template

This folder is a starter scaffold for new effects.

## Copy workflow

1. Copy `src/components/effects/_template` to `src/components/effects/<effectName>`
2. Rename files/symbols:
    - `TemplateEffectOverlay.tsx`
    - `templateEffectSignal.ts`
    - `useTemplateEffect.ts`
    - `templateEffect.css`
3. Update your effect signal name (`effects:<effectName>:play`)
4. Export the effect from `src/components/effects/index.ts`
5. Mount your overlay where `Render` is mounted in `App.tsx`

## Included pieces

- Signal helper (`playTemplateEffect`)
- Effect hook (`useTemplateEffect`)
- Overlay component (`TemplateEffectOverlay`)
- Effect-local CSS
- Effect-level barrel export (`index.ts`)
