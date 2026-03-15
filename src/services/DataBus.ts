// src/services/DataBus.ts
import { generateId, type Entity } from "@/logic/entity/Entity";
import { audioBus } from "@/services/audioBus";
import { CollisionSystem } from "@/logic/collision/CollisionSystem";
import { createRectangleCollider, CollisionLayer } from "@/logic/collision";
import type { CollisionEvent } from "@/logic/collision/collisionEvents";
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
import { TOP_DOWN_PLAYER_TUNING } from "@/config/playerTuning";
import { resolvePublicAssetPath } from "@/utils/assetPaths";

const NINJA_GREEN_ANIMATION_SHEETS = {
    attack: resolvePublicAssetPath(
        "Ninja%20Adventure%20-%20Asset%20Pack/Actor/Characters/NinjaGreen/SeparateAnim/Attack.png",
    ),
    dead: resolvePublicAssetPath(
        "Ninja%20Adventure%20-%20Asset%20Pack/Actor/Characters/NinjaGreen/SeparateAnim/Dead.png",
    ),
    idle: resolvePublicAssetPath(
        "Ninja%20Adventure%20-%20Asset%20Pack/Actor/Characters/NinjaGreen/SeparateAnim/Idle.png",
    ),
    item: resolvePublicAssetPath(
        "Ninja%20Adventure%20-%20Asset%20Pack/Actor/Characters/NinjaGreen/SeparateAnim/Item.png",
    ),
    jump: resolvePublicAssetPath(
        "Ninja%20Adventure%20-%20Asset%20Pack/Actor/Characters/NinjaGreen/SeparateAnim/Jump.png",
    ),
    special1:
        resolvePublicAssetPath(
            "Ninja%20Adventure%20-%20Asset%20Pack/Actor/Characters/NinjaGreen/SeparateAnim/Special1.png",
        ),
    special2:
        resolvePublicAssetPath(
            "Ninja%20Adventure%20-%20Asset%20Pack/Actor/Characters/NinjaGreen/SeparateAnim/Special2.png",
        ),
    walk: resolvePublicAssetPath(
        "Ninja%20Adventure%20-%20Asset%20Pack/Actor/Characters/NinjaGreen/SeparateAnim/Walk.png",
    ),
} as const;

const FIREBALL_ANIMATION_SHEET =
    resolvePublicAssetPath(
        "Ninja%20Adventure%20-%20Asset%20Pack/FX/Projectile/Fireball.png",
    );
const FIREBALL_FRAMES = [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
] as const;
const FIREBALL_SPEED_PX_PER_SEC = Math.round(
    TOP_DOWN_PLAYER_TUNING.moveSpeedPxPerSec * 2.5,
);
const FIREBALL_SPAWN_OFFSET_PX = 48;
const FIREBALL_LIFETIME_MS = 1600;
const FIREBALL_SCALER = 4;
const FIREBALL_HITBOX_SIZE_PX = 8;
const FIREBALL_HITBOX_OFFSET_PX = 4;
const PLAYER_ATTACK_COOLDOWN_MS = 250;

const SMOKE_ANIMATION_SHEET =
    resolvePublicAssetPath(
        "Ninja%20Adventure%20-%20Asset%20Pack/FX/Smoke/Smoke/SpriteSheet.png",
    );
const SMOKE_FRAMES = [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
    [5, 0],
] as const;
const SMOKE_SPRITE_SIZE = 32;
const SMOKE_SCALER = 2;
const SMOKE_FPS = 14;
const SMOKE_LIFETIME_MS = 430;

const EXPLOSION_ANIMATION_SHEET =
    resolvePublicAssetPath(
        "Ninja%20Adventure%20-%20Asset%20Pack/FX/Elemental/Explosion/SpriteSheet.png",
    );
const EXPLOSION_FRAMES = [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
    [5, 0],
    [6, 0],
    [7, 0],
    [8, 0],
] as const;
const EXPLOSION_SPRITE_SIZE = 40;
const EXPLOSION_FPS = 18;
const EXPLOSION_LIFETIME_MS = 500;
const PLAYER_SPECIAL_ATTACK_COOLDOWN_MS = 9000;

const CYCLOPS_ANIMATION_SHEET =
    resolvePublicAssetPath(
        "Ninja%20Adventure%20-%20Asset%20Pack/Actor/Monsters/Cyclope/SpriteSheet.png",
    );
const CYCLOPS_SPRITE_SIZE = 16;
const CYCLOPS_SCALER = 3;
const CYCLOPS_FPS = 8;
const PLAYER_MAX_LIVES = 3;
const DEFAULT_PLAYER_START_POSITION = { x: 10, y: 10 } as const;
const CYCLOPS_DIRECTIONAL_WALK_FRAMES = {
    south: [
        [0, 0],
        [0, 1],
        [0, 2],
        [0, 3],
    ],
    north: [
        [1, 0],
        [1, 1],
        [1, 2],
        [1, 3],
    ],
    west: [
        [2, 0],
        [2, 1],
        [2, 2],
        [2, 3],
    ],
    east: [
        [3, 0],
        [3, 1],
        [3, 2],
        [3, 3],
    ],
} as const;
const CYCLOPS_DIRECTIONAL_IDLE_FRAME = {
    south: [0, 0],
    north: [1, 0],
    west: [2, 0],
    east: [3, 0],
} as const;

const NINJA_DIRECTIONAL_WALK_FRAMES = {
    south: [
        [0, 0],
        [0, 1],
        [0, 2],
        [0, 3],
    ],
    north: [
        [1, 0],
        [1, 1],
        [1, 2],
        [1, 3],
    ],
    west: [
        [2, 0],
        [2, 1],
        [2, 2],
        [2, 3],
    ],
    east: [
        [3, 0],
        [3, 1],
        [3, 2],
        [3, 3],
    ],
} as const;

