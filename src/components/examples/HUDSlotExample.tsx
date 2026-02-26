import { useEffect, useState } from "react";
import { ActionButton } from "@/components/actionButton";
import { HUDSlot } from "@/components/hudSlot";

export type HUDSlotExampleProps = {
    title?: string;
};

const COOLDOWN_MS = 2600;

const HUDSlotExample = ({ title = "HUDSlot preview" }: HUDSlotExampleProps) => {
    const [ammo, setAmmo] = useState(30);
    const [cooldownEndsAt, setCooldownEndsAt] = useState(0);
    const [cooldownRemainingMs, setCooldownRemainingMs] = useState(0);
    const [abilityCooldownEndsAt, setAbilityCooldownEndsAt] = useState(0);
    const [abilityCooldownRemainingMs, setAbilityCooldownRemainingMs] =
        useState(0);
    const [abilityActivations, setAbilityActivations] = useState(0);

    useEffect(() => {
        if (cooldownEndsAt <= 0) {
            setCooldownRemainingMs(0);
            return;
        }

        const update = () => {
            setCooldownRemainingMs(Math.max(0, cooldownEndsAt - Date.now()));
        };

        update();
        const timer = window.setInterval(update, 80);
        return () => {
            window.clearInterval(timer);
        };
    }, [cooldownEndsAt]);

    useEffect(() => {
        if (abilityCooldownEndsAt <= 0) {
            setAbilityCooldownRemainingMs(0);
            return;
        }

        const update = () => {
            setAbilityCooldownRemainingMs(
                Math.max(0, abilityCooldownEndsAt - Date.now()),
            );
        };

        update();
        const timer = window.setInterval(update, 80);
        return () => {
            window.clearInterval(timer);
        };
    }, [abilityCooldownEndsAt]);

    return (
        <section className="um-container um-stack" aria-label={title}>
            <h3 className="um-title">{title}</h3>
            <p className="um-help">
                Compact slot primitive for HUD items with icon, badge, and
                optional cooldown hookup.
            </p>

            <div className="um-row" role="group" aria-label="HUD slot controls">
                <button
                    type="button"
                    className="um-button"
                    onClick={() => {
                        setAmmo((current) => Math.max(0, current - 1));
                    }}
                >
                    Use ammo
                </button>
                <button
                    type="button"
                    className="um-button um-button--primary"
                    onClick={() => {
                        setCooldownEndsAt(Date.now() + COOLDOWN_MS);
                    }}
                >
                    Trigger slot cooldown
                </button>
            </div>

            <div className="um-row" aria-label="HUD slot variants">
                <HUDSlot
                    label="Health"
                    value="84/100"
                    icon="❤"
                    badge="Buffed"
                />
                <HUDSlot
                    label="Ammo"
                    value={`${ammo}/30`}
                    icon="✦"
                    cooldownRemainingMs={cooldownRemainingMs}
                    cooldownTotalMs={COOLDOWN_MS}
                    showCooldownText
                />
                <HUDSlot label="Skill" value="Locked" icon="◆" disabled />
            </div>

            <HUDSlot
                label="Artifact"
                value="Ready"
                icon="◈"
                render={(state) => (
                    <div
                        className="um-panel um-row"
                        role="group"
                        aria-label={state.ariaLabel}
                    >
                        <span className="um-capsule">{state.label}</span>
                        <span className="um-text">{state.value}</span>
                    </div>
                )}
            />

            <div className="um-stack" aria-label="Ability slot composition">
                <p className="um-help">
                    Composition pattern: render an `ActionButton` inside a
                    `HUDSlot` for ability-style controls.
                </p>

                <HUDSlot
                    label="Ability"
                    value={`Used ${abilityActivations} times`}
                    icon="✧"
                    render={(state) => (
                        <div
                            className="um-panel um-stack"
                            role="group"
                            aria-label={state.ariaLabel}
                        >
                            <div className="um-row">
                                <span className="um-capsule">
                                    {state.label}
                                </span>
                                <span className="um-text">{state.value}</span>
                            </div>

                            <ActionButton
                                label="Blink"
                                cooldownRemainingMs={abilityCooldownRemainingMs}
                                cooldownTotalMs={COOLDOWN_MS}
                                onClick={() => {
                                    setAbilityActivations(
                                        (current) => current + 1,
                                    );
                                    setAbilityCooldownEndsAt(
                                        Date.now() + COOLDOWN_MS,
                                    );
                                }}
                            />
                        </div>
                    )}
                />
            </div>
        </section>
    );
};

export default HUDSlotExample;
