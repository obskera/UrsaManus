import { useCallback, useMemo, useRef, useState } from "react";
import {
    CompassDirectionControl,
    PointerTapDebugReadout,
    ScreenControlGroup,
    ScreenController,
    createPlayerInputActions,
    usePointerTapTracking,
    useActionKeyBindings,
    type PointerTapPayload,
} from "@/components/screenController";

export type DefaultInputStyleExampleProps = {
    enabled?: boolean;
    onChanged?: () => void;
    onInteract?: () => void;
    title?: string;
};

const DefaultInputStyleExample = ({
    enabled = true,
    onChanged,
    onInteract,
    title = "Default Input + Style Example",
}: DefaultInputStyleExampleProps) => {
    const renderAreaRef = useRef<HTMLDivElement | null>(null);
    const [lastTap, setLastTap] = useState<PointerTapPayload | null>(null);

    const actions = useMemo(
        () =>
            createPlayerInputActions({
                onChanged,
                onInteract,
            }),
        [onChanged, onInteract],
    );

    const handleTap = useCallback((payload: PointerTapPayload) => {
        setLastTap(payload);
    }, []);

    const getRenderArea = useCallback(() => {
        return renderAreaRef.current;
    }, []);

    usePointerTapTracking({
        enabled,
        getTarget: getRenderArea,
        onTap: handleTap,
    });

    useActionKeyBindings(actions, {
        enabled,
        preventDefault: true,
    });

    return (
        <section className="um-container um-stack" aria-label={title}>
            <h3 className="um-title">{title}</h3>
            <p className="um-help">
                Uses shared actions for both keyboard (`WASD`/arrows, `E`) and
                compass buttons.
            </p>

            <div className="um-row" role="group" aria-label="Example actions">
                <button
                    className="um-button um-button--primary"
                    onClick={actions.interact}
                >
                    Interact
                </button>
                <button className="um-button" onClick={actions.north}>
                    Trigger North
                </button>
                <span className="um-capsule">Reusable patterns</span>
            </div>

            <div className="um-panel um-stack">
                <label className="um-label" htmlFor="example-notes">
                    Notes
                </label>
                <textarea
                    id="example-notes"
                    className="um-textarea"
                    defaultValue="This example wires helper input actions into key bindings and compass controls."
                />
            </div>

            <div
                ref={renderAreaRef}
                className="um-panel um-stack"
                aria-label="Pointer tracking area"
                style={{ minHeight: "8rem", position: "relative" }}
            >
                <ScreenController className="snes-layout">
                    <ScreenControlGroup className="face-button-group">
                        <CompassDirectionControl
                            mode="player-actions"
                            onMove={onChanged}
                            onInteract={onInteract}
                        />
                    </ScreenControlGroup>
                </ScreenController>
            </div>

            <PointerTapDebugReadout payload={lastTap} className="um-capsule" />

            <ul className="um-list">
                <li className="um-list-item">
                    Action map: create once, reuse across inputs
                </li>
                <li className="um-list-item">
                    Key hook: `useActionKeyBindings`
                </li>
                <li className="um-list-item">
                    On-screen: `CompassDirectionControl` in `player-actions`
                    mode
                </li>
                <li className="um-list-item">
                    Pointer hook tracks click/tap position and inside/outside
                    target bounds
                </li>
            </ul>
        </section>
    );
};

export default DefaultInputStyleExample;
