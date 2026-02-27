import { useEffect, useMemo, useRef, useState } from "react";
import { SideScrollerCanvas } from "@/components/gameModes";
import { PlatformerHUDPreset } from "@/components/hudAnchor";
import { SideScrollerControls } from "@/components/screenController";
import { dataBus } from "@/services/DataBus";

export type SideScrollerMiniGameExampleProps = {
    title?: string;
};

type MissionState = "playing" | "won" | "lost";

type CollectibleZone = {
    id: string;
    label: string;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
};

const COLLECTIBLE_ZONES: CollectibleZone[] = [
    {
        id: "chip-a",
        label: "Collect data chip A",
        minX: 20,
        maxX: 120,
        minY: 0,
        maxY: 150,
    },
    {
        id: "chip-b",
        label: "Collect data chip B",
        minX: 180,
        maxX: 300,
        minY: 0,
        maxY: 190,
    },
    {
        id: "chip-c",
        label: "Collect data chip C",
        minX: 330,
        maxX: 500,
        minY: 0,
        maxY: 180,
    },
];

const HAZARD_ZONE = {
    minX: 350,
    maxX: 520,
    minY: 210,
    maxY: 320,
};

const ROUND_DURATION_MS = 30_000;

function resolveCollectibleId(x: number, y: number): string | null {
    const matched = COLLECTIBLE_ZONES.find(
        (zone) =>
            x >= zone.minX &&
            x <= zone.maxX &&
            y >= zone.minY &&
            y <= zone.maxY,
    );

    return matched?.id ?? null;
}

function isHazardPosition(x: number, y: number) {
    return (
        x >= HAZARD_ZONE.minX &&
        x <= HAZARD_ZONE.maxX &&
        y >= HAZARD_ZONE.minY &&
        y <= HAZARD_ZONE.maxY
    );
}

const SideScrollerMiniGameExample = ({
    title = "Sidescroller mini game MVP",
}: SideScrollerMiniGameExampleProps) => {
    const [missionState, setMissionState] = useState<MissionState>("playing");
    const [collectedIds, setCollectedIds] = useState<string[]>([]);
    const [lives, setLives] = useState(2);
    const [timeRemainingMs, setTimeRemainingMs] = useState(ROUND_DURATION_MS);
    const [runNumber, setRunNumber] = useState(1);
    const [sceneSeed, setSceneSeed] = useState(1);
    const wasInHazardRef = useRef(false);

    useEffect(() => {
        if (missionState !== "playing") return;

        const timer = window.setInterval(() => {
            setTimeRemainingMs((current) => {
                const next = Math.max(0, current - 250);
                if (next === 0) {
                    setMissionState("lost");
                }
                return next;
            });
        }, 250);

        return () => {
            window.clearInterval(timer);
        };
    }, [missionState]);

    const refreshMissionProgress = () => {
        if (missionState !== "playing") return;

        const player = dataBus.getPlayer();
        const playerX = player.position.x;
        const playerY = player.position.y;

        const collectibleId = resolveCollectibleId(playerX, playerY);
        if (collectibleId) {
            setCollectedIds((current) => {
                if (current.includes(collectibleId)) {
                    return current;
                }

                const next = [...current, collectibleId];
                if (next.length >= COLLECTIBLE_ZONES.length) {
                    setMissionState("won");
                }

                return next;
            });
        }

        const inHazardNow = isHazardPosition(playerX, playerY);
        if (inHazardNow && !wasInHazardRef.current) {
            setLives((current) => {
                const next = Math.max(0, current - 1);
                if (next === 0) {
                    setMissionState("lost");
                }
                return next;
            });
        }

        wasInHazardRef.current = inHazardNow;
    };

    const restartRun = () => {
        dataBus.setState((prev) => {
            const player = prev.entitiesById[prev.playerId];
            if (!player) return prev;

            return {
                ...prev,
                entitiesById: {
                    ...prev.entitiesById,
                    [player.id]: {
                        ...player,
                        position: { x: 10, y: 10 },
                    },
                },
            };
        });

        wasInHazardRef.current = false;
        setCollectedIds([]);
        setLives(2);
        setTimeRemainingMs(ROUND_DURATION_MS);
        setMissionState("playing");
        setRunNumber((current) => current + 1);
        setSceneSeed((current) => current + 1);
    };

    const missionStatusLabel =
        missionState === "won"
            ? "Run complete"
            : missionState === "lost"
              ? "Run failed"
              : "Collect and survive";

    const healthValue = `${Math.max(0, lives * 50)}/100`;
    const timeSecondsLeft = Math.ceil(timeRemainingMs / 1000);

    const collectibleLookup = useMemo(() => {
        return new Set(collectedIds);
    }, [collectedIds]);

    return (
        <section className="um-container um-stack" aria-label={title}>
            <h3 className="um-title">{title}</h3>
            <p className="um-help">
                MVP loop: collect three data chips, avoid hazard pit damage, and
                restart after win/lose.
            </p>

            <PlatformerHUDPreset
                healthValue={healthValue}
                minimapValue={`Timer ${timeSecondsLeft}s`}
                coinsValue={`${collectedIds.length}/${COLLECTIBLE_ZONES.length}`}
                livesValue={lives}
                jumpLabel="Hop"
                onJump={() => {
                    dataBus.requestPlayerJump();
                    refreshMissionProgress();
                }}
            />

            <div className="um-panel um-stack" aria-label="Sidescroller scene">
                <SideScrollerCanvas
                    key={sceneSeed}
                    width={320}
                    height={220}
                    worldWidth={520}
                    worldHeight={320}
                    showDebugOutlines={false}
                />
                <SideScrollerControls onMove={refreshMissionProgress} />
            </div>

            <div className="um-panel um-stack">
                <p className="um-text">Mission status: {missionState}</p>
                <p className="um-text">Status label: {missionStatusLabel}</p>
                <p className="um-text">Run #: {runNumber}</p>
                <ul className="um-list">
                    {COLLECTIBLE_ZONES.map((zone) => (
                        <li key={zone.id} className="um-list-item">
                            {collectibleLookup.has(zone.id) ? "✓" : "○"}{" "}
                            {zone.label}
                        </li>
                    ))}
                </ul>
                <p className="um-help">
                    Hazard pit: right-side trench near the floor.
                </p>
            </div>

            {missionState !== "playing" ? (
                <button
                    type="button"
                    className="um-button um-button--primary"
                    onClick={restartRun}
                >
                    Restart run
                </button>
            ) : null}
        </section>
    );
};

export default SideScrollerMiniGameExample;
