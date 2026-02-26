import { useEffect, useState } from "react";
import { CooldownIndicator } from "@/components/cooldownIndicator";

export type CooldownIndicatorExampleProps = {
    title?: string;
};

const COOLDOWN_MS = 2200;

const CooldownIndicatorExample = ({
    title = "CooldownIndicator preview",
}: CooldownIndicatorExampleProps) => {
    const [cooldownEndsAt, setCooldownEndsAt] = useState(0);
    const [remainingMs, setRemainingMs] = useState(0);

    useEffect(() => {
        if (cooldownEndsAt <= 0) {
            setRemainingMs(0);
            return;
        }

        const update = () => {
            const next = Math.max(0, cooldownEndsAt - Date.now());
            setRemainingMs(next);
        };

        update();
        const timer = window.setInterval(update, 80);
        return () => {
            window.clearInterval(timer);
        };
    }, [cooldownEndsAt]);

    return (
        <section className="um-container um-stack" aria-label={title}>
            <h3 className="um-title">{title}</h3>
            <p className="um-help">
                Standalone cooldown visual primitive for actions, slots, and HUD
                overlays.
            </p>

            <div className="um-row" role="group" aria-label="Cooldown controls">
                <button
                    type="button"
                    className="um-button um-button--primary"
                    onClick={() => {
                        setCooldownEndsAt(Date.now() + COOLDOWN_MS);
                    }}
                >
                    Trigger cooldown
                </button>
                <button
                    type="button"
                    className="um-button"
                    onClick={() => {
                        setCooldownEndsAt(0);
                    }}
                >
                    Reset
                </button>
            </div>

            <div className="um-row" aria-label="Cooldown indicator variants">
                <CooldownIndicator
                    label="Dash cooldown"
                    remainingMs={remainingMs}
                    totalMs={COOLDOWN_MS}
                />

                <CooldownIndicator
                    label="Skill cooldown"
                    remainingMs={Math.min(1200, remainingMs)}
                    totalMs={1200}
                    formatText={(state) => `${state.percentage}%`}
                />

                <CooldownIndicator
                    label="Orb cooldown"
                    remainingMs={Math.min(1500, remainingMs)}
                    totalMs={1500}
                    render={(state) => (
                        <output className="um-capsule">
                            Orb {state.percentage}%
                        </output>
                    )}
                />
            </div>
        </section>
    );
};

export default CooldownIndicatorExample;
