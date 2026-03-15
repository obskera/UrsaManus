import { useEffect, useMemo, useRef } from "react";
import type { ScreenControllerChildProps } from "./screenController";

export type HjklButtonKey = "h" | "j" | "k" | "l";

export interface HjklKeyControlProps extends ScreenControllerChildProps {
    enabled?: boolean;
    keys?: HjklButtonKey[];
    onPress?: (key: HjklButtonKey) => void;
}

const ALL_HJKL_KEYS: HjklButtonKey[] = ["h", "j", "k", "l"];

function normalizeKeys(keys?: HjklButtonKey[]): HjklButtonKey[] {
    const source = keys && keys.length > 0 ? keys : ALL_HJKL_KEYS;
    const unique = Array.from(new Set(source));

    return unique.filter(
        (key): key is HjklButtonKey =>
            key === "h" || key === "j" || key === "k" || key === "l",
    );
}

const HjklKeyControl = ({
    enabled = true,
    keys,
    onPress,
}: HjklKeyControlProps) => {
    const keySet = useMemo(() => new Set(normalizeKeys(keys)), [keys]);
    const pressedRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (!enabled || keySet.size === 0) {
            return;
        }

        const isEditableTarget = (target: EventTarget | null) => {
            const element = target as HTMLElement | null;
            if (!element) {
                return false;
            }

            return (
                element.tagName === "INPUT" ||
                element.tagName === "TEXTAREA" ||
                element.tagName === "SELECT" ||
                element.isContentEditable
            );
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (isEditableTarget(event.target)) {
                return;
            }

            const key = event.key.toLowerCase();
            if (!keySet.has(key as HjklButtonKey)) {
                return;
            }

            event.preventDefault();

            if (event.repeat || pressedRef.current.has(key)) {
                return;
            }

            pressedRef.current.add(key);
            console.log(`[HJKL] ${key} down`);
            onPress?.(key as HjklButtonKey);
        };

        const onKeyUp = (event: KeyboardEvent) => {
            const key = event.key.toLowerCase();
            if (!keySet.has(key as HjklButtonKey)) {
                return;
            }

            event.preventDefault();

            if (!pressedRef.current.has(key)) {
                return;
            }

            pressedRef.current.delete(key);
            console.log(`[HJKL] ${key} up`);
        };

        window.addEventListener("keydown", onKeyDown, { passive: false });
        window.addEventListener("keyup", onKeyUp);

        return () => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
        };
    }, [enabled, keySet, onPress]);

    return null;
};

export default HjklKeyControl;
