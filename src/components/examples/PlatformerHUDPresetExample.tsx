import { useEffect, useState } from "react";
import { PlatformerHUDPreset } from "@/components/hudAnchor";

export type PlatformerHUDPresetExampleProps = {
    title?: string;
};

const JUMP_COOLDOWN_MS = 1200;

const PlatformerHUDPresetExample = ({
    title = "PlatformerHUDPreset preview",
}: PlatformerHUDPresetExampleProps) => {
    const [coins, setCoins] = useState(12);
    const [lives, setLives] = useState(3);
    const [jumpCooldownEndsAt, setJumpCooldownEndsAt] = useState(0);
    const [jumpCooldownRemainingMs, setJumpCooldownRemainingMs] = useState(0);

    useEffect(() => {
        if (jumpCooldownEndsAt <= 0) {
            setJumpCooldownRemainingMs(0);
            return;
        }

        const update = () => {
            setJumpCooldownRemainingMs(
                Math.max(0, jumpCooldownEndsAt - Date.now()),
            );
        };

        update();
        const timer = window.setInterval(update, 80);
        return () => {
            window.clearInterval(timer);
        };
    }, [jumpCooldownEndsAt]);

    return (
        <section className="um-container um-stack" aria-label={title}>
            <h3 className="um-title">{title}</h3>
            <p className="um-help">
                Ready-made platformer HUD starter built from QuickHUDLayout,
                HUDSlot, and ActionButton.
            </p>

            <div
                className="um-row"
                role="group"
                aria-label="Platformer HUD controls"
            >
                <button
                    type="button"
                    className="um-button"
                    onClick={() => {
                        setCoins((current) => current + 1);
                    }}
                >
                    Collect coin
                </button>
                <button
                    type="button"
                    className="um-button"
                    onClick={() => {
                        setLives((current) => Math.max(0, current - 1));
                    }}
                >
                    Lose life
                </button>
            </div>

            <PlatformerHUDPreset
                healthValue="92/100"
                minimapValue="Stage 1-1"
                coinsValue={coins}
                livesValue={lives}
                jumpLabel="Jump"
                jumpCooldownRemainingMs={jumpCooldownRemainingMs}
                jumpCooldownTotalMs={JUMP_COOLDOWN_MS}
                onJump={() => {
                    setJumpCooldownEndsAt(Date.now() + JUMP_COOLDOWN_MS);
                }}
            />
        </section>
    );
};

export default PlatformerHUDPresetExample;
