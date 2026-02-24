import Render from "./components/Render/Render";
import "./App.css";
import { dataBus } from "./services/DataBus";
import useArrowKeys, { type ArrowDirection } from "./logic/useArrowKeys";

export default function App() {
    const { player } = dataBus.getState();

    const handleArrowKey = (direction: ArrowDirection) => {
        switch (direction) {
            case "up":
                console.log("up");
                dataBus.movePlayerUp();
                break;
            case "down":
                console.log("down");
                dataBus.movePlayerDown();
                break;
            case "left":
                console.log("left");
                dataBus.movePlayerLeft();
                break;
            case "right":
                console.log("right");
                dataBus.movePlayerRight();
                break;
        }
    };

    useArrowKeys({ onDirection: handleArrowKey });

    return (
        <div className="GameContainer">
            <Render items={[player]} width={400} height={300} />
        </div>
    );
}