const NINJA_DIRECTIONAL_IDLE_FRAME: Record<
    PlayerFacingDirection,
    readonly [number, number]
> = {
    south: [0, 0],
    north: [1, 0],
    west: [2, 0],
    east: [3, 0],
} as const;

const NINJA_DIRECTIONAL_ATTACK_FRAME: Record<
    PlayerFacingDirection,
    readonly [number, number]
> = {
    south: [0, 0],
    north: [1, 0],
    west: [2, 0],
    east: [3, 0],
} as const;

const NINJA_SINGLE_ROW_FRAMES = [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
] as const;

type PlayerFacingDirection = keyof typeof NINJA_DIRECTIONAL_WALK_FRAMES;

type PlayerAnimationClipKey =
    | "idle"
    | "moving"
    | "attacking"
    | "dodge"
    | "block"
    | "damaged"
    | "stunned"
    | "dead";

type PlayerAnimationClip = {
    spriteImageSheet: string;
    spriteSheetTileWidth: number;
    spriteSheetTileHeight: number;
    frames: readonly (readonly [number, number])[];
    fps: number;
    directional?: boolean;
};

const NINJA_GREEN_PLAYER_ANIMATION_CLIPS: Record<
    PlayerAnimationClipKey,
    PlayerAnimationClip
> = {
    idle: {
        spriteImageSheet: NINJA_GREEN_ANIMATION_SHEETS.idle,
        spriteSheetTileWidth: 4,
        spriteSheetTileHeight: 1,
        frames: [[0, 0]],
        fps: 1,
    },
    moving: {
        spriteImageSheet: NINJA_GREEN_ANIMATION_SHEETS.walk,
        spriteSheetTileWidth: 4,
        spriteSheetTileHeight: 4,
        frames: NINJA_SINGLE_ROW_FRAMES,
        fps: TOP_DOWN_PLAYER_TUNING.walkAnimationFps,
        directional: true,
    },
    attacking: {
        spriteImageSheet: NINJA_GREEN_ANIMATION_SHEETS.attack,
        spriteSheetTileWidth: 4,
        spriteSheetTileHeight: 1,
        frames: NINJA_SINGLE_ROW_FRAMES,
        fps: 10,
    },
    dodge: {
        spriteImageSheet: NINJA_GREEN_ANIMATION_SHEETS.jump,
        spriteSheetTileWidth: 4,
        spriteSheetTileHeight: 1,
        frames: NINJA_SINGLE_ROW_FRAMES,
        fps: 10,
    },
    block: {
        spriteImageSheet: NINJA_GREEN_ANIMATION_SHEETS.item,
        spriteSheetTileWidth: 1,
        spriteSheetTileHeight: 1,
        frames: [[0, 0]],
        fps: 1,
    },
    damaged: {
        spriteImageSheet: NINJA_GREEN_ANIMATION_SHEETS.special1,
        spriteSheetTileWidth: 1,
        spriteSheetTileHeight: 1,
        frames: [[0, 0]],
        fps: 1,
    },
    stunned: {
        spriteImageSheet: NINJA_GREEN_ANIMATION_SHEETS.special2,
        spriteSheetTileWidth: 1,
        spriteSheetTileHeight: 1,
        frames: [[0, 0]],
        fps: 1,
    },
    dead: {
        spriteImageSheet: NINJA_GREEN_ANIMATION_SHEETS.dead,
        spriteSheetTileWidth: 1,
        spriteSheetTileHeight: 1,
        frames: [[0, 0]],
        fps: 1,
    },
};

const resolvePlayerAnimationClipKey = (
    state: EntityBehaviorState,
): PlayerAnimationClipKey => {
    switch (state) {
        case "moving":
        case "patrol":
        case "chase":
        case "flee":
            return "moving";
        case "attacking":
        case "phase-1":
        case "phase-2":
            return "attacking";
        case "dodge":
            return "dodge";
        case "block":
            return "block";
        case "damaged":
            return "damaged";
        case "stunned":
            return "stunned";
        case "dead":
            return "dead";
        case "idle":
        default:
            return "idle";
    }
};

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
    playerLives: number;
    playerScore: number;
    isGameOver: boolean;

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
const DEFAULT_ENEMY_SPAWN_INTERVAL_MS = 5000;
const DEFAULT_ENEMY_SPAWN_MIN_DISTANCE_FROM_PLAYER_PX = 200;
const DEFAULT_ENEMY_SPAWN_MAX_ENEMIES = 256;

class DataBus {
    private moveByAmount: number = 10;
    private collisionSystem = new CollisionSystem();
    private physicsConfig: GravityConfig = { ...DEFAULT_GRAVITY_CONFIG };
    private playerMoveInputX: number = 0;
    private playerMoveInputY: number = 0;
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
    private playerFacingDirection: PlayerFacingDirection = "south";
    private entityInteractionContracts = new Map<
        string,
        EntityInteractionContract
    >();
    private projectileVelocityById = new Map<
        string,
        { x: number; y: number }
    >();
    private projectileLifetimeById = new Map<string, number>();
    private smokeLifetimeById = new Map<string, number>();
    private explosionLifetimeById = new Map<string, number>();
    private cyclopsFacingById = new Map<
        string,
        keyof typeof CYCLOPS_DIRECTIONAL_WALK_FRAMES
    >();
    private playerLastHurtAtMs = Number.NEGATIVE_INFINITY;
    private playerHurtCooldownMs = 450;
    private playerHurtFlashUntilMs = Number.NEGATIVE_INFINITY;
    private playerHurtFlashDurationMs = 800;
    private playerHurtAnimDurationMs = 150;
    private enemySpawnerEnabled = false;
    private enemySpawnIntervalMs = DEFAULT_ENEMY_SPAWN_INTERVAL_MS;
    private enemySpawnAccumulatorMs = 0;
    private enemySpawnWave = 0;
    private playerNextAttackAtMs = 0;
    private playerNextSpecialAttackAtMs = 0;

