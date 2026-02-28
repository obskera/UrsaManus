import { useMemo } from "react";
import type { InputActionMap } from "./inputActions";
import {
    useActionKeyBindings,
    type InputKeyMap,
    type UseActionKeyBindingsOptions,
} from "./useActionKeyBindings";
import {
    useGamepadInput,
    type GamepadInputMap,
    type UseGamepadInputOptions,
} from "./useGamepadInput";
import {
    usePointerTapTracking,
    type UsePointerTapTrackingOptions,
} from "./usePointerTapTracking";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const INPUT_PROFILE_STORAGE_KEY = "ursa:input-profile:v1";

export type InputProfilePresetId = "default" | "left-handed" | "gamepad-first";

export type InputProfilePreset = {
    id: InputProfilePresetId;
    name: string;
    keyboardEnabled?: boolean;
    pointerEnabled?: boolean;
    gamepadEnabled?: boolean;
    preventDefault?: boolean;
    keyMap?: Partial<InputKeyMap>;
    gamepadMapping?: GamepadInputMap;
    deadzone?: number;
    gamepadIndex?: number;
};

export type ResolvedInputProfilePreset = {
    id: InputProfilePresetId;
    name: string;
    keyboardEnabled: boolean;
    pointerEnabled: boolean;
    gamepadEnabled: boolean;
    preventDefault: boolean;
    keyMap?: Partial<InputKeyMap>;
    gamepadMapping?: GamepadInputMap;
    deadzone: number;
    gamepadIndex: number;
};

export type InputProfileBindingsOptions = {
    enabled?: boolean;
    profile?: InputProfilePresetId | InputProfilePreset;
    keyBindings?: Omit<UseActionKeyBindingsOptions, "enabled" | "keyMap">;
    gamepad?: Omit<
        UseGamepadInputOptions,
        "enabled" | "mapping" | "deadzone" | "gamepadIndex"
    >;
};

export type InputProfilePointerOptions = Omit<
    UsePointerTapTrackingOptions,
    "enabled"
>;

export type ResolvedInputProfileBindings = {
    keyBindings: UseActionKeyBindingsOptions;
    gamepad: UseGamepadInputOptions;
    pointerEnabled: boolean;
    profile: ResolvedInputProfilePreset;
};

const DEFAULT_DEADZONE = 0.2;

