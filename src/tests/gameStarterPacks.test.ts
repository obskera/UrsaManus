import { describe, expect, it } from "vitest";
import {
    getGameStarterPack,
    listGameStarterPacks,
    simulateGameStarterPack,
    type GameStarterPackId,
} from "@/services/gameStarterPacks";

describe("gameStarterPacks", () => {
    it("lists all planned starter packs", () => {
        const packs = listGameStarterPacks();
        expect(packs).toHaveLength(11);
        expect(packs.every((pack) => pack.doneCriteria.length > 0)).toBe(true);
    });

    it("resolves starter packs by id", () => {
        const pack = getGameStarterPack("combat-encounter-pack");
        expect(pack).not.toBeNull();
        expect(pack?.bundle.spawns.length).toBeGreaterThan(0);

        const missing = getGameStarterPack("unknown-pack" as GameStarterPackId);
        expect(missing).toBeNull();
    });

    it("simulates all starter packs with zero attach issues", () => {
        const ids = listGameStarterPacks().map((pack) => pack.id);

        for (const id of ids) {
            const report = simulateGameStarterPack(id);
            expect(report.ok).toBe(true);
            expect(report.issues).toEqual([]);
            expect(report.entitiesSimulated).toBeGreaterThan(0);
            expect(report.moduleAttachments).toBeGreaterThan(0);
        }
    });

    it("returns explicit failure report for unknown ids", () => {
        const report = simulateGameStarterPack(
            "unknown-pack" as GameStarterPackId,
        );
        expect(report.ok).toBe(false);
        expect(report.issues[0]).toContain("Unknown game starter pack");
    });
});
