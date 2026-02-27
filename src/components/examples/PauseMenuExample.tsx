import { useState } from "react";
import { PauseMenu } from "@/components/gameModes";

export type PauseMenuExampleProps = {
    title?: string;
};

const PauseMenuExample = ({
    title = "PauseMenu preview",
}: PauseMenuExampleProps) => {
    const [screen, setScreen] = useState<"playing" | "paused" | "main">(
        "playing",
    );
    const [runCount, setRunCount] = useState(1);

    return (
        <section className="um-container um-stack" aria-label={title}>
            <h3 className="um-title">{title}</h3>
            <p className="um-help">
                MVP flow: pause and resume gameplay, restart the run, or quit to
                main menu.
            </p>

            {screen === "paused" ? (
                <PauseMenu
                    onResume={() => {
                        setScreen("playing");
                    }}
                    onRestart={() => {
                        setRunCount((current) => current + 1);
                        setScreen("playing");
                    }}
                    onQuitToMainMenu={() => {
                        setScreen("main");
                    }}
                />
            ) : (
                <div className="um-panel um-stack">
                    <p className="um-text">
                        {screen === "playing"
                            ? "Gameplay running."
                            : "At main menu."}
                    </p>
                    {screen !== "main" ? (
                        <button
                            type="button"
                            className="um-button um-button--primary"
                            onClick={() => {
                                setScreen("paused");
                            }}
                        >
                            Pause game
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="um-button"
                            onClick={() => {
                                setScreen("playing");
                            }}
                        >
                            Return to gameplay
                        </button>
                    )}
                </div>
            )}

            <p className="um-text">Current state: {screen}</p>
            <p className="um-text">Run #: {runCount}</p>
        </section>
    );
};

export default PauseMenuExample;
