import { useState } from "react";
import { MainMenu } from "@/components/gameModes";

export type MainMenuExampleProps = {
    title?: string;
};

const MainMenuExample = ({
    title = "MainMenu preview",
}: MainMenuExampleProps) => {
    const [screen, setScreen] = useState<"main" | "playing">("main");
    const [hasSave, setHasSave] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);

    return (
        <section className="um-container um-stack" aria-label={title}>
            <h3 className="um-title">{title}</h3>
            <p className="um-help">
                MVP flow: main menu actions route to gameplay, continue from
                save, and toggle settings state.
            </p>

            {screen === "main" ? (
                <MainMenu
                    title="Main Menu"
                    subtitle="Start fresh or continue from the latest save."
                    canContinue={hasSave}
                    onStartNewGame={() => {
                        setHasSave(true);
                        setScreen("playing");
                    }}
                    onContinue={() => {
                        setScreen("playing");
                    }}
                    onOpenSettings={() => {
                        setSettingsOpen((current) => !current);
                    }}
                />
            ) : (
                <div className="um-panel um-stack" aria-label="Gameplay state">
                    <p className="um-text">Gameplay running.</p>
                    <button
                        type="button"
                        className="um-button"
                        onClick={() => {
                            setScreen("main");
                        }}
                    >
                        Return to menu
                    </button>
                </div>
            )}

            <p className="um-text">Current state: {screen}</p>
            <p className="um-text">
                Settings: {settingsOpen ? "open" : "closed"}
            </p>
        </section>
    );
};

export default MainMenuExample;