const PRESETS: Record<InputProfilePresetId, InputProfilePreset> = {
    default: {
        id: "default",
        name: "Default",
        keyboardEnabled: true,
        pointerEnabled: true,
        gamepadEnabled: true,
        preventDefault: true,
        deadzone: DEFAULT_DEADZONE,
        gamepadIndex: -1,
    },
    "left-handed": {
        id: "left-handed",
        name: "Left Handed",
        keyboardEnabled: true,
        pointerEnabled: true,
        gamepadEnabled: true,
        preventDefault: true,
        keyMap: {
            north: ["i", "arrowup"],
            south: ["k", "arrowdown"],
            west: ["j", "arrowleft"],
            east: ["l", "arrowright"],
            interact: ["u", "enter"],
        },
        deadzone: 0.22,
        gamepadIndex: -1,
    },
    "gamepad-first": {
        id: "gamepad-first",
        name: "Gamepad First",
        keyboardEnabled: false,
        pointerEnabled: true,
        gamepadEnabled: true,
        preventDefault: true,
        deadzone: 0.28,
        gamepadIndex: -1,
        gamepadMapping: {
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
    },
};

const DEFAULT_PROFILE_ID: InputProfilePresetId = "default";

function getDefaultStorage(): StorageLike | null {
    if (typeof window === "undefined") {
        return null;
    }

    try {
        return window.localStorage;
    } catch {
        return null;
    }
}

function normalizeDeadzone(value: number | undefined): number {
    if (!Number.isFinite(value ?? Number.NaN)) {
        return DEFAULT_DEADZONE;
    }

    return Math.max(0, Math.min(0.99, value ?? DEFAULT_DEADZONE));
}

function normalizeGamepadIndex(value: number | undefined): number {
    if (!Number.isFinite(value ?? Number.NaN)) {
        return -1;
    }

    return Math.floor(value ?? -1);
}

export function getInputProfilePreset(
    profileId: InputProfilePresetId,
): InputProfilePreset {
    return PRESETS[profileId];
}

export function listInputProfilePresets(): InputProfilePreset[] {
    return Object.values(PRESETS).map((preset) => ({ ...preset }));
}

export function resolveInputProfilePreset(
    profile: InputProfilePresetId | InputProfilePreset | undefined,
): ResolvedInputProfilePreset {
    if (!profile) {
        return resolveInputProfilePreset(DEFAULT_PROFILE_ID);
    }

    const baseProfile =
        typeof profile === "string"
            ? PRESETS[profile]
            : (PRESETS[profile.id] ?? PRESETS[DEFAULT_PROFILE_ID]);

    const merged =
        typeof profile === "string"
            ? baseProfile
            : {
                  ...baseProfile,
                  ...profile,
              };

    return {
        id: merged.id,
        name: merged.name,
        keyboardEnabled: merged.keyboardEnabled ?? true,
        pointerEnabled: merged.pointerEnabled ?? true,
        gamepadEnabled: merged.gamepadEnabled ?? true,
        preventDefault: merged.preventDefault ?? true,
        keyMap: merged.keyMap,
        gamepadMapping: merged.gamepadMapping,
        deadzone: normalizeDeadzone(merged.deadzone),
        gamepadIndex: normalizeGamepadIndex(merged.gamepadIndex),
    };
}

export function createInputProfileBindings(
    options: InputProfileBindingsOptions = {},
): ResolvedInputProfileBindings {
    const profile = resolveInputProfilePreset(options.profile);
    const enabled = options.enabled ?? true;

    return {
        keyBindings: {
            enabled: enabled && profile.keyboardEnabled,
            preventDefault:
                options.keyBindings?.preventDefault ?? profile.preventDefault,
            keyMap: profile.keyMap,
        },
        gamepad: {
            ...options.gamepad,
            enabled: enabled && profile.gamepadEnabled,
            deadzone: profile.deadzone,
            gamepadIndex: profile.gamepadIndex,
            mapping: profile.gamepadMapping,
        },
        pointerEnabled: enabled && profile.pointerEnabled,
        profile,
    };
}

export function saveInputProfilePreset(
    profile: InputProfilePreset,
    storage: StorageLike | null = getDefaultStorage(),
): boolean {
    if (!storage) {
        return false;
    }

    try {
        storage.setItem(INPUT_PROFILE_STORAGE_KEY, JSON.stringify(profile));
        return true;
    } catch {
        return false;
    }
}

export function loadInputProfilePreset(
    storage: StorageLike | null = getDefaultStorage(),
): InputProfilePreset | null {
    if (!storage) {
        return null;
    }

    try {
        const payload = storage.getItem(INPUT_PROFILE_STORAGE_KEY);
        if (!payload) {
            return null;
        }

        const parsed = JSON.parse(payload) as InputProfilePreset;
        if (!parsed || typeof parsed !== "object") {
            return null;
        }

        if (!parsed.id || !parsed.name) {
            return null;
        }

        return parsed;
    } catch {
        return null;
    }
}

export function clearInputProfilePreset(
    storage: StorageLike | null = getDefaultStorage(),
): boolean {
    if (!storage) {
        return false;
    }

    try {
        storage.removeItem(INPUT_PROFILE_STORAGE_KEY);
        return true;
    } catch {
        return false;
    }
}

export function useInputProfileBindings(
    actions: InputActionMap,
    options: InputProfileBindingsOptions = {},
    pointer?: InputProfilePointerOptions,
) {
    const resolved = useMemo(
        () => createInputProfileBindings(options),
        [options],
    );

    useActionKeyBindings(actions, resolved.keyBindings);
    useGamepadInput(actions, resolved.gamepad);
    usePointerTapTracking({
        enabled: resolved.pointerEnabled,
        getTarget: pointer?.getTarget ?? (() => null),
        onTap: pointer?.onTap,
    });

    return resolved;
}
