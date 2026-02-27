## UrsaManus Usage Guide

This guide explains how to use the main engine modules in the current codebase.

For system-level flow and responsibilities, see [ARCHITECTURE.md](ARCHITECTURE.md).

### Documentation Map

- [ARCHITECTURE.md](ARCHITECTURE.md) — system flow and module responsibilities
- [save/README.md](save/README.md) — save/load workflows and implementation snippets
- [save/CHEATSHEET.md](save/CHEATSHEET.md) — quick save/load API and shortcut reference
- [../src/services/save/README.md](../src/services/save/README.md) — contributor notes for save internals

### UI Primitives Index

Quick links for reusable, copy/paste-friendly UI building blocks:

- [Default style primitives (`um-*`)](#default-style-primitives-srcstylesdefaultscss)
- [Reusable input helpers (keys + compass)](#reusable-input-helpers-keys--compass)
- [LifeGauge UI primitive (default + skinnable)](#lifegauge-ui-primitive-default--skinnable)
- [ActionButton UI primitive (pressed + cooldown)](#actionbutton-ui-primitive-pressed--cooldown)
- [Toggle UI primitive (on/off state)](#toggle-ui-primitive-onoff-state)
- [VirtualActionButton UI primitive (mobile action)](#virtualactionbutton-ui-primitive-mobile-action)
- [VirtualDPad UI primitive (mobile movement)](#virtualdpad-ui-primitive-mobile-movement)
- [CooldownIndicator UI primitive](#cooldownindicator-ui-primitive)
- [HUDSlot UI primitive](#hudslot-ui-primitive)
- [HUDAnchor UI primitive](#hudanchor-ui-primitive)
- [HUD preset composition helper](#hud-preset-composition-helper)
- [LifeGauge full example component](../src/components/examples/LifeGaugeExample.tsx)

---

## 1) Project Structure

- `src/components/` — React UI and render/controller components
- `src/logic/` — reusable gameplay logic and collision utilities
- `src/services/` — stateful engine services (`DataBus`, buses)
- `src/tests/` — unit/integration tests

---

## 2) Running the Project

Install dependencies:

`npm install`

Start dev server:

`npm run dev`

Run tests:

`npm run test:run`

Run coverage:

`npm run test:coverage`

Run lint:

`npm run lint`

### Template Post-Clone Checklist

If you started from this repository as a template, complete this once before feature work:

- [ ] Update `package.json` metadata (`name`, `version`)
- [ ] Replace README project identity and summary
- [ ] Review `docs/ARCHITECTURE.md` assumptions against your project scope
- [ ] Run and pass local gates:
    - `npm run lint`
    - `npm run test:run`
    - `npm run test:coverage:strict`
- [ ] Confirm CI passes in GitHub Actions after first push

### Default style primitives (`src/styles/defaults.css`)

Engine default classes are globally loaded in `src/main.tsx` to help extensions stay visually consistent.

Think of these as lightweight engine utility classes (similar to Bootstrap utility/components, but scoped to UrsaManus defaults).

Use these class groups:

- Containers/layout: `um-container`, `um-panel`, `um-stack`, `um-row`
- Text/meta: `um-title`, `um-text`, `um-help`, `um-label`
- Buttons: `um-button`, `um-button--primary`, `um-button--ghost`, `um-button--capsule`
- Capsules/pills: `um-capsule`
- Inputs: `um-input`, `um-select`, `um-textarea`
- Checkbox/radio: `um-choice-group`, `um-choice`, `um-checkbox`, `um-radio`
- Lists: `um-list`, `um-list-item`, `um-list--plain`, `um-list--inline`

### Class reference (quick lookup)

| Class                | Purpose                                     | Typical element(s)                       |
| -------------------- | ------------------------------------------- | ---------------------------------------- |
| `um-container`       | Primary boxed section wrapper               | `section`, `div`                         |
| `um-panel`           | Nested boxed region inside container        | `div`                                    |
| `um-stack`           | Vertical layout with consistent spacing     | `div`, `section`, `form`                 |
| `um-row`             | Inline row layout with wrapping and spacing | `div`                                    |
| `um-title`           | Section title text style                    | `h2`, `h3`, `p`                          |
| `um-text`            | Standard muted body text                    | `p`, `span`                              |
| `um-help`            | Small helper/supporting text                | `p`, `small`                             |
| `um-label`           | Label style with aligned content            | `label`                                  |
| `um-button`          | Base button style                           | `button`                                 |
| `um-button--primary` | Primary action button variant               | `button`                                 |
| `um-button--ghost`   | Low-emphasis transparent button variant     | `button`                                 |
| `um-button--capsule` | Pill-shaped button variant                  | `button`                                 |
| `um-capsule`         | Small metadata/status capsule               | `span`, `div`                            |
| `um-input`           | Text-like input field style                 | `input[type=text]`, `input[type=number]` |
| `um-select`          | Select field style                          | `select`                                 |
| `um-textarea`        | Multiline text field style                  | `textarea`                               |
| `um-choice-group`    | Inline grouping for radio/checkbox sets     | `div`, `fieldset`                        |
| `um-choice`          | Label wrapper for one checkbox/radio choice | `label`                                  |
| `um-checkbox`        | Checkbox accent styling hook                | `input[type=checkbox]`                   |
| `um-radio`           | Radio accent styling hook                   | `input[type=radio]`                      |
| `um-list`            | Default styled list container               | `ul`, `ol`                               |
| `um-list-item`       | List line-height/readability style          | `li`                                     |
| `um-list--plain`     | Remove bullets and left indent              | `ul`, `ol`                               |
| `um-list--inline`    | Inline/wrapping list layout                 | `ul`, `ol`                               |

Recommended approach:

- Start with `um-container` + `um-stack` for section structure.
- Add semantic HTML first, then attach `um-*` classes.
- Layer feature-specific classes after `um-*` classes when customization is needed.

### Usage model (Bootstrap-like)

- Compose classes on plain HTML elements (`div`, `button`, `input`, `ul`, etc.).
- Start with structure classes (`um-container`, `um-stack`, `um-row`).
- Add component classes (`um-button`, `um-input`, `um-capsule`).
- Add variants only when needed (`um-button--primary`, `um-button--capsule`).

### Common combinations

- Card/panel: `um-container um-stack`
- Toolbar row: `um-row` + `um-button` variants
- Labeled form field: `um-stack` + `um-label` + `um-input`
- Choice sets: `um-choice-group` + `um-choice`
- Status tags: `um-capsule`
- Inline metadata list: `um-list um-list--inline`

Copy/paste starter:

```tsx
<section className="um-container um-stack">
    <h3 className="um-title">Panel title</h3>
    <p className="um-text">Consistent default styling for extensions.</p>

    <div className="um-row">
        <button className="um-button">Default</button>
        <button className="um-button um-button--primary">Primary</button>
        <button className="um-button um-button--capsule">Capsule</button>
        <span className="um-capsule">Status</span>
    </div>

    <label className="um-label" htmlFor="name-input">
        Name
    </label>
    <input id="name-input" className="um-input" placeholder="Type..." />

    <div className="um-choice-group" role="group" aria-label="Options">
        <label className="um-choice">
            <input type="checkbox" className="um-checkbox" /> Enable SFX
        </label>
        <label className="um-choice">
            <input type="radio" name="difficulty" className="um-radio" />
            Normal
        </label>
    </div>

    <ul className="um-list">
        <li className="um-list-item">First item</li>
        <li className="um-list-item">Second item</li>
    </ul>
</section>
```

### Recipe: compact action toolbar

```tsx
<div className="um-row">
    <button className="um-button um-button--primary">Save</button>
    <button className="um-button">Reset</button>
    <button className="um-button um-button--ghost">Advanced</button>
    <span className="um-capsule">Draft</span>
</div>
```

### Recipe: list + empty state container

```tsx
<section className="um-container um-stack">
    <h3 className="um-title">Inventory</h3>

    <ul className="um-list">
        <li className="um-list-item">Potion</li>
        <li className="um-list-item">Torch</li>
        <li className="um-list-item">Map</li>
    </ul>

    <p className="um-help">No more items available.</p>
</section>
```

### Recipe: radio + checkbox filter bar

```tsx
<div className="um-container um-stack">
    <p className="um-title">Filters</p>

    <div className="um-choice-group" role="group" aria-label="Difficulty">
        <label className="um-choice">
            <input type="radio" name="difficulty" className="um-radio" />
            Easy
        </label>
        <label className="um-choice">
            <input
                type="radio"
                name="difficulty"
                className="um-radio"
                defaultChecked
            />
            Normal
        </label>
        <label className="um-choice">
            <input type="radio" name="difficulty" className="um-radio" />
            Hard
        </label>
    </div>

    <label className="um-choice">
        <input type="checkbox" className="um-checkbox" defaultChecked />
        Show completed quests
    </label>
</div>
```

### Notes

- `um-button` styles are intentionally generic; apply game/mode-specific classes on top when needed.
- `um-checkbox` / `um-radio` rely on native inputs with engine accent color for accessibility and browser consistency.
- Utilities are globally available once `src/styles/defaults.css` is imported in `src/main.tsx`.

### Migration examples (plain HTML → `um-*`)

#### 1) Buttons + status capsule

Before:

```tsx
<div>
    <button>Save</button>
    <button>Cancel</button>
    <span>Draft</span>
</div>
```

After:

```tsx
<div className="um-row">
    <button className="um-button um-button--primary">Save</button>
    <button className="um-button">Cancel</button>
    <span className="um-capsule">Draft</span>
</div>
```

#### 2) Form block

Before:

```tsx
<div>
    <label htmlFor="name">Name</label>
    <input id="name" />
</div>
```

After:

```tsx
<div className="um-container um-stack">
    <label className="um-label" htmlFor="name">
        Name
    </label>
    <input id="name" className="um-input" />
</div>
```

#### 3) Checkbox/radio options

Before:

```tsx
<div>
    <label>
        <input type="checkbox" /> Enable audio
    </label>
    <label>
        <input type="radio" name="mode" /> Arcade
    </label>
</div>
```

After:

```tsx
<div className="um-choice-group" role="group" aria-label="Settings">
    <label className="um-choice">
        <input type="checkbox" className="um-checkbox" /> Enable audio
    </label>
    <label className="um-choice">
        <input type="radio" className="um-radio" name="mode" /> Arcade
    </label>
</div>
```

#### 4) Lists

Before:

```tsx
<ul>
    <li>Potion</li>
    <li>Map</li>
</ul>
```

After:

```tsx
<ul className="um-list">
    <li className="um-list-item">Potion</li>
    <li className="um-list-item">Map</li>
</ul>
```

#### 5) Container + helper text

Before:

```tsx
<div>
    <h3>Settings</h3>
    <p>Adjust options below.</p>
</div>
```

After:

```tsx
<section className="um-container um-stack">
    <h3 className="um-title">Settings</h3>
    <p className="um-help">Adjust options below.</p>
</section>
```

### Reusable input helpers (keys + compass)

UrsaManus now includes helper utilities in `@/components/screenController` so you can assign gameplay behavior once and reuse it across keyboard + compass controls:

- `createPlayerInputActions(options)`
- `useActionKeyBindings(actions, options)`
- `CompassActionControl`

Copy/paste starter:

```tsx
import {
    CompassActionControl,
    createPlayerInputActions,
    useActionKeyBindings,
} from "@/components/screenController";

function InputModule({ onChanged }: { onChanged?: () => void }) {
    const actions = createPlayerInputActions({
        onChanged,
        onInteract: () => {
            // custom interact behavior
        },
    });

    useActionKeyBindings(actions, {
        enabled: true,
        preventDefault: true,
    });

    return <CompassActionControl actions={actions} />;
}
```

Tip: treat `actions` as your semantic gameplay contract (`north/south/east/west/interact`) and keep device bindings (`WASD`, arrows, on-screen buttons) thin.

### Full reference component (end-to-end)

If you want a complete starter that combines:

- `um-*` default style classes,
- shared player input action map,
- keyboard bindings,
- compass on-screen controls,

use:

- `DefaultInputStyleExample` from `src/components/examples/DefaultInputStyleExample.tsx`

Import:

```tsx
import { DefaultInputStyleExample } from "@/components/examples";

<DefaultInputStyleExample
    onChanged={() => {
        // force render or sync UI state
    }}
    onInteract={() => {
        // custom interaction behavior
    }}
/>;
```

### LifeGauge UI primitive (default + skinnable)

Use `LifeGauge` from `@/components/lifeGauge` when you want a health/energy meter with:

- default plug-and-play skin,
- headless render state for custom skin overrides,
- built-in clamping + tone thresholds (`healthy` / `warning` / `critical`).

#### Default skin (quickest)

```tsx
import { LifeGauge } from "@/components/lifeGauge";

function Hud() {
    return <LifeGauge value={64} max={100} label="Player HP" />;
}
```

#### Custom text formatting

```tsx
import { LifeGauge } from "@/components/lifeGauge";

function Hud() {
    return (
        <LifeGauge
            value={42}
            max={100}
            label="Shield"
            formatValueText={(state) => `${state.percentage}%`}
        />
    );
}
```

#### Full custom skin (render override)

```tsx
import { LifeGauge } from "@/components/lifeGauge";

function CustomHud() {
    return (
        <LifeGauge
            value={28}
            max={100}
            label="Player HP"
            render={(state) => (
                <div
                    role="meter"
                    aria-label={state.ariaLabel}
                    aria-valuemin={state.min}
                    aria-valuemax={state.max}
                    aria-valuenow={state.clampedValue}
                    aria-valuetext={state.valueText}
                    data-tone={state.tone}
                    className="um-panel um-stack"
                >
                    <div className="um-row">
                        <span className="um-capsule">{state.tone}</span>
                        <span className="um-text">{state.valueText}</span>
                    </div>

                    <div
                        style={{
                            height: "0.5rem",
                            borderRadius: "999px",
                            overflow: "hidden",
                            border: "1px solid var(--um-border-soft)",
                            background: "var(--um-surface-base)",
                        }}
                        aria-hidden="true"
                    >
                        <div
                            style={{
                                width: `${state.percentage}%`,
                                height: "100%",
                                background: "var(--um-accent)",
                            }}
                        />
                    </div>
                </div>
            )}
        />
    );
}
```

#### Full reference example component

Use the full demo component if you want side-by-side default and custom skins with built-in controls:

- `LifeGaugeExample` from `src/components/examples/LifeGaugeExample.tsx`

```tsx
import { LifeGaugeExample } from "@/components/examples";

<LifeGaugeExample title="LifeGauge preview" />;
```

### ActionButton UI primitive (pressed + cooldown)

Use `ActionButton` from `@/components/actionButton` when you need a gameplay action trigger with:

- explicit pressed/disabled states,
- cooldown lockout behavior,
- default skin plus full render override support.

#### Default usage (quickest)

```tsx
import { ActionButton } from "@/components/actionButton";

<ActionButton
    label="Dash"
    onClick={() => {
        // trigger action
    }}
/>;
```

#### Controlled pressed/cooldown

```tsx
import { ActionButton } from "@/components/actionButton";

<ActionButton
    label="Dash"
    pressed={isDashQueued}
    cooldownRemainingMs={dashCooldownRemainingMs}
    cooldownTotalMs={dashCooldownMs}
    onClick={attemptDash}
/>;
```

#### Custom cooldown text

```tsx
import { ActionButton } from "@/components/actionButton";

<ActionButton
    label="Pulse"
    cooldownRemainingMs={900}
    cooldownTotalMs={1200}
    formatCooldownText={(state) => `${state.cooldownPercentage}%`}
/>;
```

#### Full custom skin (render override)

```tsx
import { ActionButton } from "@/components/actionButton";

<ActionButton
    label="Dash"
    cooldownRemainingMs={1400}
    cooldownTotalMs={2000}
    render={(state) => (
        <button
            type="button"
            className="um-button"
            disabled={!state.canActivate}
            aria-disabled={!state.canActivate}
            data-status={state.status}
        >
            Dash {state.isCoolingDown ? `(${state.cooldownText})` : ""}
        </button>
    )}
/>;
```

### Toggle UI primitive (on/off state)

Use `Toggle` from `@/components/toggle` when you need a compact switch-style on/off control with:

- controlled checked state,
- disabled lockout,
- default skin plus full render override support.

#### Default usage (quickest)

```tsx
import { Toggle } from "@/components/toggle";

<Toggle label="SFX" checked={sfxEnabled} onChange={setSfxEnabled} />;
```

#### Disabled state

```tsx
import { Toggle } from "@/components/toggle";

<Toggle label="Online" checked disabled />;
```

#### Full custom skin (render override)

```tsx
import { Toggle } from "@/components/toggle";

<Toggle
    label="Stealth"
    checked={isStealthEnabled}
    onChange={setIsStealthEnabled}
    render={(state) => (
        <button
            type="button"
            className="um-button"
            aria-pressed={state.checked}
            disabled={!state.canToggle}
        >
            Stealth: {state.checked ? "Enabled" : "Disabled"}
        </button>
    )}
/>;
```

### VirtualActionButton UI primitive (mobile action)

Use `VirtualActionButton` from `@/components/virtualActionButton` when you need a touch-friendly action control with:

- hold lifecycle callbacks,
- cooldown lockout support,
- default skin plus full render override support.

#### Default usage (quickest)

```tsx
import { VirtualActionButton } from "@/components/virtualActionButton";

<VirtualActionButton
    label="A"
    onActivate={() => {
        // trigger action
    }}
/>;
```

#### Hold lifecycle + cooldown

```tsx
import { VirtualActionButton } from "@/components/virtualActionButton";

<VirtualActionButton
    label="A"
    cooldownRemainingMs={900}
    cooldownTotalMs={1200}
    onPressStart={() => {
        // start hold intent
    }}
    onPressEnd={() => {
        // clear hold intent
    }}
    onActivate={() => {
        // activate when ready
    }}
/>;
```

#### Full custom skin (render override)

```tsx
import { VirtualActionButton } from "@/components/virtualActionButton";

<VirtualActionButton
    label="Skill"
    cooldownRemainingMs={600}
    cooldownTotalMs={1200}
    render={(state) => (
        <button
            type="button"
            className="um-button"
            disabled={!state.canActivate}
            aria-disabled={!state.canActivate}
        >
            Skill {state.isCoolingDown ? `(${state.cooldownText})` : ""}
        </button>
    )}
/>;
```

### VirtualDPad UI primitive (mobile movement)

Use `VirtualDPad` from `@/components/virtualDPad` when you need an on-screen directional pad with:

- controlled/uncontrolled pressed state,
- direction start/end callbacks,
- default skin plus full render override support.

#### Default usage (quickest)

```tsx
import { VirtualDPad } from "@/components/virtualDPad";

<VirtualDPad
    label="Movement DPad"
    onPressedChange={(next) => {
        // next.up / next.down / next.left / next.right
    }}
/>;
```

#### Controlled state

```tsx
import { useState } from "react";
import {
    VirtualDPad,
    type VirtualDPadPressedState,
} from "@/components/virtualDPad";

function MovementPad() {
    const [pressed, setPressed] = useState<VirtualDPadPressedState>({
        up: false,
        down: false,
        left: false,
        right: false,
    });

    return <VirtualDPad pressed={pressed} onPressedChange={setPressed} />;
}
```

#### Full custom skin (render override)

```tsx
import { VirtualDPad } from "@/components/virtualDPad";

<VirtualDPad
    pressed={{ right: true }}
    render={(state) => (
        <output className="um-capsule">
            Vector: {state.vectorX},{state.vectorY}
        </output>
    )}
/>;
```

### CooldownIndicator UI primitive

Use `CooldownIndicator` from `@/components/cooldownIndicator` as a reusable cooldown visual for any action/widget.

#### Default usage

```tsx
import { CooldownIndicator } from "@/components/cooldownIndicator";

<CooldownIndicator label="Dash cooldown" remainingMs={900} totalMs={1800} />;
```

#### Hide text + custom text formatting

```tsx
import { CooldownIndicator } from "@/components/cooldownIndicator";

<CooldownIndicator
    remainingMs={1200}
    totalMs={2000}
    showText={false}
    formatText={(state) => `${state.percentage}%`}
/>;
```

### HUDSlot UI primitive

Use `HUDSlot` from `@/components/hudSlot` for compact HUD items with icon + label + optional badge and cooldown hookup.

#### Default usage

```tsx
import { HUDSlot } from "@/components/hudSlot";

<HUDSlot label="Health" value="84/100" icon="❤" badge="Buffed" />;
```

#### With cooldown hookup

```tsx
import { HUDSlot } from "@/components/hudSlot";

<HUDSlot
    label="Ammo"
    value="12/30"
    icon="✦"
    cooldownRemainingMs={900}
    cooldownTotalMs={1800}
    showCooldownText
/>;
```

#### Full custom render override

```tsx
import { HUDSlot } from "@/components/hudSlot";

<HUDSlot
    label="Artifact"
    value="Ready"
    render={(state) => (
        <output>
            {state.label}: {state.value}
        </output>
    )}
/>;
```

#### Composition recipe: ability slot (`HUDSlot` + `ActionButton`)

```tsx
import { useState } from "react";
import { HUDSlot } from "@/components/hudSlot";
import { ActionButton } from "@/components/actionButton";

function AbilitySlot() {
    const [cooldownRemainingMs, setCooldownRemainingMs] = useState(0);

    return (
        <HUDSlot
            label="Ability"
            value="Blink"
            icon="✧"
            render={(state) => (
                <div
                    className="um-panel um-stack"
                    role="group"
                    aria-label={state.ariaLabel}
                >
                    <div className="um-row">
                        <span className="um-capsule">{state.label}</span>
                        <span className="um-text">{state.value}</span>
                    </div>

                    <ActionButton
                        label="Blink"
                        cooldownRemainingMs={cooldownRemainingMs}
                        cooldownTotalMs={2000}
                        onClick={() => {
                            setCooldownRemainingMs(2000);
                        }}
                    />
                </div>
            )}
        />
    );
}
```

### HUDAnchor UI primitive

Use HUDAnchor from @/components/hudAnchor to pin HUD content to top-left, top-right, bottom-left, or bottom-right with safe-area-aware offsets.

#### Default usage

```tsx
import { HUDAnchor } from "@/components/hudAnchor";

<div style={{ position: "relative", minHeight: 220 }}>
    <HUDAnchor anchor="top-left">
        <span className="um-capsule">Top Left</span>
    </HUDAnchor>
</div>;
```

#### Safe-area + offsets

```tsx
import { HUDAnchor } from "@/components/hudAnchor";

<HUDAnchor anchor="bottom-right" safeArea offsetX={12} offsetY={12}>
    <span className="um-capsule">Skills</span>
</HUDAnchor>;
```

#### Full custom render override

```tsx
import { HUDAnchor } from "@/components/hudAnchor";

<HUDAnchor
    anchor="top-right"
    render={(state) => <output>{state.anchor}</output>}
/>;
```

### QuickHUDLayout preset

Use QuickHUDLayout from @/components/hudAnchor for a fast default HUD shell:

- top-left health slot
- top-right minimap slot
- safe-area + shared offsets built in

#### Default usage

```tsx
import { QuickHUDLayout } from "@/components/hudAnchor";

<QuickHUDLayout healthValue="90/100" minimapValue="Zone 3" />;
```

#### Custom slot override

```tsx
import { QuickHUDLayout } from "@/components/hudAnchor";

<QuickHUDLayout
    leftSlot={<span className="um-capsule">HP Custom</span>}
    rightSlot={<span className="um-capsule">Map Custom</span>}
/>;
```

### PlatformerHUDPreset starter

Use PlatformerHUDPreset from @/components/hudAnchor for a ready-made platformer HUD built from existing primitives.

#### Default usage

```tsx
import { PlatformerHUDPreset } from "@/components/hudAnchor";

<PlatformerHUDPreset
    healthValue="92/100"
    minimapValue="Stage 1-1"
    coinsValue={12}
    livesValue={3}
/>;
```

#### With jump action cooldown

```tsx
import { PlatformerHUDPreset } from "@/components/hudAnchor";

<PlatformerHUDPreset
    jumpLabel="Jump"
    jumpCooldownRemainingMs={900}
    jumpCooldownTotalMs={1200}
    onJump={() => {
        // trigger jump/ability
    }}
/>;
```

### TopDownHUDPreset starter

Use TopDownHUDPreset from @/components/hudAnchor for a ready-made top-down HUD with objective + stance slots and an interact action.

#### Default usage

```tsx
import { TopDownHUDPreset } from "@/components/hudAnchor";

<TopDownHUDPreset
    healthValue="76/100"
    minimapValue="Sector B4"
    objectivesValue="2/5"
    stanceValue="Stealth"
/>;
```

#### With interact cooldown

```tsx
import { TopDownHUDPreset } from "@/components/hudAnchor";

<TopDownHUDPreset
    interactLabel="Interact"
    interactCooldownRemainingMs={700}
    interactCooldownTotalMs={1000}
    onInteract={() => {
        // trigger interaction
    }}
/>;
```

### HUD preset composition helper

Use `createHudPresetSlots` from `@/components/hudAnchor` to keep slot override handling consistent when you build new mode presets.

```tsx
import { type ReactNode } from "react";
import { ActionButton } from "@/components/actionButton";
import { HUDSlot } from "@/components/hudSlot";
import { createHudPresetSlots } from "@/components/hudAnchor";

type MyHUDPresetProps = {
    topLeftSlot?: ReactNode;
    topRightSlot?: ReactNode;
    bottomLeftSlot?: ReactNode;
    bottomRightSlot?: ReactNode;
};

function MyHUDPreset({
    topLeftSlot,
    topRightSlot,
    bottomLeftSlot,
    bottomRightSlot,
}: MyHUDPresetProps) {
    const slots = createHudPresetSlots(
        {
            topLeftSlot,
            topRightSlot,
            bottomLeftSlot,
            bottomRightSlot,
        },
        {
            topLeft: <HUDSlot label="Health" value="100/100" icon="❤" />,
            topRight: <HUDSlot label="Minimap" value="Zone A" icon="⌖" />,
            bottomLeft: (
                <HUDSlot label="Objective" value="Find beacon" icon="◎" />
            ),
            bottomRight: <ActionButton label="Interact" />,
        },
    );

    return (
        <>
            {slots.topLeft}
            {slots.topRight}
            {slots.bottomLeft}
            {slots.bottomRight}
        </>
    );
}
```

#### Dev tab location (default app)

In the default app (`src/App.tsx`), both component demos are grouped under one expandable dev section:

- toggle button: **Show example components**
- panel title: **Example components**
- included demos:
    - `LifeGaugeExample` (`src/components/examples/LifeGaugeExample.tsx`)
    - `ActionButtonExample` (`src/components/examples/ActionButtonExample.tsx`)
    - `ToggleExample` (`src/components/examples/ToggleExample.tsx`)
    - `VirtualActionButtonExample` (`src/components/examples/VirtualActionButtonExample.tsx`)
    - `VirtualDPadExample` (`src/components/examples/VirtualDPadExample.tsx`)
    - `CooldownIndicatorExample` (`src/components/examples/CooldownIndicatorExample.tsx`)
    - `HUDSlotExample` (`src/components/examples/HUDSlotExample.tsx`)
    - `HUDAnchorExample` (`src/components/examples/HUDAnchorExample.tsx`)
    - `QuickHUDLayoutExample` (`src/components/examples/QuickHUDLayoutExample.tsx`)
    - `PlatformerHUDPresetExample` (`src/components/examples/PlatformerHUDPresetExample.tsx`)
    - `TopDownHUDPresetExample` (`src/components/examples/TopDownHUDPresetExample.tsx`)
    - `TopDownMiniGameExample` (`src/components/examples/TopDownMiniGameExample.tsx`)
    - `SideScrollerMiniGameExample` (`src/components/examples/SideScrollerMiniGameExample.tsx`)

---

## 3) Rendering Sprites (`Render`)

`Render` in `src/components/Render/Render.tsx` draws game entities to a canvas.

### Props

- `items: RenderableItem[]` (required)
- `width?: number` (default `300`)
- `height?: number` (default `300`)
- `cameraX?: number` (default `0`) — viewport left edge in world space
- `cameraY?: number` (default `0`) — viewport top edge in world space
- `showDebugOutlines?: boolean` (default `true`) — toggles collider debug draw + debug frame style

### `RenderableItem` essentials

- `spriteImageSheet` — URL/path to sprite sheet
- `spriteSize` — source tile size (px)
- `spriteSheetTileWidth`, `spriteSheetTileHeight` — sheet bounds in tiles
- `characterSpriteTiles` — animation frames as tile coordinates
- `scaler` — draw scale multiplier
- `position` — world position
- `fps` (optional) — animation speed
- `collider` (optional) — rectangle collider data for debug draw

### Example

```tsx
<Render
    items={Object.values(dataBus.getState().entitiesById)}
    width={400}
    height={300}
/>
```

### Prebuilt game-mode canvas presets

Use these for faster setup without manually wiring mode-specific `DataBus` config:

- `SideScrollerCanvas` — enables gravity + side-scroller movement tuning
- `TopDownCanvas` — disables player gravity/physics for top-down movement
- `SoundManager` — scene-level audio prefab that listens to `AudioBus`

Both presets now support separating world size from canvas size:

- `width` / `height` = canvas viewport size
- `worldWidth` / `worldHeight` = full world bounds size
- `cameraMode` = `"follow-player"` or `"manual"`
- `cameraClampToWorld` = clamps viewport to world edges
- `manualCameraStartX` / `manualCameraStartY` = starting viewport origin for manual mode

```tsx
import { SideScrollerCanvas, TopDownCanvas } from "@/components/gameModes";

<SideScrollerCanvas
    width={400}
    height={300}
    worldWidth={500}
    worldHeight={500}
    cameraMode="follow-player"
    showDebugOutlines={import.meta.env.DEV}
/>;
<TopDownCanvas
    width={400}
    height={300}
    worldWidth={500}
    worldHeight={500}
    cameraMode="manual"
    manualCameraStartX={50}
    manualCameraStartY={50}
    showDebugOutlines={import.meta.env.DEV}
/>;
```

### AudioBus + SoundManager prefab

Use `AudioBus` to emit audio cues from gameplay/UI code, then mount one
`SoundManager` in the scene to resolve and play those cues.

```tsx
import { SideScrollerCanvas, SoundManager } from "@/components/gameModes";
import { audioBus } from "@/services/AudioBus";

const cues = {
    "scene:music": {
        kind: "tone",
        frequencyHz: 196,
        durationMs: 400,
        gain: 0.08,
        waveform: "triangle",
    },
    "ui:confirm": {
        kind: "tone",
        frequencyHz: 720,
        durationMs: 70,
        gain: 0.05,
        waveform: "square",
    },
} as const;

export function SceneWithAudio() {
    return (
        <>
            <SoundManager cues={cues} />
            <SideScrollerCanvas width={400} height={300} />
            <button
                onClick={() => {
                    audioBus.play("ui:confirm", { channel: "ui" });
                }}
            >
                Confirm
            </button>
        </>
    );
}
```

Audio control helpers:

- `audioBus.play(cueId, options)`
- `audioBus.stop(cueId?)`
- `audioBus.stopChannel(channel)`
- `audioBus.setMasterMuted(boolean)`
- `audioBus.setChannelMuted(channel, boolean)`
- `audioBus.setMasterVolume(0..1)`

### Global app-level world/camera config

Default app wiring uses `src/config/gameViewConfig.ts` so both modes share one camera/world definition.

```ts
export const GAME_VIEW_CONFIG = {
    canvas: { width: 400, height: 300 },
    world: { width: 500, height: 500 },
    camera: {
        mode: "follow-player",
        clampToWorld: true,
        manualStart: { x: 0, y: 0 },
        panStepPx: 24,
        fastPanMultiplier: 3,
    },
};
```

For manual camera movement at runtime, use `DataBus` camera methods:

- `dataBus.setCameraMode("manual")`
- `dataBus.setCameraPosition(x, y)`
- `dataBus.moveCameraBy(dx, dy)`

Pair them with matching control presets from `@/components/screenController`:

- `SideScrollerControls`
- `TopDownControls`

### Game mode presets cheat sheet

| Mode             | Canvas               | Controls               | Input model                      |
| ---------------- | -------------------- | ---------------------- | -------------------------------- |
| Side scroller    | `SideScrollerCanvas` | `SideScrollerControls` | smooth horizontal + gravity jump |
| Top-down (8-way) | `TopDownCanvas`      | `TopDownControls`      | hold-based 8-way movement        |
| Top-down (4-way) | `TopDownCanvas`      | `TopDownControls`      | set `allowDiagonal={false}`      |

### Copy/paste: side-scroller module wiring

```tsx
import { useCallback, useRef } from "react";
import { SideScrollerCanvas } from "@/components/gameModes";
import { SideScrollerControls } from "@/components/screenController";

export function SideScrollerModule() {
    const gameScreenRef = useRef<HTMLDivElement | null>(null);
    const handleMove = useCallback(() => {
        // optional UI updates
    }, []);

    return (
        <>
            <SideScrollerCanvas
                width={400}
                height={300}
                containerRef={gameScreenRef}
                showDebugOutlines={import.meta.env.DEV}
            />
            <SideScrollerControls onMove={handleMove} />
        </>
    );
}
```

### Copy/paste: top-down module wiring

```tsx
import { useCallback, useRef } from "react";
import { TopDownCanvas } from "@/components/gameModes";
import { TopDownControls } from "@/components/screenController";

export function TopDownModule() {
    const gameScreenRef = useRef<HTMLDivElement | null>(null);
    const handleMove = useCallback(() => {
        // optional UI updates
    }, []);

    return (
        <>
            <TopDownCanvas
                width={400}
                height={300}
                containerRef={gameScreenRef}
                showDebugOutlines={import.meta.env.DEV}
            />
            <TopDownControls
                onMove={handleMove}
                allowDiagonal={true}
                speedPxPerSec={220}
            />
        </>
    );
}
```

### Copy/paste: switch between both modes in one app

```tsx
import { useState } from "react";

type Mode = "side-scroller" | "top-down";
const [mode, setMode] = useState<Mode>("side-scroller");

return mode === "side-scroller" ? (
    <>
        <SideScrollerCanvas width={400} height={300} />
        <SideScrollerControls />
    </>
) : (
    <>
        <TopDownCanvas width={400} height={300} />
        <TopDownControls allowDiagonal />
    </>
);
```

### URL mode query in the default app

`App.tsx` supports mode selection via URL query:

- `?mode=side-scroller`
- `?mode=top-down`

### Dev landing controls (default app)

In development mode, the default landing page includes capsule toggles for debugging/help:

- `Show/Hide debug outlines` toggles frame/collider debug visuals.
- `Show/Hide dev controls` opens a compact in-page controls/hotkeys tab.

### Dev + Input Cheat Sheet

| Key / Control         | Action                                      |
| --------------------- | ------------------------------------------- |
| `Arrow keys` / `WASD` | Move player                                 |
| `Space` / `ArrowUp`   | Jump (side-scroller mode)                   |
| `T`                   | Cycle screen transition previews            |
| `P`                   | Spawn/cycle particle presets                |
| `F`                   | Start torch flame at mouse/center fallback  |
| `Shift+F`             | Stop torch flame emitter                    |
| `I/J/K/L`             | Pan camera (manual camera mode)             |
| `Shift+I/J/K/L`       | Pan camera faster (manual camera mode)      |
| `Show/Hide debug...`  | Toggle debug outlines in landing page       |
| `Show/Hide dev...`    | Toggle landing-page dev controls help panel |

### Quick recipes (copy/paste)

- Platformer starter (`SideScrollerCanvas` + `SideScrollerControls`):

```tsx
<SideScrollerCanvas width={400} height={300} />
<SideScrollerControls onMove={handleMove} />
```

- Dungeon crawler (4-way, `TopDownCanvas` + `TopDownControls`):

```tsx
<TopDownCanvas width={400} height={300} />
<TopDownControls onMove={handleMove} allowDiagonal={false} />
```

- Action RPG (8-way, `TopDownCanvas` + `TopDownControls`):

```tsx
<TopDownCanvas width={400} height={300} />
<TopDownControls onMove={handleMove} allowDiagonal speedPxPerSec={240} />
```

- Shareable start-mode links:
    - side scroller: `?mode=side-scroller`
    - top down: `?mode=top-down`

### Full starter file: `App.tsx` (side scroller)

```tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { SideScrollerControls } from "@/components/screenController";
import { SideScrollerCanvas } from "@/components/gameModes";
import { dataBus } from "@/services/DataBus";
import "./App.css";

export default function App() {
    const [, force] = useState(0);
    const gameScreenRef = useRef<HTMLDivElement | null>(null);

    const handleMove = useCallback(() => {
        force((n) => n + 1);
    }, []);

    useEffect(() => {
        let rafId = 0;
        let lastFrame = performance.now();

        const tick = (now: number) => {
            const deltaMs = now - lastFrame;
            lastFrame = now;

            if (dataBus.stepPhysics(deltaMs)) {
                force((n) => n + 1);
            }

            rafId = requestAnimationFrame(tick);
        };

        rafId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafId);
    }, []);

    return (
        <div className="GameContainer">
            <SideScrollerCanvas
                width={400}
                height={300}
                containerRef={gameScreenRef}
                showDebugOutlines={import.meta.env.DEV}
            />
            <SideScrollerControls onMove={handleMove} />
        </div>
    );
}
```

### Full starter file: `App.tsx` (top down)

```tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { TopDownControls } from "@/components/screenController";
import { TopDownCanvas } from "@/components/gameModes";
import { dataBus } from "@/services/DataBus";
import "./App.css";

export default function App() {
    const [, force] = useState(0);
    const gameScreenRef = useRef<HTMLDivElement | null>(null);

    const handleMove = useCallback(() => {
        force((n) => n + 1);
    }, []);

    useEffect(() => {
        let rafId = 0;
        let lastFrame = performance.now();

        const tick = (now: number) => {
            const deltaMs = now - lastFrame;
            lastFrame = now;

            if (dataBus.stepPhysics(deltaMs)) {
                force((n) => n + 1);
            }

            rafId = requestAnimationFrame(tick);
        };

        rafId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafId);
    }, []);

    return (
        <div className="GameContainer">
            <TopDownCanvas
                width={400}
                height={300}
                containerRef={gameScreenRef}
                showDebugOutlines={import.meta.env.DEV}
            />
            <TopDownControls
                onMove={handleMove}
                allowDiagonal={true}
                speedPxPerSec={220}
            />
        </div>
    );
}
```

### Full starter file: `App.css` (works for both presets)

```css
.GameContainer {
    width: min(100%, 980px);
    margin: 0 auto;
    padding: 2.25rem 1rem 1.5rem;
    display: grid;
    gap: 1rem;
}

.GameSurface {
    border-radius: 18px;
    border: 1px solid rgba(148, 163, 184, 0.25);
    background: rgba(15, 23, 42, 0.72);
    padding: 1rem;
    display: grid;
    gap: 1rem;
}

.GameScreen {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    width: fit-content;
    padding: 1.5rem;
    border-radius: 12px;
    background: linear-gradient(
        180deg,
        rgba(15, 23, 42, 0.92) 0%,
        rgba(2, 6, 23, 0.92) 100%
    );
    box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.35);
    overflow: hidden;
}
```

---

## 4) Game State + Movement (`DataBus`)

`src/services/DataBus.ts` owns the runtime state and movement/collision updates.

### Common methods

- `getState()` — read current `GameState`
- `movePlayerUp/Down/Left/Right()` — move player and run collisions
- `setWorldSize(width, height)` — updates world dimensions
- `setWorldBoundsEnabled(true|false)` — toggles world boundary entities
- `setPlayerCanPassWorldBounds(true|false)` — toggles player vs world collisions
- `setPlayerMoveInput(inputX)` — smooth horizontal input (`-1` to `1`)
- `setPhysicsConfig(config)` — configure gravity/terminal velocity/frame clamp
- `enableEntityPhysics(entityId, bodyOverrides?)` — opt an entity into gravity/physics
- `disableEntityPhysics(entityId)` — opt an entity out
- `enablePlayerPhysics(bodyOverrides?)` — player convenience wrapper
- `enablePlayerGravity(bodyOverrides?)` — one-line player gravity setup
- `disablePlayerPhysics()` — player convenience wrapper
- `setPlayerMovementConfig(config)` — tune horizontal accel/decel and jump velocity
- `setPlayerJumpAssistConfig(config)` — tune coyote time / jump buffer
- `setEntityVelocity(entityId, x, y)` — set per-entity velocity
- `isEntityGrounded(entityId, probeDistance?)` — grounded check helper
- `isPlayerGrounded(probeDistance?)` — player grounded check helper
- `jumpEntity(entityId, jumpVelocity?)` — grounded-gated jump helper
- `jumpPlayer(jumpVelocity?)` — one-line player jump helper
- `requestPlayerJump()` — buffered jump request (consumed in `stepPhysics`)
- `stepPhysics(deltaMs)` — advance physics and return whether positions changed

### Usage pattern

Use `dataBus` as the single source of engine state in UI components:

```ts
dataBus.movePlayerRight();
const entities = Object.values(dataBus.getState().entitiesById);
```

### Gravity/physics (opt-in)

Physics is modular and disabled per entity until enabled.

```ts
const player = dataBus.getPlayer();

dataBus.setPhysicsConfig({
    gravityPxPerSec2: 1600,
    terminalVelocityPxPerSec: 900,
    maxDeltaMs: 50,
});

dataBus.enableEntityPhysics(player.id, {
    gravityScale: 1,
    velocity: { x: 0, y: 0 },
    dragX: 0,
});

// Example jump impulse
dataBus.setEntityVelocity(player.id, 0, -520);

// Called each animation frame; returns true when entities moved
const didMove = dataBus.stepPhysics(deltaMs);
```

Player shortcut:

```ts
dataBus.enablePlayerGravity({
    gravityScale: 1,
    velocity: { x: 0, y: 0 },
});

if (dataBus.isPlayerGrounded()) {
    dataBus.jumpPlayer(520);
}

// smooth movement input loop (keyboard/controller)
dataBus.setPlayerMoveInput(1); // move right

// buffered jump input for coyote-time flows
dataBus.requestPlayerJump();
```

### Reusable physics module

Import from `src/logic/physics` when you want physics behavior outside `DataBus`:

- `createPhysicsBody(overrides?)`
- `stepEntityPhysics(entityLike, deltaMs, config?)`
- `DEFAULT_GRAVITY_CONFIG`

---

## 5) Screen Controls System

All screen controls are under `src/components/screenController/` and re-exported by `index.ts`.

### Exports

- `ScreenController` — container
- `ScreenControl` — base button primitive
- `ScreenControlGroup` — grouped/labeled section wrapper
- `ArrowKeyControl` — keyboard listener control (Arrow keys + WASD)
- `OnScreenArrowControl` — clickable arrow buttons (movement)
- `CompassDirectionControl` — `N/S/E/W` buttons (`log` mode or `player-actions` mode)
- `CompassActionControl` — compass control that directly consumes a provided action map
- `createPlayerInputActions` — reusable gameplay action map factory
- `useActionKeyBindings` — reusable keyboard-to-action binding hook
- `getFocusableElements` / `handleArrowFocusNavigation` — lightweight focus + arrow-key navigation helpers
- `createInputComponentAdapters` — adapter factory for reusing one action map across multiple input components

### Recommended composition

```tsx
<ScreenController className="snes-layout">
    <ArrowKeyControl onMove={() => force((n) => n + 1)} />
    <ScreenControlGroup className="dpad-group">
        <OnScreenArrowControl onMove={() => force((n) => n + 1)} />
    </ScreenControlGroup>
    <ScreenControlGroup className="face-button-group">
        <CompassDirectionControl mode="player-actions" />
    </ScreenControlGroup>
</ScreenController>
```

Default keyboard controls:

- Movement: Arrow keys / `WASD`
- Jump: `Space`

### Input mapping template (copy/paste)

Use the built-in helpers when you want one place to map gameplay actions to both keys and on-screen buttons.

```tsx
import {
    CompassDirectionControl,
    createPlayerInputActions,
    useActionKeyBindings,
} from "@/components/screenController";

function ControlsModule({ onChanged }: { onChanged?: () => void }) {
    const actions = createPlayerInputActions({
        onChanged,
        onInteract: () => {
            // your interaction logic
        },
    });

    useActionKeyBindings(actions, {
        enabled: true,
        preventDefault: true,
    });

    return <CompassDirectionControl mode="player-actions" onMove={onChanged} />;
}
```

### Focus + keyboard navigation helpers

Use `getFocusableElements` and `handleArrowFocusNavigation` from `@/components/screenController` to add simple roving focus in button groups, menus, or control clusters.

```tsx
import {
    getFocusableElements,
    handleArrowFocusNavigation,
} from "@/components/screenController";

function FocusableActionRow() {
    return (
        <div
            role="group"
            aria-label="Quick actions"
            onKeyDown={(event) => {
                handleArrowFocusNavigation(
                    event.nativeEvent,
                    event.currentTarget,
                    {
                        orientation: "horizontal",
                        wrap: true,
                    },
                );
            }}
        >
            <button type="button">Save</button>
            <button type="button">Load</button>
            <button type="button">Reset</button>
        </div>
    );
}

// Programmatic access when needed
const focusables = getFocusableElements(document.body);
console.log(focusables.length);
```

### Input mapping adapters (reuse one action map across components)

Use `createInputComponentAdapters` when you want one `InputActionMap` to drive multiple controls (keyboard, compass buttons, virtual DPad, action buttons) without duplicating wiring.

```tsx
import {
    CompassActionControl,
    createInputComponentAdapters,
    createPlayerInputActions,
    useActionKeyBindings,
} from "@/components/screenController";
import { VirtualDPad } from "@/components/virtualDPad";
import { VirtualActionButton } from "@/components/virtualActionButton";

function MobileControls() {
    const actions = createPlayerInputActions({
        onChanged: () => {
            // trigger render sync
        },
    });

    const adapters = createInputComponentAdapters(actions);
    useActionKeyBindings(actions);

    return (
        <div className="um-row">
            <CompassActionControl actions={adapters.compassActions} />
            <VirtualDPad
                onDirectionStart={adapters.virtualDPad.onDirectionStart}
            />
            <VirtualActionButton
                label="A"
                onActivate={adapters.actionButton.onActivate}
            />
        </div>
    );
}
```

### Compass buttons template (primary)

`CompassDirectionControl` supports both modes:

- `mode="log"` (default) for quick demo logging
- `mode="player-actions"` for gameplay movement/jump behavior via `DataBus`

```tsx
import { ScreenControl } from "@/components/screenController";

type CompassActions = {
    north: () => void;
    south: () => void;
    east: () => void;
    west: () => void;
};

export function GameCompass({ actions }: { actions: CompassActions }) {
    return (
        <div className="compass-direction-control">
            <ScreenControl
                label="N"
                className="compass-button north"
                onActivate={actions.north}
            />
            <ScreenControl
                label="W"
                className="compass-button west"
                onActivate={actions.west}
            />
            <ScreenControl
                label="E"
                className="compass-button east"
                onActivate={actions.east}
            />
            <ScreenControl
                label="S"
                className="compass-button south"
                onActivate={actions.south}
            />
        </div>
    );
}
```

### Key assignment template

Use this when you need custom keys beyond default `ArrowKeyControl` behavior.

```tsx
import { useEffect } from "react";

type InputActions = {
    north: () => void;
    south: () => void;
    east: () => void;
    west: () => void;
    interact: () => void;
};

export function useKeyBindings(actions: InputActions, enabled: boolean = true) {
    useEffect(() => {
        if (!enabled) return;

        const onKeyDown = (event: KeyboardEvent) => {
            const key = event.key.toLowerCase();

            if (key === "w" || key === "arrowup") actions.north();
            if (key === "s" || key === "arrowdown") actions.south();
            if (key === "d" || key === "arrowright") actions.east();
            if (key === "a" || key === "arrowleft") actions.west();
            if (key === "e") actions.interact();
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [actions, enabled]);
}
```

### Quick cheat sheet: assign once, reuse everywhere

- Define action map once (`north/south/east/west/interact`).
- Feed the same actions into compass `ScreenControl` buttons.
- Feed the same actions into keyboard bindings.
- Keep `onChanged` callback centralized to force render only where needed.
- Prefer action names (`north`, `interact`) instead of input names (`w`, `buttonA`) so you can remap later.

---

## 6) Screen Transition Effects (`components/effects`)

### Canvas effects plugin contract (advanced)

The current runtime path uses `EffectGraph` internally. `CanvasEffectsStage` remains available as a compatibility adapter over the same pass contract:

- `EffectGraph`
- `CanvasEffectsStage`
- `CanvasEffectPass`
- `CanvasEffectFrame`
- `CanvasEffectLayer`
- `CANVAS_EFFECT_LAYER_ORDER`

Contract summary:

- Each pass declares `id`, `layer`, `isActive`, `update(deltaMs)`, and `draw(frame)`.
- Stage ordering is deterministic by layer (`particles` -> `transition`) and then pass id.
- Signal trigger APIs stay unchanged (`playScreenTransition`, `emitParticles`).

```ts
import {
    EffectGraph,
    type CanvasEffectPass,
} from "@/components/effects";

const graph = new EffectGraph();

const pass: CanvasEffectPass = {
    id: "example-pass",
    layer: "particles",
    isActive: () => true,
    update: (deltaMs) => {
        void deltaMs;
    },
    draw: ({ ctx, width, height }) => {
        void ctx;
        void width;
        void height;
    },
};

graph.upsertPlugin(pass);
```

Current runtime behavior note: effects and transitions are runtime-owned in `Render` (no mode-level pass hooks or overlay shims).

The transition system is signal-driven and runs through the `Render` runtime effects stage.

- `createScreenTransitionCanvasPass` owns transition update/draw lifecycle.
- `TransitionCoordinator` guarantees phase timing and callback ordering.
- `playScreenTransition(payload)` emits a transition signal with full control.
- `playBlackFade(options)` is a preset helper for black transitions.
- Variant helpers: `playVenetianBlindsTransition`, `playMosaicDissolveTransition`, `playIrisTransition`, `playDirectionalPushTransition`.
- `setupDevEffectHotkeys(options)` wires development preview keys (`T`, `P`, `F`, `Shift+F`, `I/J/K/L`, `Shift+I/J/K/L`).

### Required app wiring

Use `Render` with runtime effects enabled (default behavior).

```tsx
return (
    <div className="GameScreen">
        <Render
            items={Object.values(dataBus.getState().entitiesById)}
            width={400}
            height={300}
            includeEffects
            enableTransitionEffects
        />
    </div>
);
```

### Trigger a transition

```ts
import { playScreenTransition } from "@/components/effects";

playScreenTransition({
    color: "#000",
    from: "top-left",
    durationMs: 500,
    stepMs: 16,
    boxSize: 16,
});
```

### Trigger with black preset

```ts
import { playBlackFade } from "@/components/effects";

playBlackFade({
    from: "bottom-right",
    durationMs: 500,
    stepMs: 16,
    boxSize: 16,
});
```

### Trigger a specific variant

```ts
import {
    playDirectionalPushTransition,
    playIrisTransition,
    playMosaicDissolveTransition,
    playVenetianBlindsTransition,
} from "@/components/effects";

playVenetianBlindsTransition({
    color: "#2f3e46",
    from: "top-left",
    venetianOrientation: "horizontal",
});

playMosaicDissolveTransition({
    color: "#5e548e",
    from: "top-left",
    mosaicSeed: 42,
});

playIrisTransition({
    color: "#2a9d8f",
    from: "top-left",
    irisOrigin: "center",
});

playDirectionalPushTransition({
    color: "#bc4749",
    from: "top-left",
    pushFrom: "right",
});
```

### Transition payload reference

- `color: string` — fill color for transition boxes
- `from: "top-left" | "top-right" | "bottom-left" | "bottom-right"`
- `durationMs?: number` — per phase duration (cover and reveal)
- `stepMs?: number` — delay between diagonal wave cells
- `boxSize?: number` — pixel block size
- `variant?: "diagonal" | "venetian-blinds" | "mosaic-dissolve" | "iris" | "directional-push"`
- `venetianOrientation?: "horizontal" | "vertical"` (venetian only)
- `mosaicSeed?: number` (mosaic only)
- `irisOrigin?: "center" | TransitionCorner` (iris only)
- `pushFrom?: "left" | "right" | "top" | "bottom"` (directional push only)
- `onCovered?: () => void` — called when screen is fully covered
- `onComplete?: () => void` — called after reveal finishes

Variant helper note: `playVenetianBlindsTransition`, `playMosaicDissolveTransition`, `playIrisTransition`, and `playDirectionalPushTransition` now accept optional `color` and default to `"black"` when omitted.

### Recommended scene-swap flow

Use `onCovered` to swap world/screen state while the transition is opaque:

```ts
playBlackFade({
    from: "top-right",
    onCovered: () => {
        // swap map/screen/entities here
    },
    onComplete: () => {
        // optional post-transition work
    },
});
```

### Notes

- Transition signal: `effects:screen-transition:play`
- Development hotkeys now live in `src/components/effects/dev/devEffectHotkeys.ts`.
- New effects can start from `src/components/effects/_template/`.

### Dev hotkeys setup (optional)

Use this helper in development to preview transitions and particles quickly.

```ts
import { setupDevEffectHotkeys } from "@/components/effects";

const cleanup = setupDevEffectHotkeys({
    enabled: import.meta.env.DEV,
    width: 400,
    height: 300,
    getContainer: () => gameScreenRef.current,
});

// call cleanup() on unmount
```

Default keybinds:

- `T` — cycle transition variants/corners
- `P` — cycle particle presets at random in-bounds positions
- `F` — start/reposition a continuous torch emitter at mouse position (or center fallback)
- `Shift+F` — stop the torch emitter
- `I/J/K/L` — pan camera in manual mode
- `Shift+I/J/K/L` — pan camera faster in manual mode

Contributor workflow notes for these controls are documented in [CONTRIBUTING.md](CONTRIBUTING.md#6-dev-preview-controls-effects).

---

## 7) Particle Effects (`components/effects`)

The particle emitter is signal-driven and renders through the `Render` runtime effects stage.

- `createParticleEmitterCanvasPass` owns particle spawn/update/draw lifecycle.
- `emitParticles(payload)` emits particle bursts through `SignalBus`.

### Required app wiring

Use `Render` with runtime effects enabled (default behavior).

```tsx
return (
    <div className="GameScreen">
        <Render
            items={Object.values(dataBus.getState().entitiesById)}
            width={400}
            height={300}
            includeEffects
        />
    </div>
);
```

### Emit particles from anywhere

```ts
import { emitParticles } from "@/components/effects";

emitParticles({
    amount: 40,
    location: { x: 200, y: 150 },
    direction: {
        angleDeg: 270,
        speed: 160,
        spreadDeg: 360,
        speedJitter: 80,
    },
    emissionShape: "point",
    lifeMs: 700,
    color: "#ffd166",
    size: 2,
    sizeJitter: 1,
    gravity: 120,
    drag: 0.15,
});
```

### Particle payload reference

- `amount: number` — number of particles to spawn
- `location: { x, y }` — emission origin
- `direction: { angleDeg, speed, spreadDeg?, speedJitter? }`
- `emissionShape: "point" | "circle" | "line"`
- `lifeMs: number` — lifetime per particle
- `color: string` — fill color
- `colorPalette?: string[]` — optional random palette per particle
- `size?: number` — base particle size
- `sizeJitter?: number` — random size variance
- `sizeRange?: { min: number; max: number }` — optional min/max random size
- `emissionRadius?: number` — used by `circle` shape
- `emissionLength?: number` — used by `line` shape
- `gravity?: number` — vertical acceleration per second
- `drag?: number` — velocity damping factor

### Preset helpers

Use these for faster setup before fine-tuning with `emitParticles`:

- `emitSmokeParticles(location, options?)`
- `emitSparkParticles(location, options?)`
- `emitMagicShimmerParticles(location, options?)`
- `emitDebrisParticles(location, options?)`
- `emitBurningFlameParticles(location, options?)` (flame + smoke combo)

```ts
import {
    emitBurningFlameParticles,
    emitSmokeParticles,
    startTorchFlameEmitter,
    stopTorchFlameEmitter,
} from "@/components/effects";

emitSmokeParticles({ x: 180, y: 170 });

emitBurningFlameParticles(
    { x: 200, y: 190 },
    {
        flameAmount: 20,
        smokeAmount: 10,
    },
);

const stopTorch = startTorchFlameEmitter(
    "campfire",
    { x: 220, y: 210 },
    {
        intervalMs: 100,
        amount: 14,
    },
);

// later
stopTorch();
stopTorchFlameEmitter("campfire");
```

### Emission shape notes

- `point`: all particles spawn exactly at `location`
- `circle`: particles spawn randomly inside `emissionRadius`
- `line`: particles spawn across a horizontal line using `emissionLength`

### Common presets (copy/paste)

```ts
import { emitParticles } from "@/components/effects";

// Dust puff (ground hit)
emitParticles({
    amount: 22,
    location: { x: 160, y: 220 },
    direction: { angleDeg: 270, speed: 80, spreadDeg: 80, speedJitter: 30 },
    emissionShape: "line",
    emissionLength: 20,
    lifeMs: 380,
    color: "#c2b280",
    size: 2,
    sizeJitter: 1,
    gravity: 160,
    drag: 0.25,
});

// Spark burst (impact)
emitParticles({
    amount: 34,
    location: { x: 200, y: 120 },
    direction: { angleDeg: 270, speed: 190, spreadDeg: 360, speedJitter: 90 },
    emissionShape: "point",
    lifeMs: 320,
    color: "#ffd166",
    size: 2,
    sizeJitter: 1,
    gravity: 90,
    drag: 0.1,
});

// Explosion (area burst)
emitParticles({
    amount: 65,
    location: { x: 220, y: 140 },
    direction: { angleDeg: 270, speed: 220, spreadDeg: 360, speedJitter: 120 },
    emissionShape: "circle",
    emissionRadius: 14,
    lifeMs: 700,
    color: "#ff7b00",
    size: 3,
    sizeJitter: 2,
    gravity: 130,
    drag: 0.12,
});
```

### Particle tuning by feel

| Feel                | Increase                             | Decrease                   | Typical ranges                                                                  |
| ------------------- | ------------------------------------ | -------------------------- | ------------------------------------------------------------------------------- |
| Soft / floaty       | `lifeMs`, `drag`                     | `gravity`, `speed`         | `lifeMs: 500-1200`, `drag: 0.18-0.35`, `gravity: 20-120`                        |
| Punchy / impact     | `amount`, `speed`, `spreadDeg`       | `lifeMs`                   | `amount: 20-50`, `speed: 140-280`, `spreadDeg: 180-360`, `lifeMs: 180-450`      |
| Heavy / debris      | `size`, `gravity`                    | `spreadDeg`, `speedJitter` | `size: 2-5`, `gravity: 140-260`, `spreadDeg: 60-200`                            |
| Chaotic / explosive | `spreadDeg`, `speedJitter`, `amount` | `drag`                     | `spreadDeg: 300-360`, `speedJitter: 80-180`, `amount: 40-90`, `drag: 0.05-0.18` |

Quick tip: if particles feel too “stiff,” raise `speedJitter`; if they feel too “noisy,” lower `spreadDeg` first.

### Notes

- Particle signal: `effects:particles:emit`
- Overlay is visual-only (`pointer-events: none`)
- Torch helpers: `startTorchFlameEmitter(id, location, options?)`, `stopTorchFlameEmitter(id)`, `stopAllTorchFlameEmitters()`
- Development particle/transition previews are handled by `setupDevEffectHotkeys` in development mode

### Effects API quick reference

| Effect                     | Trigger helper                  | Signal                           | Required payload fields                                               | Common optional fields                                                      |
| -------------------------- | ------------------------------- | -------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Screen transition          | `playScreenTransition(payload)` | `effects:screen-transition:play` | `color`, `from`                                                       | `durationMs`, `stepMs`, `boxSize`, `onCovered`, `onComplete`                |
| Screen transition (preset) | `playBlackFade(options)`        | `effects:screen-transition:play` | `from`                                                                | `durationMs`, `stepMs`, `boxSize`, `onCovered`, `onComplete`                |
| Particle emitter           | `emitParticles(payload)`        | `effects:particles:emit`         | `amount`, `location`, `direction`, `emissionShape`, `lifeMs`, `color` | `size`, `sizeJitter`, `emissionRadius`, `emissionLength`, `gravity`, `drag` |
| Particle presets           | `emitSmokeParticles(...)` etc.  | `effects:particles:emit`         | `location`                                                            | `ParticlePresetOptions` (`amount`, `lifeMs`, `colorPalette`, `sizeRange`)   |
| Torch emitter              | `startTorchFlameEmitter(...)`   | `effects:particles:emit`         | `id`, `location`                                                      | `intervalMs`, `amount`, `flameAmount`, `smokeAmount`, preset overrides      |

| Particle `direction` field | Type     | Meaning                            |
| -------------------------- | -------- | ---------------------------------- |
| `angleDeg`                 | `number` | Base movement angle in degrees     |
| `speed`                    | `number` | Base speed                         |
| `spreadDeg`                | `number` | Direction spread around `angleDeg` |
| `speedJitter`              | `number` | Random variation around `speed`    |

---

## 8) Keyboard Hook (`useArrowKeys`)

`src/logic/useArrowKeys.ts` is a reusable hook for directional keyboard input.

### API

- `onDirection(direction)` — callback with `"up" | "down" | "left" | "right"`
- `preventDefault?: boolean` (default `true`)
- `enabled?: boolean` (default `true`)

### Example

```ts
useArrowKeys({
    onDirection: (dir) => {
        if (dir === "left") dataBus.movePlayerLeft();
    },
});
```

---

## 9) Testing Conventions

- Use explicit Vitest imports in every test file (`describe`, `it`, `expect`, `vi`, etc.)
- Naming convention:
    - primary tests: `<subject>.test.ts(x)`
    - additional/edge scenarios: `<subject>.extended.test.ts(x)`

Current examples:

- `screenController.behavior.test.tsx`
- `screenController.layout.test.tsx`
- `Render.extended.test.tsx`
- `useArrowKeys.extended.test.tsx`

---

## 10) Common Extension Tasks

### Add a new control

1. Create a component in `src/components/screenController/`
2. Re-export it from `src/components/screenController/index.ts`
3. Mount it in `App.tsx` inside `ScreenController`
4. Add behavior/layout tests in `src/tests/`

### Add a new entity type

1. Create/update entity data shape in logic/entity layer
2. Add entity to `DataBus` state
3. Ensure it has render-required fields (`spriteImageSheet`, tiles, etc.)
4. Add collider when collision participation is required

---

## 11) Save File Import/Export

Reference docs:

- Full guide: [save/README.md](save/README.md)
- One-page quick ref: [save/CHEATSHEET.md](save/CHEATSHEET.md)
- Module internals: [../src/services/save/README.md](../src/services/save/README.md)

### Quick save (localStorage)

Quick save APIs are available in `src/services/save/bus.ts`:

- `quickSave()` stores current state in localStorage key `ursa:quickSave:v1`.
- `quickLoad()` restores that snapshot when present/valid.
- `clearQuickSave()` removes the stored snapshot.

Default app behavior in development:

- App startup attempts `quickLoad()` automatically.
- Runtime state changes trigger throttled autosave via `createQuickSaveScheduler`.

Dev shortcuts (when dev mode is enabled):

- `Alt + Shift + S` — Quick Save
- `Alt + Shift + L` — Quick Load
- `Alt + Shift + E` — Export Save File
- `Alt + Shift + I` — Import Save File
- `Alt + Shift + M` — Toggle Audio Mute
- `Alt + Shift + N` — Toggle Music Mute
- `Alt + Shift + B` — Toggle SFX Mute

Save file APIs live in `src/services/save/file.ts` and use the versioned `SaveGameV1` schema from `src/services/save/schema.ts`.

### Startup restore snippet

```ts
import { quickLoad } from "@/services/save";

const didRestore = quickLoad();
if (!didRestore) {
    // keep default state
}
```

### Throttled autosave snippet

```ts
import { createQuickSaveScheduler } from "@/services/save";

const scheduler = createQuickSaveScheduler({ waitMs: 700 });

function onStateChanged() {
    scheduler.notifyChange();
}

function cleanup() {
    scheduler.dispose();
}
```

### Export

- Call `exportSaveFile()` to download a `.json` snapshot of current `DataBus` state.
- Filename format: `ursa-save-<timestamp>.json` (see `buildSaveFileName`).
- Return shape:
    - success: `{ ok: true, fileName }`
    - error: `{ ok: false, code, message }`

### Import

- Call `importSaveFile(file)` with a user-selected `.json` file.
- Import validates JSON, validates save schema/version, and then rehydrates state.
- Return shape:
    - success: `{ ok: true, fileName }`
    - error: `{ ok: false, code, message }`

Supported import error codes:

- `file-read-failed`
- `empty-file`
- `invalid-json`
- `invalid-save-format`
- `rehydrate-failed`

### Import error copy map snippet

```ts
import type { SaveFileErrorCode } from "@/services/save/file";

const saveErrorCopy: Record<SaveFileErrorCode, string> = {
    "download-not-supported": "Export is not supported in this environment.",
    "file-read-failed": "Could not read that save file.",
    "empty-file": "The selected save file is empty.",
    "invalid-json": "The selected file is not valid JSON.",
    "invalid-save-format": "Unsupported save version or schema.",
    "rehydrate-failed":
        "Save could not be applied to the current runtime state.",
};
```

### Save shortcut cheat sheet

| Action      | Shortcut          |
| ----------- | ----------------- |
| Quick Save  | `Alt + Shift + S` |
| Quick Load  | `Alt + Shift + L` |
| Export Save | `Alt + Shift + E` |
| Import Save | `Alt + Shift + I` |
| Audio Mute  | `Alt + Shift + M` |
| Music Mute  | `Alt + Shift + N` |
| SFX Mute    | `Alt + Shift + B` |

The import/export format is intentionally tied to `version` in schema so future migrations can be added without breaking existing save files.

---

## 12) Notes

- Canvas image loading in `Render` uses internal URL caching.
- `ArrowKeyControl` handles both Arrow keys and WASD.
- The controls shell currently uses a retro SNES-style left/right layout.
