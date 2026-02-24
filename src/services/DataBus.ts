import { generateId, type Entity } from "@/logic/Entity";

// DataBus is a single source of truth for the game engine.
export type GameState = {
    player: Entity;
};

class DataBus {
    private moveByAmount: number = 10;

    private state: GameState = {
        player: {
            id: generateId(),
            type: "player",
            name: "player1",
            animations: [],
            currentAnimation: "idle",
            updateState: () => {},
            spriteImageSheet: "/spriteSheet.png",
            spriteSize: 16,
            spriteSheetTileWidth: 49,
            spriteSheetTileHeight: 22,
            characterSpriteTiles: [[10, 10]],
            scaler: 2,
            position: { x: 10, y: 10 },
            fps: 10,
        },
    };

    movePlayerRight(moveAmount: number = this.moveByAmount): void {
        // const currentState = this.getState()
        this.state.player.position.x += moveAmount;
    }
    movePlayerLeft(moveAmount: number = this.moveByAmount): void {
        // const currentState = this.getState()
        this.state.player.position.x -= moveAmount;
    }
    movePlayerUp(moveAmount: number = this.moveByAmount): void {
        // const currentState = this.getState()
        this.state.player.position.y -= moveAmount;
    }
    movePlayerDown(moveAmount: number = this.moveByAmount): void {
        // const currentState = this.getState()
        this.state.player.position.y += moveAmount;
    }

    getState(): GameState {
        return this.state;
    }

    setState(updater: (prev: GameState) => GameState) {
        this.state = updater(this.state);
    }
}

export const dataBus = new DataBus();
