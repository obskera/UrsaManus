import { type ReactNode } from "react";
import "./MenuTemplates.css";

export interface GameOverScreenProps {
    title?: string;
    subtitle?: string;
    summaryLabel?: string;
    summaryValue?: ReactNode;
    onRetry?: () => void;
    onReturnToMainMenu?: () => void;
}

const GameOverScreen = ({
    title = "Game Over",
    subtitle = "Run ended. Try again or head back to menu.",
    summaryLabel = "Final score",
    summaryValue = "0",
    onRetry,
    onReturnToMainMenu,
}: GameOverScreenProps) => {
    return (
        <section
            className="um-container um-stack um-menu-template"
            aria-label={title}
        >
            <header className="um-menu-template__header">
                <p className="um-capsule um-menu-template__eyebrow">
                    Game State
                </p>
                <h3 className="um-title">{title}</h3>
                <p className="um-help">{subtitle}</p>
            </header>

            <p className="um-text">
                {summaryLabel}: <strong>{summaryValue}</strong>
            </p>

            <div
                className="um-menu-template__actions"
                role="group"
                aria-label="Game over actions"
            >
                <button
                    type="button"
                    className="um-button um-button--primary"
                    onClick={onRetry}
                >
                    Retry
                </button>
                <button
                    type="button"
                    className="um-button"
                    onClick={onReturnToMainMenu}
                >
                    Return to Main Menu
                </button>
            </div>
        </section>
    );
};

export default GameOverScreen;
