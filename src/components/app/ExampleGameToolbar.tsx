type ExampleGameToolbarProps = {
    isMusicMuted: boolean;
    isSfxMuted: boolean;
    showDebugOutlines: boolean;
    onToggleMusicMuted: () => void;
    onToggleSfxMuted: () => void;
    onToggleDebugOutlines: () => void;
};

const ExampleGameToolbar = ({
    isMusicMuted,
    isSfxMuted,
    showDebugOutlines,
    onToggleMusicMuted,
    onToggleSfxMuted,
    onToggleDebugOutlines,
}: ExampleGameToolbarProps) => {
    return (
        <div className="GameControlsRow">
            <div
                className="DevToolsGroup"
                role="group"
                aria-label="Audio and debug controls"
            >
                <button
                    type="button"
                    className={
                        isMusicMuted
                            ? "DebugToggle DebugToggle--active"
                            : "DebugToggle"
                    }
                    aria-pressed={isMusicMuted}
                    onClick={(event) => {
                        onToggleMusicMuted();
                        event.currentTarget.blur();
                    }}
                >
                    {isMusicMuted ? "Unmute Music" : "Mute Music"}
                </button>
                <button
                    type="button"
                    className={
                        isSfxMuted
                            ? "DebugToggle DebugToggle--active"
                            : "DebugToggle"
                    }
                    aria-pressed={isSfxMuted}
                    onClick={(event) => {
                        onToggleSfxMuted();
                        event.currentTarget.blur();
                    }}
                >
                    {isSfxMuted ? "Unmute SFX" : "Mute SFX"}
                </button>
                <button
                    type="button"
                    className={
                        showDebugOutlines
                            ? "DebugToggle DebugToggle--active"
                            : "DebugToggle"
                    }
                    aria-pressed={showDebugOutlines}
                    onClick={(event) => {
                        onToggleDebugOutlines();
                        event.currentTarget.blur();
                    }}
                >
                    {showDebugOutlines
                        ? "Hide Debug Outlines"
                        : "Show Debug Outlines"}
                </button>
            </div>
        </div>
    );
};

export default ExampleGameToolbar;
