import { beforeEach, describe, expect, it } from "vitest";
import { dataBus } from "@/services/DataBus";
import type { GameState } from "@/services/DataBus";

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
        worldBoundsIds: [...state.worldBoundsIds],
    };
}

describe("DataBus physics integration", () => {
    let baseline: GameState;

    beforeEach(() => {
        baseline = cloneGameState(dataBus.getState());
        dataBus.setState(() => cloneGameState(baseline));
        dataBus.setWorldBoundsEnabled(false);
    });

    it("does nothing when no entities have physics bodies", () => {
        const changed = dataBus.stepPhysics(16);
        expect(changed).toBe(false);
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
});
