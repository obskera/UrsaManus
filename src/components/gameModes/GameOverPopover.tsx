import "./GameOverPopover.css";

export type GameOverPopoverProps = {
    finalScore: number;
    onRestart: () => void;
};

const GameOverPopover = ({ finalScore, onRestart }: GameOverPopoverProps) => {
    return (
        <aside className="um-game-over-popover" role="dialog" aria-modal="true">
            <p className="um-game-over-popover__title">Game Over</p>
            <p className="um-game-over-popover__score">
                Final Score: {finalScore}
            </p>
            <button
                type="button"
                className="game-mode-button is-active"
                onClick={onRestart}
            >
                Restart Game
            </button>
        </aside>
    );
};

export default GameOverPopover;
