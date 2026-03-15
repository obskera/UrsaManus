import { createElement, useMemo, useState } from "react";
import ScreenControl from "./ScreenControl";
import type { ScreenControllerChildProps } from "./screenController";
import type { HjklButtonKey } from "./hjklKeyControl";

export interface HjklOnScreenControlProps extends ScreenControllerChildProps {
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

const HjklOnScreenControl = ({ keys, onPress }: HjklOnScreenControlProps) => {
    const [heldKeys, setHeldKeys] = useState<HjklButtonKey[]>([]);
    const resolvedKeys = useMemo(() => normalizeKeys(keys), [keys]);

    const setPressed = (key: HjklButtonKey, pressed: boolean) => {
        setHeldKeys((current) => {
            const isHeld = current.includes(key);

            if (pressed) {
                if (isHeld) {
                    return current;
                }

                console.log(`[HJKL] ${key} down`);
                onPress?.(key);
                return [...current, key];
            }

            if (!isHeld) {
                return current;
            }

            console.log(`[HJKL] ${key} up`);
            return current.filter((entry) => entry !== key);
        });
    };

    return createElement(
        "div",
        { className: "hjkl-row-control", "aria-label": "HJKL actions" },
        ...resolvedKeys.map((key) =>
            createElement(ScreenControl, {
                key,
                label: key.toUpperCase(),
                className: heldKeys.includes(key)
                    ? "hjkl-button is-held"
                    : "hjkl-button",
                onPressStart: () => setPressed(key, true),
                onPressEnd: () => setPressed(key, false),
            }),
        ),
    );
};

export default HjklOnScreenControl;
