import { beforeEach, describe, expect, it } from "vitest";
import { dataBus } from "@/services/DataBus";
import type { GameState } from "@/services/DataBus";
import { CollisionLayer } from "@/logic/collision";

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

    beforeEach(() => {
        baseline = cloneGameState(dataBus.getState());
        dataBus.setState(() => cloneGameState(baseline));
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

    it("supports buffered jump request shortly before landing", () => {
        const player = dataBus.getPlayer();
        dataBus.setWorldBoundsEnabled(true);
        dataBus.enablePlayerGravity({ velocity: { x: 0, y: 0 } });

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
});
