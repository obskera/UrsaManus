import { beforeEach, describe, expect, it, vi } from "vitest";
import { dataBus, type GameState } from "@/services/DataBus";
import { CollisionLayer, createRectangleCollider } from "@/logic/collision";

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

describe("DataBus interaction core", () => {
    const initialBaseline = cloneGameState(dataBus.getState());

    beforeEach(() => {
        dataBus.setState(() => cloneGameState(initialBaseline));
        dataBus.clearEntityInteractionContracts();
        dataBus.clearWorldPause();
    });

    it("resolves and executes nearest interaction", () => {
        const player = dataBus.getPlayer();
        const targetId = "target-near" as never;
        const onInteract = vi.fn();

        dataBus.setState((prev) => ({
            ...prev,
            entitiesById: {
                ...prev.entitiesById,
                [targetId]: {
                    ...player,
                    id: targetId,
                    type: "object",
                    name: "Console",
                    position: {
                        x: player.position.x + 24,
                        y: player.position.y,
                    },
                    collider: createRectangleCollider({
                        size: { width: 16, height: 16 },
                        offset: { x: 0, y: 0 },
                        collisionResponse: "overlap",
                        layer: CollisionLayer.object,
                        collidesWith: CollisionLayer.player,
                    }),
                },
            },
        }));

        dataBus.setEntityInteractionContract(targetId, {
            canInteract: () => true,
            interact: onInteract,
            inputHint: {
                keyboard: "Press E to Use",
            },
        });

        const resolved = dataBus.resolvePlayerInteraction("keyboard");
        expect(resolved.targetId).toBe(targetId);
        expect(resolved.canInteract).toBe(true);
        expect(resolved.inputHintLabel).toBe("Press E to Use");

        const result = dataBus.interactWithNearestTarget("keyboard");
        expect(result.canInteract).toBe(true);
        expect(onInteract).toHaveBeenCalledTimes(1);
    });

    it("returns out-of-range when target exceeds max distance", () => {
        const player = dataBus.getPlayer();
        const farId = "target-far" as never;

        dataBus.setState((prev) => ({
            ...prev,
            entitiesById: {
                ...prev.entitiesById,
                [farId]: {
                    ...player,
                    id: farId,
                    type: "object",
                    name: "Far Console",
                    position: {
                        x: player.position.x + 220,
                        y: player.position.y,
                    },
                },
            },
        }));

        dataBus.setEntityInteractionContract(farId, {
            maxDistancePx: 40,
            interact: vi.fn(),
        });

        const resolved = dataBus.resolveEntityInteraction(farId, "keyboard");
        expect(resolved.canInteract).toBe(false);
        expect(resolved.defaultBlockedReason).toBe("out-of-range");
    });

    it("applies line-of-sight gating with blocker entities", () => {
        const player = dataBus.getPlayer();
        const targetId = "target-los" as never;
        const blockerId = "blocker-los" as never;

        dataBus.setState((prev) => ({
            ...prev,
            entitiesById: {
                ...prev.entitiesById,
                [targetId]: {
                    ...player,
                    id: targetId,
                    type: "enemy",
                    name: "NPC",
                    position: {
                        x: player.position.x + 80,
                        y: player.position.y,
                    },
                    collider: createRectangleCollider({
                        size: { width: 16, height: 16 },
                        offset: { x: 0, y: 0 },
                        collisionResponse: "overlap",
                        layer: CollisionLayer.object,
                        collidesWith: CollisionLayer.player,
                    }),
                },
                [blockerId]: {
                    ...player,
                    id: blockerId,
                    type: "object",
                    name: "Wall",
                    position: {
                        x: player.position.x + 40,
                        y: player.position.y,
                    },
                    collider: createRectangleCollider({
                        size: { width: 16, height: 16 },
                        offset: { x: 0, y: 0 },
                        collisionResponse: "block",
                        layer: CollisionLayer.world,
                        collidesWith: CollisionLayer.player,
                    }),
                },
            },
        }));

        dataBus.setEntityInteractionContract(targetId, {
            maxDistancePx: 120,
            requireLineOfSight: true,
            interact: vi.fn(),
        });

        const resolved = dataBus.resolveEntityInteraction(targetId);
        expect(resolved.canInteract).toBe(false);
        expect(resolved.defaultBlockedReason).toBe("line-of-sight-blocked");
    });

    it("supports contract-level disabled interaction with custom blocked reason", () => {
        const player = dataBus.getPlayer();
        const targetId = "target-locked" as never;

        dataBus.setState((prev) => ({
            ...prev,
            entitiesById: {
                ...prev.entitiesById,
                [targetId]: {
                    ...player,
                    id: targetId,
                    type: "object",
                    name: "Locked Chest",
                    position: {
                        x: player.position.x + 20,
                        y: player.position.y,
                    },
                },
            },
        }));

        dataBus.setEntityInteractionContract(targetId, {
            canInteract: () => false,
            blockedReason: (_, reason) =>
                reason === "interaction-disabled" ? "requires-key" : reason,
            interact: vi.fn(),
        });

        const resolved = dataBus.resolveEntityInteraction(
            targetId,
            "controller",
        );
        expect(resolved.canInteract).toBe(false);
        expect(resolved.blockedReason).toBe("requires-key");
        expect(resolved.inputHintLabel).toBe("Press X to Interact");
    });

    it("supports pointer and controller hint variants", () => {
        const player = dataBus.getPlayer();
        const targetId = "target-hints" as never;

        dataBus.setState((prev) => ({
            ...prev,
            entitiesById: {
                ...prev.entitiesById,
                [targetId]: {
                    ...player,
                    id: targetId,
                    type: "enemy",
                    name: "NPC",
                    position: {
                        x: player.position.x + 18,
                        y: player.position.y,
                    },
                },
            },
        }));

        dataBus.setEntityInteractionContract(targetId, {
            interact: vi.fn(),
            inputHint: {
                pointer: "Tap NPC",
                controller: "Press A to Talk",
            },
        });

        const pointerResolved = dataBus.resolveEntityInteraction(
            targetId,
            "pointer",
        );
        const controllerResolved = dataBus.resolveEntityInteraction(
            targetId,
            "controller",
        );

        expect(pointerResolved.inputHintLabel).toBe("Tap NPC");
        expect(controllerResolved.inputHintLabel).toBe("Press A to Talk");
    });

    it("returns missing-target for unknown interaction entries", () => {
        const resolved = dataBus.resolveEntityInteraction(
            "missing-id",
            "keyboard",
        );
        expect(resolved.canInteract).toBe(false);
        expect(resolved.defaultBlockedReason).toBe("missing-target");

        const interacted = dataBus.interactWithEntity("missing-id", "keyboard");
        expect(interacted.canInteract).toBe(false);
        expect(interacted.defaultBlockedReason).toBe("missing-target");
    });

    it("removes stale interaction contracts when entity is removed", () => {
        const player = dataBus.getPlayer();
        const targetId = "target-stale" as never;

        dataBus.setState((prev) => ({
            ...prev,
            entitiesById: {
                ...prev.entitiesById,
                [targetId]: {
                    ...player,
                    id: targetId,
                    type: "object",
                    name: "Temporary",
                    position: {
                        x: player.position.x + 12,
                        y: player.position.y,
                    },
                },
            },
        }));

        const registered = dataBus.setEntityInteractionContract(targetId, {
            interact: vi.fn(),
        });
        expect(registered).toBe(true);

        dataBus.setState((prev) => {
            const next = { ...prev.entitiesById };
            delete next[targetId];
            return {
                ...prev,
                entitiesById: next,
            };
        });

        expect(dataBus.getEntityInteractionContract(targetId)).toBeNull();
        expect(
            dataBus.resolveEntityInteraction(targetId).defaultBlockedReason,
        ).toBe("missing-target");
    });
});
