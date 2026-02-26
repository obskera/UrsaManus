import { useState } from "react";
import { LifeGauge } from "@/components/lifeGauge";
import "./LifeGaugeExample.css";

export type LifeGaugeExampleProps = {
    title?: string;
};

const LIFE_MAX = 100;
const STARTING_LIFE = 72;

const LifeGaugeExample = ({
    title = "LifeGauge example (default + custom skin)",
}: LifeGaugeExampleProps) => {
    const [life, setLife] = useState(STARTING_LIFE);

    return (
        <section className="um-container um-stack" aria-label={title}>
            <h3 className="um-title">{title}</h3>
            <p className="um-help">
                Default skin is plug-and-play. Custom skin uses the `render`
                state API.
            </p>

            <div className="um-row" role="group" aria-label="Life controls">
                <button
                    className="um-button"
                    onClick={() => {
                        setLife((current) => current - 12);
                    }}
                >
                    Damage -12
                </button>
                <button
                    className="um-button"
                    onClick={() => {
                        setLife((current) => current + 8);
                    }}
                >
                    Heal +8
                </button>
                <button
                    className="um-button um-button--primary"
                    onClick={() => {
                        setLife(STARTING_LIFE);
                    }}
                >
                    Reset
                </button>
            </div>

            <div className="um-row life-gauge-example__pair">
                <div className="life-gauge-example__item">
                    <p className="um-help">Default skin</p>
                    <LifeGauge value={life} max={LIFE_MAX} label="Player HP" />
                </div>

                <div className="life-gauge-example__item">
                    <p className="um-help">Custom skin</p>
                    <LifeGauge
                        value={life}
                        max={LIFE_MAX}
                        label="Player HP (Custom)"
                        render={(state) => (
                            <div
                                className="life-gauge-example__custom"
                                role="meter"
                                aria-label={state.ariaLabel}
                                aria-valuemin={state.min}
                                aria-valuemax={state.max}
                                aria-valuenow={state.clampedValue}
                                aria-valuetext={state.valueText}
                                data-tone={state.tone}
                            >
                                <div className="life-gauge-example__custom-top">
                                    <span className="um-capsule">
                                        {state.tone}
                                    </span>
                                    <span className="um-text">
                                        {state.valueText}
                                    </span>
                                </div>
                                <div
                                    className="life-gauge-example__custom-track"
                                    aria-hidden="true"
                                >
                                    <div
                                        className="life-gauge-example__custom-fill"
                                        style={{
                                            width: `${state.percentage}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    />
                </div>
            </div>
        </section>
    );
};

export default LifeGaugeExample;
