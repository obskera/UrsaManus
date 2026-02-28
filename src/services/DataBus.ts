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
import {
    isTimedStateActive,
    resolveEntityBehaviorState,
    type EntityBehaviorState,
    type TimedEntityState,
} from "@/logic/entity/entityStateMachine";
import {
    DEFAULT_INTERACTION_DISTANCE_PX,
    normalizeEnvironmentalForceZone,
    getEntityDistancePx,
    hasLineOfSightBetweenEntities,
    resolveInteractionHintLabel,
    resolveEnvironmentalForceEffect,
    createStatusEffectsSimulation,
    type EnvironmentalForceZone,
    type EnvironmentalForceZoneInput,
    type InteractionInputHint,
    type InteractionInputMode,
    type StatusEffectInput,
    type StatusEffectInstance,
} from "@/logic/simulation";
import spriteSheetUrl from "@/assets/spriteSheet.png";

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

export type WorldPauseReason = string;

export type WorldPauseChange = {
    reason: WorldPauseReason;
    reasons: WorldPauseReason[];
    paused: boolean;
};

export type EntityBehaviorTransition = {
    entityId: string;
    from: EntityBehaviorState;
    to: EntityBehaviorState;
    atMs: number;
};

export type BossPhaseState = Extract<
    EntityBehaviorState,
    "phase-1" | "phase-2"
>;

export type NpcArchetypeMode = "idle" | "idle-roam" | "patrol" | "chase";

export type NpcWaypoint = {
    x: number;
    y: number;
};

export type EnvironmentalForceZoneProfile = EnvironmentalForceZoneInput;
export type EntityStatusEffectInput = StatusEffectInput;

export type InteractionBlockedReason =
    | "missing-target"
    | "out-of-range"
    | "line-of-sight-blocked"
    | "interaction-disabled";

export type InteractionContext = {
    player: Entity;
    target: Entity;
    inputMode: InteractionInputMode;
    distancePx: number;
    hasLineOfSight: boolean;
};

export type EntityInteractionContract = {
    canInteract?: (context: InteractionContext) => boolean;
    interact: (context: InteractionContext) => void;
    blockedReason?: (
        context: InteractionContext,
        reason: InteractionBlockedReason,
    ) => string | null;
    maxDistancePx?: number;
    requireLineOfSight?: boolean;
    inputHint?: InteractionInputHint;
};

export type InteractionResolution = {
    targetId: string | null;
    canInteract: boolean;
    blockedReason: string | null;
    defaultBlockedReason: InteractionBlockedReason | null;
    distancePx: number | null;
    hasLineOfSight: boolean;
    inputHintLabel: string | null;
    inputMode: InteractionInputMode;
};

export type NpcArchetypeProfile = {
    mode?: NpcArchetypeMode;
    anchorX?: number;
    anchorY?: number;
    patrolDistancePx?: number;
    patrolSpeedPxPerSec?: number;
    waypoints?: NpcWaypoint[];
    waypointTolerancePx?: number;
    roamDistancePx?: number;
    roamSpeedPxPerSec?: number;
    roamFrequencyHz?: number;
    chaseDistancePx?: number;
    chaseStopDistancePx?: number;
    chaseSpeedPxPerSec?: number;
    fleeDistancePx?: number;
    fleeSpeedPxPerSec?: number;
};

type ResolvedNpcArchetypeProfile = {
    mode: NpcArchetypeMode;
    anchorX: number;
    anchorY: number;
    patrolDistancePx: number;
    patrolSpeedPxPerSec: number;
    waypoints: NpcWaypoint[];
    waypointTolerancePx: number;
    roamDistancePx: number;
    roamSpeedPxPerSec: number;
    roamFrequencyHz: number;
    chaseDistancePx: number;
    chaseStopDistancePx: number;
    chaseSpeedPxPerSec: number;
    fleeDistancePx: number;
    fleeSpeedPxPerSec: number;
};