    private canPlayerAttack(): boolean {
        return this.simulationTimeMs >= this.playerNextAttackAtMs;
    }
    private canPlayerSpecialAttack(): boolean {
        return this.simulationTimeMs >= this.playerNextSpecialAttackAtMs;
    }

    private updateCyclopsAnimation(entity: Entity) {
        const vx = entity.physicsBody?.velocity.x ?? 0;
        const vy = entity.physicsBody?.velocity.y ?? 0;
        const speed = Math.hypot(vx, vy);

        const facing = this.cyclopsFacingById.get(entity.id) ?? "south";

        if (speed > 6) {
            const absVx = Math.abs(vx);
            const absVy = Math.abs(vy);

            let nextFacing = facing;
            if (absVx > absVy) {
                nextFacing = vx >= 0 ? "east" : "west";
            } else if (absVy > absVx) {
                nextFacing = vy >= 0 ? "south" : "north";
            }

            this.cyclopsFacingById.set(entity.id, nextFacing);
            entity.characterSpriteTiles = CYCLOPS_DIRECTIONAL_WALK_FRAMES[
                nextFacing
            ].map(([x, y]) => [x, y]);
            entity.fps = CYCLOPS_FPS;
        } else {
            const [idleX, idleY] = CYCLOPS_DIRECTIONAL_IDLE_FRAME[facing];
            entity.characterSpriteTiles = [[idleX, idleY]];
            entity.fps = 1;
        }
    }

    private handleEnemyPlayerCollisionEvents(events: CollisionEvent[]) {
        for (const event of events) {
            if (event.phase !== "enter") continue;

            const a =
                event.a ?? getEntityById(this.state.entitiesById, event.aId);
            const b =
                event.b ?? getEntityById(this.state.entitiesById, event.bId);
            if (!a || !b) continue;

            const isPlayerA = a.id === this.state.playerId;
            const isPlayerB = b.id === this.state.playerId;
            if (!isPlayerA && !isPlayerB) continue;

            const enemy = isPlayerA
                ? b.type === "enemy"
                    ? b
                    : null
                : a.type === "enemy"
                  ? a
                  : null;
            if (!enemy) continue;

            this.playerHurt(enemy);
        }
    }

    private getCyclopsCount() {
        let count = 0;
        for (const entity of this.getEntities()) {
            if (entity.name.startsWith("cyclops:")) {
                count += 1;
            }
        }
        return count;
    }

    private getEnemySpawnPosition(): { x: number; y: number } {
        const player = this.getPlayer();
        const cyclopsDrawSize = CYCLOPS_SPRITE_SIZE * CYCLOPS_SCALER;
        const margin = 24;
        const minX = margin;
        const minY = margin;
        const maxX = Math.max(
            minX,
            this.state.worldSize.width - cyclopsDrawSize - margin,
        );
        const maxY = Math.max(
            minY,
            this.state.worldSize.height - cyclopsDrawSize - margin,
        );

        for (let attempt = 0; attempt < 24; attempt += 1) {
            const x = minX + Math.random() * (maxX - minX || 1);
            const y = minY + Math.random() * (maxY - minY || 1);
            const distanceFromPlayer = Math.hypot(
                x - player.position.x,
                y - player.position.y,
            );

            if (
                distanceFromPlayer <
                DEFAULT_ENEMY_SPAWN_MIN_DISTANCE_FROM_PLAYER_PX
            ) {
                continue;
            }

            return { x, y };
        }

        return {
            x: Math.max(
                minX,
                Math.min(
                    maxX,
                    player.position.x +
                        DEFAULT_ENEMY_SPAWN_MIN_DISTANCE_FROM_PLAYER_PX,
                ),
            ),
            y: Math.max(
                minY,
                Math.min(
                    maxY,
                    player.position.y +
                        DEFAULT_ENEMY_SPAWN_MIN_DISTANCE_FROM_PLAYER_PX,
                ),
            ),
        };
    }

    private spawnCyclopsFromSpawner() {
        const position = this.getEnemySpawnPosition();
        this.spawnCyclops(position.x, position.y);
    }

    private getDoublingEnemySpawnCount(wave: number) {
        const exponent = Math.max(0, wave - 1);
        return 2 ** exponent;
    }

    private stepEnemySpawning(deltaMs: number): boolean {
        if (
            !this.enemySpawnerEnabled ||
            deltaMs <= 0 ||
            this.state.isGameOver
        ) {
            return false;
        }

        this.enemySpawnAccumulatorMs += deltaMs;
        let didSpawnEnemy = false;

        while (this.enemySpawnAccumulatorMs >= this.enemySpawnIntervalMs) {
            this.enemySpawnAccumulatorMs -= this.enemySpawnIntervalMs;
            this.enemySpawnWave += 1;

            const currentCyclopsCount = this.getCyclopsCount();
            const remainingSlots =
                DEFAULT_ENEMY_SPAWN_MAX_ENEMIES - currentCyclopsCount;
            if (remainingSlots <= 0) {
                continue;
            }

            const requestedSpawns = this.getDoublingEnemySpawnCount(
                this.enemySpawnWave,
            );
            const spawnCount = Math.min(requestedSpawns, remainingSlots);
            for (let i = 0; i < spawnCount; i += 1) {
                this.spawnCyclopsFromSpawner();
                didSpawnEnemy = true;
            }
        }

        return didSpawnEnemy;
    }

    private getFacingUnitVector(direction: PlayerFacingDirection) {
        switch (direction) {
            case "north":
                return { x: 0, y: -1 };
            case "south":
                return { x: 0, y: 1 };
            case "west":
                return { x: -1, y: 0 };
            case "east":
            default:
                return { x: 1, y: 0 };
        }
    }

