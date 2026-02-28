import { beforeEach, describe, expect, it, vi } from "vitest";
import { dataBus } from "@/services/DataBus";
import type { GameState } from "@/services/DataBus";
import { CollisionLayer } from "@/logic/collision";
import {
    STATUS_EFFECT_TICK_SIGNAL,
    type StatusEffectTickEvent,
} from "@/logic/simulation";
import { signalBus } from "@/services/signalBus";

function cloneGameState(state: GameState): GameState {
    const entitiesById: GameState["entitiesById"] = {};

    for (const [id, entity] of Object.entries(state.entitiesById)) {
        entitiesById[id] = {
            ...entity,
            position: { ...entity.position },
            collider: entity.collider
                ? {
                      ...entity.collider,
                      size: { ...entity.collider.size },
                      offset: { ...entity.collider.offset },
                  }
                : undefined,
            physicsBody: entity.physicsBody
                ? {
                      ...entity.physicsBody,
                      velocity: { ...entity.physicsBody.velocity },
                  }
                : undefined,
        };
    }

    return {
        ...state,
        entitiesById,
        worldSize: { ...state.worldSize },
        camera: {
            ...state.camera,
            viewport: { ...state.camera.viewport },
        },
        worldBoundsIds: [...state.worldBoundsIds],
    };
}

