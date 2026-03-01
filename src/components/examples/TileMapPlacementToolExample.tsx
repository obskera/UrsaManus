import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
} from "react";
import {
    createTileMapPlacementService,
    type TileMapCollisionProfile,
    type TileMapOverlayEntityInput,
    type TileMapPlacementSnapshot,
} from "@/services/tileMapPlacement";
import {
    exportBrowserJsonFile,
    readBrowserJsonFileText,
} from "@/services/browserJsonFile";
import {
    parseJsonDocument,
    stringifyJsonDocument,
    TOOL_JSON_MESSAGE,
} from "@/services/toolJsonDocument";
import {
    clearToolRecoverySnapshot,
    loadToolRecoverySnapshot,
    persistToolRecoverySnapshot,
} from "@/services/toolRecoverySnapshot";

export type TileMapPlacementToolExampleProps = {
    title?: string;
};

type EditMode = "paint" | "erase" | "pick" | "overlay";

type EditHistory = {
    entries: string[];
    index: number;
};

type ToolPerfDiagnostics = {
    label: string;
    durationMs: number;
    payloadBytes: number;
};

const TILEMAP_RECOVERY_TOOL_KEY = "tilemap";
const TILE_BRUSH_QUICK_SELECT = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const toCsvString = (values: string[]): string => {
    return values.join(", ");
};

const parseCsvStringList = (raw: string): string[] => {
    return raw
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
};

const parseCsvTileIdList = (raw: string): number[] => {
    return raw
        .split(",")
        .map((entry) => Number(entry.trim()))
        .filter((entry) => Number.isInteger(entry) && entry > 0)
        .map((entry) => Math.floor(entry));
};

