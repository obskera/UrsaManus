import { useState } from "react";
import { Toggle } from "@/components/toggle";

export type ToggleExampleProps = {
    title?: string;
};

const ToggleExample = ({ title = "Toggle preview" }: ToggleExampleProps) => {
    const [sfxEnabled, setSfxEnabled] = useState(true);
    const [showMinimap, setShowMinimap] = useState(false);

    return (
        <section className="um-container um-stack" aria-label={title}>
            <h3 className="um-title">{title}</h3>
            <p className="um-help">
                Lightweight on/off primitive with default skin and full render
                override support.
            </p>

            <div className="um-row" role="group" aria-label="Toggle states">
                <Toggle
                    label="SFX"
                    checked={sfxEnabled}
                    onChange={setSfxEnabled}
                />

                <Toggle
                    label="Minimap"
                    checked={showMinimap}
                    onChange={setShowMinimap}
                />

                <Toggle label="Online" checked disabled />

                <span className="um-capsule">
                    SFX: {sfxEnabled ? "On" : "Off"}
                </span>
            </div>

            <Toggle
                label="Custom stealth toggle"
                checked={showMinimap}
                onChange={setShowMinimap}
                render={(state) => (
                    <button
                        type="button"
                        className="um-button"
                        aria-pressed={state.checked}
                        disabled={!state.canToggle}
                        onClick={() => {
                            if (state.canToggle) {
                                setShowMinimap((current) => !current);
                            }
                        }}
                    >
                        Stealth: {state.checked ? "Enabled" : "Disabled"}
                    </button>
                )}
            />
        </section>
    );
};

export default ToggleExample;