    private getFacingRotationDeg(direction: PlayerFacingDirection): number {
        switch (direction) {
            case "east":
                return 90;
            case "south":
                return 180;
            case "west":
                return -90;
            case "north":
            default:
                return 0;
        }
    }

    private isProjectileEntity(entityId: string) {
        return this.projectileVelocityById.has(entityId);
    }

    private despawnProjectile(entityId: string) {
        const entity = this.state.entitiesById[entityId];
        if (entity) {
            const drawSize = entity.spriteSize * entity.scaler;
            this.spawnSmokeAt(
                entity.position.x + drawSize / 2,
                entity.position.y + drawSize / 2,
            );
        }

        this.projectileVelocityById.delete(entityId);
        this.projectileLifetimeById.delete(entityId);
        delete this.state.entitiesById[entityId];
    }

    private despawnEnemy(entityId: string) {
        delete this.state.entitiesById[entityId];
        this.cyclopsFacingById.delete(entityId);
        this.clearNpcArchetypeProfile(entityId);
        this.entityBehaviorStates.delete(entityId);
        this.entityTimedStates.delete(entityId);
    }

    private spawnSmokeAt(centerX: number, centerY: number) {
        const smokeId = generateId();
        const smokeDrawSize = SMOKE_SPRITE_SIZE * SMOKE_SCALER;

        const smoke: Entity = {
            id: smokeId,
            type: "object",
            name: `smoke:${smokeId}`,
            animations: [],
            currentAnimation: "burst",
            updateState: () => {},
            spriteImageSheet: SMOKE_ANIMATION_SHEET,
            spriteSize: SMOKE_SPRITE_SIZE,
            spriteSheetTileWidth: 6,
            spriteSheetTileHeight: 1,
            characterSpriteTiles: SMOKE_FRAMES.map(([x, y]) => [x, y]),
            scaler: SMOKE_SCALER,
            position: {
                x: centerX - smokeDrawSize / 2,
                y: centerY - smokeDrawSize / 2,
            },
            fps: SMOKE_FPS,
        };

        this.state.entitiesById[smoke.id] = smoke;
        this.smokeLifetimeById.set(smoke.id, SMOKE_LIFETIME_MS);
    }
    private spawnExplosionAt(centerX: number, centerY: number, scaler: number) {
        const explosionId = generateId();
        const safeScaler = Math.max(0.5, scaler);
        const explosionDrawSize = EXPLOSION_SPRITE_SIZE * safeScaler;

        const explosion: Entity = {
            id: explosionId,
            type: "object",
            name: `explosion:${explosionId}`,
            animations: [],
            currentAnimation: "burst",
            updateState: () => {},
            spriteImageSheet: EXPLOSION_ANIMATION_SHEET,
            spriteSize: EXPLOSION_SPRITE_SIZE,
            spriteSheetTileWidth: 9,
            spriteSheetTileHeight: 1,
            characterSpriteTiles: EXPLOSION_FRAMES.map(([x, y]) => [x, y]),
            scaler: safeScaler,
            position: {
                x: centerX - explosionDrawSize / 2,
                y: centerY - explosionDrawSize / 2,
            },
            fps: EXPLOSION_FPS,
        };

        this.state.entitiesById[explosion.id] = explosion;
        this.explosionLifetimeById.set(explosion.id, EXPLOSION_LIFETIME_MS);
    }

    private stepSmokeEffects(deltaMs: number): boolean {
        if (deltaMs <= 0 || this.smokeLifetimeById.size === 0) {
            return false;
        }

        let didDespawn = false;
        const expiredIds: string[] = [];

        for (const [entityId, lifetime] of this.smokeLifetimeById) {
            const entity = this.state.entitiesById[entityId];
            if (!entity) {
                expiredIds.push(entityId);
                continue;
            }

            const remaining = Math.max(0, lifetime - deltaMs);
            this.smokeLifetimeById.set(entityId, remaining);
            if (remaining <= 0) {
                expiredIds.push(entityId);
            }
        }

        for (const entityId of expiredIds) {
            this.smokeLifetimeById.delete(entityId);
            if (this.state.entitiesById[entityId]) {
                delete this.state.entitiesById[entityId];
                didDespawn = true;
            }
        }

        return didDespawn;
    }
    private stepExplosionEffects(deltaMs: number): boolean {
        if (deltaMs <= 0 || this.explosionLifetimeById.size === 0) {
            return false;
        }

        let didDespawn = false;
        const expiredIds: string[] = [];

        for (const [entityId, lifetime] of this.explosionLifetimeById) {
            const entity = this.state.entitiesById[entityId];
            if (!entity) {
                expiredIds.push(entityId);
                continue;
            }

            const remaining = Math.max(0, lifetime - deltaMs);
            this.explosionLifetimeById.set(entityId, remaining);
            if (remaining <= 0) {
                expiredIds.push(entityId);
            }
        }

        for (const entityId of expiredIds) {
            this.explosionLifetimeById.delete(entityId);
            if (this.state.entitiesById[entityId]) {
                delete this.state.entitiesById[entityId];
                didDespawn = true;
            }
        }

        return didDespawn;
    }