const TileMapPlacementToolExample = ({
    title = "Tile map placement tool (MVP)",
}: TileMapPlacementToolExampleProps) => {
    const [service] = useState(() => {
        const createdService = createTileMapPlacementService();
        createdService.setMapBounds({ width: 16, height: 10 });
        return createdService;
    });

    const [snapshot, setSnapshot] = useState<TileMapPlacementSnapshot>(() => {
        return service.getSnapshot();
    });
    const [editMode, setEditMode] = useState<EditMode>("paint");
    const [brushTileId, setBrushTileId] = useState(1);
    const [newLayerId, setNewLayerId] = useState("details");
    const [initialRaw] = useState(() => {
        return stringifyJsonDocument(JSON.parse(service.exportPayload()));
    });
    const [importExportRaw, setImportExportRaw] = useState(initialRaw);
    const [history, setHistory] = useState<EditHistory>({
        entries: [initialRaw],
        index: 0,
    });
    const [savedRaw, setSavedRaw] = useState(initialRaw);
    const [actionLog, setActionLog] = useState<string[]>([]);
    const [status, setStatus] = useState("Ready.");
    const [lastAutosaveAt, setLastAutosaveAt] = useState<string | null>(null);
    const [perfDiagnostics, setPerfDiagnostics] =
        useState<ToolPerfDiagnostics | null>(null);
    const [collisionLayerIdsInput, setCollisionLayerIdsInput] = useState(() =>
        toCsvString(snapshot.collisionProfile.solidLayerIds),
    );
    const [
        collisionLayerNameContainsInput,
        setCollisionLayerNameContainsInput,
    ] = useState(() =>
        toCsvString(snapshot.collisionProfile.solidLayerNameContains),
    );
    const [collisionTileIdsInput, setCollisionTileIdsInput] = useState(() =>
        snapshot.collisionProfile.solidTileIds.join(", "),
    );
    const [collisionFallbackEnabled, setCollisionFallbackEnabled] = useState(
        () => snapshot.collisionProfile.fallbackToVisibleNonZero,
    );
    const [overlayIdInput, setOverlayIdInput] = useState("");
    const [overlayNameInput, setOverlayNameInput] = useState("Overlay Entity");
    const [overlayTypeInput, setOverlayTypeInput] =
        useState<TileMapOverlayEntityInput["type"]>("object");
    const [overlayTagInput, setOverlayTagInput] =
        useState<TileMapOverlayEntityInput["tag"]>("item");
    const [overlayRoomIndexInput, setOverlayRoomIndexInput] = useState("0");
    const [overlayTileIdInput, setOverlayTileIdInput] = useState("");

    const importFileInputRef = useRef<HTMLInputElement | null>(null);
    const actionSequenceRef = useRef(0);
    const initialRecoveryAttemptedRef = useRef(false);

    const isDirty = importExportRaw !== savedRaw;
    const canUndo = history.index > 0;
    const canRedo = history.index < history.entries.length - 1;

    const activeLayerId =
        snapshot.selectedLayerId ?? snapshot.layers[0]?.id ?? null;
    const activeLayer = useMemo(() => {
        if (!activeLayerId) {
            return null;
        }

        return (
            snapshot.layers.find((layer) => layer.id === activeLayerId) ?? null
        );
    }, [activeLayerId, snapshot.layers]);

    const appendActionLog = useCallback((label: string) => {
        actionSequenceRef.current += 1;
        const entry = `#${actionSequenceRef.current} ${label}`;
        setActionLog((current) => {
            return [entry, ...current].slice(0, 8);
        });
    }, []);

    const pushHistory = (nextRaw: string) => {
        setHistory((current) => {
            const currentRaw = current.entries[current.index];
            if (currentRaw === nextRaw) {
                return current;
            }

            const base = current.entries.slice(0, current.index + 1);
            const nextEntries = [...base, nextRaw];
            const maxEntries = 120;

            if (nextEntries.length > maxEntries) {
                const trimmed = nextEntries.slice(
                    nextEntries.length - maxEntries,
                );
                return {
                    entries: trimmed,
                    index: trimmed.length - 1,
                };
            }

            return {
                entries: nextEntries,
                index: nextEntries.length - 1,
            };
        });
    };

    const syncFromService = (
        nextStatus?: string,
        options?: {
            trackHistory?: boolean;
            actionLabel?: string;
        },
    ): string => {
        const nextRaw = stringifyJsonDocument(
            JSON.parse(service.exportPayload()),
        );
        setSnapshot(service.getSnapshot());
        setImportExportRaw(nextRaw);

        if (options?.trackHistory !== false) {
            pushHistory(nextRaw);
        }

        if (options?.actionLabel) {
            appendActionLog(options.actionLabel);
        }

        if (nextStatus) {
            setStatus(nextStatus);
        }

        return nextRaw;
    };

    const applyHistoryEntry = (raw: string, statusLabel: string) => {
        const result = service.importPayload(raw);
        if (!result.ok) {
            setStatus(result.message ?? "History restore failed.");
            return;
        }

        setSnapshot(service.getSnapshot());
        setImportExportRaw(raw);
        setStatus(statusLabel);
        appendActionLog(statusLabel);
    };

    useEffect(() => {
        if (!isDirty) {
            return;
        }

        const onBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = "";
        };

        window.addEventListener("beforeunload", onBeforeUnload);
        return () => {
            window.removeEventListener("beforeunload", onBeforeUnload);
        };
    }, [isDirty]);

    const recoverAutosaveSnapshot = useCallback(
        (options?: { silentMissing?: boolean }): boolean => {
            const loaded = loadToolRecoverySnapshot(TILEMAP_RECOVERY_TOOL_KEY);
            if (!loaded.ok) {
                if (loaded.removeCorrupt) {
                    clearToolRecoverySnapshot(TILEMAP_RECOVERY_TOOL_KEY);
                }

                if (!loaded.missing || !options?.silentMissing) {
                    setStatus(loaded.message);
                }

                if (loaded.missing) {
                    setLastAutosaveAt(null);
                }

                return false;
            }

            setLastAutosaveAt(loaded.envelope.savedAt);

            const autosaveRaw = loaded.envelope.payloadRaw;
            if (!autosaveRaw) {
                if (!options?.silentMissing) {
                    setStatus("Recovery snapshot ignored: payload is invalid.");
                }
                return false;
            }

            const parsed = parseJsonDocument<unknown>(autosaveRaw, {
                invalidJsonMessage: "Recovery snapshot ignored: invalid JSON.",
            });
            if (!parsed.ok) {
                clearToolRecoverySnapshot(TILEMAP_RECOVERY_TOOL_KEY);
                setLastAutosaveAt(null);
                setStatus(parsed.message);
                return false;
            }

            const normalizedAutosaveRaw = stringifyJsonDocument(parsed.value);
            if (normalizedAutosaveRaw === importExportRaw) {
                if (!options?.silentMissing) {
                    setStatus("Autosave snapshot is already applied.");
                }
                return false;
            }

            const result = service.importPayload(autosaveRaw);
            if (!result.ok) {
                clearToolRecoverySnapshot(TILEMAP_RECOVERY_TOOL_KEY);
                setLastAutosaveAt(null);
                setStatus(result.message ?? "Recovery snapshot ignored.");
                return false;
            }

            const nextRaw = stringifyJsonDocument(
                JSON.parse(service.exportPayload()),
            );
            setSnapshot(service.getSnapshot());
            setImportExportRaw(nextRaw);
            setHistory({
                entries: [nextRaw],
                index: 0,
            });
            setStatus("Recovered autosave snapshot.");
            appendActionLog("Recover autosave snapshot");
            return true;
        },
        [appendActionLog, importExportRaw, service],
    );

    useEffect(() => {
        if (initialRecoveryAttemptedRef.current) {
            return;
        }

        initialRecoveryAttemptedRef.current = true;
        recoverAutosaveSnapshot({ silentMissing: true });
    }, [recoverAutosaveSnapshot]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            const persisted = persistToolRecoverySnapshot(
                TILEMAP_RECOVERY_TOOL_KEY,
                importExportRaw,
            );

            if (!persisted.ok) {
                setStatus(persisted.message);
                setLastAutosaveAt(null);
                return;
            }

            setLastAutosaveAt(persisted.envelope.savedAt);
        }, 250);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [importExportRaw]);

    useEffect(() => {
        setCollisionLayerIdsInput(
            toCsvString(snapshot.collisionProfile.solidLayerIds),
        );
        setCollisionLayerNameContainsInput(
            toCsvString(snapshot.collisionProfile.solidLayerNameContains),
        );
        setCollisionTileIdsInput(
            snapshot.collisionProfile.solidTileIds.join(", "),
        );
        setCollisionFallbackEnabled(
            snapshot.collisionProfile.fallbackToVisibleNonZero,
        );
    }, [snapshot.collisionProfile]);

    const onApplyCollisionProfile = () => {
        const nextProfile: Partial<TileMapCollisionProfile> = {
            solidLayerIds: parseCsvStringList(collisionLayerIdsInput),
            solidLayerNameContains: parseCsvStringList(
                collisionLayerNameContainsInput,
            ),
            solidTileIds: parseCsvTileIdList(collisionTileIdsInput),
            fallbackToVisibleNonZero: collisionFallbackEnabled,
        };

        service.setCollisionProfile(nextProfile);
        syncFromService("Updated collision profile.", {
            actionLabel: "Update collision profile",
        });
    };

    const onGridCellClick = (x: number, y: number, forcePick = false) => {
        if (editMode === "pick" || forcePick) {
            const pickedTileId = service.getTileAt(
                x,
                y,
                activeLayerId ?? undefined,
            );
            setBrushTileId(pickedTileId);
            appendActionLog(`Pick tile ${pickedTileId} @ (${x}, ${y})`);
            if (editMode === "pick") {
                setEditMode("paint");
                setStatus(
                    `Picked tile ${pickedTileId} from (${x}, ${y}) and switched to paint mode.`,
                );
            } else {
                setStatus(`Picked tile ${pickedTileId} from (${x}, ${y}).`);
            }
            return;
        }

        if (editMode === "overlay") {
            const parsedRoomIndex = Number(overlayRoomIndexInput);
            const parsedTileId = Number(overlayTileIdInput);
            const result = service.addOverlayEntity({
                ...(overlayIdInput.trim() ? { id: overlayIdInput.trim() } : {}),
                name: overlayNameInput,
                type: overlayTypeInput,
                tag: overlayTagInput,
                x,
                y,
                roomIndex: Number.isFinite(parsedRoomIndex)
                    ? Math.max(0, Math.floor(parsedRoomIndex))
                    : 0,
                ...(Number.isFinite(parsedTileId)
                    ? { tileId: Math.max(0, Math.floor(parsedTileId)) }
                    : {}),
            });

            if (!result.ok) {
                setStatus(result.message ?? "Overlay placement failed.");
                return;
            }

            syncFromService(`Placed overlay at (${x}, ${y}).`, {
                actionLabel: `Place overlay @ (${x}, ${y})`,
            });
            return;
        }

        const result =
            editMode === "paint"
                ? service.placeTile(
                      x,
                      y,
                      brushTileId,
                      activeLayerId ?? undefined,
                  )
                : service.eraseTile(x, y, activeLayerId ?? undefined);

        if (!result.ok) {
            setStatus(result.message ?? "Tile edit failed.");
            return;
        }

        syncFromService(
            editMode === "paint"
                ? `Painted tile ${brushTileId} at (${x}, ${y}).`
                : `Erased tile at (${x}, ${y}).`,
            {
                actionLabel:
                    editMode === "paint"
                        ? `Paint tile ${brushTileId} @ (${x}, ${y})`
                        : `Erase tile @ (${x}, ${y})`,
            },
        );
    };

    const onResizeMap = () => {
        const parsedWidth = Number(
            window.prompt("Map width", String(snapshot.map.width)),
        );
        const parsedHeight = Number(
            window.prompt("Map height", String(snapshot.map.height)),
        );

        if (!Number.isFinite(parsedWidth) || !Number.isFinite(parsedHeight)) {
            setStatus("Resize cancelled.");
            return;
        }

        service.setMapBounds({ width: parsedWidth, height: parsedHeight });
        syncFromService(
            `Resized map to ${Math.floor(parsedWidth)}x${Math.floor(parsedHeight)}.`,
            {
                actionLabel: `Resize map -> ${Math.floor(parsedWidth)}x${Math.floor(parsedHeight)}`,
            },
        );
    };

    const onAddLayer = () => {
        const result = service.addLayer({
            id: newLayerId,
            select: true,
        });

        if (!result.ok) {
            setStatus(result.message ?? "Unable to add layer.");
            return;
        }

        syncFromService(`Added and selected layer "${newLayerId.trim()}".`, {
            actionLabel: `Add layer ${newLayerId.trim()}`,
        });
    };

    const onImportPayload = () => {
        const parsed = parseJsonDocument<unknown>(importExportRaw, {
            invalidJsonMessage: TOOL_JSON_MESSAGE.importInvalidJson,
        });
        if (!parsed.ok) {
            setStatus(parsed.message);
            return;
        }

        const result = service.importPayload(importExportRaw);
        if (!result.ok) {
            setStatus(result.message ?? "Import failed.");
            return;
        }

        const nextRaw = syncFromService("Imported tile map payload.", {
            actionLabel: "Import JSON payload",
        });
        setSavedRaw(nextRaw);
    };

    const exportJsonFile = () => {
        const fileName = "tilemap-layout.json";

        const result = exportBrowserJsonFile(importExportRaw, fileName);
        if (!result.ok) {
            setStatus(result.message);
            return;
        }

        setSavedRaw(importExportRaw);
        appendActionLog("Export JSON file");
        setStatus(`Exported ${fileName}.`);
    };

    const onOpenRuntimePlaytest = () => {
        const currentRaw = stringifyJsonDocument(
            JSON.parse(service.exportPayload()),
        );
        const persisted = persistToolRecoverySnapshot(
            TILEMAP_RECOVERY_TOOL_KEY,
            currentRaw,
        );
        if (!persisted.ok) {
            setStatus(persisted.message);
            setLastAutosaveAt(null);
            return;
        }

        setLastAutosaveAt(persisted.envelope.savedAt);
        setStatus(
            "Playtest launch: payload ready, opening runtime from current tilemap state.",
        );
        appendActionLog("Open runtime playtest");

        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.delete("tool");
        window.open(nextUrl.toString(), "_self");
    };

    const onVerifyRoundTrip = () => {
        const startedAt = performance.now();
        const parsed = parseJsonDocument<unknown>(importExportRaw, {
            invalidJsonMessage: TOOL_JSON_MESSAGE.validationInvalidJson,
        });
        if (!parsed.ok) {
            setStatus(`Round-trip verification failed: ${parsed.message}`);
            return;
        }

        const normalizedInputRaw = stringifyJsonDocument(parsed.value);
        const imported = service.importPayload(normalizedInputRaw);
        if (!imported.ok) {
            setStatus(
                `Round-trip verification failed: ${imported.message ?? "Import failed."}`,
            );
            return;
        }

        const roundTrippedRaw = stringifyJsonDocument(
            JSON.parse(service.exportPayload()),
        );
        const noSemanticDrift = normalizedInputRaw === roundTrippedRaw;

        syncFromService(
            noSemanticDrift
                ? "Round-trip verification passed: no semantic drift detected."
                : "Round-trip verification warning: semantic drift detected after re-import.",
            {
                actionLabel: "Verify round-trip",
            },
        );
        setPerfDiagnostics({
            label: "Round-trip verification",
            durationMs: Math.round((performance.now() - startedAt) * 10) / 10,
            payloadBytes: new TextEncoder().encode(roundTrippedRaw).length,
        });
    };

    const onRunPerfDiagnostics = () => {
        const startedAt = performance.now();

        const parsed = parseJsonDocument<unknown>(importExportRaw, {
            invalidJsonMessage: TOOL_JSON_MESSAGE.validationInvalidJson,
        });
        if (!parsed.ok) {
            setStatus(`Perf diagnostics failed: ${parsed.message}`);
            return;
        }

        const normalizedRaw = stringifyJsonDocument(parsed.value);
        const imported = service.importPayload(normalizedRaw);
        if (!imported.ok) {
            setStatus(
                `Perf diagnostics failed: ${imported.message ?? "Import failed."}`,
            );
            return;
        }

        const nextRaw = syncFromService(undefined, {
            trackHistory: false,
            actionLabel: "Run perf diagnostics",
        });
        const durationMs =
            Math.round((performance.now() - startedAt) * 10) / 10;
        setPerfDiagnostics({
            label: "Import/export smoke",
            durationMs,
            payloadBytes: new TextEncoder().encode(nextRaw).length,
        });
        setStatus(
            `Perf diagnostics complete: import/export smoke in ${durationMs}ms.`,
        );
    };

    const onImportFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        try {
            const readResult = await readBrowserJsonFileText(file);
            if (!readResult.ok) {
                setStatus(readResult.message);
                return;
            }

            const parsed = parseJsonDocument<unknown>(readResult.raw, {
                invalidJsonMessage: TOOL_JSON_MESSAGE.importInvalidJsonFile,
            });
            if (!parsed.ok) {
                setStatus(parsed.message);
                return;
            }

            const result = service.importPayload(readResult.raw);
            if (!result.ok) {
                setStatus(result.message ?? "Import failed.");
                return;
            }

            const nextRaw = syncFromService(`Imported ${file.name}.`, {
                actionLabel: `Import file ${file.name}`,
            });
            setSavedRaw(nextRaw);
        } finally {
            event.target.value = "";
        }
    };

    const layerSelectLabel = `Active layer: ${activeLayer?.name ?? "none"}`;

    return (
        <section className="um-container um-stack" aria-label={title}>
            <h3 className="um-title">{title}</h3>
            <p className="um-help">
                Localhost tile tool MVP with paint/erase/pick, layer control,
                and deterministic JSON export/import ready for runtime
                integration.
            </p>
            <p className="um-help">
                Shortcut: hold Alt and click any tile to pick it into the brush.
            </p>

            <div className="um-row" role="group" aria-label="Tile map controls">
                <button
                    type="button"
                    className={
                        editMode === "paint"
                            ? "um-button um-button--primary"
                            : "um-button"
                    }
                    onClick={() => {
                        setEditMode("paint");
                    }}
                >
                    Paint mode
                </button>
                <button
                    type="button"
                    className={
                        editMode === "erase"
                            ? "um-button um-button--primary"
                            : "um-button"
                    }
                    onClick={() => {
                        setEditMode("erase");
                    }}
                >
                    Erase mode
                </button>
                <button
                    type="button"
                    className={
                        editMode === "pick"
                            ? "um-button um-button--primary"
                            : "um-button"
                    }
                    onClick={() => {
                        setEditMode("pick");
                    }}
                >
                    Pick mode
                </button>
                <button
                    type="button"
                    className={
                        editMode === "overlay"
                            ? "um-button um-button--primary"
                            : "um-button"
                    }
                    onClick={() => {
                        setEditMode("overlay");
                    }}
                >
                    Overlay mode
                </button>
                <label className="um-label" htmlFor="tilemap-brush-id">
                    Brush tile id
                </label>
                <input
                    id="tilemap-brush-id"
                    className="um-input"
                    type="number"
                    min={0}
                    step={1}
                    value={brushTileId}
                    onChange={(event) => {
                        const parsed = Number(event.target.value);
                        if (!Number.isFinite(parsed)) {
                            return;
                        }

                        setBrushTileId(Math.max(0, Math.floor(parsed)));
                    }}
                    style={{ width: "6rem" }}
                />
                <div
                    className="um-row"
                    role="group"
                    aria-label="Tile brush quick select"
                >
                    {TILE_BRUSH_QUICK_SELECT.map((tileId) => (
                        <button
                            key={`tile-brush-${tileId}`}
                            type="button"
                            className={
                                brushTileId === tileId
                                    ? "um-button um-button--primary"
                                    : "um-button"
                            }
                            onClick={() => {
                                setBrushTileId(tileId);
                                setStatus(`Brush set to tile ${tileId}.`);
                            }}
                        >
                            Tile {tileId}
                        </button>
                    ))}
                </div>
                <button
                    type="button"
                    className="um-button"
                    onClick={() => {
                        const result = service.clearLayer(
                            activeLayerId ?? undefined,
                        );
                        if (!result.ok) {
                            setStatus(
                                result.message ?? "Unable to clear layer.",
                            );
                            return;
                        }

                        syncFromService("Cleared active layer.", {
                            actionLabel: "Clear active layer",
                        });
                    }}
                >
                    Clear active layer
                </button>
                <button
                    type="button"
                    className="um-button"
                    onClick={onResizeMap}
                >
                    Resize map
                </button>
                <button
                    type="button"
                    className="um-button"
                    onClick={() => {
                        if (!canUndo) {
                            return;
                        }

                        const nextIndex = history.index - 1;
                        const nextRaw = history.entries[nextIndex];
                        setHistory((current) => ({
                            ...current,
                            index: nextIndex,
                        }));
                        applyHistoryEntry(nextRaw, "Undo applied.");
                    }}
                    disabled={!canUndo}
                >
                    Undo
                </button>
                <button
                    type="button"
                    className="um-button"
                    onClick={() => {
                        if (!canRedo) {
                            return;
                        }

                        const nextIndex = history.index + 1;
                        const nextRaw = history.entries[nextIndex];
                        setHistory((current) => ({
                            ...current,
                            index: nextIndex,
                        }));
                        applyHistoryEntry(nextRaw, "Redo applied.");
                    }}
                    disabled={!canRedo}
                >
                    Redo
                </button>
                <button
                    type="button"
                    className="um-button"
                    onClick={exportJsonFile}
                >
                    Export JSON file
                </button>
                <button
                    type="button"
                    className="um-button"
                    onClick={() => {
                        importFileInputRef.current?.click();
                    }}
                >
                    Import JSON file
                </button>
                <button
                    type="button"
                    className="um-button um-button--primary"
                    onClick={onOpenRuntimePlaytest}
                >
                    Open in runtime playtest
                </button>
                <button
                    type="button"
                    className="um-button"
                    onClick={onVerifyRoundTrip}
                >
                    Verify round-trip
                </button>
                <input
                    ref={importFileInputRef}
                    type="file"
                    accept="application/json,.json"
                    aria-label="Import tile map JSON file"
                    style={{ display: "none" }}
                    onChange={(event) => {
                        void onImportFileChange(event);
                    }}
                />
            </div>

            <div className="um-panel um-stack">
                <div
                    className="um-row"
                    role="group"
                    aria-label="Layer controls"
                >
                    <span className="um-capsule">{layerSelectLabel}</span>
                    <label className="um-label" htmlFor="tilemap-layer-select">
                        Select layer
                    </label>
                    <select
                        id="tilemap-layer-select"
                        className="um-select"
                        value={activeLayerId ?? ""}
                        onChange={(event) => {
                            const nextLayerId = event.target.value;
                            service.selectLayer(nextLayerId || null);
                            syncFromService(
                                `Selected layer "${nextLayerId || "none"}".`,
                                {
                                    trackHistory: false,
                                    actionLabel: `Select layer ${nextLayerId || "none"}`,
                                },
                            );
                        }}
                    >
                        {snapshot.layers.map((layer) => (
                            <option key={layer.id} value={layer.id}>
                                {layer.name}
                            </option>
                        ))}
                    </select>
                    <label className="um-label" htmlFor="tilemap-new-layer-id">
                        New layer id
                    </label>
                    <input
                        id="tilemap-new-layer-id"
                        className="um-input"
                        type="text"
                        value={newLayerId}
                        onChange={(event) => {
                            setNewLayerId(event.target.value);
                        }}
                        style={{ width: "10rem" }}
                    />
                    <button
                        type="button"
                        className="um-button"
                        onClick={onAddLayer}
                    >
                        Add layer
                    </button>
                    <button
                        type="button"
                        className="um-button"
                        onClick={() => {
                            if (!activeLayerId) {
                                setStatus("No active layer to remove.");
                                return;
                            }

                            const removed = service.removeLayer(activeLayerId);
                            if (!removed) {
                                setStatus(
                                    "Unable to remove layer (base layer is protected).",
                                );
                                return;
                            }

                            syncFromService("Removed active layer.", {
                                actionLabel: "Remove active layer",
                            });
                        }}
                    >
                        Remove active layer
                    </button>
                    <button
                        type="button"
                        className="um-button"
                        onClick={() => {
                            if (!activeLayerId || !activeLayer) {
                                setStatus(
                                    "No active layer to toggle visibility.",
                                );
                                return;
                            }

                            service.setLayerVisibility(
                                activeLayerId,
                                !activeLayer.visible,
                            );
                            syncFromService(
                                `${activeLayer.name} visibility set to ${
                                    !activeLayer.visible ? "shown" : "hidden"
                                }.`,
                                {
                                    actionLabel: `${activeLayer.name} visibility -> ${
                                        !activeLayer.visible
                                            ? "shown"
                                            : "hidden"
                                    }`,
                                },
                            );
                        }}
                    >
                        Toggle visibility
                    </button>
                    <button
                        type="button"
                        className="um-button"
                        onClick={() => {
                            if (!activeLayerId || !activeLayer) {
                                setStatus("No active layer to lock/unlock.");
                                return;
                            }

                            const changed = service.setLayerLocked(
                                activeLayerId,
                                !activeLayer.locked,
                            );
                            if (!changed) {
                                setStatus("Unable to update layer lock state.");
                                return;
                            }

                            syncFromService(
                                `${activeLayer.name} ${
                                    !activeLayer.locked ? "locked" : "unlocked"
                                }.`,
                                {
                                    actionLabel: `${activeLayer.name} lock -> ${
                                        !activeLayer.locked
                                            ? "locked"
                                            : "unlocked"
                                    }`,
                                },
                            );
                        }}
                    >
                        {activeLayer?.locked ? "Unlock layer" : "Lock layer"}
                    </button>
                    <button
                        type="button"
                        className="um-button"
                        onClick={() => {
                            if (!activeLayerId) {
                                setStatus("No active layer to move.");
                                return;
                            }

                            const moved = service.moveLayer(
                                activeLayerId,
                                "up",
                            );
                            if (!moved) {
                                setStatus("Layer cannot move further up.");
                                return;
                            }

                            syncFromService("Moved active layer up.", {
                                actionLabel: "Move layer up",
                            });
                        }}
                    >
                        Move layer up
                    </button>
                    <button
                        type="button"
                        className="um-button"
                        onClick={() => {
                            if (!activeLayerId) {
                                setStatus("No active layer to move.");
                                return;
                            }

                            const moved = service.moveLayer(
                                activeLayerId,
                                "down",
                            );
                            if (!moved) {
                                setStatus("Layer cannot move further down.");
                                return;
                            }

                            syncFromService("Moved active layer down.", {
                                actionLabel: "Move layer down",
                            });
                        }}
                    >
                        Move layer down
                    </button>
                    <button
                        type="button"
                        className="um-button"
                        onClick={() => {
                            if (!activeLayerId) {
                                setStatus("No active layer to duplicate.");
                                return;
                            }

                            const requested = window.prompt(
                                "Duplicate layer id",
                                `${activeLayerId}-copy`,
                            );
                            if (requested === null) {
                                setStatus("Duplicate layer cancelled.");
                                return;
                            }

                            const result = service.duplicateLayer(
                                activeLayerId,
                                requested,
                            );
                            if (!result.ok) {
                                setStatus(
                                    result.message ??
                                        "Unable to duplicate layer.",
                                );
                                return;
                            }

                            syncFromService("Duplicated active layer.", {
                                actionLabel: "Duplicate layer",
                            });
                        }}
                    >
                        Duplicate layer
                    </button>
                    <button
                        type="button"
                        className="um-button"
                        onClick={() => {
                            if (!activeLayerId) {
                                setStatus("No active layer to merge.");
                                return;
                            }

                            const targetLayerId = window.prompt(
                                "Merge active layer into layer id",
                                "base",
                            );
                            if (!targetLayerId) {
                                setStatus("Merge layer cancelled.");
                                return;
                            }

                            const removeSource = window.confirm(
                                "Remove source layer after merge?",
                            );
                            const result = service.mergeLayerInto(
                                activeLayerId,
                                targetLayerId,
                                { removeSource },
                            );
                            if (!result.ok) {
                                setStatus(
                                    result.message ?? "Unable to merge layer.",
                                );
                                return;
                            }

                            syncFromService(
                                `Merged ${activeLayerId} into ${targetLayerId}.`,
                                {
                                    actionLabel: `Merge ${activeLayerId} -> ${targetLayerId}`,
                                },
                            );
                        }}
                    >
                        Merge layer into...
                    </button>
                </div>

                <div
                    className="um-panel"
                    aria-label="Tile paint grid"
                    style={{
                        display: "grid",
                        gridTemplateColumns: `repeat(${snapshot.map.width}, 18px)`,
                        gap: "2px",
                        padding: "0.5rem",
                        width: "fit-content",
                        overflowX: "auto",
                        maxWidth: "100%",
                    }}
                >
                    {Array.from(
                        { length: snapshot.map.width * snapshot.map.height },
                        (_, index) => {
                            const x = index % snapshot.map.width;
                            const y = Math.floor(index / snapshot.map.width);
                            const tileId = service.getTileAt(
                                x,
                                y,
                                activeLayerId ?? undefined,
                            );

                            return (
                                <button
                                    key={`cell-${x}-${y}`}
                                    type="button"
                                    aria-label={`Tile (${x}, ${y})`}
                                    title={`(${x}, ${y}) = ${tileId}`}
                                    onClick={(event) => {
                                        onGridCellClick(x, y, event.altKey);
                                    }}
                                    style={{
                                        width: "18px",
                                        height: "18px",
                                        padding: 0,
                                        border: "1px solid rgba(255,255,255,0.18)",
                                        background:
                                            tileId > 0
                                                ? "rgba(89, 166, 255, 0.9)"
                                                : "rgba(255,255,255,0.08)",
                                        color: "transparent",
                                    }}
                                >
                                    {tileId}
                                </button>
                            );
                        },
                    )}
                </div>

                <div
                    className="um-panel um-stack"
                    aria-label="Overlay controls"
                >
                    <p className="um-help">
                        Overlay mode places authored entity records at clicked
                        tile coordinates.
                    </p>
                    <div
                        className="um-row"
                        role="group"
                        aria-label="Overlay authoring fields"
                    >
                        <label
                            className="um-label"
                            htmlFor="tilemap-overlay-id"
                        >
                            Overlay id
                        </label>
                        <input
                            id="tilemap-overlay-id"
                            className="um-input"
                            type="text"
                            value={overlayIdInput}
                            onChange={(event) => {
                                setOverlayIdInput(event.target.value);
                            }}
                            style={{ width: "9rem" }}
                            placeholder="auto"
                        />
                        <label
                            className="um-label"
                            htmlFor="tilemap-overlay-name"
                        >
                            Overlay name
                        </label>
                        <input
                            id="tilemap-overlay-name"
                            className="um-input"
                            type="text"
                            value={overlayNameInput}
                            onChange={(event) => {
                                setOverlayNameInput(event.target.value);
                            }}
                            style={{ width: "10rem" }}
                        />
                        <label
                            className="um-label"
                            htmlFor="tilemap-overlay-type"
                        >
                            Type
                        </label>
                        <select
                            id="tilemap-overlay-type"
                            className="um-select"
                            value={overlayTypeInput}
                            onChange={(event) => {
                                setOverlayTypeInput(
                                    event.target
                                        .value as TileMapOverlayEntityInput["type"],
                                );
                            }}
                        >
                            <option value="object">object</option>
                            <option value="enemy">enemy</option>
                            <option value="player">player</option>
                        </select>
                        <label
                            className="um-label"
                            htmlFor="tilemap-overlay-tag"
                        >
                            Tag
                        </label>
                        <select
                            id="tilemap-overlay-tag"
                            className="um-select"
                            value={overlayTagInput}
                            onChange={(event) => {
                                setOverlayTagInput(
                                    event.target
                                        .value as TileMapOverlayEntityInput["tag"],
                                );
                            }}
                        >
                            <option value="item">item</option>
                            <option value="enemy">enemy</option>
                            <option value="objective">objective</option>
                            <option value="player-start">player-start</option>
                        </select>
                        <label
                            className="um-label"
                            htmlFor="tilemap-overlay-room-index"
                        >
                            Room index
                        </label>
                        <input
                            id="tilemap-overlay-room-index"
                            className="um-input"
                            type="number"
                            min={0}
                            step={1}
                            value={overlayRoomIndexInput}
                            onChange={(event) => {
                                setOverlayRoomIndexInput(event.target.value);
                            }}
                            style={{ width: "6rem" }}
                        />
                        <label
                            className="um-label"
                            htmlFor="tilemap-overlay-tile-id"
                        >
                            Tile id
                        </label>
                        <input
                            id="tilemap-overlay-tile-id"
                            className="um-input"
                            type="number"
                            min={0}
                            step={1}
                            value={overlayTileIdInput}
                            onChange={(event) => {
                                setOverlayTileIdInput(event.target.value);
                            }}
                            style={{ width: "6rem" }}
                            placeholder="optional"
                        />
                    </div>
                    {snapshot.overlays.length > 0 ? (
                        <ul className="um-list" aria-label="Overlay entities">
                            {snapshot.overlays.map((overlay) => (
                                <li key={overlay.id} className="um-list-item">
                                    {overlay.id} ({overlay.type}/{overlay.tag})
                                    @ ({overlay.x}, {overlay.y})
                                    <button
                                        type="button"
                                        className="um-button"
                                        onClick={() => {
                                            const removed =
                                                service.removeOverlayEntity(
                                                    overlay.id,
                                                );
                                            if (!removed) {
                                                setStatus(
                                                    `Unable to remove overlay ${overlay.id}.`,
                                                );
                                                return;
                                            }

                                            syncFromService(
                                                `Removed overlay ${overlay.id}.`,
                                                {
                                                    actionLabel: `Remove overlay ${overlay.id}`,
                                                },
                                            );
                                        }}
                                        style={{ marginLeft: "0.5rem" }}
                                    >
                                        Remove
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="um-help">No overlays authored yet.</p>
                    )}
                </div>

                <div
                    className="um-panel um-stack"
                    aria-label="Collision profile"
                >
                    <p className="um-help">
                        Collision profile controls runtime solid-tile
                        extraction.
                    </p>
                    <label
                        className="um-label"
                        htmlFor="tilemap-collision-layer-ids"
                    >
                        Solid layer ids (comma-separated)
                    </label>
                    <input
                        id="tilemap-collision-layer-ids"
                        className="um-input"
                        type="text"
                        value={collisionLayerIdsInput}
                        onChange={(event) => {
                            setCollisionLayerIdsInput(event.target.value);
                        }}
                    />
                    <label
                        className="um-label"
                        htmlFor="tilemap-collision-layer-name-contains"
                    >
                        Solid layer name contains (comma-separated)
                    </label>
                    <input
                        id="tilemap-collision-layer-name-contains"
                        className="um-input"
                        type="text"
                        value={collisionLayerNameContainsInput}
                        onChange={(event) => {
                            setCollisionLayerNameContainsInput(
                                event.target.value,
                            );
                        }}
                    />
                    <label
                        className="um-label"
                        htmlFor="tilemap-collision-tile-ids"
                    >
                        Solid tile ids (comma-separated)
                    </label>
                    <input
                        id="tilemap-collision-tile-ids"
                        className="um-input"
                        type="text"
                        value={collisionTileIdsInput}
                        onChange={(event) => {
                            setCollisionTileIdsInput(event.target.value);
                        }}
                    />
                    <label
                        className="um-label"
                        htmlFor="tilemap-collision-fallback"
                    >
                        <input
                            id="tilemap-collision-fallback"
                            type="checkbox"
                            checked={collisionFallbackEnabled}
                            onChange={(event) => {
                                setCollisionFallbackEnabled(
                                    event.target.checked,
                                );
                            }}
                        />{" "}
                        Fallback to visible non-zero tiles
                    </label>
                    <div
                        className="um-row"
                        role="group"
                        aria-label="Collision profile controls"
                    >
                        <button
                            type="button"
                            className="um-button"
                            onClick={onApplyCollisionProfile}
                        >
                            Apply collision profile
                        </button>
                    </div>
                </div>

                <p className="um-help" aria-live="polite">
                    {status} Map: {snapshot.map.width}x{snapshot.map.height}.
                    Layers: {snapshot.layerCount}. Filled tiles:{" "}
                    {snapshot.filledTileCount}.
                </p>
                <div
                    className="um-row"
                    role="group"
                    aria-label="Recovery controls"
                >
                    <span className="um-capsule">
                        Last autosave: {lastAutosaveAt ?? "none"}
                    </span>
                    <button
                        type="button"
                        className="um-button"
                        onClick={() => {
                            recoverAutosaveSnapshot();
                        }}
                        disabled={!lastAutosaveAt}
                    >
                        Recover autosave
                    </button>
                    <button
                        type="button"
                        className="um-button"
                        onClick={() => {
                            clearToolRecoverySnapshot(
                                TILEMAP_RECOVERY_TOOL_KEY,
                            );
                            setLastAutosaveAt(null);
                            setStatus("Cleared autosave snapshot.");
                            appendActionLog("Clear autosave snapshot");
                        }}
                        disabled={!lastAutosaveAt}
                    >
                        Clear autosave
                    </button>
                </div>
                <p className="um-help">
                    History: {history.index + 1}/{history.entries.length}.
                    Unsaved changes: {isDirty ? "Yes" : "No"}.
                </p>
                <p className="um-help">
                    Perf: payload{" "}
                    {(
                        new TextEncoder().encode(importExportRaw).length / 1024
                    ).toFixed(1)}
                    KB.
                    {perfDiagnostics
                        ? ` Last sample (${perfDiagnostics.label}): ${perfDiagnostics.durationMs}ms.`
                        : " Last sample: none."}
                </p>
                {actionLog.length > 0 ? (
                    <ul className="um-list" aria-label="Tilemap action log">
                        {actionLog.map((entry) => (
                            <li key={entry} className="um-list-item">
                                {entry}
                            </li>
                        ))}
                    </ul>
                ) : null}
            </div>

            <div className="um-panel um-stack">
                <label className="um-label" htmlFor="tilemap-json-payload">
                    Tile map JSON payload
                </label>
                <textarea
                    id="tilemap-json-payload"
                    className="um-textarea"
                    value={importExportRaw}
                    onChange={(event) => {
                        setImportExportRaw(event.target.value);
                    }}
                    style={{ minHeight: "12rem" }}
                />
                <div
                    className="um-row"
                    role="group"
                    aria-label="Payload controls"
                >
                    <button
                        type="button"
                        className="um-button"
                        onClick={() => {
                            setImportExportRaw(
                                stringifyJsonDocument(
                                    JSON.parse(service.exportPayload()),
                                ),
                            );
                            appendActionLog("Refresh export payload");
                            setStatus("Exported latest payload.");
                        }}
                    >
                        Refresh export
                    </button>
                    <button
                        type="button"
                        className="um-button um-button--primary"
                        onClick={onImportPayload}
                    >
                        Import JSON
                    </button>
                    <button
                        type="button"
                        className="um-button"
                        onClick={onRunPerfDiagnostics}
                    >
                        Run perf diagnostics
                    </button>
                </div>
            </div>
        </section>
    );
};

export default TileMapPlacementToolExample;
