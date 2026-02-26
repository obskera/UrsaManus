import { dataBus } from "@/services/DataBus";

export type InputActionMap = {
    north: () => void;
    south: () => void;
    east: () => void;
    west: () => void;
    interact: () => void;
};

export type CreatePlayerInputActionsOptions = {
    onChanged?: () => void;
    onInteract?: () => void;
};

export function createPlayerInputActions({
    onChanged,
    onInteract,
}: CreatePlayerInputActionsOptions = {}): InputActionMap {
    const notifyChanged = () => {
        onChanged?.();
    };

    return {
        north: () => {
            if (dataBus.isPlayerGravityActive()) {
                dataBus.requestPlayerJump();
            } else {
                dataBus.movePlayerUp();
            }
            notifyChanged();
        },
        south: () => {
            dataBus.movePlayerDown();
            notifyChanged();
        },
        east: () => {
            dataBus.movePlayerRight();
            notifyChanged();
        },
        west: () => {
            dataBus.movePlayerLeft();
            notifyChanged();
        },
        interact: () => {
            onInteract?.();
            notifyChanged();
        },
    };
}
