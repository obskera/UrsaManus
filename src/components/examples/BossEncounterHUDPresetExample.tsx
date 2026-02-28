import { useEffect, useState } from "react";
import { BossEncounterHUDPreset } from "@/components/hudAnchor";

export type BossEncounterHUDPresetExampleProps = {
    title?: string;
};

const SPECIAL_COOLDOWN_MS = 1200;

const BossEncounterHUDPresetExample = ({
    title = "BossEncounterHUDPreset preview",
}: BossEncounterHUDPresetExampleProps) => {
    const [phase, setPhase] = useState(1);
    const [bossName, setBossName] = useState("Warden");
    const [specialCooldownEndsAt, setSpecialCooldownEndsAt] = useState(0);
    const [nowMs, setNowMs] = useState(() => Date.now());

    useEffect(() => {
        if (specialCooldownEndsAt <= 0) return;

        const timer = window.setInterval(() => {
            setNowMs(Date.now());
        }, 80);

        return () => {
            window.clearInterval(timer);
        };
    }, [specialCooldownEndsAt]);

    const specialCooldownRemainingMs =
        specialCooldownEndsAt > 0
            ? Math.max(0, specialCooldownEndsAt - nowMs)
            : 0;

    return (
        <section className="um-container um-stack" aria-label={title}>
            <h3 className="um-title">{title}</h3>
            <p className="um-help">
                Boss encounter HUD starter with phase state and a special action
                cooldown.
            </p>

            <div className="um-row" role="group" aria-label="Boss controls">
                <button
                    type="button"
                    className="um-button"
                    onClick={() => {
                        setPhase((current) => Math.min(3, current + 1));
                    }}
                >
                    Advance phase
                </button>
                <button
                    type="button"
                    className="um-button"
                    onClick={() => {
                        setBossName((current) =>
                            current === "Warden" ? "Overseer" : "Warden",
                        );
                    }}
                >
                    Toggle boss
                </button>
            </div>

            <BossEncounterHUDPreset
                healthValue="66/100"
                minimapValue="Arena"
                bossNameValue={bossName}
                bossPhaseValue={`Phase ${phase}`}
                specialLabel="Special"
                specialCooldownRemainingMs={specialCooldownRemainingMs}
                specialCooldownTotalMs={SPECIAL_COOLDOWN_MS}
                onSpecial={() => {
                    setSpecialCooldownEndsAt(Date.now() + SPECIAL_COOLDOWN_MS);
                }}
            />
        </section>
    );
};

export default BossEncounterHUDPresetExample;
