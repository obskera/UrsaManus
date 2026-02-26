import { useMemo } from "react";
import { useScreenTransition } from "./useScreenTransition";
import "./screenTransition.css";

type ScreenTransitionOverlayProps = {
    width: number;
    height: number;
};

const ScreenTransitionOverlay = ({
    width,
    height,
}: ScreenTransitionOverlayProps) => {
    const transition = useScreenTransition(width, height);

    const style = useMemo(
        () => ({
            width,
            height,
        }),
        [width, height],
    );

    if (!transition.active) return null;

    return (
        <div className="screen-transition-overlay" style={style} aria-hidden>
            {transition.cells.map((cell) => (
                <div
                    key={cell.key}
                    className="screen-transition-cell"
                    style={{
                        transform: `translate(${cell.x}px, ${cell.y}px)`,
                        width: transition.boxSize,
                        height: transition.boxSize,
                        backgroundColor: transition.color,
                        opacity: cell.opacity,
                    }}
                />
            ))}
        </div>
    );
};

export default ScreenTransitionOverlay;