describe("DataBus physics integration", () => {
    let baseline: GameState;
    const initialBaseline = cloneGameState(dataBus.getState());

    beforeEach(() => {
        baseline = cloneGameState(initialBaseline);
        dataBus.setState(() => cloneGameState(baseline));
        dataBus.clearWorldPause();
        dataBus.clearEntityTimedStates();
        dataBus.clearEntityStatusEffects();
        dataBus.clearEntityBehaviorTransitions();
        dataBus.clearNpcArchetypeProfiles();
        dataBus.clearEnvironmentalForceZones();
        dataBus.setWorldBoundsEnabled(false);
        dataBus.disablePlayerPhysics();
        dataBus.setPlayerMoveInput(0);
        dataBus.setPlayerMovementConfig({
            maxSpeedX: 220,
            groundAcceleration: 1800,
            airAcceleration: 1100,
            groundDeceleration: 2200,
            airDeceleration: 700,
            jumpVelocity: 520,
        });
        dataBus.setPlayerJumpAssistConfig({
            coyoteTimeMs: 120,
            jumpBufferMs: 120,
            groundProbeDistance: 2,
        });
    });

    it("adds and removes world bounds entities", () => {
        dataBus.setWorldBoundsEnabled(true);
        const withBounds = dataBus.getState();

        expect(withBounds.worldBoundsIds).toHaveLength(4);
        for (const id of withBounds.worldBoundsIds) {
            expect(withBounds.entitiesById[id]).toBeDefined();
        }

        dataBus.setWorldBoundsEnabled(false);
        const withoutBounds = dataBus.getState();

        expect(withoutBounds.worldBoundsIds).toEqual([]);
    });

    it("rebuilds world bounds when world size changes", () => {
        dataBus.setWorldBoundsEnabled(true);
        const firstBoundIds = [...dataBus.getState().worldBoundsIds];

        dataBus.setWorldSize(520, 360);
        const resizedState = dataBus.getState();

        expect(resizedState.worldBoundsIds).toHaveLength(4);
        expect(resizedState.worldBoundsIds).not.toEqual(firstBoundIds);

        const rightBound = Object.values(resizedState.entitiesById).find(
            (entity) => entity.name === "worldBoundRight",
        );
        expect(rightBound?.position.x).toBe(520);
    });

    it("can toggle player world-bound collision participation", () => {
        const player = dataBus.getPlayer();
        const before = player.collider?.collidesWith ?? 0;

        dataBus.setPlayerCanPassWorldBounds(true);
        const disabled = player.collider?.collidesWith ?? 0;
        expect(disabled & CollisionLayer.world).toBe(0);

        dataBus.setPlayerCanPassWorldBounds(false);
        const enabled = player.collider?.collidesWith ?? 0;

        expect(enabled & CollisionLayer.world).toBe(CollisionLayer.world);
        expect(enabled).toBe(before | CollisionLayer.world);
    });

    it("handles world-bound toggles for missing/non-collider entities", () => {
        expect(() => {
            dataBus.setEntityCanPassWorldBounds("missing-id", true);
        }).not.toThrow();

        dataBus.setState((prev) => ({
            ...prev,
            entitiesById: {
                ...prev.entitiesById,
                noCollider: {
                    ...dataBus.getPlayer(),
                    id: "noCollider" as never,
                    collider: undefined,
                },
            },
        }));

        expect(() => {
            dataBus.setEntityCanPassWorldBounds("noCollider", true);
        }).not.toThrow();
    });

    it("does nothing when no entities have physics bodies", () => {
        const changed = dataBus.stepPhysics(16);
        expect(changed).toBe(false);
    });

    it("returns false for non-positive delta in physics step", () => {
        expect(dataBus.stepPhysics(0)).toBe(false);
        expect(dataBus.stepPhysics(-10)).toBe(false);
    });

    it("freezes simulation while world is paused", () => {
        const player = dataBus.getPlayer();
        const startY = player.position.y;

        dataBus.enablePlayerGravity({ velocity: { x: 0, y: 0 } });
        dataBus.pauseWorld("pause-menu");

        const changed = dataBus.stepPhysics(16);

        expect(changed).toBe(false);
        expect(player.position.y).toBe(startY);
        expect(dataBus.isWorldPaused()).toBe(true);
        expect(dataBus.getWorldPauseReasons()).toContain("pause-menu");

        dataBus.resumeWorld("pause-menu");
        expect(dataBus.isWorldPaused()).toBe(false);
    });

    it("gates player movement and jump input while paused", () => {
        const player = dataBus.getPlayer();
        dataBus.enablePlayerGravity({ velocity: { x: 0, y: 0 } });

        dataBus.pauseWorld("cutscene");

        const moved = dataBus.movePlayerBy(8, 0);
        dataBus.setPlayerMoveInput(1);
        dataBus.stepPhysics(16);
        dataBus.requestPlayerJump();
        dataBus.stepPhysics(16);

        expect(moved).toBe(false);
        expect(player.physicsBody?.velocity.x).toBe(0);
        expect(player.physicsBody?.velocity.y).toBeGreaterThanOrEqual(0);
    });

    it("emits onPause/onResume hooks only on pause-state edges", () => {
        const onPause = vi.fn();
        const onResume = vi.fn();
        const unsubscribePause = dataBus.onPause(onPause);
        const unsubscribeResume = dataBus.onResume(onResume);

        dataBus.pauseWorld("pause-menu");
        dataBus.pauseWorld("cutscene");

        expect(onPause).toHaveBeenCalledTimes(1);
        expect(onPause).toHaveBeenCalledWith(
            expect.objectContaining({
                reason: "pause-menu",
                paused: true,
            }),
        );
        expect(onResume).toHaveBeenCalledTimes(0);

        dataBus.resumeWorld("pause-menu");
        expect(dataBus.isWorldPaused()).toBe(true);
        expect(onResume).toHaveBeenCalledTimes(0);

        dataBus.resumeWorld("cutscene");
        expect(dataBus.isWorldPaused()).toBe(false);
        expect(onResume).toHaveBeenCalledTimes(1);
        expect(onResume).toHaveBeenCalledWith(
            expect.objectContaining({
                reason: "cutscene",
                reasons: [],
                paused: false,
            }),
        );

        unsubscribePause();
        unsubscribeResume();
    });

    it("emits resume hook when pause is cleared", () => {
        const onResume = vi.fn();
        const unsubscribeResume = dataBus.onResume(onResume);

        dataBus.pauseWorld("pause-menu");
        dataBus.clearWorldPause();

        expect(onResume).toHaveBeenCalledTimes(1);
        expect(onResume).toHaveBeenCalledWith(
            expect.objectContaining({
                reason: "clear",
                reasons: [],
                paused: false,
            }),
        );

        unsubscribeResume();
    });

    it("applies gravity to an enabled entity", () => {
        const player = dataBus.getPlayer();
        const startY = player.position.y;

        dataBus.enableEntityPhysics(player.id, {
            gravityScale: 1,
            velocity: { x: 0, y: 0 },
        });

        const changed = dataBus.stepPhysics(16);

        expect(changed).toBe(true);
        expect(player.position.y).toBeGreaterThan(startY);
        expect(player.physicsBody?.velocity.y).toBeGreaterThan(0);
    });

    it("enables player gravity through convenience helper", () => {
        const player = dataBus.getPlayer();

        dataBus.enablePlayerGravity({
            gravityScale: 1.25,
            velocity: { x: 0, y: 0 },
        });

        expect(player.physicsBody).toBeDefined();
        expect(player.physicsBody?.affectedByGravity).toBe(true);
        expect(player.physicsBody?.gravityScale).toBe(1.25);
    });

    it("reports gravity-active state from player physics body", () => {
        expect(dataBus.isPlayerGravityActive()).toBe(false);

        dataBus.enablePlayerGravity({ velocity: { x: 0, y: 0 } });
        expect(dataBus.isPlayerGravityActive()).toBe(true);

        dataBus.disablePlayerPhysics();
        expect(dataBus.isPlayerGravityActive()).toBe(false);
    });

    it("creates and updates entity velocity even when physics body is absent", () => {
        const player = dataBus.getPlayer();
        dataBus.disableEntityPhysics(player.id);

        dataBus.setEntityVelocity(player.id, 15, -25);

        expect(player.physicsBody).toBeDefined();
        expect(player.physicsBody?.velocity).toEqual({ x: 15, y: -25 });
    });

    it("clamps invalid and out-of-range move input", () => {
        const player = dataBus.getPlayer();
        dataBus.enablePlayerGravity({ velocity: { x: 0, y: 0 } });

        dataBus.setPlayerMoveInput(Number.NaN);
        dataBus.stepPhysics(16);
        const afterNaN = player.physicsBody?.velocity.x ?? 0;

        dataBus.setPlayerMoveInput(999);
        dataBus.stepPhysics(16);
        const afterPositiveClamp = player.physicsBody?.velocity.x ?? 0;

        dataBus.setPlayerMoveInput(-999);
        dataBus.stepPhysics(16);
        const afterNegativeClamp = player.physicsBody?.velocity.x ?? 0;

        expect(afterNaN).toBe(0);
        expect(afterPositiveClamp).toBeGreaterThan(0);
        expect(afterNegativeClamp).toBeLessThan(afterPositiveClamp);
    });

    it("returns false when attempted motion is fully blocked", () => {
        const player = dataBus.getPlayer();

        dataBus.setWorldBoundsEnabled(true);
        player.position.y = dataBus.getState().worldSize.height - 80;
        dataBus.enablePlayerGravity({ velocity: { x: 0, y: 0 } });

        dataBus.stepPhysics(16);
        const blockedFrameChanged = dataBus.stepPhysics(16);

        expect(blockedFrameChanged).toBe(false);
        expect(player.physicsBody?.velocity.y).toBe(0);
    });

    it("detects player grounded state near world floor", () => {
        const player = dataBus.getPlayer();
        dataBus.setWorldBoundsEnabled(true);

        player.position.y = dataBus.getState().worldSize.height - 80;

        expect(dataBus.isPlayerGrounded()).toBe(true);
    });

    it("applies upward velocity when jump is triggered while grounded", () => {
        const player = dataBus.getPlayer();
        dataBus.setWorldBoundsEnabled(true);
        player.position.y = dataBus.getState().worldSize.height - 80;

        const jumped = dataBus.jumpPlayer(420);

        expect(jumped).toBe(true);
        expect(player.physicsBody?.velocity.y).toBe(-420);
    });

    it("does not jump when player is not grounded", () => {
        const player = dataBus.getPlayer();
        dataBus.setWorldBoundsEnabled(true);
        player.position.y = 10;
        dataBus.enablePlayerGravity({ velocity: { x: 0, y: 0 } });

        const jumped = dataBus.jumpPlayer(420);

        expect(jumped).toBe(false);
        expect(player.physicsBody?.velocity.y).toBe(0);
    });

    it("returns false for invalid entity in jump/ground checks", () => {
        expect(dataBus.isEntityGrounded("missing", 1)).toBe(false);
        expect(dataBus.isEntityGrounded(dataBus.getPlayer().id, 0)).toBe(false);
        expect(dataBus.jumpEntity("missing", 300)).toBe(false);
    });

    it("applies smooth horizontal movement from input intent", () => {
        const player = dataBus.getPlayer();
        dataBus.enablePlayerGravity({ velocity: { x: 0, y: 0 } });

        dataBus.setPlayerMoveInput(1);
        dataBus.stepPhysics(16);

        expect(player.physicsBody?.velocity.x).toBeGreaterThan(0);

        dataBus.setPlayerMoveInput(0);
        dataBus.stepPhysics(16);

        expect(Math.abs(player.physicsBody?.velocity.x ?? 0)).toBeLessThan(220);
    });

    it("syncs player behavior state and currentAnimation from move intent", () => {
        const player = dataBus.getPlayer();

        dataBus.setPlayerMoveInput(1);
        dataBus.stepPhysics(16);

        expect(dataBus.getEntityBehaviorState(player.id)).toBe("moving");
        expect(player.currentAnimation).toBe("moving");

        dataBus.setPlayerMoveInput(0);
        dataBus.stepPhysics(16);

        expect(dataBus.getEntityBehaviorState(player.id)).toBe("idle");
        expect(player.currentAnimation).toBe("idle");
    });

    it("supports timed damaged state interrupt before returning to movement", () => {
        const player = dataBus.getPlayer();

        dataBus.setPlayerMoveInput(1);
        dataBus.stepPhysics(16);
        expect(dataBus.getEntityBehaviorState(player.id)).toBe("moving");

        dataBus.markPlayerDamaged(100);
        expect(dataBus.getEntityBehaviorState(player.id)).toBe("damaged");
        expect(player.currentAnimation).toBe("damaged");

        dataBus.stepPhysics(60);
        expect(dataBus.getEntityBehaviorState(player.id)).toBe("damaged");

        dataBus.stepPhysics(60);
        expect(dataBus.getEntityBehaviorState(player.id)).toBe("moving");
        expect(player.currentAnimation).toBe("moving");
    });

    it("supports timed attacking and stunned states", () => {
        const player = dataBus.getPlayer();

        dataBus.markPlayerAttacking(60);
        expect(dataBus.getEntityBehaviorState(player.id)).toBe("attacking");
        expect(player.currentAnimation).toBe("attacking");

        dataBus.stepPhysics(40);
        dataBus.stepPhysics(40);
        expect(dataBus.getEntityBehaviorState(player.id)).toBe("idle");

        dataBus.markPlayerStunned(80);
        expect(dataBus.getEntityBehaviorState(player.id)).toBe("stunned");
        expect(player.currentAnimation).toBe("stunned");

        dataBus.stepPhysics(50);
        dataBus.stepPhysics(50);
        expect(dataBus.getEntityBehaviorState(player.id)).toBe("idle");
    });

    it("supports timed dodging and blocking states", () => {
        const player = dataBus.getPlayer();

        dataBus.markPlayerDodging(60);
        expect(dataBus.getEntityBehaviorState(player.id)).toBe("dodge");
        expect(player.currentAnimation).toBe("dodge");

        dataBus.stepPhysics(40);
        dataBus.stepPhysics(40);
        expect(dataBus.getEntityBehaviorState(player.id)).toBe("idle");

        dataBus.markPlayerBlocking(80);
        expect(dataBus.getEntityBehaviorState(player.id)).toBe("block");
        expect(player.currentAnimation).toBe("block");

        dataBus.stepPhysics(50);
        dataBus.stepPhysics(50);
        expect(dataBus.getEntityBehaviorState(player.id)).toBe("idle");
    });

    it("lets damaged interrupt attacking timed state", () => {
        const player = dataBus.getPlayer();

        dataBus.markPlayerAttacking(200);
        expect(dataBus.getEntityBehaviorState(player.id)).toBe("attacking");

        dataBus.markPlayerDamaged(80);
        expect(dataBus.getEntityBehaviorState(player.id)).toBe("damaged");

        dataBus.stepPhysics(50);
        dataBus.stepPhysics(50);
        expect(dataBus.getEntityBehaviorState(player.id)).toBe("idle");
    });

    it("records recent behavior transitions for debug trail", () => {
        const player = dataBus.getPlayer();

        dataBus.setPlayerMoveInput(1);
        dataBus.stepPhysics(16);

        dataBus.markPlayerAttacking(40);
        dataBus.stepPhysics(50);

        const transitions = dataBus.getEntityBehaviorTransitions(player.id, 3);

        expect(transitions.length).toBeGreaterThan(0);
        expect(transitions.some((entry) => entry.to === "attacking")).toBe(
            true,
        );
        expect(transitions.some((entry) => entry.to === "moving")).toBe(true);
    });

    it("can clear behavior transition history", () => {
        const player = dataBus.getPlayer();

        dataBus.markPlayerDamaged(40);
        const transitionsBeforeClear = dataBus.getEntityBehaviorTransitions(
            player.id,
            3,
        );
        expect(transitionsBeforeClear.length).toBeGreaterThan(0);

        dataBus.clearEntityBehaviorTransitions();
        expect(dataBus.getEntityBehaviorTransitions(player.id, 3)).toEqual([]);
    });

    it("applies patrol profile to enemy archetype", () => {
        const enemyId = "enemy-patrol" as unknown as GameState["playerId"];
        const player = dataBus.getPlayer();

        dataBus.setState((prev) => ({
            ...prev,
            entitiesById: {
                ...prev.entitiesById,
                [enemyId]: {
                    ...player,
                    id: enemyId,
                    type: "enemy",
                    name: "enemy-patrol",
                    position: { ...player.position, x: 180 },
                    collider: undefined,
                    physicsBody: undefined,
                    behaviorState: "idle",
                    currentAnimation: "idle",
                },
            },
        }));

        dataBus.setNpcArchetypeProfile(enemyId, {
            mode: "patrol",
            anchorX: 180,
            patrolDistancePx: 24,
            patrolSpeedPxPerSec: 120,
            fleeDistancePx: 10,
            fleeSpeedPxPerSec: 150,
        });

        const enemyBefore = dataBus.getState().entitiesById[enemyId];
        const startX = enemyBefore.position.x;

        dataBus.stepPhysics(16);

        const enemyAfter = dataBus.getState().entitiesById[enemyId];
        expect(dataBus.getEntityBehaviorState(enemyId)).toBe("patrol");
        expect(enemyAfter.currentAnimation).toBe("patrol");
        expect(enemyAfter.position.x).toBeGreaterThan(startX);
    });

    it("switches enemy archetype to flee when player is nearby", () => {
        const enemyId = "enemy-flee" as unknown as GameState["playerId"];
        const player = dataBus.getPlayer();

        dataBus.setState((prev) => ({
            ...prev,
            entitiesById: {
                ...prev.entitiesById,
                [enemyId]: {
                    ...player,
                    id: enemyId,
                    type: "enemy",
                    name: "enemy-flee",
                    position: { ...player.position, x: player.position.x + 12 },
                    collider: undefined,
                    physicsBody: undefined,
                    behaviorState: "idle",
                    currentAnimation: "idle",
                },
            },
        }));

        dataBus.setNpcArchetypeProfile(enemyId, {
            mode: "patrol",
            anchorX: player.position.x + 12,
            patrolDistancePx: 18,
            patrolSpeedPxPerSec: 80,
            fleeDistancePx: 40,
            fleeSpeedPxPerSec: 160,
        });

        dataBus.stepPhysics(16);

        const enemyAfter = dataBus.getState().entitiesById[enemyId];
        expect(dataBus.getEntityBehaviorState(enemyId)).toBe("flee");
        expect(enemyAfter.currentAnimation).toBe("flee");
        expect((enemyAfter.physicsBody?.velocity.x ?? 0) > 0).toBe(true);
    });

    it("supports idle NPC profile and clear profile API", () => {
        const enemyId = "enemy-idle" as unknown as GameState["playerId"];
        const player = dataBus.getPlayer();

        dataBus.setState((prev) => ({
            ...prev,
            entitiesById: {
                ...prev.entitiesById,
                [enemyId]: {
                    ...player,
                    id: enemyId,
                    type: "enemy",
                    name: "enemy-idle",
                    position: { ...player.position, x: 250 },
                    collider: undefined,
                    physicsBody: undefined,
                    behaviorState: "idle",
                    currentAnimation: "idle",
                },
            },
        }));

        dataBus.setNpcArchetypeProfile(enemyId, {
            mode: "idle",
            fleeDistancePx: 10,
        });

        expect(dataBus.getNpcArchetypeProfile(enemyId)).not.toBeNull();

        dataBus.stepPhysics(16);
        expect(dataBus.getEntityBehaviorState(enemyId)).toBe("idle");

        dataBus.clearNpcArchetypeProfile(enemyId);
        expect(dataBus.getNpcArchetypeProfile(enemyId)).toBeNull();
    });

    it("supports idle-roam archetype with deterministic roaming motion", () => {
        const enemyId = "enemy-roam" as unknown as GameState["playerId"];
        const player = dataBus.getPlayer();

        dataBus.setState((prev) => ({
            ...prev,
            entitiesById: {
                ...prev.entitiesById,
                [enemyId]: {
                    ...player,
                    id: enemyId,
                    type: "enemy",
                    name: "enemy-roam",
                    position: { ...player.position, x: 210, y: 80 },
                    collider: undefined,
                    physicsBody: undefined,
                    behaviorState: "idle",
                    currentAnimation: "idle",
                },
            },
        }));

        dataBus.setNpcArchetypeProfile(enemyId, {
            mode: "idle-roam",
            anchorX: 210,
            anchorY: 80,
            roamDistancePx: 20,
            roamSpeedPxPerSec: 120,
            roamFrequencyHz: 1.2,
            fleeDistancePx: 6,
        });

        const start = dataBus.getState().entitiesById[enemyId].position;
        const startX = start.x;
        const startY = start.y;
        dataBus.stepPhysics(16);
        dataBus.stepPhysics(16);
        const after = dataBus.getState().entitiesById[enemyId].position;

        expect(dataBus.getEntityBehaviorState(enemyId)).toBe("patrol");
        expect(after.x !== startX || after.y !== startY).toBe(true);
    });

    it("supports waypoint patrol archetype", () => {
        const enemyId = "enemy-waypoint" as unknown as GameState["playerId"];
        const player = dataBus.getPlayer();

        dataBus.setState((prev) => ({
            ...prev,
            entitiesById: {
                ...prev.entitiesById,
                [enemyId]: {
                    ...player,
                    id: enemyId,
                    type: "enemy",
                    name: "enemy-waypoint",
                    position: { ...player.position, x: 100, y: 100 },
                    collider: undefined,
                    physicsBody: undefined,
                    behaviorState: "idle",
                    currentAnimation: "idle",
                },
            },
        }));

        dataBus.setNpcArchetypeProfile(enemyId, {
            mode: "patrol",
            waypoints: [
                { x: 120, y: 100 },
                { x: 120, y: 120 },
            ],
            patrolSpeedPxPerSec: 140,
            waypointTolerancePx: 4,
            fleeDistancePx: 6,
        });

        const before = dataBus.getState().entitiesById[enemyId].position;
        const beforeX = before.x;
        dataBus.stepPhysics(16);
        const after = dataBus.getState().entitiesById[enemyId].position;

        expect(dataBus.getEntityBehaviorState(enemyId)).toBe("patrol");
        expect(after.x).toBeGreaterThan(beforeX);
    });

    it("supports chase archetype with distance gating", () => {
        const enemyId = "enemy-chase" as unknown as GameState["playerId"];
        const player = dataBus.getPlayer();

        dataBus.setState((prev) => ({
            ...prev,
            entitiesById: {
                ...prev.entitiesById,
                [enemyId]: {
                    ...player,
                    id: enemyId,
                    type: "enemy",
                    name: "enemy-chase",
                    position: { ...player.position, x: player.position.x + 80 },
                    collider: undefined,
                    physicsBody: undefined,
                    behaviorState: "idle",
                    currentAnimation: "idle",
                },
            },
        }));

        dataBus.setNpcArchetypeProfile(enemyId, {
            mode: "chase",
            chaseDistancePx: 120,
            chaseStopDistancePx: 8,
            chaseSpeedPxPerSec: 160,
            fleeDistancePx: 6,
        });

        dataBus.stepPhysics(16);
        const chasing = dataBus.getState().entitiesById[enemyId];

        expect(dataBus.getEntityBehaviorState(enemyId)).toBe("chase");
        expect((chasing.physicsBody?.velocity.x ?? 0) < 0).toBe(true);

        dataBus.setState((prev) => ({
            ...prev,
            entitiesById: {
                ...prev.entitiesById,
                [enemyId]: {
                    ...prev.entitiesById[enemyId],
                    position: {
                        x: player.position.x + 240,
                        y: player.position.y,
                    },
                },
            },
        }));

        dataBus.stepPhysics(16);
        expect(dataBus.getEntityBehaviorState(enemyId)).toBe("idle");
    });

    it("supports manual boss phase state assignment", () => {
        const bossId = "enemy-boss" as unknown as GameState["playerId"];
        const player = dataBus.getPlayer();

        dataBus.setState((prev) => ({
            ...prev,
            entitiesById: {
                ...prev.entitiesById,
                [bossId]: {
                    ...player,
                    id: bossId,
                    type: "enemy",
                    name: "enemy-boss",
                    position: { ...player.position, x: 320 },
                    collider: undefined,
                    physicsBody: undefined,
                    behaviorState: "idle",
                    currentAnimation: "idle",
                },
            },
        }));

        dataBus.setEntityBossPhase(bossId, "phase-1");
        expect(dataBus.getEntityBehaviorState(bossId)).toBe("phase-1");
        expect(dataBus.getState().entitiesById[bossId].currentAnimation).toBe(
            "phase-1",
        );

        dataBus.setEntityBossPhase(bossId, "phase-2");
        expect(dataBus.getEntityBehaviorState(bossId)).toBe("phase-2");
        expect(dataBus.getState().entitiesById[bossId].currentAnimation).toBe(
            "phase-2",
        );
    });

    it("supports buffered jump request shortly before landing", () => {
        const player = dataBus.getPlayer();
        dataBus.setWorldBoundsEnabled(true);
        dataBus.enablePlayerGravity({ velocity: { x: 0, y: 0 } });

        player.position.y = dataBus.getState().worldSize.height - 80;
        dataBus.stepPhysics(16);

        player.position.y = dataBus.getState().worldSize.height - 84;
        dataBus.requestPlayerJump();
        dataBus.stepPhysics(16);

        expect(player.physicsBody?.velocity.y).toBeLessThan(0);
    });

    it("allows coyote jump shortly after leaving ground", () => {
        const player = dataBus.getPlayer();
        dataBus.setWorldBoundsEnabled(true);
        dataBus.enablePlayerGravity({ velocity: { x: 0, y: 0 } });

        player.position.y = dataBus.getState().worldSize.height - 80;
        dataBus.stepPhysics(16);
        player.position.y -= 3;

        dataBus.requestPlayerJump();
        dataBus.stepPhysics(16);

        expect(player.physicsBody?.velocity.y).toBeLessThan(0);
    });

    it("can disable physics per entity", () => {
        const player = dataBus.getPlayer();
        dataBus.enableEntityPhysics(player.id, { velocity: { x: 0, y: 0 } });
        dataBus.disableEntityPhysics(player.id);

        const changed = dataBus.stepPhysics(16);

        expect(changed).toBe(false);
        expect(player.physicsBody).toBeUndefined();
    });

    it("clamps manual camera position to world edges", () => {
        dataBus.setWorldSize(500, 500);
        dataBus.setCameraViewport(300, 300);
        dataBus.setCameraClampToWorld(true);

        dataBus.setCameraPosition(999, 999);

        const { camera } = dataBus.getState();
        expect(camera.x).toBe(200);
        expect(camera.y).toBe(200);
    });

    it("follows player position when camera is in follow mode", () => {
        dataBus.setWorldSize(500, 500);
        dataBus.setCameraViewport(300, 300);
        dataBus.setCameraClampToWorld(true);
        dataBus.setCameraFollowPlayer(true);

        const player = dataBus.getPlayer();
        player.position.x = 250;
        player.position.y = 250;

        dataBus.movePlayerBy(1, 0);

        const { camera } = dataBus.getState();
        expect(camera.x).toBeGreaterThan(0);
        expect(camera.y).toBeGreaterThan(0);
    });

    it("keeps manual camera static while player moves", () => {
        dataBus.setWorldSize(500, 500);
        dataBus.setCameraViewport(300, 300);
        dataBus.setCameraClampToWorld(true);
        dataBus.setCameraMode("manual");
        dataBus.setCameraPosition(120, 140);

        const player = dataBus.getPlayer();
        player.position.x = 200;
        player.position.y = 200;

        dataBus.movePlayerBy(10, 0);

        const { camera } = dataBus.getState();
        expect(camera.x).toBe(120);
        expect(camera.y).toBe(140);
    });

    it("preserves follow mode when camera is manually panned", () => {
        dataBus.setWorldSize(500, 500);
        dataBus.setCameraViewport(300, 300);
        dataBus.setCameraClampToWorld(true);
        dataBus.setCameraFollowPlayer(true);

        dataBus.moveCameraBy(24, 0);

        const { camera } = dataBus.getState();
        expect(camera.mode).toBe("follow-player");
    });

    it("ignores enable/disable velocity operations for missing entities", () => {
        expect(() => {
            dataBus.enableEntityPhysics("missing");
            dataBus.disableEntityPhysics("missing");
            dataBus.setEntityVelocity("missing", 1, 2);
        }).not.toThrow();
    });

    it("supports directional movement wrappers", () => {
        const player = dataBus.getPlayer();
        const start = { ...player.position };

        dataBus.movePlayerRight(5);
        dataBus.movePlayerLeft(5);
        dataBus.movePlayerUp(5);
        dataBus.movePlayerDown(5);

        expect(player.position.x).toBe(start.x);
        expect(player.position.y).toBe(start.y);
    });

    it("ignores invalid camera viewport updates", () => {
        const before = { ...dataBus.getState().camera.viewport };

        dataBus.setCameraViewport(0, 200);
        dataBus.setCameraViewport(200, -1);

        expect(dataBus.getState().camera.viewport).toEqual(before);
    });

    it("falls back to clamped camera state when follow target is missing", () => {
        dataBus.setWorldSize(500, 500);
        dataBus.setCameraViewport(300, 300);
        dataBus.setCameraMode("manual");
        dataBus.setCameraPosition(180, 180);

        dataBus.setCameraFollowTarget("missing-target-id");

        const { camera } = dataBus.getState();
        expect(camera.mode).toBe("follow-player");
        expect(camera.x).toBe(180);
        expect(camera.y).toBe(180);
    });

    it("merges physics body velocity overrides when physics already exists", () => {
        const player = dataBus.getPlayer();

        dataBus.enableEntityPhysics(player.id, {
            velocity: { x: 5, y: -7 },
            gravityScale: 1.5,
        });

        dataBus.enableEntityPhysics(player.id, {
            velocity: { x: 11 },
        });

        expect(player.physicsBody?.velocity.x).toBe(11);
        expect(player.physicsBody?.velocity.y).toBe(-7);
        expect(player.physicsBody?.gravityScale).toBe(1.5);
    });

    it("zeros horizontal velocity when physics movement collides on x", () => {
        const player = dataBus.getPlayer();
        const state = dataBus.getState();
        const blocker = Object.values(state.entitiesById).find(
            (entity) => entity.name === "testBox",
        );

        expect(blocker).toBeDefined();

        if (!blocker) {
            return;
        }

        player.position.x = blocker.position.x - 20;
        player.position.y = blocker.position.y;

        dataBus.enablePlayerPhysics({
            affectedByGravity: false,
            velocity: { x: 180, y: 0 },
        });

        dataBus.stepPhysics(100);

        expect(player.physicsBody?.velocity.x).toBe(0);
    });

    it("applies directional environmental force to entities inside zone", () => {
        const player = dataBus.getPlayer();
        dataBus.enablePlayerPhysics({
            affectedByGravity: false,
            dragX: 0,
            velocity: { x: 0, y: 0 },
        });

        dataBus.setEnvironmentalForceZone({
            id: "wind-right",
            bounds: {
                x: player.position.x - 8,
                y: player.position.y - 8,
                width: 64,
                height: 64,
            },
            forcePxPerSec: { x: 120, y: 0 },
        });

        dataBus.stepPhysics(50);

        expect(player.physicsBody?.velocity.x).toBeGreaterThan(0);
        expect(player.position.x).toBeGreaterThan(10);
    });

    it("applies drag scaling by entity type inside force zone", () => {
        const player = dataBus.getPlayer();
        dataBus.enablePlayerPhysics({
            affectedByGravity: false,
            dragX: 1,
            velocity: { x: 100, y: 0 },
        });

        dataBus.setEnvironmentalForceZone({
            id: "current-resistance",
            bounds: {
                x: player.position.x - 10,
                y: player.position.y - 10,
                width: 80,
                height: 80,
            },
            dragScaleByType: {
                player: 4,
            },
        });

        dataBus.stepPhysics(50);

        expect(player.physicsBody?.velocity.x ?? 0).toBeLessThan(95);
    });

    it("does not apply environmental force when entity is outside zone", () => {
        const player = dataBus.getPlayer();
        dataBus.enablePlayerPhysics({
            affectedByGravity: false,
            dragX: 0,
            velocity: { x: 0, y: 0 },
        });

        dataBus.setEnvironmentalForceZone({
            id: "far-wind",
            bounds: {
                x: player.position.x + 500,
                y: player.position.y + 500,
                width: 64,
                height: 64,
            },
            forcePxPerSec: { x: 200, y: 0 },
        });

        dataBus.stepPhysics(50);

        expect(player.physicsBody?.velocity.x).toBe(0);
    });

    it("applies status effect speed scale to player motion", () => {
        const player = dataBus.getPlayer();
        dataBus.setPlayerMovementConfig({
            maxSpeedX: 10,
            groundAcceleration: 5000,
            airAcceleration: 5000,
        });
        dataBus.enablePlayerGravity({
            affectedByGravity: false,
            velocity: { x: 0, y: 0 },
        });

        dataBus.setPlayerMoveInput(1);
        dataBus.stepPhysics(16);
        const baselineSpeed = player.physicsBody?.velocity.x ?? 0;

        dataBus.setEntityVelocity(player.id, 0, 0);
        dataBus.applyEntitySlow(player.id, {
            durationMs: 1000,
            magnitude: 0.5,
        });
        dataBus.stepPhysics(16);
        const slowedSpeed = player.physicsBody?.velocity.x ?? 0;

        expect(slowedSpeed).toBeLessThan(baselineSpeed);
        expect(dataBus.getEntityMovementSpeedScale(player.id)).toBeCloseTo(0.5);
    });

    it("emits burn tick signals during physics stepping", () => {
        const player = dataBus.getPlayer();
        const ticks: StatusEffectTickEvent[] = [];
        const off = signalBus.on<StatusEffectTickEvent>(
            STATUS_EFFECT_TICK_SIGNAL,
            (event) => {
                ticks.push(event);
            },
        );

        dataBus.applyEntityBurn(player.id, {
            durationMs: 1200,
            magnitude: 2,
            tickIntervalMs: 500,
        });

        for (let index = 0; index < 10; index += 1) {
            dataBus.stepPhysics(50);
        }
        for (let index = 0; index < 10; index += 1) {
            dataBus.stepPhysics(50);
        }
        for (let index = 0; index < 6; index += 1) {
            dataBus.stepPhysics(50);
        }

        expect(ticks.length).toBeGreaterThanOrEqual(2);
        expect(ticks[0]).toEqual(
            expect.objectContaining({
                entityId: player.id,
                type: "burn",
            }),
        );
        expect(ticks[1].atMs - ticks[0].atMs).toBe(500);

        off();
        signalBus.clear(STATUS_EFFECT_TICK_SIGNAL);
    });
});
