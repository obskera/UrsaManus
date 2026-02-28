# Input Mapping Cheat Sheet

Quick reference for wiring keyboard, pointer tap, and gamepad inputs into one shared action contract.

## Core Contract

Define gameplay intent once:

- `north`
- `south`
- `east`
- `west`
- `interact`

```ts
import { createPlayerInputActions } from "@/components/screenController";

const actions = createPlayerInputActions({
    onChanged: () => {
        // force render / sync state
    },
    onInteract: () => {
        // custom interact logic
    },
});
```

## Keyboard (default)

```ts
import { useActionKeyBindings } from "@/components/screenController";

useActionKeyBindings(actions, {
    enabled: true,
    preventDefault: true,
});
```

Defaults:

- `north`: `ArrowUp`, `W`
- `south`: `ArrowDown`, `S`
- `east`: `ArrowRight`, `D`
- `west`: `ArrowLeft`, `A`
- `interact`: `E`, `Enter`

## Pointer Tap Tracking

```ts
import {
    usePointerTapTracking,
    type PointerTapPayload,
} from "@/components/screenController";

usePointerTapTracking({
    enabled: true,
    getTarget: () => containerRef.current,
    onTap: (payload: PointerTapPayload) => {
        if (!payload.insideTarget) return;
        // use payload.localX / payload.localY for in-target placement
    },
});
```

Use `localX/localY` for target-relative positioning and `insideTarget` for guard checks.

## Gamepad (init-time remap)

```ts
import { useGamepadInput } from "@/components/screenController";

useGamepadInput(actions, {
    deadzone: 0.24,
    gamepadIndex: -1, // first connected pad
    mapping: {
        axis: {
            north: { axis: 1, direction: "negative" },
            south: { axis: 1, direction: "positive" },
            west: { axis: 0, direction: "negative" },
            east: { axis: 0, direction: "positive" },
        },
        button: {
            interact: 0,
        },
    },
    onConnected: (pad) => {
        console.log("Connected:", pad.id);
    },
    onDisconnected: (pad) => {
        console.log("Disconnected:", pad.id);
    },
});
```

## Remapping from User Settings

```ts
const mapping = {
    axis: {
        north: { axis: settings.axisY, direction: "negative" as const },
        south: { axis: settings.axisY, direction: "positive" as const },
        west: { axis: settings.axisX, direction: "negative" as const },
        east: { axis: settings.axisX, direction: "positive" as const },
    },
    button: {
        interact: settings.interactButton,
    },
};

useGamepadInput(actions, { mapping, deadzone: settings.deadzone });
```

## Device Composition Pattern

Use one action map, many device adapters:

- `useActionKeyBindings(actions)`
- `useGamepadInput(actions, { ... })`
- `CompassActionControl actions={...}` or `createInputComponentAdapters(actions)`

This keeps gameplay logic centralized and device bindings declarative.

## Input Profile Presets + Persistence

Use profile helpers when you want one object to drive keyboard/gamepad/pointer setup and persist user preference.

```ts
import {
    createInputProfileBindings,
    loadInputProfilePreset,
    saveInputProfilePreset,
} from "@/components/screenController";

const saved = loadInputProfilePreset();

const bindings = createInputProfileBindings({
    profile: saved ?? "default",
});

useActionKeyBindings(actions, bindings.keyBindings);
useGamepadInput(actions, bindings.gamepad);
// pointer hook: enabled = bindings.pointerEnabled

saveInputProfilePreset({
    ...bindings.profile,
    deadzone: 0.24,
});
```

Profiles included by default:

- `default`
- `left-handed`
- `gamepad-first`
