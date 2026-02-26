import { beforeEach, describe, expect, it, vi } from "vitest";
import { dataBus, type GameState } from "@/services/DataBus";
import {
    buildSaveFileName,
    exportSaveFile,
    importSaveFile,
    serializeGameState,
} from "@/services/save";

function cloneGameState(state: GameState): GameState {
    const entitiesById: GameState["entitiesById"] = {};

    for (const [id, entity] of Object.entries(state.entitiesById)) {
        entitiesById[id] = {
            ...entity,
            position: { ...entity.position },
            animations: entity.animations.map((animation) => ({
                ...animation,
                frames: animation.frames.map((frame) => [...frame]),
            })),
            characterSpriteTiles: entity.characterSpriteTiles.map((frame) => [
                ...frame,
            ]),
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

describe("save file service", () => {
    let baseline: GameState;

    beforeEach(() => {
        baseline = cloneGameState(dataBus.getState());
        dataBus.setState(() => cloneGameState(baseline));
    });

    it("builds deterministic save filenames", () => {
        const fileName = buildSaveFileName("2026-02-26T12:34:56.789Z");
        expect(fileName).toBe("ursa-save-2026-02-26T12-34-56-789Z.json");
    });

    it("exports save file and triggers anchor download", () => {
        const click = vi.fn();
        const anchor = {
            href: "",
            download: "",
            style: { display: "" },
            click,
        } as unknown as HTMLAnchorElement;

        const appendChild = vi.fn();
        const removeChild = vi.fn();
        const createObjectURL = vi.fn(() => "blob:test");
        const revokeObjectURL = vi.fn();

        const result = exportSaveFile({
            createObjectURL,
            revokeObjectURL,
            createElement: vi.fn(() => anchor as unknown as HTMLElement),
            appendChild,
            removeChild,
        });

        expect(result.ok).toBe(true);
        expect(click).toHaveBeenCalledTimes(1);
        expect(anchor.href).toBe("blob:test");
        expect(anchor.download.endsWith(".json")).toBe(true);
        expect(appendChild).toHaveBeenCalledTimes(1);
        expect(removeChild).toHaveBeenCalledTimes(1);
        expect(revokeObjectURL).toHaveBeenCalledWith("blob:test");
    });

    it("returns unsupported result when export dependencies are unavailable", () => {
        const result = exportSaveFile(null);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.code).toBe("download-not-supported");
        }
    });

    it("uses default browser deps when no export deps are passed", () => {
        const clickSpy = vi
            .spyOn(HTMLAnchorElement.prototype, "click")
            .mockImplementation(() => {});

        const createObjectURLSpy = vi
            .spyOn(window.URL, "createObjectURL")
            .mockImplementation(() => "blob:auto");
        const revokeObjectURLSpy = vi
            .spyOn(window.URL, "revokeObjectURL")
            .mockImplementation(() => {});

        const result = exportSaveFile();

        expect(result.ok).toBe(true);
        expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
        expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:auto");
        expect(clickSpy).toHaveBeenCalledTimes(1);
    });

    it("returns unsupported when default document is unavailable", () => {
        vi.stubGlobal("document", undefined);

        const result = exportSaveFile();
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.code).toBe("download-not-supported");
        }

        vi.unstubAllGlobals();
    });

    it("imports a valid save file and rehydrates state", async () => {
        const playerId = dataBus.getState().playerId;

        const save = serializeGameState(dataBus.getState());
        const parsed = JSON.parse(JSON.stringify(save)) as {
            state: {
                entitiesById: Record<
                    string,
                    { position: { x: number; y: number; z?: number } }
                >;
            };
        };

        parsed.state.entitiesById[playerId].position.x = 321;
        const importFile = new File([JSON.stringify(parsed)], "import.json", {
            type: "application/json",
        });

        dataBus.setState((prev) => ({
            ...prev,
            entitiesById: {
                ...prev.entitiesById,
                [playerId]: {
                    ...prev.entitiesById[playerId],
                    position: {
                        ...prev.entitiesById[playerId].position,
                        x: 777,
                    },
                },
            },
        }));

        const imported = await importSaveFile(importFile);
        expect(imported.ok).toBe(true);
        expect(dataBus.getState().entitiesById[playerId].position.x).toBe(321);
    });

    it("returns invalid-json error for malformed file contents", async () => {
        const file = new File(["{not-json"], "bad.json", {
            type: "application/json",
        });

        const result = await importSaveFile(file);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.code).toBe("invalid-json");
        }
    });

    it("returns empty-file error for blank file", async () => {
        const file = new File(["    "], "empty.json", {
            type: "application/json",
        });

        const result = await importSaveFile(file);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.code).toBe("empty-file");
        }
    });

    it("returns invalid format error for unsupported payload", async () => {
        const file = new File(
            [JSON.stringify({ version: 99, state: {} })],
            "unsupported.json",
            {
                type: "application/json",
            },
        );

        const result = await importSaveFile(file);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.code).toBe("invalid-save-format");
        }
    });

    it("returns read failure when file text cannot be read", async () => {
        const fakeFile = {
            name: "broken.json",
            text: vi.fn(async () => {
                throw new Error("read failed");
            }),
        } as unknown as File;

        const result = await importSaveFile(fakeFile);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.code).toBe("file-read-failed");
        }
    });

    it("returns rehydrate-failed when state application fails", async () => {
        const save = serializeGameState(dataBus.getState());

        vi.resetModules();
        vi.doMock("@/services/save/state", async () => {
            const actual = await vi.importActual<
                typeof import("@/services/save/state")
            >("@/services/save/state");

            return {
                ...actual,
                rehydrateGameState: vi.fn(() => false),
            };
        });

        const { importSaveFile: importWithMockedRehydrate } =
            await import("@/services/save/file");

        const file = new File([JSON.stringify(save)], "valid.json", {
            type: "application/json",
        });

        const result = await importWithMockedRehydrate(file);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.code).toBe("rehydrate-failed");
        }

        vi.doUnmock("@/services/save/state");
        vi.resetModules();
    });
});
