import { useEffect, useState } from "react";
import { TopDownHUDPreset } from "@/components/hudAnchor";

export type TopDownHUDPresetExampleProps = {
    title?: string;
};

const INTERACT_COOLDOWN_MS = 1000;

const TopDownHUDPresetExample = ({
    title = "TopDownHUDPreset preview",
}: TopDownHUDPresetExampleProps) => {
    const [objectivesDone, setObjectivesDone] = useState(2);
    const [stance, setStance] = useState<"Stealth" | "Assault">("Stealth");
    const [interactCooldownEndsAt, setInteractCooldownEndsAt] = useState(0);
    const [interactCooldownRemainingMs, setInteractCooldownRemainingMs] =
        useState(0);

    useEffect(() => {
        if (interactCooldownEndsAt <= 0) {
            setInteractCooldownRemainingMs(0);
            return;
        }

        const update = () => {
            setInteractCooldownRemainingMs(
                Math.max(0, interactCooldownEndsAt - Date.now()),
            );
        };

        update();
        const timer = window.setInterval(update, 80);
        return () => {
            window.clearInterval(timer);
        };
    }, [interactCooldownEndsAt]);

    return (
        <section className="um-container um-stack" aria-label={title}>
            <h3 className="um-title">{title}</h3>
            <p className="um-help">
                Ready-made top-down HUD starter built from QuickHUDLayout,
                HUDSlot, and ActionButton.
            </p>

            <div
                className="um-row"
                role="group"
                aria-label="Top-down HUD controls"
            >
                <button
                    type="button"
                    className="um-button"
                    onClick={() => {
                        setObjectivesDone((current) =>
                            Math.min(5, current + 1),
                        );
                    }}
                >
                    Complete objective
                </button>
                <button
                    type="button"
                    className="um-button"
                    onClick={() => {
                        setStance((current) =>
                            current === "Stealth" ? "Assault" : "Stealth",
                        );
                    }}
                >
                    Toggle stance
                </button>
            </div>

            <TopDownHUDPreset
                healthValue="76/100"
                minimapValue="Sector B4"
                objectivesValue={`${objectivesDone}/5`}
                stanceValue={stance}
                interactLabel="Interact"
                interactCooldownRemainingMs={interactCooldownRemainingMs}
                interactCooldownTotalMs={INTERACT_COOLDOWN_MS}
                onInteract={() => {
                    setInteractCooldownEndsAt(
                        Date.now() + INTERACT_COOLDOWN_MS,
                    );
                }}
            />
        </section>
    );
};

export default TopDownHUDPresetExample;
