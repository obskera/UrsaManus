import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TileMapPlacementToolExample from "@/components/examples/TileMapPlacementToolExample";
import {
    TOOL_RECOVERY_SNAPSHOT_VERSION,
    buildToolRecoveryStorageKey,
} from "@/services/toolRecoverySnapshot";

const TILEMAP_AUTOSAVE_STORAGE_KEY = buildToolRecoveryStorageKey("tilemap");

const getFirstBaseTileValue = (payloadRaw: string): number | undefined => {
    const payload = JSON.parse(payloadRaw) as {
        layers?: Array<{
            id?: string;
            tiles?: number[];
        }>;
    };
    const baseLayer = payload.layers?.find((layer) => layer.id === "base");
    return baseLayer?.tiles?.[0];
};

describe("TileMapPlacementToolExample", () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    it("paints tiles, adds a layer, and refreshes export payload", async () => {
        const user = userEvent.setup();
        render(<TileMapPlacementToolExample />);

        expect(screen.getByText(/Map: 16x10\./)).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Tile (0, 0)" }));

        expect(
            screen.getByText("Painted tile 1 at (0, 0).", { exact: false }),
        ).toBeInTheDocument();

        await user.clear(screen.getByLabelText("New layer id"));
        await user.type(screen.getByLabelText("New layer id"), "collision");
        await user.click(screen.getByRole("button", { name: "Add layer" }));

        expect(
            screen.getByText('Added and selected layer "collision".', {
                exact: false,
            }),
        ).toBeInTheDocument();

        await user.click(
            screen.getByRole("button", { name: "Refresh export" }),
        );

        const payload = screen.getByLabelText(
            "Tile map JSON payload",
        ) as HTMLTextAreaElement;

        expect(payload.value).toContain('"version": "um-tilemap-v1"');
        expect(payload.value).toContain('"id": "collision"');
    }, 20000);

    it("imports a valid tile map json file", async () => {
        const user = userEvent.setup();
        render(<TileMapPlacementToolExample />);

        const importInput = screen.getByLabelText(
            "Import tile map JSON file",
        ) as HTMLInputElement;

        const importedPayload = {
            version: "um-tilemap-v1",
            map: {
                width: 2,
                height: 2,
            },
            selectedLayerId: "base",
            layers: [
                {
                    id: "base",
                    name: "Base",
                    visible: true,
                    tiles: [1, 0, 0, 2],
                },
            ],
        };

        const file = new File(
            [JSON.stringify(importedPayload)],
            "tilemap.json",
            {
                type: "application/json",
            },
        );

        await user.upload(importInput, file);

        expect(
            screen.getByText(/Imported tilemap\.json\./, { exact: false }),
        ).toBeInTheDocument();
        expect(screen.getByText(/Map: 2x2\./)).toBeInTheDocument();

        const payload = screen.getByLabelText(
            "Tile map JSON payload",
        ) as HTMLTextAreaElement;
        expect(payload.value).toContain('"width": 2');
        expect(payload.value).toContain('"tiles": [');
    });

    it("supports undo and redo for tile edits", async () => {
        const user = userEvent.setup();
        render(<TileMapPlacementToolExample />);

        const tileButton = screen.getByRole("button", { name: "Tile (0, 0)" });
        const payload = screen.getByLabelText(
            "Tile map JSON payload",
        ) as HTMLTextAreaElement;

        await user.click(tileButton);
        expect(getFirstBaseTileValue(payload.value)).toBe(1);
        expect(screen.getByText(/History: 2\/2\./)).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Undo" }));
        expect(getFirstBaseTileValue(payload.value)).toBe(0);
        expect(
            screen.getByText(/^Undo applied\./, { selector: "p" }),
        ).toBeInTheDocument();
        expect(screen.getByText(/History: 1\/2\./)).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Redo" }));
        expect(getFirstBaseTileValue(payload.value)).toBe(1);
        expect(
            screen.getByText(/^Redo applied\./, { selector: "p" }),
        ).toBeInTheDocument();
        expect(screen.getByText(/History: 2\/2\./)).toBeInTheDocument();
    }, 20000);

    it("adds and removes beforeunload guard based on dirty state", async () => {
        const user = userEvent.setup();
        render(<TileMapPlacementToolExample />);

        expect(screen.getByText(/Unsaved changes: No\./)).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Tile (0, 0)" }));
        expect(screen.getByText(/Unsaved changes: Yes\./)).toBeInTheDocument();

        const dirtyEvent = new Event("beforeunload", { cancelable: true });
        window.dispatchEvent(dirtyEvent);
        expect(dirtyEvent.defaultPrevented).toBe(true);

        await user.click(screen.getByRole("button", { name: "Undo" }));
        await waitFor(() => {
            expect(
                screen.getByText(/Unsaved changes: No\./),
            ).toBeInTheDocument();
        });

        const cleanEvent = new Event("beforeunload", { cancelable: true });
        window.dispatchEvent(cleanEvent);
        expect(cleanEvent.defaultPrevented).toBe(false);
    });

    it("recovers autosave snapshot on initial load", () => {
        const recoveredPayload = {
            version: "um-tilemap-v1",
            map: {
                width: 2,
                height: 2,
            },
            selectedLayerId: "base",
            layers: [
                {
                    id: "base",
                    name: "Base",
                    visible: true,
                    tiles: [1, 0, 0, 2],
                },
            ],
        };

        window.localStorage.setItem(
            TILEMAP_AUTOSAVE_STORAGE_KEY,
            JSON.stringify({
                version: TOOL_RECOVERY_SNAPSHOT_VERSION,
                toolKey: "tilemap",
                savedAt: "2026-03-01T00:00:00.000Z",
                payloadRaw: JSON.stringify(recoveredPayload),
            }),
        );

        render(<TileMapPlacementToolExample />);

        expect(
            screen.getByText(/Recovered autosave snapshot\./),
        ).toBeInTheDocument();
        expect(
            screen.getByText(/Last autosave: 2026-03-01T00:00:00\.000Z/),
        ).toBeInTheDocument();
        expect(screen.getByText(/Map: 2x2\./)).toBeInTheDocument();

        const payload = screen.getByLabelText(
            "Tile map JSON payload",
        ) as HTMLTextAreaElement;
        expect(payload.value).toContain('"width": 2');
    });

    it("supports explicit recovery snapshot controls", async () => {
        const user = userEvent.setup();

        window.localStorage.setItem(
            TILEMAP_AUTOSAVE_STORAGE_KEY,
            JSON.stringify({
                version: TOOL_RECOVERY_SNAPSHOT_VERSION,
                toolKey: "tilemap",
                savedAt: "2026-03-01T12:00:00.000Z",
                payloadRaw: JSON.stringify({
                    version: "um-tilemap-v1",
                    map: { width: 2, height: 2 },
                    selectedLayerId: "base",
                    layers: [
                        {
                            id: "base",
                            name: "Base",
                            visible: true,
                            tiles: [1, 0, 0, 0],
                        },
                    ],
                }),
            }),
        );

        render(<TileMapPlacementToolExample />);

        expect(
            screen.getByRole("button", { name: "Recover autosave" }),
        ).toBeEnabled();

        await user.click(
            screen.getByRole("button", { name: "Clear autosave" }),
        );

        expect(
            screen.getByText(/Cleared autosave snapshot\./),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Recover autosave" }),
        ).toBeDisabled();
        expect(screen.getByText(/Last autosave: none/)).toBeInTheDocument();
    });

    it("launches runtime playtest from current tilemap state", async () => {
        const user = userEvent.setup();
        const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

        render(<TileMapPlacementToolExample />);

        await user.click(screen.getByRole("button", { name: "Tile (0, 0)" }));
        await user.click(
            screen.getByRole("button", { name: "Open in runtime playtest" }),
        );

        expect(openSpy).toHaveBeenCalledTimes(1);

        await waitFor(() => {
            const autosaveRaw = window.localStorage.getItem(
                TILEMAP_AUTOSAVE_STORAGE_KEY,
            );
            expect(autosaveRaw).not.toBeNull();

            const envelope = JSON.parse(autosaveRaw ?? "{}") as {
                payloadRaw?: string;
            };
            expect(getFirstBaseTileValue(envelope.payloadRaw ?? "")).toBe(1);
        });

        openSpy.mockRestore();
    });

    it("verifies tilemap round-trip payload without semantic drift", async () => {
        const user = userEvent.setup();
        render(<TileMapPlacementToolExample />);

        await user.click(screen.getByRole("button", { name: "Tile (0, 0)" }));
        await user.click(
            screen.getByRole("button", { name: "Verify round-trip" }),
        );

        expect(
            screen.getByText(
                /Round-trip verification passed: no semantic drift detected\./,
            ),
        ).toBeInTheDocument();
    });

    it("reports tilemap round-trip verification failure for invalid JSON", async () => {
        const user = userEvent.setup();
        render(<TileMapPlacementToolExample />);

        const payload = screen.getByLabelText(
            "Tile map JSON payload",
        ) as HTMLTextAreaElement;
        await user.clear(payload);
        await user.type(payload, "bad-json");

        await user.click(
            screen.getByRole("button", { name: "Verify round-trip" }),
        );

        expect(
            screen.getByText(
                /Round-trip verification failed: Validation failed: invalid JSON\./,
            ),
        ).toBeInTheDocument();
    });

    it("writes autosave snapshot while editing", async () => {
        const user = userEvent.setup();
        render(<TileMapPlacementToolExample />);

        await user.click(screen.getByRole("button", { name: "Tile (0, 0)" }));

        await waitFor(() => {
            const autosaveRaw = window.localStorage.getItem(
                TILEMAP_AUTOSAVE_STORAGE_KEY,
            );
            expect(autosaveRaw).not.toBeNull();

            const envelope = JSON.parse(autosaveRaw ?? "{}") as {
                version?: string;
                toolKey?: string;
                payloadRaw?: string;
            };

            expect(envelope.version).toBe(TOOL_RECOVERY_SNAPSHOT_VERSION);
            expect(envelope.toolKey).toBe("tilemap");
            expect(getFirstBaseTileValue(envelope.payloadRaw ?? "")).toBe(1);
        });
    });

    it("allows selecting brush tile from quick-select buttons", async () => {
        const user = userEvent.setup();
        render(<TileMapPlacementToolExample />);

        await user.click(screen.getByRole("button", { name: "Tile 7" }));

        const brushInput = screen.getByLabelText(
            "Brush tile id",
        ) as HTMLInputElement;
        expect(brushInput.value).toBe("7");

        await user.click(screen.getByRole("button", { name: "Tile (0, 0)" }));

        const payload = screen.getByLabelText(
            "Tile map JSON payload",
        ) as HTMLTextAreaElement;
        expect(getFirstBaseTileValue(payload.value)).toBe(7);
        expect(
            screen.getByText(/Painted tile 7 at \(0, 0\)\./, {
                exact: false,
            }),
        ).toBeInTheDocument();
    });

    it("supports eyedropper pick mode to set brush from a grid tile", async () => {
        const user = userEvent.setup();
        render(<TileMapPlacementToolExample />);

        await user.click(screen.getByRole("button", { name: "Tile 8" }));
        await user.click(screen.getByRole("button", { name: "Tile (0, 0)" }));

        await user.click(screen.getByRole("button", { name: "Tile 3" }));
        await user.click(screen.getByRole("button", { name: "Tile (1, 0)" }));

        await user.click(screen.getByRole("button", { name: "Pick mode" }));
        await user.click(screen.getByRole("button", { name: "Tile (1, 0)" }));

        const brushInput = screen.getByLabelText(
            "Brush tile id",
        ) as HTMLInputElement;
        expect(brushInput.value).toBe("3");
        expect(
            screen.getByText(
                /Picked tile 3 from \(1, 0\) and switched to paint mode\./,
                {
                    exact: false,
                },
            ),
        ).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Tile (2, 0)" }));

        const payload = screen.getByLabelText(
            "Tile map JSON payload",
        ) as HTMLTextAreaElement;
        const exported = JSON.parse(payload.value) as {
            layers: Array<{
                id: string;
                tiles: number[];
            }>;
        };
        const baseLayer = exported.layers.find((layer) => layer.id === "base");

        expect(baseLayer?.tiles[1]).toBe(3);
        expect(baseLayer?.tiles[2]).toBe(3);
    }, 20000);

    it("supports Alt+click shortcut to pick tile into brush", async () => {
        const user = userEvent.setup();
        render(<TileMapPlacementToolExample />);

        await user.click(screen.getByRole("button", { name: "Tile 9" }));
        await user.click(screen.getByRole("button", { name: "Tile (0, 0)" }));

        await user.click(screen.getByRole("button", { name: "Tile 2" }));
        await user.click(screen.getByRole("button", { name: "Tile (1, 0)" }));

        fireEvent.click(screen.getByRole("button", { name: "Tile (0, 0)" }), {
            altKey: true,
        });

        const brushInput = screen.getByLabelText(
            "Brush tile id",
        ) as HTMLInputElement;
        expect(brushInput.value).toBe("9");

        await user.click(screen.getByRole("button", { name: "Tile (2, 0)" }));

        const payload = screen.getByLabelText(
            "Tile map JSON payload",
        ) as HTMLTextAreaElement;
        const exported = JSON.parse(payload.value) as {
            layers: Array<{
                id: string;
                tiles: number[];
            }>;
        };
        const baseLayer = exported.layers.find((layer) => layer.id === "base");

        expect(baseLayer?.tiles[2]).toBe(9);
    }, 20000);

    it("applies collision profile controls into exported payload", async () => {
        const user = userEvent.setup();
        render(<TileMapPlacementToolExample />);

        await user.clear(
            screen.getByLabelText("Solid layer ids (comma-separated)"),
        );
        await user.type(
            screen.getByLabelText("Solid layer ids (comma-separated)"),
            "collision,walls",
        );
        await user.clear(
            screen.getByLabelText(
                "Solid layer name contains (comma-separated)",
            ),
        );
        await user.type(
            screen.getByLabelText(
                "Solid layer name contains (comma-separated)",
            ),
            "collision,blocker",
        );
        await user.clear(
            screen.getByLabelText("Solid tile ids (comma-separated)"),
        );
        await user.type(
            screen.getByLabelText("Solid tile ids (comma-separated)"),
            "4,7,11",
        );

        const fallbackCheckbox = screen.getByLabelText(
            "Fallback to visible non-zero tiles",
        ) as HTMLInputElement;
        if (fallbackCheckbox.checked) {
            await user.click(fallbackCheckbox);
        }

        await user.click(
            screen.getByRole("button", { name: "Apply collision profile" }),
        );

        const payload = screen.getByLabelText(
            "Tile map JSON payload",
        ) as HTMLTextAreaElement;
        const exported = JSON.parse(payload.value) as {
            collisionProfile?: {
                solidLayerIds?: string[];
                solidLayerNameContains?: string[];
                solidTileIds?: number[];
                fallbackToVisibleNonZero?: boolean;
            };
        };

        expect(exported.collisionProfile).toEqual({
            solidLayerIds: ["collision", "walls"],
            solidLayerNameContains: ["collision", "blocker"],
            solidTileIds: [4, 7, 11],
            fallbackToVisibleNonZero: false,
        });
    }, 10000);

    it("authors overlay entities in overlay mode and exports them", async () => {
        const user = userEvent.setup();
        render(<TileMapPlacementToolExample />);

        await user.clear(screen.getByLabelText("Overlay id"));
        await user.type(screen.getByLabelText("Overlay id"), "enemy-spawn-1");
        await user.clear(screen.getByLabelText("Overlay name"));
        await user.type(screen.getByLabelText("Overlay name"), "Enemy Spawn");
        await user.selectOptions(screen.getByLabelText("Type"), "enemy");
        await user.selectOptions(screen.getByLabelText("Tag"), "enemy");
        await user.clear(screen.getByLabelText("Room index"));
        await user.type(screen.getByLabelText("Room index"), "2");
        await user.clear(screen.getByLabelText("Tile id"));
        await user.type(screen.getByLabelText("Tile id"), "33");

        await user.click(screen.getByRole("button", { name: "Overlay mode" }));
        await user.click(screen.getByRole("button", { name: "Tile (2, 1)" }));

        expect(
            screen.getByText(/enemy-spawn-1 \(enemy\/enemy\) @ \(2, 1\)/),
        ).toBeInTheDocument();

        const payload = screen.getByLabelText(
            "Tile map JSON payload",
        ) as HTMLTextAreaElement;
        const exported = JSON.parse(payload.value) as {
            overlays?: Array<{
                id: string;
                name: string;
                type: string;
                tag: string;
                x: number;
                y: number;
                roomIndex: number;
                tileId?: number;
            }>;
        };

        expect(exported.overlays).toEqual([
            {
                id: "enemy-spawn-1",
                name: "Enemy Spawn",
                type: "enemy",
                tag: "enemy",
                x: 2,
                y: 1,
                roomIndex: 2,
                tileId: 33,
            },
        ]);
    }, 10000);

    it("prevents tile edits while active layer is locked", async () => {
        const user = userEvent.setup();
        render(<TileMapPlacementToolExample />);

        await user.click(screen.getByRole("button", { name: "Lock layer" }));
        await user.click(screen.getByRole("button", { name: "Tile (0, 0)" }));

        expect(screen.getByText(/Layer is locked\./)).toBeInTheDocument();

        const payload = screen.getByLabelText(
            "Tile map JSON payload",
        ) as HTMLTextAreaElement;
        expect(getFirstBaseTileValue(payload.value)).toBe(0);
    });
});
