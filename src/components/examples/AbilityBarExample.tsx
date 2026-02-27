import { useEffect, useMemo, useState } from "react";
import { AbilityBar } from "@/components/hudAnchor";

export type AbilityBarExampleProps = {
    title?: string;
};

const ABILITY_COOLDOWN_MS = {
    dash: 700,
    blink: 1100,
    burst: 1600,
} as const;

type AbilityId = keyof typeof ABILITY_COOLDOWN_MS;

const AbilityBarExample = ({
    title = "AbilityBar preview",
}: AbilityBarExampleProps) => {
    const [cooldownEndsAt, setCooldownEndsAt] = useState<
        Record<AbilityId, number>
    >({
        dash: 0,
        blink: 0,
        burst: 0,
    });
    const [nowMs, setNowMs] = useState(() => Date.now());

    const hasActiveCooldown =
        cooldownEndsAt.dash > nowMs ||
        cooldownEndsAt.blink > nowMs ||
        cooldownEndsAt.burst > nowMs;

    useEffect(() => {
        if (!hasActiveCooldown) {
            return;
        }

        const timer = window.setInterval(() => {
            setNowMs(Date.now());
        }, 80);

        return () => {
            window.clearInterval(timer);
        };
    }, [hasActiveCooldown]);

    const triggerAbility = (abilityId: AbilityId) => {
        setCooldownEndsAt((current) => ({
            ...current,
            [abilityId]: Date.now() + ABILITY_COOLDOWN_MS[abilityId],
        }));
    };

    const abilities = useMemo(() => {
        return [
            {
                id: "dash",
                label: "Dash",
                cooldownRemainingMs: Math.max(0, cooldownEndsAt.dash - nowMs),
                cooldownTotalMs: ABILITY_COOLDOWN_MS.dash,
                onTrigger: () => {
                    triggerAbility("dash");
                },
            },
            {
                id: "blink",
                label: "Blink",
                cooldownRemainingMs: Math.max(0, cooldownEndsAt.blink - nowMs),
                cooldownTotalMs: ABILITY_COOLDOWN_MS.blink,
                onTrigger: () => {
                    triggerAbility("blink");
                },
            },
            {
                id: "burst",
                label: "Burst",
                cooldownRemainingMs: Math.max(0, cooldownEndsAt.burst - nowMs),
                cooldownTotalMs: ABILITY_COOLDOWN_MS.burst,
                onTrigger: () => {
                    triggerAbility("burst");
                },
            },
        ];
    }, [
        cooldownEndsAt.blink,
        cooldownEndsAt.burst,
        cooldownEndsAt.dash,
        nowMs,
    ]);

    return (
        <section className="um-container um-stack" aria-label={title}>
            <h3 className="um-title">{title}</h3>
            <p className="um-help">
                Compact action prefab for ability-heavy HUDs using ActionButton
                cooldown state.
            </p>

            <div
                className="um-row"
                role="group"
                aria-label="Ability bar controls"
            >
                <button
                    type="button"
                    className="um-button"
                    onClick={() => {
                        setCooldownEndsAt({ dash: 0, blink: 0, burst: 0 });
                        setNowMs(Date.now());
                    }}
                >
                    Reset cooldowns
                </button>
            </div>

            <div style={{ minHeight: "7rem", position: "relative" }}>
                <AbilityBar abilities={abilities} />
            </div>
        </section>
    );
};

export default AbilityBarExample;
