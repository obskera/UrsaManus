import { useEffect, useState } from "react";
import { VirtualActionButton } from "@/components/virtualActionButton";

export type VirtualActionButtonExampleProps = {
    title?: string;
};

const COOLDOWN_MS = 1500;

const VirtualActionButtonExample = ({
    title = "VirtualActionButton preview",
}: VirtualActionButtonExampleProps) => {
    const [activations, setActivations] = useState(0);
    const [cooldownEndsAt, setCooldownEndsAt] = useState(0);
    const [cooldownRemainingMs, setCooldownRemainingMs] = useState(0);
    const [isHolding, setIsHolding] = useState(false);

    useEffect(() => {
        if (cooldownEndsAt <= 0) {
            setCooldownRemainingMs(0);
            return;
        }

        const update = () => {
            const remaining = Math.max(0, cooldownEndsAt - Date.now());
            setCooldownRemainingMs(remaining);
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
                Touch-friendly action button for mobile controls with hold
                lifecycle callbacks and cooldown lockout.
            </p>

            <div className="um-row" role="group" aria-label="Action states">
                <VirtualActionButton
                    label="A"
                    cooldownRemainingMs={cooldownRemainingMs}
                    cooldownTotalMs={COOLDOWN_MS}
                    onPressStart={() => {
                        setIsHolding(true);
                    }}
                    onPressEnd={() => {
                        setIsHolding(false);
                    }}
                    onActivate={() => {
                        setActivations((current) => current + 1);
                        setCooldownEndsAt(Date.now() + COOLDOWN_MS);
                    }}
                />

                <VirtualActionButton label="B" disabled />

                <span className="um-capsule">Activations: {activations}</span>
                <span className="um-capsule">
                    Holding: {isHolding ? "Yes" : "No"}
                </span>
            </div>

            <VirtualActionButton
                label="Skill"
                cooldownRemainingMs={Math.min(1200, cooldownRemainingMs)}
                cooldownTotalMs={1200}
                render={(state) => (
                    <button
                        type="button"
                        className="um-button"
                        disabled={!state.canActivate}
                        aria-disabled={!state.canActivate}
                    >
                        Skill{" "}
                        {state.isCoolingDown ? `(${state.cooldownText})` : ""}
                    </button>
                )}
            />
        </section>
    );
};

export default VirtualActionButtonExample;