    public playerHurt(source: Entity) {
        if (this.state.isGameOver) {
            return;
        }

        if (this.simulationTimeMs < this.playerHurtFlashUntilMs) {
            return;
        }

        if (
            this.simulationTimeMs - this.playerLastHurtAtMs <
            this.playerHurtCooldownMs
        ) {
            return;
        }

        this.playerLastHurtAtMs = this.simulationTimeMs;
        this.playerHurtFlashUntilMs =
            this.simulationTimeMs + this.playerHurtFlashDurationMs;

        const player = this.getPlayer();
        this.setEntityTimedState(
            player.id,
            "damaged",
            this.playerHurtAnimDurationMs,
        );

        const nextLives = Math.max(0, this.state.playerLives - 1);
        this.state.playerLives = nextLives;

        audioBus.play("player:hurt", {
            channel: "sfx",
            restartIfPlaying: true,
        });

        console.log(
            `[PLAYER HURT] by ${source.name} (${Math.round(source.position.x)}, ${Math.round(source.position.y)}) -> ${nextLives}/${PLAYER_MAX_LIVES}`,
        );

        if (nextLives <= 0) {
            this.state.isGameOver = true;
            this.pauseWorld("game-over");
            audioBus.play("ui:game-over", {
                channel: "sfx",
                restartIfPlaying: true,
            });
        }
    }

    public spawnCyclops(x: number, y: number): string {
        const id = generateId();
        const cyclops: Entity = {
            id,
            type: "enemy",
            name: `cyclops:${id}`,
            animations: [],
            currentAnimation: "idle",
            updateState: () => {},
            spriteImageSheet: CYCLOPS_ANIMATION_SHEET,
            spriteSize: CYCLOPS_SPRITE_SIZE,
            spriteSheetTileWidth: 4,
            spriteSheetTileHeight: 4,
            characterSpriteTiles: [[0, 0]],
            scaler: CYCLOPS_SCALER + Math.random() * (CYCLOPS_SCALER * 1.5),
            fps: 1,
            position: { x, y },
            collider: createRectangleCollider({
                size: {
                    width: CYCLOPS_SPRITE_SIZE,
                    height: CYCLOPS_SPRITE_SIZE,
                },
                offset: { x: 0, y: 0 },
                collisionResponse: "overlap",
                layer: CollisionLayer.enemy,
                collidesWith: CollisionLayer.world | CollisionLayer.player,
                debugDraw: false,
            }),
        };

        this.state.entitiesById[cyclops.id] = cyclops;
        this.cyclopsFacingById.set(cyclops.id, "south");
        const cyclopsDrawSize = cyclops.spriteSize * cyclops.scaler;
        this.setNpcArchetypeProfile(cyclops.id, {
            mode: "chase",
            chaseDistancePx: 300,
            chaseSpeedPxPerSec: 80,
            chaseStopDistancePx: cyclopsDrawSize * 0.5,
            fleeDistancePx: 0,
        });

        return cyclops.id;
    }

    private classifyFireballCollisionTarget(entity: Entity): string {
        const layer = entity.collider?.layer ?? CollisionLayer.none;

        if (
            entity.name.startsWith("worldBound") ||
            layer === CollisionLayer.world
        ) {
            return "wall";
        }

        if (entity.type === "enemy" || layer === CollisionLayer.enemy) {
            return "enemy";
        }

        if (entity.type === "object" || layer === CollisionLayer.object) {
            return "entity";
        }

        return entity.type;
    }

    private handleProjectileCollisionEvents(events: CollisionEvent[]) {
        for (const event of events) {
            if (event.phase !== "enter") {
                continue;
            }

            const a =
                event.a ?? getEntityById(this.state.entitiesById, event.aId);
            const b =
                event.b ?? getEntityById(this.state.entitiesById, event.bId);
            if (!a || !b) {
                continue;
            }

            const aIsProjectile = this.isProjectileEntity(a.id);
            const bIsProjectile = this.isProjectileEntity(b.id);

            if (!aIsProjectile && !bIsProjectile) {
                continue;
            }

            if (aIsProjectile && bIsProjectile) {
                continue;
            }

            const projectile = aIsProjectile ? a : b;
            const target = aIsProjectile ? b : a;

            const hitKind = this.classifyFireballCollisionTarget(target);
            console.log(
                `[FIREBALL HIT] ${hitKind}: ${target.name} (${Math.round(target.position.x)}, ${Math.round(target.position.y)})`,
            );

            if (target.type === "enemy") {
                this.state.playerScore += 1;
                this.despawnEnemy(target.id);
            }

            this.despawnProjectile(projectile.id);
        }
    }

    private spawnPlayerFireball() {
        const player = this.getPlayer();
        const direction = this.playerFacingDirection;
        const facing = this.getFacingUnitVector(direction);
        const playerDrawSize = player.spriteSize * player.scaler;
        const centerX = player.position.x + playerDrawSize / 2;
        const centerY = player.position.y + playerDrawSize / 2;

        const projectileId = generateId();
        const fireballDrawSize = 16 * FIREBALL_SCALER;
        const fireball: Entity = {
            id: projectileId,
            type: "object",
            name: `fireball:${projectileId}`,
            animations: [],
            currentAnimation: "travel",
            updateState: () => {},
            spriteImageSheet: FIREBALL_ANIMATION_SHEET,
            spriteSize: 16,
            spriteSheetTileWidth: 4,
            spriteSheetTileHeight: 1,
            characterSpriteTiles: FIREBALL_FRAMES.map(([x, y]) => [x, y]),
            scaler: FIREBALL_SCALER,
            position: {
                x:
                    centerX +
                    facing.x * FIREBALL_SPAWN_OFFSET_PX -
                    fireballDrawSize / 2,
                y:
                    centerY +
                    facing.y * FIREBALL_SPAWN_OFFSET_PX -
                    fireballDrawSize / 2,
            },
            rotationDeg: this.getFacingRotationDeg(direction),
            fps: 16,
            collider: createRectangleCollider({
                size: {
                    width: FIREBALL_HITBOX_SIZE_PX,
                    height: FIREBALL_HITBOX_SIZE_PX,
                },
                offset: {
                    x: FIREBALL_HITBOX_OFFSET_PX,
                    y: FIREBALL_HITBOX_OFFSET_PX,
                },
                collisionResponse: "overlap",
                layer: CollisionLayer.player,
                collidesWith:
                    CollisionLayer.world |
                    CollisionLayer.object |
                    CollisionLayer.enemy,
                debugDraw: false,
            }),
        };

        this.state.entitiesById[fireball.id] = fireball;
        this.projectileVelocityById.set(fireball.id, {
            x: facing.x * FIREBALL_SPEED_PX_PER_SEC,
            y: facing.y * FIREBALL_SPEED_PX_PER_SEC,
        });
        this.projectileLifetimeById.set(fireball.id, FIREBALL_LIFETIME_MS);
    }

