import { useEffect, useState } from "react";
import { SurvivalHUDPreset } from "@/components/hudAnchor";

export type SurvivalHUDPresetExampleProps = {
    title?: string;
};

const CRAFT_COOLDOWN_MS = 1100;

const SurvivalHUDPresetExample = ({
    title = "SurvivalHUDPreset preview",
}: SurvivalHUDPresetExampleProps) => {
    const [hunger, setHunger] = useState(74);
    const [temperature, setTemperature] = useState<"Warm" | "Cold">("Warm");
    const [craftCooldownEndsAt, setCraftCooldownEndsAt] = useState(0);
    const [nowMs, setNowMs] = useState(() => Date.now());

    useEffect(() => {
        if (craftCooldownEndsAt <= 0) return;

        const timer = window.setInterval(() => {
            setNowMs(Date.now());
        }, 80);

        return () => {
            window.clearInterval(timer);
        };
    }, [craftCooldownEndsAt]);

    const craftCooldownRemainingMs =
        craftCooldownEndsAt > 0 ? Math.max(0, craftCooldownEndsAt - nowMs) : 0;

    return (
        <section className="um-container um-stack" aria-label={title}>
            <h3 className="um-title">{title}</h3>
            <p className="um-help">
                Survival HUD starter with hunger/temperature status and a craft
                action.
            </p>

            <div className="um-row" role="group" aria-label="Survival controls">
                <button
                    type="button"
                    className="um-button"
                    onClick={() => {
                        setHunger((current) => Math.max(0, current - 5));
                    }}
                >
                    Consume hunger
                </button>
                <button
                    type="button"
                    className="um-button"
                    onClick={() => {
                        setTemperature((current) =>
                            current === "Warm" ? "Cold" : "Warm",
                        );
                    }}
                >
                    Toggle temperature
                </button>
            </div>

            <SurvivalHUDPreset
                healthValue="90/100"
                minimapValue="Camp 01"
                hungerValue={`${hunger}%`}
                temperatureValue={temperature}
                craftLabel="Craft"
                craftCooldownRemainingMs={craftCooldownRemainingMs}
                craftCooldownTotalMs={CRAFT_COOLDOWN_MS}
                onCraft={() => {
                    setCraftCooldownEndsAt(Date.now() + CRAFT_COOLDOWN_MS);
                }}
            />
        </section>
    );
};

export default SurvivalHUDPresetExample;
