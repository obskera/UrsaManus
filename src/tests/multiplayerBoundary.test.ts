import { afterEach, describe, expect, it } from "vitest";
import { signalBus } from "@/services/signalBus";
import {
    MULTIPLAYER_BOUNDARY_EVALUATED_SIGNAL,
    MULTIPLAYER_BOUNDARY_UPDATED_SIGNAL,
    createMultiplayerBoundaryService,
} from "@/services/multiplayerBoundary";

describe("multiplayer boundary service", () => {
    afterEach(() => {
        signalBus.clear();
    });

    it("registers deterministic boundary contracts and lists them", () => {
        const service = createMultiplayerBoundaryService();

        expect(
            service.registerContract({
                id: "simulation",
                label: "Simulation Core",
                deterministic: true,
                authority: "server",
                replicationSafeApis: ["step", "applyInput", "serialize"],
            }),
        ).toBe(true);

        expect(
            service.registerContract({
                id: "ui-hud",
                label: "HUD",
                deterministic: false,
                authority: "client",
                replicationSafeApis: ["syncAbilityCooldown"],
            }),
        ).toBe(true);

        const contracts = service.listContracts();
        expect(contracts.map((contract) => contract.id)).toEqual([
            "simulation",
            "ui-hud",
        ]);
        expect(service.getContract("simulation")?.deterministic).toBe(true);
    });

    it("enforces state-authority contract by actor", () => {
        const service = createMultiplayerBoundaryService();
        service.registerContract({
            id: "combat",
            label: "Combat",
            deterministic: true,
            authority: "server",
            replicationSafeApis: ["applyHit", "setInvulnerableUntil"],
        });

        const serverAction = service.evaluateAction({
            contractId: "combat",
            api: "applyHit",
            actor: "server",
        });
        expect(serverAction.ok).toBe(true);

        const clientAction = service.evaluateAction({
            contractId: "combat",
            api: "applyHit",
            actor: "client",
        });
        expect(clientAction.ok).toBe(false);
        expect(clientAction.reason).toBe("actor-authority-mismatch");
    });

    it("flags APIs that are not replication-safe", () => {
        const service = createMultiplayerBoundaryService();
        service.registerContract({
            id: "world-stream",
            label: "World Stream",
            deterministic: true,
            authority: "shared",
            replicationSafeApis: ["updateFocus", "registerEntity"],
        });

        expect(
            service.isApiReplicationSafe("world-stream", "updateFocus"),
        ).toBe(true);
        expect(
            service.isApiReplicationSafe("world-stream", "forceDebugLoad"),
        ).toBe(false);

        const blocked = service.evaluateAction({
            contractId: "world-stream",
            api: "forceDebugLoad",
            actor: "client",
        });
        expect(blocked.ok).toBe(false);
        expect(blocked.reason).toBe("api-not-replication-safe");
    });

    it("emits lifecycle signals and readiness report for multiplayer planning", () => {
        const events: string[] = [];

        signalBus.on(MULTIPLAYER_BOUNDARY_UPDATED_SIGNAL, () => {
            events.push("updated");
        });
        signalBus.on(
            MULTIPLAYER_BOUNDARY_EVALUATED_SIGNAL,
            (event: { ok: boolean }) => {
                events.push(event.ok ? "eval-ok" : "eval-blocked");
            },
        );

        const service = createMultiplayerBoundaryService();
        service.registerContract({
            id: "replay",
            label: "Replay",
            deterministic: true,
            authority: "shared",
            replicationSafeApis: ["recordInput", "recordEvent", "exportReplay"],
        });
        service.registerContract({
            id: "local-vfx",
            label: "Local VFX",
            deterministic: false,
            authority: "client",
            replicationSafeApis: ["setScreenShake"],
        });

        service.evaluateAction({
            contractId: "replay",
            api: "recordInput",
            actor: "client",
        });
        service.evaluateAction({
            contractId: "local-vfx",
            api: "spawnParticle",
            actor: "client",
        });

        const report = service.getReadinessReport();
        expect(report).toEqual({
            totalContracts: 2,
            deterministicContracts: 1,
            serverAuthorityContracts: 0,
            sharedAuthorityContracts: 1,
            clientAuthorityContracts: 1,
            replicationSafeApiCount: 4,
            nonDeterministicContracts: ["local-vfx"],
        });

        expect(events).toEqual([
            "updated",
            "updated",
            "eval-ok",
            "eval-blocked",
        ]);
    });
});
