import { useState } from "react";
import { QuickHUDLayout } from "@/components/hudAnchor";

export type QuickHUDLayoutExampleProps = {
    title?: string;
};

const QuickHUDLayoutExample = ({
    title = "QuickHUDLayout preview",
}: QuickHUDLayoutExampleProps) => {
    const [safeArea, setSafeArea] = useState(true);
    const [offset, setOffset] = useState(8);

    return (
        <section className="um-container um-stack" aria-label={title}>
            <h3 className="um-title">{title}</h3>
            <p className="um-help">
                Prebuilt HUD preset with top-left health and top-right minimap
                slots, ready for quick drop-in usage.
            </p>

            <div
                className="um-row"
                role="group"
                aria-label="Quick HUD controls"
            >
                <button
                    type="button"
                    className="um-button"
                    onClick={() => {
                        setSafeArea((current) => !current);
                    }}
                >
                    {safeArea ? "Disable safe area" : "Enable safe area"}
                </button>
                <button
                    type="button"
                    className="um-button"
                    onClick={() => {
                        setOffset((current) => Math.max(0, current - 4));
                    }}
                >
                    Offset -4
                </button>
                <button
                    type="button"
                    className="um-button um-button--primary"
                    onClick={() => {
                        setOffset((current) => current + 4);
                    }}
                >
                    Offset +4
                </button>
            </div>

            <QuickHUDLayout
                safeArea={safeArea}
                offsetX={offset}
                offsetY={offset}
                healthValue="92/100"
                minimapValue="Sector A2"
            />
        </section>
    );
};

export default QuickHUDLayoutExample;
