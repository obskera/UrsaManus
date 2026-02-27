import { useEffect, useState } from "react";
import { ActionButton } from "@/components/actionButton";

export type ActionButtonExampleProps = {
    title?: string;
};

const COOLDOWN_MS = 1800;

const ActionButtonExample = ({
    title = "ActionButton preview",
}: ActionButtonExampleProps) => {
    const [cooldownEndsAt, setCooldownEndsAt] = useState(0);
    const [pressCount, setPressCount] = useState(0);
    const [nowMs, setNowMs] = useState(() => Date.now());

    useEffect(() => {
        if (cooldownEndsAt <= 0) return;

        const timer = window.setInterval(() => {
            setNowMs(Date.now());
        }, 80);
        return () => {
            window.clearInterval(timer);
        };
    }, [cooldownEndsAt]);

    const cooldownRemainingMs =
        cooldownEndsAt > 0 ? Math.max(0, cooldownEndsAt - nowMs) : 0;

    return (
        <section className="um-container um-stack" aria-label={title}>
            <h3 className="um-title">{title}</h3>
            <p className="um-help">
                Default action state handling with cooldown lockout, plus custom
                render override.
            </p>

            <div
                className="um-row"
                role="group"
                aria-label="Action button demo"
            >
                <ActionButton
                    label="Dash"
                    cooldownRemainingMs={cooldownRemainingMs}
                    cooldownTotalMs={COOLDOWN_MS}
                    onClick={() => {
                        setPressCount((current) => current + 1);
                        setCooldownEndsAt(Date.now() + COOLDOWN_MS);
                    }}
                />
                <ActionButton
                    label="Heavy Attack"
                    pressed
                    onClick={() => {
                        setPressCount((current) => current + 1);
                    }}
                />
                <ActionButton label="Locked" disabled />
                <span className="um-capsule">Activations: {pressCount}</span>
            </div>

            <ActionButton
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

export default ActionButtonExample;
