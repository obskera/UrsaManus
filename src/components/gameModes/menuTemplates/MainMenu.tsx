import "./MenuTemplates.css";

export interface MainMenuProps {
    title?: string;
    subtitle?: string;
    canContinue?: boolean;
    onStartNewGame?: () => void;
    onContinue?: () => void;
    onOpenSettings?: () => void;
}

const MainMenu = ({
    title = "Main Menu",
    subtitle = "Choose where to jump in.",
    canContinue = false,
    onStartNewGame,
    onContinue,
    onOpenSettings,
}: MainMenuProps) => {
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

            <div
                className="um-menu-template__actions"
                role="group"
                aria-label="Main menu actions"
            >
                <button
                    type="button"
                    className="um-button um-button--primary"
                    onClick={onStartNewGame}
                >
                    Start New Game
                </button>
                <button
                    type="button"
                    className="um-button"
                    onClick={onContinue}
                    disabled={!canContinue}
                >
                    Continue
                </button>
                <button
                    type="button"
                    className="um-button"
                    onClick={onOpenSettings}
                >
                    Settings
                </button>
            </div>
        </section>
    );
};

export default MainMenu;
