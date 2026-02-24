// src/services/DataBus.ts
import { generateId, type Entity } from "@/logic/entity/Entity";
import { CollisionSystem } from "@/logic/collision/CollisionSystem";
import { createRectangleCollider, CollisionLayer } from "@/logic/collision";
import { getEntityById } from "@/logic/entity/getEntityById";
import { isBlockedBySolid } from "@/logic/collision/isBlockedBySolid";
import { createWorldBounds } from "@/logic/collision/worldBoundsFactory";

export type GameState = {
    entitiesById: Record<string, Entity>;
    playerId: string;

    worldSize: { width: number; height: number };
    worldBoundsEnabled: boolean;
    worldBoundsIds: string[];
};

class DataBus {
    private moveByAmount: number = 10;
    private collisionSystem = new CollisionSystem();

    private state: GameState = (() => {
        const player: Entity = {
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
            characterSpriteTiles: [[7, 19]],
            scaler: 5,
            position: { x: 10, y: 10 },
            fps: 10,
            collider: createRectangleCollider({
                size: { width: 16, height: 16 },
                offset: { x: 0, y: 0 },
                collisionResponse: "block",
                layer: CollisionLayer.player,
                collidesWith: CollisionLayer.object | CollisionLayer.world,
                debugDraw: true,
            }),
        };

        const testBox: Entity = {
            id: generateId(),
            type: "object",
            name: "testBox",
            animations: [],
            currentAnimation: "idle",
            updateState: () => {},
            spriteImageSheet: "/spriteSheet.png",
            spriteSize: 16,
            spriteSheetTileWidth: 49,
            spriteSheetTileHeight: 22,
            characterSpriteTiles: [[4, 19]],
            scaler: 3,
            position: { x: 120, y: 10 },
            fps: 10,
            collider: createRectangleCollider({
                size: { width: 16, height: 16 },
                offset: { x: 0, y: 0 },
                collisionResponse: "block",
                layer: CollisionLayer.object,
                collidesWith: CollisionLayer.player,
                debugDraw: true,
            }),
        };

        return {
            entitiesById: {
                [player.id]: player,
                [testBox.id]: testBox,
            },
            playerId: player.id,

            worldSize: { width: 400, height: 300 },
            worldBoundsEnabled: false,
            worldBoundsIds: [],
        };
    })();

    public getPlayer(): Entity {
        return this.state.entitiesById[this.state.playerId];
    }

    public getEntities(): Entity[] {
        return Object.values(this.state.entitiesById);
    }

    private runCollisions(): void {
        const events = this.collisionSystem.update(this.getEntities());
        for (const e of events) {
            const a = e.a ?? getEntityById(this.state.entitiesById, e.aId);
            const b = e.b ?? getEntityById(this.state.entitiesById, e.bId);
            console.log(
                `collision ${e.phase}: ${a?.name ?? e.aId} <-> ${b?.name ?? e.bId}`,
            );
        }
    }

    private tryMovePlayer(dx: number, dy: number): void {
        const player = this.getPlayer();
        const entities = this.getEntities();

        if (dx !== 0) {
            player.position.x += dx;
            if (isBlockedBySolid(player, entities)) {
                player.position.x -= dx;
            }
        }

        if (dy !== 0) {
            player.position.y += dy;
            if (isBlockedBySolid(player, entities)) {
                player.position.y -= dy;
            }
        }
    }

    movePlayerRight(moveAmount: number = this.moveByAmount): void {
        this.tryMovePlayer(moveAmount, 0);
        this.runCollisions();
    }

    movePlayerLeft(moveAmount: number = this.moveByAmount): void {
        this.tryMovePlayer(-moveAmount, 0);
        this.runCollisions();
    }

    movePlayerUp(moveAmount: number = this.moveByAmount): void {
        this.tryMovePlayer(0, -moveAmount);
        this.runCollisions();
    }

    movePlayerDown(moveAmount: number = this.moveByAmount): void {
        this.tryMovePlayer(0, moveAmount);
        this.runCollisions();
    }

    getState(): GameState {
        return this.state;
    }

    setState(updater: (prev: GameState) => GameState) {
        this.state = updater(this.state);
    }

    public setWorldSize(width: number, height: number) {
        this.state.worldSize = { width, height };
        if (this.state.worldBoundsEnabled) {
            this.rebuildWorldBounds();
        }
    }

    public setWorldBoundsEnabled(enabled: boolean) {
        this.state.worldBoundsEnabled = enabled;
        if (enabled) this.rebuildWorldBounds();
        else this.removeWorldBounds();
    }

    private removeWorldBounds() {
        for (const id of this.state.worldBoundsIds) {
            delete this.state.entitiesById[id];
        }
        this.state.worldBoundsIds = [];
    }

    private rebuildWorldBounds() {
        this.removeWorldBounds();

        const { width, height } = this.state.worldSize;
        const bounds = createWorldBounds(width, height, 32);

        this.state.entitiesById[bounds.left.id] = bounds.left;
        this.state.entitiesById[bounds.right.id] = bounds.right;
        this.state.entitiesById[bounds.top.id] = bounds.top;
        this.state.entitiesById[bounds.bottom.id] = bounds.bottom;

        this.state.worldBoundsIds = [
            bounds.left.id,
            bounds.right.id,
            bounds.top.id,
            bounds.bottom.id,
        ];
    }
    public setEntityCanPassWorldBounds(entityId: string, canPass: boolean) {
        const entity = this.state.entitiesById[entityId];
        if (!entity?.collider) return;

        if (canPass) {
            entity.collider.collidesWith =
                entity.collider.collidesWith & ~CollisionLayer.world;
            return;
        }

        entity.collider.collidesWith =
            entity.collider.collidesWith | CollisionLayer.world;
    }
    public setPlayerCanPassWorldBounds(canPass: boolean) {
        this.setEntityCanPassWorldBounds(this.state.playerId, canPass);
    }
}

export const dataBus = new DataBus();
