// DataBus is a single source of truth for the game engine.
export type GameState = {
    score: number;
    playerHealth: number;
};

class DataBus {
    private state: GameState = {
        score: 0,
        playerHealth: 100,
    };

    getState(): GameState {
        return this.state;
    }

    setState(partial: Partial<GameState>) {
        this.state = { ...this.state, ...partial };
    }
}

export const dataBus = new DataBus();
