import type { RenderableItem } from "@/components/Render/Render";
import type { RectangleCollider } from "./collision";
import type { PhysicsBody } from "@/logic/physics";

export type Position = {
    x: number;
    y: number;
    z: number;
};

export type SpriteAnimation = {
    spriteSheet: string;
    name: string;
    frames: number[][];
};

export type SpriteSize = {
    w: number;
    h: number;
};

export type UUID = string & { readonly __brand: unique symbol };

export const generateId = (): UUID => crypto.randomUUID() as UUID;

export type EntityType = "player" | "enemy" | "object";

export type Entity = RenderableItem & {
    id: UUID;
    type: EntityType;
    name: string;
    animations: SpriteAnimation[];
    currentAnimation: string;
    updateState: (deltaMS: number) => void;

    collider?: RectangleCollider;
    physicsBody?: PhysicsBody;
};
//for reference:
// export interface RenderableItem {
//     spriteimageTest: string;
//     spriteSize: number;
//     spriteSheetTileWidth: number;
//     spriteSheetTileHeight: number;
//     characterSpriteTiles: number[][];
//     scaler: number;
//     position: { x: number; y: number };
//     fps?: number;
// }

export const getAnimationByName = (
    entity: Entity,
    animationName: string,
): SpriteAnimation | undefined => {
    return entity.animations.find((a) => a.name === animationName);
};
