import Render, { type RenderableItem } from "./components/Render/Render";
import "./App.css";
export default function App() {
    const spriteSheet = "/spriteSheet.png";

    const animSprite: RenderableItem = {
        spriteimageTest: spriteSheet,
        spriteSize: 16,
        spriteSheetTileWidth: 49,
        spriteSheetTileHeight: 22,
        characterSpriteTiles: [
            [18, 7],
            [19, 7],
            [20, 7],
            [21, 7],
        ],
        scaler: 4,
        position: { x: 40, y: 40 },
        fps: 10,
    };
    const animSprite2: RenderableItem = {
        spriteimageTest: spriteSheet,
        spriteSize: 16,
        spriteSheetTileWidth: 49,
        spriteSheetTileHeight: 22,
        characterSpriteTiles: [
            [18, 7],
            [19, 7],
            [20, 7],
            [21, 7],
        ],
        scaler: 4,
        position: { x: 0, y: 0 },
        fps: 10,
    };

    //Render takes an array of animations to draw to the canvas, and should update when changed
    return (
        <div className="GameContainer">
            <Render
                items={[animSprite, animSprite2]}
                width={400}
                height={300}
            />
        </div>
    );
}
