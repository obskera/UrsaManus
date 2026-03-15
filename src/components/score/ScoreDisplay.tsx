import "./ScoreDisplay.css";

export type ScoreDisplayProps = {
    score: number;
    label?: string;
    className?: string;
};

const ScoreDisplay = ({
    score,
    label = "Score",
    className,
}: ScoreDisplayProps) => {
    const safeScore = Number.isFinite(score)
        ? Math.max(0, Math.floor(score))
        : 0;
    const rootClassName = className
        ? `um-score-display ${className}`
        : "um-score-display";

    return (
        <div
            className={rootClassName}
            role="status"
            aria-label={`${label}: ${safeScore}`}
        >
            {label}: {safeScore}
        </div>
    );
};

export default ScoreDisplay;
