import { useEffect } from "react";
import type { InputActionMap } from "./inputActions";

export type InputKeyMap = {
    north: string[];
    south: string[];
    east: string[];
    west: string[];
    interact: string[];
};

export type UseActionKeyBindingsOptions = {
    enabled?: boolean;
    preventDefault?: boolean;
    keyMap?: Partial<InputKeyMap>;
};

const DEFAULT_KEY_MAP: InputKeyMap = {
    north: ["arrowup", "w"],
    south: ["arrowdown", "s"],
    east: ["arrowright", "d"],
    west: ["arrowleft", "a"],
    interact: ["e", "enter"],
};

export function useActionKeyBindings(
    actions: InputActionMap,
    {
        enabled = true,
        preventDefault = true,
        keyMap,
    }: UseActionKeyBindingsOptions = {},
) {
    useEffect(() => {
        if (!enabled) return;

        const resolvedMap: InputKeyMap = {
            north: keyMap?.north ?? DEFAULT_KEY_MAP.north,
            south: keyMap?.south ?? DEFAULT_KEY_MAP.south,
            east: keyMap?.east ?? DEFAULT_KEY_MAP.east,
            west: keyMap?.west ?? DEFAULT_KEY_MAP.west,
            interact: keyMap?.interact ?? DEFAULT_KEY_MAP.interact,
        };

        const onKeyDown = (event: KeyboardEvent) => {
            const key = event.key.toLowerCase();
            const directionAction = resolvedMap.north.includes(key)
                ? actions.north
                : resolvedMap.south.includes(key)
                  ? actions.south
                  : resolvedMap.east.includes(key)
                    ? actions.east
                    : resolvedMap.west.includes(key)
                      ? actions.west
                      : resolvedMap.interact.includes(key)
                        ? actions.interact
                        : null;

            if (!directionAction) {
                return;
            }

            if (preventDefault) {
                event.preventDefault();
            }

            directionAction();
        };

        window.addEventListener("keydown", onKeyDown, { passive: false });

        return () => {
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [actions, enabled, keyMap, preventDefault]);
}