const MAX_BEHAVIOR_TRANSITIONS = 200;
const DEFAULT_NPC_PATROL_DISTANCE_PX = 32;
const DEFAULT_NPC_PATROL_SPEED_PX_PER_SEC = 90;
const DEFAULT_NPC_WAYPOINT_TOLERANCE_PX = 6;
const DEFAULT_NPC_ROAM_DISTANCE_PX = 18;
const DEFAULT_NPC_ROAM_SPEED_PX_PER_SEC = 70;
const DEFAULT_NPC_ROAM_FREQUENCY_HZ = 0.45;
const DEFAULT_NPC_CHASE_DISTANCE_PX = 240;
const DEFAULT_NPC_CHASE_STOP_DISTANCE_PX = 12;
const DEFAULT_NPC_CHASE_SPEED_PX_PER_SEC = 130;
const DEFAULT_NPC_FLEE_DISTANCE_PX = 72;
const DEFAULT_NPC_FLEE_SPEED_PX_PER_SEC = 140;

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
    private worldPauseReasons = new Set<WorldPauseReason>();
    private onPauseHandlers = new Set<(event: WorldPauseChange) => void>();
    private onResumeHandlers = new Set<(event: WorldPauseChange) => void>();
    private entityBehaviorStates = new Map<string, EntityBehaviorState>();
    private entityTimedStates = new Map<string, TimedEntityState>();
    private entityBehaviorTransitions: EntityBehaviorTransition[] = [];
    private npcArchetypeProfiles = new Map<
        string,
        ResolvedNpcArchetypeProfile
    >();
    private npcPatrolDirections = new Map<string, 1 | -1>();
    private npcWaypointIndices = new Map<string, number>();
    private environmentalForceZones = new Map<string, EnvironmentalForceZone>();
    private statusEffects = createStatusEffectsSimulation();
    private entityInteractionContracts = new Map<
        string,
        EntityInteractionContract
    >();

    private state: GameState = (() => {
        const player: Entity = {
            id: generateId(),
            type: "player",
            name: "player1",
            animations: [],
            currentAnimation: "idle",
            updateState: () => {},
            spriteImageSheet: spriteSheetUrl,
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
            spriteImageSheet: spriteSheetUrl,
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

    private syncEntityStateStores() {
        const validIds = new Set(Object.keys(this.state.entitiesById));

        for (const id of this.entityBehaviorStates.keys()) {
            if (!validIds.has(id)) {
                this.entityBehaviorStates.delete(id);
            }
        }

        for (const id of this.entityTimedStates.keys()) {
            if (!validIds.has(id)) {
                this.entityTimedStates.delete(id);
            }
        }

        for (const id of this.npcArchetypeProfiles.keys()) {
            if (!validIds.has(id)) {
                this.npcArchetypeProfiles.delete(id);
            }
        }

        for (const id of this.npcPatrolDirections.keys()) {
            if (!validIds.has(id)) {
                this.npcPatrolDirections.delete(id);
            }
        }

        for (const id of this.npcWaypointIndices.keys()) {
            if (!validIds.has(id)) {
                this.npcWaypointIndices.delete(id);
            }
        }

        for (const id of this.entityInteractionContracts.keys()) {
            if (!validIds.has(id)) {
                this.entityInteractionContracts.delete(id);
            }
        }

        this.entityBehaviorTransitions = this.entityBehaviorTransitions.filter(
            (entry) => validIds.has(entry.entityId),
        );

        for (const entity of this.getEntities()) {
            if (!entity.behaviorState) {
                entity.behaviorState = "idle";
            }
            this.entityBehaviorStates.set(entity.id, entity.behaviorState);
            if (!entity.currentAnimation) {
                entity.currentAnimation = entity.behaviorState;
            }
        }
    }

    private setEntityBehaviorState(entity: Entity, state: EntityBehaviorState) {
        const previousState = this.entityBehaviorStates.get(entity.id);

        if (previousState && previousState !== state) {
            this.entityBehaviorTransitions.push({
                entityId: entity.id,
                from: previousState,
                to: state,
                atMs: this.simulationTimeMs,
            });

            if (
                this.entityBehaviorTransitions.length > MAX_BEHAVIOR_TRANSITIONS
            ) {
                this.entityBehaviorTransitions.shift();
            }
        }

        entity.behaviorState = state;
        this.entityBehaviorStates.set(entity.id, state);
        entity.currentAnimation = state;
    }

    private getActiveTimedState(entityId: string): TimedEntityState | null {
        const timedState = this.entityTimedStates.get(entityId) ?? null;
        if (!timedState) {
            return null;
        }

        if (!isTimedStateActive(timedState, this.simulationTimeMs)) {
            this.entityTimedStates.delete(entityId);
            return null;
        }

        return timedState;
    }

    private updatePlayerBehaviorState(player: Entity) {
        const timedState = this.getActiveTimedState(player.id);
        const speedX = player.physicsBody?.velocity.x ?? 0;
        const nextBehaviorState = resolveEntityBehaviorState({
            nowMs: this.simulationTimeMs,
            timedState,
            hasMoveIntent: this.playerMoveInputX !== 0,
            speedX,
        });

        this.setEntityBehaviorState(player, nextBehaviorState);
    }

    private ensureNpcPhysicsBody(entityId: string) {
        this.enableEntityPhysics(entityId, {
            affectedByGravity: false,
            dragX: 0,
            velocity: {
                x:
                    this.state.entitiesById[entityId]?.physicsBody?.velocity
                        .x ?? 0,
                y:
                    this.state.entitiesById[entityId]?.physicsBody?.velocity
                        .y ?? 0,
            },
        });
    }

    private setNpcVelocityToward(
        entity: Entity,
        target: { x: number; y: number },
        speedPxPerSec: number,
        stopDistancePx: number = 0,
    ): boolean {
        const deltaX = target.x - entity.position.x;
        const deltaY = target.y - entity.position.y;
        const distance = Math.hypot(deltaX, deltaY);

        if (distance <= Math.max(0, stopDistancePx)) {
            this.setEntityVelocity(entity.id, 0, 0);
            return true;
        }

        if (distance <= 0.0001 || speedPxPerSec <= 0) {
            this.setEntityVelocity(entity.id, 0, 0);
            return true;
        }

        this.setEntityVelocity(
            entity.id,
            (deltaX / distance) * speedPxPerSec,
            (deltaY / distance) * speedPxPerSec,
        );

        return false;
    }

    private getNpcRoamTarget(
        entity: Entity,
        profile: ResolvedNpcArchetypeProfile,
    ) {
        const idSeed =
            Array.from(entity.id).reduce(
                (sum, ch) => sum + ch.charCodeAt(0),
                0,
            ) / 255;
        const phase =
            (this.simulationTimeMs / 1000) *
                Math.PI *
                2 *
                profile.roamFrequencyHz +
            idSeed;

        return {
            x: profile.anchorX + Math.cos(phase) * profile.roamDistancePx,
            y: profile.anchorY + Math.sin(phase * 0.7) * profile.roamDistancePx,
        };
    }

    private applyNpcArchetypeProfile(entity: Entity) {
        const profile = this.npcArchetypeProfiles.get(entity.id);
        if (!profile) {
            return;
        }

        const speedScale = this.statusEffects.getMovementSpeedScale(entity.id);

        const timedState = this.getActiveTimedState(entity.id);
        if (timedState) {
            this.setEntityBehaviorState(entity, timedState.state);
            return;
        }

        const player = this.getPlayer();
        const deltaXToPlayer = entity.position.x - player.position.x;
        const deltaYToPlayer = entity.position.y - player.position.y;
        const distanceToPlayer = Math.hypot(deltaXToPlayer, deltaYToPlayer);
        const shouldFlee = distanceToPlayer <= profile.fleeDistancePx;

        if (shouldFlee) {
            this.ensureNpcPhysicsBody(entity.id);
            const fleeNorm = Math.max(distanceToPlayer, 0.0001);
            this.setEntityVelocity(
                entity.id,
                (deltaXToPlayer / fleeNorm) *
                    profile.fleeSpeedPxPerSec *
                    speedScale,
                (deltaYToPlayer / fleeNorm) *
                    profile.fleeSpeedPxPerSec *
                    speedScale,
            );
            this.setEntityBehaviorState(entity, "flee");
            return;
        }

        if (profile.mode === "idle") {
            this.setEntityVelocity(entity.id, 0, 0);
            this.setEntityBehaviorState(entity, "idle");
            return;
        }

        if (profile.mode === "idle-roam") {
            this.ensureNpcPhysicsBody(entity.id);
            const roamTarget = this.getNpcRoamTarget(entity, profile);
            const reached = this.setNpcVelocityToward(
                entity,
                roamTarget,
                profile.roamSpeedPxPerSec * speedScale,
                profile.waypointTolerancePx,
            );

            this.setEntityBehaviorState(entity, reached ? "idle" : "patrol");
            return;
        }

        if (profile.mode === "chase") {
            this.ensureNpcPhysicsBody(entity.id);

            if (distanceToPlayer > profile.chaseDistancePx) {
                this.setEntityVelocity(entity.id, 0, 0);
                this.setEntityBehaviorState(entity, "idle");
                return;
            }

            this.setNpcVelocityToward(
                entity,
                player.position,
                profile.chaseSpeedPxPerSec * speedScale,
                profile.chaseStopDistancePx,
            );
            this.setEntityBehaviorState(entity, "chase");
            return;
        }

        this.ensureNpcPhysicsBody(entity.id);

        if (profile.waypoints.length > 0) {
            const maxIndex = profile.waypoints.length - 1;
            const currentIndex = Math.min(
                Math.max(this.npcWaypointIndices.get(entity.id) ?? 0, 0),
                maxIndex,
            );
            let nextIndex = currentIndex;
            let waypoint = profile.waypoints[currentIndex];

            const reached =
                Math.hypot(
                    waypoint.x - entity.position.x,
                    waypoint.y - entity.position.y,
                ) <= profile.waypointTolerancePx;

            if (reached && profile.waypoints.length > 1) {
                nextIndex = (currentIndex + 1) % profile.waypoints.length;
                waypoint = profile.waypoints[nextIndex];
                this.npcWaypointIndices.set(entity.id, nextIndex);
            }

            this.setNpcVelocityToward(
                entity,
                waypoint,
                profile.patrolSpeedPxPerSec * speedScale,
                profile.waypointTolerancePx,
            );
            this.setEntityBehaviorState(entity, "patrol");
            return;
        }

        const leftBound = profile.anchorX - profile.patrolDistancePx;
        const rightBound = profile.anchorX + profile.patrolDistancePx;
        const currentDirection = this.npcPatrolDirections.get(entity.id) ?? 1;
        let nextDirection = currentDirection;

        if (entity.position.x <= leftBound) {
            nextDirection = 1;
        } else if (entity.position.x >= rightBound) {
            nextDirection = -1;
        }

        this.npcPatrolDirections.set(entity.id, nextDirection);
        this.setEntityVelocity(
            entity.id,
            nextDirection * profile.patrolSpeedPxPerSec * speedScale,
            0,
        );
        this.setEntityBehaviorState(entity, "patrol");
    }

    private getEnvironmentalForceZones(): EnvironmentalForceZone[] {
        return Array.from(this.environmentalForceZones.values());
    }

    private applyEnvironmentalForces(entity: Entity, deltaMs: number) {
        const body = entity.physicsBody;
        if (!body) {
            return 1;
        }

        const effect = resolveEnvironmentalForceEffect({
            zones: this.getEnvironmentalForceZones(),
            entityType: entity.type,
            position: entity.position,
            deltaMs,
        });

        if (effect.deltaVelocityX !== 0 || effect.deltaVelocityY !== 0) {
            body.velocity.x += effect.deltaVelocityX;
            body.velocity.y += effect.deltaVelocityY;
        }

        if (effect.dragScaleX !== 1) {
            body.dragX = Math.max(0, body.dragX * effect.dragScaleX);
        }

        return effect.dragScaleX;
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
        if (this.isWorldPaused()) return false;
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
        this.playerMoveInputX = 0;
        this.clearEntityTimedStates();
        this.clearEntityStatusEffects();
        this.syncEntityStateStores();
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
        if (this.isWorldPaused()) {
            this.playerMoveInputX = 0;
            return;
        }

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
        if (this.isWorldPaused()) return false;
        return this.jumpEntity(this.state.playerId, jumpVelocity);
    }

    public requestPlayerJump() {
        if (this.isWorldPaused()) return;
        this.playerJumpRequestedAtMs = this.simulationTimeMs;
    }

    public setEntityTimedState(
        entityId: string,
        state: TimedEntityState["state"],
        durationMs: number,
    ) {
        const entity = this.state.entitiesById[entityId];
        if (!entity) return;

        const safeDurationMs = Number.isFinite(durationMs)
            ? Math.max(0, durationMs)
            : 0;

        this.entityTimedStates.set(entityId, {
            state,
            untilMs: this.simulationTimeMs + safeDurationMs,
        });

        this.setEntityBehaviorState(entity, state);
    }

    public setNpcArchetypeProfile(
        entityId: string,
        profile: NpcArchetypeProfile,
    ) {
        const entity = this.state.entitiesById[entityId];
        if (!entity) {
            return;
        }

        const resolvedProfile: ResolvedNpcArchetypeProfile = {
            mode: profile.mode ?? "patrol",
            anchorX: profile.anchorX ?? entity.position.x,
            anchorY: profile.anchorY ?? entity.position.y,
            patrolDistancePx: Math.max(
                0,
                profile.patrolDistancePx ?? DEFAULT_NPC_PATROL_DISTANCE_PX,
            ),
            patrolSpeedPxPerSec: Math.max(
                0,
                profile.patrolSpeedPxPerSec ??
                    DEFAULT_NPC_PATROL_SPEED_PX_PER_SEC,
            ),
            waypoints: (profile.waypoints ?? []).filter(
                (waypoint) =>
                    Number.isFinite(waypoint.x) && Number.isFinite(waypoint.y),
            ),
            waypointTolerancePx: Math.max(
                0,
                profile.waypointTolerancePx ??
                    DEFAULT_NPC_WAYPOINT_TOLERANCE_PX,
            ),
            roamDistancePx: Math.max(
                0,
                profile.roamDistancePx ?? DEFAULT_NPC_ROAM_DISTANCE_PX,
            ),
            roamSpeedPxPerSec: Math.max(
                0,
                profile.roamSpeedPxPerSec ?? DEFAULT_NPC_ROAM_SPEED_PX_PER_SEC,
            ),
            roamFrequencyHz: Math.max(
                0,
                profile.roamFrequencyHz ?? DEFAULT_NPC_ROAM_FREQUENCY_HZ,
            ),
            chaseDistancePx: Math.max(
                0,
                profile.chaseDistancePx ?? DEFAULT_NPC_CHASE_DISTANCE_PX,
            ),
            chaseStopDistancePx: Math.max(
                0,
                profile.chaseStopDistancePx ??
                    DEFAULT_NPC_CHASE_STOP_DISTANCE_PX,
            ),
            chaseSpeedPxPerSec: Math.max(
                0,
                profile.chaseSpeedPxPerSec ??
                    DEFAULT_NPC_CHASE_SPEED_PX_PER_SEC,
            ),
            fleeDistancePx: Math.max(
                0,
                profile.fleeDistancePx ?? DEFAULT_NPC_FLEE_DISTANCE_PX,
            ),
            fleeSpeedPxPerSec: Math.max(
                0,
                profile.fleeSpeedPxPerSec ?? DEFAULT_NPC_FLEE_SPEED_PX_PER_SEC,
            ),
        };

        this.npcArchetypeProfiles.set(entityId, resolvedProfile);
        if (!this.npcPatrolDirections.has(entityId)) {
            this.npcPatrolDirections.set(entityId, 1);
        }
        if (!this.npcWaypointIndices.has(entityId)) {
            this.npcWaypointIndices.set(entityId, 0);
        }
    }

    public getNpcArchetypeProfile(
        entityId: string,
    ): ResolvedNpcArchetypeProfile | null {
        return this.npcArchetypeProfiles.get(entityId) ?? null;
    }

    public clearNpcArchetypeProfile(entityId: string) {
        this.npcArchetypeProfiles.delete(entityId);
        this.npcPatrolDirections.delete(entityId);
        this.npcWaypointIndices.delete(entityId);
    }

    public clearNpcArchetypeProfiles() {
        this.npcArchetypeProfiles.clear();
        this.npcPatrolDirections.clear();
        this.npcWaypointIndices.clear();
    }

    public setEnvironmentalForceZone(profile: EnvironmentalForceZoneProfile) {
        if (!profile.id) {
            return;
        }

        const normalized = normalizeEnvironmentalForceZone(profile);
        this.environmentalForceZones.set(normalized.id, normalized);
    }

    public setEnvironmentalForceZones(
        profiles: EnvironmentalForceZoneProfile[],
    ) {
        this.environmentalForceZones.clear();

        for (const profile of profiles) {
            this.setEnvironmentalForceZone(profile);
        }
    }

    public getEnvironmentalForceZone(
        id: string,
    ): EnvironmentalForceZone | null {
        return this.environmentalForceZones.get(id) ?? null;
    }

    public getEnvironmentalForceZoneProfiles(): EnvironmentalForceZone[] {
        return this.getEnvironmentalForceZones();
    }

    public removeEnvironmentalForceZone(id: string) {
        return this.environmentalForceZones.delete(id);
    }

    public clearEnvironmentalForceZones() {
        this.environmentalForceZones.clear();
    }

    public setEntityInteractionContract(
        entityId: string,
        contract: EntityInteractionContract,
    ) {
        const entity = this.state.entitiesById[entityId];
        if (!entity) {
            return false;
        }

        this.entityInteractionContracts.set(entityId, contract);
        return true;
    }

    public getEntityInteractionContract(
        entityId: string,
    ): EntityInteractionContract | null {
        return this.entityInteractionContracts.get(entityId) ?? null;
    }

    public clearEntityInteractionContract(entityId: string) {
        return this.entityInteractionContracts.delete(entityId);
    }

    public clearEntityInteractionContracts() {
        this.entityInteractionContracts.clear();
    }

    private buildInteractionResolution(
        entity: Entity,
        contract: EntityInteractionContract,
        inputMode: InteractionInputMode,
        fallbackMaxDistancePx?: number,
        fallbackRequireLineOfSight?: boolean,
    ): InteractionResolution {
        const player = this.getPlayer();
        const distancePx = getEntityDistancePx(player, entity);
        const maxDistancePx = Math.max(
            0,
            contract.maxDistancePx ??
                fallbackMaxDistancePx ??
                DEFAULT_INTERACTION_DISTANCE_PX,
        );
        const requireLineOfSight =
            contract.requireLineOfSight ?? fallbackRequireLineOfSight ?? true;
        const hasLineOfSight = requireLineOfSight
            ? hasLineOfSightBetweenEntities(player, entity, this.getEntities())
            : true;

        const context: InteractionContext = {
            player,
            target: entity,
            inputMode,
            distancePx,
            hasLineOfSight,
        };

        let defaultBlockedReason: InteractionBlockedReason | null = null;

        if (distancePx > maxDistancePx) {
            defaultBlockedReason = "out-of-range";
        } else if (requireLineOfSight && !hasLineOfSight) {
            defaultBlockedReason = "line-of-sight-blocked";
        } else if (contract.canInteract && !contract.canInteract(context)) {
            defaultBlockedReason = "interaction-disabled";
        }

        const blockedReason = defaultBlockedReason
            ? (contract.blockedReason?.(context, defaultBlockedReason) ??
              defaultBlockedReason)
            : null;

        return {
            targetId: entity.id,
            canInteract: defaultBlockedReason === null,
            blockedReason,
            defaultBlockedReason,
            distancePx,
            hasLineOfSight,
            inputHintLabel: resolveInteractionHintLabel(
                contract.inputHint,
                inputMode,
                "Interact",
            ),
            inputMode,
        };
    }

    public resolveEntityInteraction(
        entityId: string,
        inputMode: InteractionInputMode = "keyboard",
        options?: {
            maxDistancePx?: number;
            requireLineOfSight?: boolean;
        },
    ): InteractionResolution {
        const entity = this.state.entitiesById[entityId];
        const contract = this.entityInteractionContracts.get(entityId);

        if (!entity || !contract) {
            return {
                targetId: null,
                canInteract: false,
                blockedReason: "missing-target",
                defaultBlockedReason: "missing-target",
                distancePx: null,
                hasLineOfSight: false,
                inputHintLabel: null,
                inputMode,
            };
        }

        return this.buildInteractionResolution(
            entity,
            contract,
            inputMode,
            options?.maxDistancePx,
            options?.requireLineOfSight,
        );
    }

    public resolvePlayerInteraction(
        inputMode: InteractionInputMode = "keyboard",
        options?: {
            maxDistancePx?: number;
            requireLineOfSight?: boolean;
        },
    ): InteractionResolution {
        const player = this.getPlayer();

        const candidates = Array.from(this.entityInteractionContracts.keys())
            .map((entityId) => {
                const entity = this.state.entitiesById[entityId];
                const contract = this.entityInteractionContracts.get(entityId);
                if (!entity || !contract || entity.id === player.id) {
                    return null;
                }

                return this.buildInteractionResolution(
                    entity,
                    contract,
                    inputMode,
                    options?.maxDistancePx,
                    options?.requireLineOfSight,
                );
            })
            .filter((entry): entry is InteractionResolution => !!entry)
            .sort(
                (a, b) =>
                    (a.distancePx ?? Number.POSITIVE_INFINITY) -
                    (b.distancePx ?? Number.POSITIVE_INFINITY),
            );

        if (candidates.length <= 0) {
            return {
                targetId: null,
                canInteract: false,
                blockedReason: "missing-target",
                defaultBlockedReason: "missing-target",
                distancePx: null,
                hasLineOfSight: false,
                inputHintLabel: null,
                inputMode,
            };
        }

        return (
            candidates.find((entry) => entry.canInteract) ??
            candidates[0] ?? {
                targetId: null,
                canInteract: false,
                blockedReason: "missing-target",
                defaultBlockedReason: "missing-target",
                distancePx: null,
                hasLineOfSight: false,
                inputHintLabel: null,
                inputMode,
            }
        );
    }

    public interactWithEntity(
        entityId: string,
        inputMode: InteractionInputMode = "keyboard",
    ): InteractionResolution {
        const resolution = this.resolveEntityInteraction(entityId, inputMode);
        if (!resolution.canInteract || !resolution.targetId) {
            return resolution;
        }

        const target = this.state.entitiesById[resolution.targetId];
        const contract = this.entityInteractionContracts.get(
            resolution.targetId,
        );
        if (!target || !contract) {
            return {
                ...resolution,
                canInteract: false,
                blockedReason: "missing-target",
                defaultBlockedReason: "missing-target",
            };
        }

        contract.interact({
            player: this.getPlayer(),
            target,
            inputMode,
            distancePx: resolution.distancePx ?? 0,
            hasLineOfSight: resolution.hasLineOfSight,
        });

        return resolution;
    }

    public interactWithNearestTarget(
        inputMode: InteractionInputMode = "keyboard",
    ): InteractionResolution {
        const resolution = this.resolvePlayerInteraction(inputMode);
        if (!resolution.canInteract || !resolution.targetId) {
            return resolution;
        }

        return this.interactWithEntity(resolution.targetId, inputMode);
    }

    public applyEntityStatusEffect(
        entityId: string,
        effect: EntityStatusEffectInput,
    ) {
        const entity = this.state.entitiesById[entityId];
        if (!entity) {
            return null;
        }

        return this.statusEffects.applyEffect(entityId, effect);
    }

    public applyEntitySlow(
        entityId: string,
        options: Omit<EntityStatusEffectInput, "type" | "tickPolicy">,
    ) {
        const entity = this.state.entitiesById[entityId];
        if (!entity) {
            return null;
        }

        return this.statusEffects.applySlow(entityId, options);
    }

    public applyEntityHaste(
        entityId: string,
        options: Omit<EntityStatusEffectInput, "type" | "tickPolicy">,
    ) {
        const entity = this.state.entitiesById[entityId];
        if (!entity) {
            return null;
        }

        return this.statusEffects.applyHaste(entityId, options);
    }

    public applyEntityBurn(
        entityId: string,
        options: Omit<EntityStatusEffectInput, "type">,
    ) {
        const entity = this.state.entitiesById[entityId];
        if (!entity) {
            return null;
        }

        return this.statusEffects.applyBurn(entityId, options);
    }

    public applyEntityRegen(
        entityId: string,
        options: Omit<EntityStatusEffectInput, "type">,
    ) {
        const entity = this.state.entitiesById[entityId];
        if (!entity) {
            return null;
        }

        return this.statusEffects.applyRegen(entityId, options);
    }

    public getEntityStatusEffects(entityId: string): StatusEffectInstance[] {
        return this.statusEffects.getEntityEffects(entityId);
    }

    public getEntityMovementSpeedScale(entityId: string): number {
        return this.statusEffects.getMovementSpeedScale(entityId);
    }

    public clearEntityStatusEffects(entityId?: string) {
        if (entityId) {
            this.statusEffects.clearEntityEffects(entityId);
            return;
        }

        this.statusEffects.clearAll();
    }

    public markEntityDamaged(entityId: string, durationMs: number = 240) {
        this.setEntityTimedState(entityId, "damaged", durationMs);
    }

    public markEntityAttacking(entityId: string, durationMs: number = 180) {
        this.setEntityTimedState(entityId, "attacking", durationMs);
    }

    public markEntityStunned(entityId: string, durationMs: number = 280) {
        this.setEntityTimedState(entityId, "stunned", durationMs);
    }

    public markEntityDodging(entityId: string, durationMs: number = 120) {
        this.setEntityTimedState(entityId, "dodge", durationMs);
    }

    public markEntityBlocking(entityId: string, durationMs: number = 240) {
        this.setEntityTimedState(entityId, "block", durationMs);
    }

    public markPlayerDamaged(durationMs: number = 240) {
        this.markEntityDamaged(this.state.playerId, durationMs);
    }

    public markPlayerAttacking(durationMs: number = 180) {
        this.markEntityAttacking(this.state.playerId, durationMs);
    }

    public markPlayerStunned(durationMs: number = 280) {
        this.markEntityStunned(this.state.playerId, durationMs);
    }

    public markPlayerDodging(durationMs: number = 120) {
        this.markEntityDodging(this.state.playerId, durationMs);
    }

    public markPlayerBlocking(durationMs: number = 240) {
        this.markEntityBlocking(this.state.playerId, durationMs);
    }

    public setEntityBossPhase(entityId: string, phase: BossPhaseState) {
        const entity = this.state.entitiesById[entityId];
        if (!entity) {
            return;
        }

        this.setEntityBehaviorState(entity, phase);
    }

    public getEntityBehaviorState(entityId: string): EntityBehaviorState {
        const state =
            this.entityBehaviorStates.get(entityId) ??
            this.state.entitiesById[entityId]?.behaviorState;

        return state ?? "idle";
    }

    public getEntityBehaviorTransitions(
        entityId: string,
        limit: number = 3,
    ): EntityBehaviorTransition[] {
        const safeLimit = Number.isFinite(limit)
            ? Math.max(0, Math.floor(limit))
            : 3;

        if (safeLimit === 0) {
            return [];
        }

        const transitions = this.entityBehaviorTransitions.filter(
            (entry) => entry.entityId === entityId,
        );

        if (transitions.length <= safeLimit) {
            return transitions;
        }

        return transitions.slice(transitions.length - safeLimit);
    }

    public clearEntityBehaviorTransitions() {
        this.entityBehaviorTransitions = [];
    }

    public clearEntityTimedStates() {
        this.entityTimedStates.clear();
    }

    public pauseWorld(reason: WorldPauseReason = "manual") {
        const wasPaused = this.isWorldPaused();
        const normalizedReason = reason.trim() || "manual";
        this.worldPauseReasons.add(normalizedReason);
        this.playerMoveInputX = 0;

        if (!wasPaused && this.isWorldPaused()) {
            const event: WorldPauseChange = {
                reason: normalizedReason,
                reasons: this.getWorldPauseReasons(),
                paused: true,
            };

            for (const handler of this.onPauseHandlers) {
                handler(event);
            }
        }
    }

    public resumeWorld(reason: WorldPauseReason = "manual") {
        const wasPaused = this.isWorldPaused();
        const normalizedReason = reason.trim() || "manual";
        this.worldPauseReasons.delete(normalizedReason);
        this.playerMoveInputX = 0;

        if (wasPaused && !this.isWorldPaused()) {
            const event: WorldPauseChange = {
                reason: normalizedReason,
                reasons: this.getWorldPauseReasons(),
                paused: false,
            };

            for (const handler of this.onResumeHandlers) {
                handler(event);
            }
        }
    }

    public clearWorldPause() {
        const wasPaused = this.isWorldPaused();
        this.worldPauseReasons.clear();
        this.playerMoveInputX = 0;

        if (wasPaused) {
            const event: WorldPauseChange = {
                reason: "clear",
                reasons: this.getWorldPauseReasons(),
                paused: false,
            };

            for (const handler of this.onResumeHandlers) {
                handler(event);
            }
        }
    }

    public isWorldPaused() {
        return this.worldPauseReasons.size > 0;
    }

    public getWorldPauseReasons(): WorldPauseReason[] {
        return [...this.worldPauseReasons];
    }

    public onPause(handler: (event: WorldPauseChange) => void) {
        this.onPauseHandlers.add(handler);

        return () => {
            this.onPauseHandlers.delete(handler);
        };
    }

    public onResume(handler: (event: WorldPauseChange) => void) {
        this.onResumeHandlers.add(handler);

        return () => {
            this.onResumeHandlers.delete(handler);
        };
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
        speedScale: number,
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
            this.playerMoveInputX *
            this.playerMovementConfig.maxSpeedX *
            speedScale;
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
        if (this.isWorldPaused()) return false;

        const entities = this.getEntities();
        let hasPositionChanges = false;
        const clampedDeltaMs = Math.min(deltaMs, this.physicsConfig.maxDeltaMs);
        this.simulationTimeMs += clampedDeltaMs;
        this.statusEffects.tick(clampedDeltaMs);
        const dt = clampedDeltaMs / 1000;

        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];
            if (entity.id === this.state.playerId) {
                const speedScale = this.statusEffects.getMovementSpeedScale(
                    entity.id,
                );
                this.applyPlayerMotionAssists(entity, entities, dt, speedScale);
            } else if (entity.type === "enemy") {
                this.applyNpcArchetypeProfile(entity);
            }

            const body = entity.physicsBody;
            const originalDragX = body?.dragX ?? 0;
            this.applyEnvironmentalForces(entity, deltaMs);

            const startX = entity.position.x;
            const startY = entity.position.y;
            const result = stepEntityPhysics(
                entity,
                deltaMs,
                this.physicsConfig,
            );

            if (body) {
                body.dragX = originalDragX;
            }

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

        this.updatePlayerBehaviorState(this.getPlayer());

        return hasPositionChanges;
    }
}

export const dataBus = new DataBus();
