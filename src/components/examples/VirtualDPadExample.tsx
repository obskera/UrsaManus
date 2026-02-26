import { useMemo, useState } from "react";
import {
    VirtualDPad,
    type VirtualDPadPressedState,
} from "@/components/virtualDPad";

export type VirtualDPadExampleProps = {
    title?: string;
};

const DEFAULT_PRESSED: VirtualDPadPressedState = {
    up: false,
    down: false,
    left: false,
    right: false,
};

const VirtualDPadExample = ({
    title = "VirtualDPad preview",
}: VirtualDPadExampleProps) => {
    const [pressed, setPressed] = useState<VirtualDPadPressedState>(() => ({
        ...DEFAULT_PRESSED,
    }));

    const vector = useMemo(
        () => ({
            x: (pressed.right ? 1 : 0) + (pressed.left ? -1 : 0),
            y: (pressed.down ? 1 : 0) + (pressed.up ? -1 : 0),
        }),
        [pressed],
    );

    return (
        <section className="um-container um-stack" aria-label={title}>
            <h3 className="um-title">{title}</h3>
            <p className="um-help">
                On-screen directional pad primitive for mobile/touch movement,
                with controlled state and custom render support.
            </p>

            <div className="um-row" role="group" aria-label="DPad state">
                <VirtualDPad
                    label="Movement DPad"
                    pressed={pressed}
                    onPressedChange={setPressed}
                />

                <VirtualDPad label="Disabled DPad" disabled />

                <span className="um-capsule">
                    Vector: {vector.x},{vector.y}
                </span>
            </div>

            <VirtualDPad
                label="Custom DPad"
                pressed={pressed}
                onPressedChange={setPressed}
                render={(state) => (
                    <output className="um-capsule" role="status">
                        Active: {state.activeDirections.join("+") || "none"}
                    </output>
                )}
            />
        </section>
    );
};

export default VirtualDPadExample;
