// src/services/DataBus.ts
import { generateId, type Entity } from "@/logic/entity/Entity";
import { CollisionSystem } from "@/logic/collision/CollisionSystem";
import { createRectangleCollider, CollisionLayer } from "@/logic/collision";
import { getEntityById } from "@/logic/entity/getEntityById";
import { isBlockedBySolid } from "@/logic/collision/isBlockedBySolid";
import { createWorldBounds } from "@/logic/collision/worldBoundsFactory";
import {
    createPhysicsBody,
    DEFAULT_GRAVITY_CONFIG,
    stepEntityPhysics,
    type GravityConfig,
    type PhysicsBodyOverrides,
} from "@/logic/physics";

export type CameraMode = "follow-player" | "manual";

export type CameraState = {
    x: number;
    y: number;
    viewport: { width: number; height: number };
    mode: CameraMode;
    clampToWorld: boolean;
    followTargetId: string | null;
};

export type GameState = {
    entitiesById: Record<string, Entity>;
    playerId: string;

    worldSize: { width: number; height: number };
    camera: CameraState;
    worldBoundsEnabled: boolean;
    worldBoundsIds: string[];
};

type PlayerMovementConfig = {
    maxSpeedX: number;
    groundAcceleration: number;
    airAcceleration: number;
    groundDeceleration: number;
    airDeceleration: number;
    jumpVelocity: number;
};

type JumpAssistConfig = {
    coyoteTimeMs: number;
    jumpBufferMs: number;
    groundProbeDistance: number;
};

