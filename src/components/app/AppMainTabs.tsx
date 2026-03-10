type AppMainTabsProps = {
    activeMainTab: "example-game" | "prefab-examples";
    onSelectPrefabExamplesTab: () => void;
    onSelectExampleGameTab: () => void;
};

const AppMainTabs = ({
    activeMainTab,
    onSelectPrefabExamplesTab,
    onSelectExampleGameTab,
}: AppMainTabsProps) => {
    return (
        <div className="GameControlsRow TabChoiceRow">
            <div
                className="GameModeSwitcher"
                role="tablist"
                aria-label="App sections"
            >
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeMainTab === "prefab-examples"}
                    className={
                        activeMainTab === "prefab-examples"
                            ? "game-mode-button is-active"
                            : "game-mode-button"
                    }
                    onClick={onSelectPrefabExamplesTab}
                >
                    Example Prefabs
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeMainTab === "example-game"}
                    className={
                        activeMainTab === "example-game"
                            ? "game-mode-button is-active"
                            : "game-mode-button"
                    }
                    onClick={onSelectExampleGameTab}
                >
                    Example Game
                </button>
            </div>
        </div>
    );
};

export default AppMainTabs;