    private stepProjectiles(deltaMs: number): boolean {
        if (deltaMs <= 0 || this.projectileVelocityById.size === 0) {
            return false;
        }

        const dt = deltaMs / 1000;
        let hasMovement = false;
        const expiredIds: string[] = [];

        for (const [entityId, velocity] of this.projectileVelocityById) {
            const entity = this.state.entitiesById[entityId];
            if (!entity) {
                expiredIds.push(entityId);
                continue;
            }

            entity.position.x += velocity.x * dt;
            entity.position.y += velocity.y * dt;
            hasMovement = true;

            const remaining = Math.max(
                0,
                (this.projectileLifetimeById.get(entityId) ?? 0) - deltaMs,
            );
            this.projectileLifetimeById.set(entityId, remaining);
            if (remaining <= 0) {
                expiredIds.push(entityId);
            }
        }

        for (const entityId of expiredIds) {
            this.despawnProjectile(entityId);
        }

        return hasMovement;
    }

    private updatePlayerDirectionalSprites(dx: number, dy: number) {
        const player = this.getPlayer();
        const previousFacingDirection = this.playerFacingDirection;

        if (Math.abs(dx) > Math.abs(dy)) {
            this.playerFacingDirection = dx >= 0 ? "east" : "west";
        } else if (Math.abs(dy) > 0) {
            this.playerFacingDirection = dy >= 0 ? "south" : "north";
        }

        if (this.playerFacingDirection !== previousFacingDirection) {
            this.applyPlayerAnimationFromState(player.behaviorState ?? "idle");
        }
    }

    private applyPlayerAnimationFromState(state: EntityBehaviorState) {
        const player = this.getPlayer();
        const clip =
            NINJA_GREEN_PLAYER_ANIMATION_CLIPS[
                resolvePlayerAnimationClipKey(state)
            ];

        player.spriteImageSheet = clip.spriteImageSheet;
        player.spriteSheetTileWidth = clip.spriteSheetTileWidth;
        player.spriteSheetTileHeight = clip.spriteSheetTileHeight;
        player.fps = clip.fps;

        if (clip.directional) {
            const directionalFrames =
                NINJA_DIRECTIONAL_WALK_FRAMES[this.playerFacingDirection];
            player.characterSpriteTiles = directionalFrames.map(([x, y]) => [
                x,
                y,
            ]);
            return;
        }

        if (state === "idle") {
            const [idleX, idleY] =
                NINJA_DIRECTIONAL_IDLE_FRAME[this.playerFacingDirection];
            player.characterSpriteTiles = [[idleX, idleY]];
            return;
        }

        if (state === "attacking") {
            const [atkX, atkY] =
                NINJA_DIRECTIONAL_ATTACK_FRAME[this.playerFacingDirection];
            player.characterSpriteTiles = [[atkX, atkY]];
            return;
        }

        player.characterSpriteTiles = clip.frames.map(([x, y]) => [x, y]);
    }

