import { useState } from "react";
import { GameOverScreen } from "@/components/gameModes";

export type GameOverScreenExampleProps = {
    title?: string;
};

const GameOverScreenExample = ({
    title = "GameOverScreen preview",
}: GameOverScreenExampleProps) => {
    const [screen, setScreen] = useState<"playing" | "game-over" | "main">(
        "game-over",
    );
    const [attempt, setAttempt] = useState(1);

    return (
        <section className="um-container um-stack" aria-label={title}>
            <h3 className="um-title">{title}</h3>
            <p className="um-help">
                MVP flow: game over screen supports retry and return-to-menu
                actions.
            </p>

            {screen === "game-over" ? (
                <GameOverScreen
                    summaryLabel="Attempt"
                    summaryValue={attempt}
                    onRetry={() => {
                        setAttempt((current) => current + 1);
                        setScreen("playing");
                    }}
                    onReturnToMainMenu={() => {
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
                    <button
                        type="button"
                        className="um-button"
                        onClick={() => {
                            setScreen("game-over");
                        }}
                    >
                        Trigger game over
                    </button>
                </div>
            )}

            <p className="um-text">Current state: {screen}</p>
        </section>
    );
};

export default GameOverScreenExample;