class DataBus {
    private moveByAmount: number = 10;
    private collisionSystem = new CollisionSystem();
    private physicsConfig: GravityConfig = { ...DEFAULT_GRAVITY_CONFIG };
    private playerMoveInputX: number = 0;
    private simulationTimeMs: number = 0;
    private playerLastGroundedAtMs: number = Number.NEGATIVE_INFINITY;
    private playerJumpRequestedAtMs: number = Number.NEGATIVE_INFINITY;
    private playerMovementConfig: PlayerMovementConfig = {
        maxSpeedX: 220,
        groundAcceleration: 1800,
        airAcceleration: 1100,
        groundDeceleration: 2200,
        airDeceleration: 700,
        jumpVelocity: 520,
    };
    private jumpAssistConfig: JumpAssistConfig = {
        coyoteTimeMs: 120,
        jumpBufferMs: 120,
        groundProbeDistance: 2,
    };

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
            camera: {
                x: 0,
                y: 0,
                viewport: { width: 400, height: 300 },
                mode: "follow-player",
                clampToWorld: true,
                followTargetId: player.id,
            },
            worldBoundsEnabled: false,
            worldBoundsIds: [],
        };
    })();

    private clampCameraPosition(x: number, y: number) {
        if (!this.state.camera.clampToWorld) {
            return { x, y };
        }

        const maxX = Math.max(
            0,
            this.state.worldSize.width - this.state.camera.viewport.width,
        );
        const maxY = Math.max(
            0,
            this.state.worldSize.height - this.state.camera.viewport.height,
        );

        return {
            x: Math.max(0, Math.min(x, maxX)),
            y: Math.max(0, Math.min(y, maxY)),
        };
    }

    private getCameraFollowPosition(entity: Entity) {
        const entityCenterX =
            entity.position.x + (entity.spriteSize * entity.scaler) / 2;
        const entityCenterY =
            entity.position.y + (entity.spriteSize * entity.scaler) / 2;

        return {
            x: entityCenterX - this.state.camera.viewport.width / 2,
            y: entityCenterY - this.state.camera.viewport.height / 2,
        };
    }

    private syncCameraToState() {
        if (this.state.camera.mode === "follow-player") {
            const targetId =
                this.state.camera.followTargetId ?? this.state.playerId;
            const target = this.state.entitiesById[targetId];

            if (target) {
                const nextPosition = this.getCameraFollowPosition(target);
                const clamped = this.clampCameraPosition(
                    nextPosition.x,
                    nextPosition.y,
                );
                this.state.camera.x = clamped.x;
                this.state.camera.y = clamped.y;
                return;
            }
        }

        const clamped = this.clampCameraPosition(
            this.state.camera.x,
            this.state.camera.y,
        );
        this.state.camera.x = clamped.x;
        this.state.camera.y = clamped.y;
    }

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

    public movePlayerBy(dx: number, dy: number): boolean {
        if (dx === 0 && dy === 0) return false;

        const player = this.getPlayer();
        const startX = player.position.x;
        const startY = player.position.y;

        this.tryMovePlayer(dx, dy);
        const moved =
            player.position.x !== startX || player.position.y !== startY;

        if (moved) {
            this.runCollisions();
            this.syncCameraToState();
        }

        return moved;
    }

    movePlayerRight(moveAmount: number = this.moveByAmount): void {
        this.movePlayerBy(moveAmount, 0);
    }

    movePlayerLeft(moveAmount: number = this.moveByAmount): void {
        this.movePlayerBy(-moveAmount, 0);
    }

    movePlayerUp(moveAmount: number = this.moveByAmount): void {
        this.movePlayerBy(0, -moveAmount);
    }

    movePlayerDown(moveAmount: number = this.moveByAmount): void {
        this.movePlayerBy(0, moveAmount);
    }

    getState(): GameState {
        return this.state;
    }

    setState(updater: (prev: GameState) => GameState) {
        this.state = updater(this.state);
        this.syncCameraToState();
    }

    public setWorldSize(width: number, height: number) {
        this.state.worldSize = { width, height };
        if (this.state.worldBoundsEnabled) {
            this.rebuildWorldBounds();
        }
        this.syncCameraToState();
    }

    public setCameraViewport(width: number, height: number) {
        if (width <= 0 || height <= 0) {
            return;
        }

        this.state.camera.viewport = { width, height };
        this.syncCameraToState();
    }

    public setCameraClampToWorld(enabled: boolean) {
        this.state.camera.clampToWorld = enabled;
        this.syncCameraToState();
    }

    public setCameraMode(mode: CameraMode) {
        this.state.camera.mode = mode;
        if (mode === "follow-player" && !this.state.camera.followTargetId) {
            this.state.camera.followTargetId = this.state.playerId;
        }
        this.syncCameraToState();
    }

    public setCameraFollowTarget(entityId: string | null) {
        this.state.camera.followTargetId = entityId;
        if (entityId) {
            this.state.camera.mode = "follow-player";
        }
        this.syncCameraToState();
    }

    public setCameraFollowPlayer(enabled: boolean = true) {
        if (enabled) {
            this.state.camera.mode = "follow-player";
            this.state.camera.followTargetId = this.state.playerId;
        } else if (this.state.camera.mode === "follow-player") {
            this.state.camera.mode = "manual";
        }

        this.syncCameraToState();
    }

    public setCameraPosition(x: number, y: number) {
        const clamped = this.clampCameraPosition(x, y);
        this.state.camera.x = clamped.x;
        this.state.camera.y = clamped.y;
    }

    public moveCameraBy(dx: number, dy: number) {
        this.setCameraPosition(
            this.state.camera.x + dx,
            this.state.camera.y + dy,
        );
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

    public setPlayerMoveInput(inputX: number) {
        if (!Number.isFinite(inputX)) {
            this.playerMoveInputX = 0;
            return;
        }

        this.playerMoveInputX = Math.max(-1, Math.min(1, inputX));
    }

    public setPlayerMovementConfig(config: Partial<PlayerMovementConfig>) {
        this.playerMovementConfig = {
            ...this.playerMovementConfig,
            ...config,
        };
    }

    public setPlayerJumpAssistConfig(config: Partial<JumpAssistConfig>) {
        this.jumpAssistConfig = {
            ...this.jumpAssistConfig,
            ...config,
        };
    }

    public enablePlayerPhysics(bodyOverrides: PhysicsBodyOverrides = {}) {
        this.enableEntityPhysics(this.state.playerId, bodyOverrides);
    }

    public enablePlayerGravity(bodyOverrides: PhysicsBodyOverrides = {}) {
        this.enableEntityPhysics(this.state.playerId, {
            affectedByGravity: true,
            ...bodyOverrides,
        });
    }

    public disablePlayerPhysics() {
        this.disableEntityPhysics(this.state.playerId);
    }

    public isPlayerGravityActive() {
        const player = this.getPlayer();
        const body = player.physicsBody;
        return !!body && body.enabled && body.affectedByGravity;
    }

    public setPhysicsConfig(config: Partial<GravityConfig>) {
        this.physicsConfig = {
            ...this.physicsConfig,
            ...config,
        };
    }

    public enableEntityPhysics(
        entityId: string,
        bodyOverrides: PhysicsBodyOverrides = {},
    ) {
        const entity = this.state.entitiesById[entityId];
        if (!entity) return;

        entity.physicsBody = entity.physicsBody
            ? {
                  ...entity.physicsBody,
                  ...bodyOverrides,
                  velocity: {
                      x:
                          bodyOverrides.velocity?.x ??
                          entity.physicsBody.velocity.x,
                      y:
                          bodyOverrides.velocity?.y ??
                          entity.physicsBody.velocity.y,
                  },
              }
            : createPhysicsBody(bodyOverrides);
    }

    public disableEntityPhysics(entityId: string) {
        const entity = this.state.entitiesById[entityId];
        if (!entity) return;
        entity.physicsBody = undefined;
    }

    public setEntityVelocity(entityId: string, x: number, y: number) {
        const entity = this.state.entitiesById[entityId];
        if (!entity) return;

        if (!entity.physicsBody) {
            entity.physicsBody = createPhysicsBody();
        }

        entity.physicsBody.velocity.x = x;
        entity.physicsBody.velocity.y = y;
    }

    public isEntityGrounded(entityId: string, probeDistance: number = 1) {
        const entity = this.state.entitiesById[entityId];
        if (!entity?.collider || probeDistance <= 0) return false;

        return this.isEntityGroundedFromSet(
            entity,
            this.getEntities(),
            probeDistance,
        );
    }

    public isPlayerGrounded(probeDistance: number = 1) {
        return this.isEntityGrounded(this.state.playerId, probeDistance);
    }

    public jumpEntity(entityId: string, jumpVelocity: number = 520) {
        const entity = this.state.entitiesById[entityId];
        if (!entity) return false;
        if (!this.isEntityGrounded(entityId)) return false;

        this.enableEntityPhysics(entityId, {
            affectedByGravity: true,
        });

        if (!entity.physicsBody) return false;
        entity.physicsBody.velocity.y = -Math.abs(jumpVelocity);

        return true;
    }

    public jumpPlayer(jumpVelocity: number = 520) {
        return this.jumpEntity(this.state.playerId, jumpVelocity);
    }

    public requestPlayerJump() {
        this.playerJumpRequestedAtMs = this.simulationTimeMs;
    }

    private moveToward(current: number, target: number, maxDelta: number) {
        if (current < target) {
            return Math.min(target, current + maxDelta);
        }

        if (current > target) {
            return Math.max(target, current - maxDelta);
        }

        return current;
    }

    private isEntityGroundedFromSet(
        entity: Entity,
        entities: Entity[],
        probeDistance: number,
    ) {
        if (!entity.collider || probeDistance <= 0) return false;

        entity.position.y += probeDistance;
        const grounded = isBlockedBySolid(entity, entities);
        entity.position.y -= probeDistance;

        return grounded;
    }

    private applyPlayerMotionAssists(
        entity: Entity,
        entities: Entity[],
        dt: number,
    ) {
        const body = entity.physicsBody;
        if (!body) return;

        const isGroundedNow = this.isEntityGroundedFromSet(
            entity,
            entities,
            this.jumpAssistConfig.groundProbeDistance,
        );

        if (isGroundedNow) {
            this.playerLastGroundedAtMs = this.simulationTimeMs;
        }

        const targetVelocityX =
            this.playerMoveInputX * this.playerMovementConfig.maxSpeedX;
        const hasInput = this.playerMoveInputX !== 0;
        const acceleration = isGroundedNow
            ? this.playerMovementConfig.groundAcceleration
            : this.playerMovementConfig.airAcceleration;
        const deceleration = isGroundedNow
            ? this.playerMovementConfig.groundDeceleration
            : this.playerMovementConfig.airDeceleration;
        const maxDelta = (hasInput ? acceleration : deceleration) * dt;

        body.velocity.x = this.moveToward(
            body.velocity.x,
            targetVelocityX,
            maxDelta,
        );

        const hasBufferedJump =
            this.simulationTimeMs - this.playerJumpRequestedAtMs <=
            this.jumpAssistConfig.jumpBufferMs;
        const hasCoyoteJump =
            this.simulationTimeMs - this.playerLastGroundedAtMs <=
            this.jumpAssistConfig.coyoteTimeMs;

        if (hasBufferedJump && hasCoyoteJump) {
            body.velocity.y = -Math.abs(this.playerMovementConfig.jumpVelocity);
            this.playerJumpRequestedAtMs = Number.NEGATIVE_INFINITY;
            this.playerLastGroundedAtMs = Number.NEGATIVE_INFINITY;
        }
    }

    public stepPhysics(deltaMs: number): boolean {
        if (deltaMs <= 0) return false;

        const entities = this.getEntities();
        let hasPositionChanges = false;
        const clampedDeltaMs = Math.min(deltaMs, this.physicsConfig.maxDeltaMs);
        this.simulationTimeMs += clampedDeltaMs;
        const dt = clampedDeltaMs / 1000;

        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];
            if (entity.id === this.state.playerId) {
                this.applyPlayerMotionAssists(entity, entities, dt);
            }

            const startX = entity.position.x;
            const startY = entity.position.y;
            const result = stepEntityPhysics(
                entity,
                deltaMs,
                this.physicsConfig,
            );
            if (result.dx === 0 && result.dy === 0) {
                continue;
            }

            if (result.dx !== 0) {
                entity.position.x += result.dx;
                if (isBlockedBySolid(entity, entities)) {
                    entity.position.x -= result.dx;
                    if (entity.physicsBody) {
                        entity.physicsBody.velocity.x = 0;
                    }
                }
            }

            if (result.dy !== 0) {
                entity.position.y += result.dy;
                if (isBlockedBySolid(entity, entities)) {
                    entity.position.y -= result.dy;
                    if (entity.physicsBody) {
                        entity.physicsBody.velocity.y = 0;
                    }
                }
            }

            if (entity.position.x !== startX || entity.position.y !== startY) {
                hasPositionChanges = true;
            }
        }

        if (hasPositionChanges) {
            this.runCollisions();
            this.syncCameraToState();
        }

        return hasPositionChanges;
    }
}

export const dataBus = new DataBus();