    private state: GameState = (() => {
        const player: Entity = {
            id: generateId(),
            type: "player",
            name: "player1",
            animations: [],
            currentAnimation: "idle",
            updateState: () => {},
            spriteImageSheet: NINJA_GREEN_ANIMATION_SHEETS.idle,
            spriteSize: 16,
            spriteSheetTileWidth: 4,
            spriteSheetTileHeight: 1,
            characterSpriteTiles: [[0, 0]],
            scaler: 5,
            position: {
                x: DEFAULT_PLAYER_START_POSITION.x,
                y: DEFAULT_PLAYER_START_POSITION.y,
            },
            fps: 1,
            collider: createRectangleCollider({
                size: { width: 10, height: 10 },
                offset: { x: 3, y: 3 },
                collisionResponse: "overlap",
                layer: CollisionLayer.player,
                collidesWith:
                    CollisionLayer.object |
                    CollisionLayer.world |
                    CollisionLayer.enemy,
                debugDraw: true,
            }),
        };

        return {
            entitiesById: {
                [player.id]: player,
            },
            playerId: player.id,
            playerLives: PLAYER_MAX_LIVES,
            playerScore: 0,
            isGameOver: false,

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

        for (const id of this.cyclopsFacingById.keys()) {
            if (!validIds.has(id)) {
                this.cyclopsFacingById.delete(id);
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
        const didStateChange = previousState !== state;

        if (previousState && didStateChange) {
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

        if (entity.id === this.state.playerId && didStateChange) {
            this.applyPlayerAnimationFromState(state);
        }
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
        const hasMoveIntent =
            this.playerMoveInputX !== 0 || this.playerMoveInputY !== 0;
        const nextBehaviorState = resolveEntityBehaviorState({
            nowMs: this.simulationTimeMs,
            timedState,
            hasMoveIntent,
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

    private runCollisions(): CollisionEvent[] {
        const events = this.collisionSystem.update(this.getEntities());
        for (const e of events) {
            const a = e.a ?? getEntityById(this.state.entitiesById, e.aId);
            const b = e.b ?? getEntityById(this.state.entitiesById, e.bId);
            console.log(
                `collision ${e.phase}: ${a?.name ?? e.aId} <-> ${b?.name ?? e.bId}`,
            );
        }

        this.handleProjectileCollisionEvents(events);
        this.handleEnemyPlayerCollisionEvents(events);
        return events;
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

        this.updatePlayerDirectionalSprites(dx, dy);

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
        this.state.playerLives = Math.max(
            0,
            Math.min(
                PLAYER_MAX_LIVES,
                Number.isFinite(this.state.playerLives)
                    ? this.state.playerLives
                    : PLAYER_MAX_LIVES,
            ),
        );
        this.state.playerScore = Math.max(
            0,
            Number.isFinite(this.state.playerScore)
                ? Math.floor(this.state.playerScore)
                : 0,
        );
        this.state.isGameOver = Boolean(this.state.isGameOver);
        this.playerMoveInputX = 0;
        this.playerMoveInputY = 0;
        this.playerLastHurtAtMs = Number.NEGATIVE_INFINITY;
        this.playerHurtFlashUntilMs = Number.NEGATIVE_INFINITY;
        this.enemySpawnerEnabled = false;
        this.enemySpawnAccumulatorMs = 0;
        this.enemySpawnWave = 0;
        this.playerNextAttackAtMs = 0;
        this.playerNextSpecialAttackAtMs = 0;
        this.clearEntityTimedStates();
        this.clearEntityStatusEffects();
        this.syncEntityStateStores();
        this.syncCameraToState();

        const validIds = new Set(Object.keys(this.state.entitiesById));
        for (const entityId of this.projectileVelocityById.keys()) {
            if (!validIds.has(entityId)) {
                this.projectileVelocityById.delete(entityId);
                this.projectileLifetimeById.delete(entityId);
            }
        }

        for (const entityId of this.smokeLifetimeById.keys()) {
            if (!validIds.has(entityId)) {
                this.smokeLifetimeById.delete(entityId);
            }
        }
        for (const entityId of this.explosionLifetimeById.keys()) {
            if (!validIds.has(entityId)) {
                this.explosionLifetimeById.delete(entityId);
            }
        }
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

    public startEnemySpawning(
        intervalMs: number = DEFAULT_ENEMY_SPAWN_INTERVAL_MS,
    ) {
        if (Number.isFinite(intervalMs) && intervalMs > 250) {
            this.enemySpawnIntervalMs = intervalMs;
        } else {
            this.enemySpawnIntervalMs = DEFAULT_ENEMY_SPAWN_INTERVAL_MS;
        }

        this.enemySpawnerEnabled = true;
        this.enemySpawnAccumulatorMs = 0;
        this.enemySpawnWave = 1;

        if (this.getCyclopsCount() === 0) {
            this.spawnCyclopsFromSpawner();
        }
    }

    public stopEnemySpawning() {
        this.enemySpawnerEnabled = false;
        this.enemySpawnAccumulatorMs = 0;
        this.enemySpawnWave = 0;
    }

    public isPlayerHurtFlashing() {
        return this.simulationTimeMs < this.playerHurtFlashUntilMs;
    }

    public restartGame() {
        const player = this.getPlayer();
        const worldBoundsIds = new Set(this.state.worldBoundsIds);

        for (const entity of this.getEntities()) {
            if (entity.id === this.state.playerId) {
                continue;
            }

            if (worldBoundsIds.has(entity.id)) {
                continue;
            }

            delete this.state.entitiesById[entity.id];
        }

        this.projectileVelocityById.clear();
        this.projectileLifetimeById.clear();
        this.smokeLifetimeById.clear();
        this.explosionLifetimeById.clear();
        this.cyclopsFacingById.clear();
        this.clearNpcArchetypeProfiles();
        this.clearEntityTimedStates();
        this.clearEntityStatusEffects();
        this.clearEntityBehaviorTransitions();

        player.position.x = DEFAULT_PLAYER_START_POSITION.x;
        player.position.y = DEFAULT_PLAYER_START_POSITION.y;

        if (player.physicsBody) {
            player.physicsBody.velocity.x = 0;
            player.physicsBody.velocity.y = 0;
        }

        this.playerFacingDirection = "south";
        this.setEntityBehaviorState(player, "idle");

        this.state.playerLives = PLAYER_MAX_LIVES;
        this.state.playerScore = 0;
        this.state.isGameOver = false;

        this.playerMoveInputX = 0;
        this.playerMoveInputY = 0;
        this.playerLastHurtAtMs = Number.NEGATIVE_INFINITY;
        this.playerHurtFlashUntilMs = Number.NEGATIVE_INFINITY;
        this.playerNextAttackAtMs = 0;
        this.playerNextSpecialAttackAtMs = 0;

        this.clearWorldPause();
        this.syncEntityStateStores();
        this.syncCameraToState();
        this.startEnemySpawning(this.enemySpawnIntervalMs);
    }

    public getPlayerLives() {
        return this.state.playerLives;
    }

    public getPlayerScore() {
        return this.state.playerScore;
    }

    public getPlayerSpecialCooldownRemainingMs() {
        return Math.max(
            0,
            Math.ceil(this.playerNextSpecialAttackAtMs - this.simulationTimeMs),
        );
    }

    public getPlayerMaxLives() {
        return PLAYER_MAX_LIVES;
    }

    public getEnemySpawnWave() {
        return this.enemySpawnWave;
    }

    public isGameOver() {
        return this.state.isGameOver;
    }

    public setPlayerMoveInput(inputX: number) {
        if (this.isWorldPaused()) {
            this.playerMoveInputX = 0;
            this.playerMoveInputY = 0;
            return;
        }

        if (!Number.isFinite(inputX)) {
            this.playerMoveInputX = 0;
            this.playerMoveInputY = 0;
            return;
        }

        this.playerMoveInputX = Math.max(-1, Math.min(1, inputX));
        this.playerMoveInputY = 0;
    }

    public setPlayerTopDownMoveInput(inputX: number, inputY: number) {
        if (this.isWorldPaused()) {
            this.playerMoveInputX = 0;
            this.playerMoveInputY = 0;
            this.updatePlayerBehaviorState(this.getPlayer());
            return;
        }

        const safeInputX = Number.isFinite(inputX) ? inputX : 0;
        const safeInputY = Number.isFinite(inputY) ? inputY : 0;

        this.playerMoveInputX = Math.max(-1, Math.min(1, safeInputX));
        this.playerMoveInputY = Math.max(-1, Math.min(1, safeInputY));

        const player = this.getPlayer();
        if (!this.getActiveTimedState(player.id)) {
            const hasMoveIntent =
                this.playerMoveInputX !== 0 || this.playerMoveInputY !== 0;

            if (hasMoveIntent) {
                this.updatePlayerDirectionalSprites(
                    this.playerMoveInputX,
                    this.playerMoveInputY,
                );
            }

            this.setEntityBehaviorState(
                player,
                hasMoveIntent ? "moving" : "idle",
            );
        }
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

    public playerAttack(durationMs: number = 85): void {
        if (this.isWorldPaused()) return;

        if (!this.canPlayerAttack()) {
            const cooldownRemainingMs = Math.max(
                0,
                Math.ceil(this.playerNextAttackAtMs - this.simulationTimeMs),
            );
            console.log(`[ATTACK] onCooldown (${cooldownRemainingMs}ms)`);
            return;
        }

        const player = this.getPlayer();
        const dir = this.playerFacingDirection;
        const { x, y } = player.position;
        console.log(`[ATTACK] ${dir} @ (${Math.round(x)}, ${Math.round(y)})`);
        audioBus.play("player:attack", {
            channel: "sfx",
            restartIfPlaying: true,
        });
        this.playerNextAttackAtMs =
            this.simulationTimeMs + PLAYER_ATTACK_COOLDOWN_MS;
        this.setEntityTimedState(player.id, "attacking", durationMs);
        this.spawnPlayerFireball();
    }

    public playerSpecialAttack(durationMs: number = 180): void {
        if (this.isWorldPaused()) return;

        if (!this.canPlayerSpecialAttack()) {
            const cooldownRemainingMs =
                this.getPlayerSpecialCooldownRemainingMs();
            console.log(`[SPECIAL] onCooldown (${cooldownRemainingMs}ms)`);
            return;
        }

        const viewportLeft = this.state.camera.x;
        const viewportTop = this.state.camera.y;
        const viewportRight = viewportLeft + this.state.camera.viewport.width;
        const viewportBottom = viewportTop + this.state.camera.viewport.height;

        this.playerNextSpecialAttackAtMs =
            this.simulationTimeMs + PLAYER_SPECIAL_ATTACK_COOLDOWN_MS;
        this.setEntityTimedState(this.state.playerId, "attacking", durationMs);

        const defeatedEnemyIds: string[] = [];

        for (const entity of this.getEntities()) {
            if (entity.type !== "enemy") {
                continue;
            }

            const enemyDrawSize = entity.spriteSize * entity.scaler;
            const enemyLeft = entity.position.x;
            const enemyTop = entity.position.y;
            const enemyRight = enemyLeft + enemyDrawSize;
            const enemyBottom = enemyTop + enemyDrawSize;
            const isEnemyVisibleOnScreen =
                enemyRight > viewportLeft &&
                enemyLeft < viewportRight &&
                enemyBottom > viewportTop &&
                enemyTop < viewportBottom;

            if (!isEnemyVisibleOnScreen) {
                continue;
            }

            const enemyCenterX = enemyLeft + enemyDrawSize / 2;
            const enemyCenterY = enemyTop + enemyDrawSize / 2;

            this.spawnExplosionAt(enemyCenterX, enemyCenterY, entity.scaler);
            defeatedEnemyIds.push(entity.id);
        }

        for (const enemyId of defeatedEnemyIds) {
            this.state.playerScore += 1;
            this.despawnEnemy(enemyId);
        }
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

    public getPlayerFacingDirection(): PlayerFacingDirection {
        return this.playerFacingDirection;
    }

    public getPlayerMoveIntent() {
        return {
            x: this.playerMoveInputX,
            y: this.playerMoveInputY,
        };
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
        this.playerMoveInputY = 0;

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
        this.playerMoveInputY = 0;

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
        this.playerMoveInputY = 0;

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

        let hasPositionChanges = false;
        const clampedDeltaMs = Math.min(deltaMs, this.physicsConfig.maxDeltaMs);
        this.simulationTimeMs += clampedDeltaMs;
        this.statusEffects.tick(clampedDeltaMs);
        const dt = clampedDeltaMs / 1000;
        const didSpawnEnemies = this.stepEnemySpawning(clampedDeltaMs);
        if (didSpawnEnemies) {
            hasPositionChanges = true;
        }

        const entities = this.getEntities();
        const didMoveProjectiles = this.stepProjectiles(clampedDeltaMs);
        if (didMoveProjectiles) {
            hasPositionChanges = true;
        }
        const didDespawnSmoke = this.stepSmokeEffects(clampedDeltaMs);
        if (didDespawnSmoke) {
            hasPositionChanges = true;
        }
        const didDespawnExplosions = this.stepExplosionEffects(clampedDeltaMs);
        if (didDespawnExplosions) {
            hasPositionChanges = true;
        }

        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];
            if (entity.id === this.state.playerId) {
                const speedScale = this.statusEffects.getMovementSpeedScale(
                    entity.id,
                );
                this.applyPlayerMotionAssists(entity, entities, dt, speedScale);
            } else if (entity.type === "enemy") {
                this.applyNpcArchetypeProfile(entity);
                if (entity.name.startsWith("cyclops:")) {
                    this.updateCyclopsAnimation(entity);
                }
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
