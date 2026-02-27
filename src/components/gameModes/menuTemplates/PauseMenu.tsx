import "./MenuTemplates.css";

export interface PauseMenuProps {
    title?: string;
    subtitle?: string;
    onResume?: () => void;
    onRestart?: () => void;
    onQuitToMainMenu?: () => void;
}

const PauseMenu = ({
    title = "Pause Menu",
    subtitle = "Game is paused. Pick your next move.",
    onResume,
    onRestart,
    onQuitToMainMenu,
}: PauseMenuProps) => {
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
                aria-label="Pause menu actions"
            >
                <button
                    type="button"
                    className="um-button um-button--primary"
                    onClick={onResume}
                >
                    Resume
                </button>
                <button type="button" className="um-button" onClick={onRestart}>
                    Restart Run
                </button>
                <button
                    type="button"
                    className="um-button"
                    onClick={onQuitToMainMenu}
                >
                    Quit to Main Menu
                </button>
            </div>
        </section>
    );
};

export default PauseMenu;
