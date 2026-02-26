import { useState } from "react";
import { HUDAnchor } from "@/components/hudAnchor";
import { HUDSlot } from "@/components/hudSlot";
import "./HUDAnchorExample.css";

export type HUDAnchorExampleProps = {
    title?: string;
};

const HUDAnchorExample = ({
    title = "HUDAnchor preview",
}: HUDAnchorExampleProps) => {
    const [safeArea, setSafeArea] = useState(true);
    const [offset, setOffset] = useState(8);

    return (
        <section className="um-container um-stack" aria-label={title}>
            <h3 className="um-title">{title}</h3>
            <p className="um-help">
                Anchor HUD content to corners with optional safe-area padding
                and shared offsets.
            </p>

            <div className="um-row" role="group" aria-label="Anchor controls">
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
                    Nudge in -4
                </button>
                <button
                    type="button"
                    className="um-button um-button--primary"
                    onClick={() => {
                        setOffset((current) => current + 4);
                    }}
                >
                    Nudge in +4
                </button>
                <span className="um-capsule">Offset: {offset}px</span>
            </div>

            <div
                className="hud-anchor-example__surface"
                role="region"
                aria-label="HUD anchor surface"
            >
                <HUDAnchor
                    anchor="top-left"
                    safeArea={safeArea}
                    offsetX={offset}
                    offsetY={offset}
                >
                    <HUDSlot label="Top Left" value="HP 84" icon="❤" />
                </HUDAnchor>

                <HUDAnchor
                    anchor="top-right"
                    safeArea={safeArea}
                    offsetX={offset}
                    offsetY={offset}
                >
                    <HUDSlot label="Top Right" value="Map" icon="⌖" />
                </HUDAnchor>

                <HUDAnchor
                    anchor="bottom-left"
                    safeArea={safeArea}
                    offsetX={offset}
                    offsetY={offset}
                >
                    <HUDSlot label="Bottom Left" value="Items" icon="◌" />
                </HUDAnchor>

                <HUDAnchor
                    anchor="bottom-right"
                    safeArea={safeArea}
                    offsetX={offset}
                    offsetY={offset}
                >
                    <HUDSlot label="Bottom Right" value="Skills" icon="✧" />
                </HUDAnchor>
            </div>
        </section>
    );
};

export default HUDAnchorExample;
