import { useEffect, useMemo, useState } from "react";
import { TopDownCanvas } from "@/components/gameModes";
import { TopDownHUDPreset } from "@/components/hudAnchor";
import { TopDownControls } from "@/components/screenController";
import { dataBus } from "@/services/DataBus";

export type TopDownMiniGameExampleProps = {
    title?: string;
};

type MissionState = "playing" | "won" | "lost";

type ObjectiveZone = {
    id: string;
    label: string;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
};

const OBJECTIVE_ZONES: ObjectiveZone[] = [
    {
        id: "alpha",
        label: "Scan relay Alpha",
        minX: 0,
        maxX: 140,
        minY: 0,
        maxY: 120,
    },
    {
        id: "bravo",
        label: "Scan relay Bravo",
        minX: 150,
        maxX: 330,
        minY: 0,
        maxY: 150,
    },
    {
        id: "charlie",
        label: "Scan relay Charlie",
        minX: 0,
        maxX: 330,
        minY: 160,
        maxY: 320,
    },
];

const ROUND_DURATION_MS = 25_000;

function resolveObjectiveZoneId(x: number, y: number): string | null {
    const matched = OBJECTIVE_ZONES.find(
        (zone) =>
            x >= zone.minX &&
            x <= zone.maxX &&
            y >= zone.minY &&
            y <= zone.maxY,
    );
    return matched?.id ?? null;
}

const TopDownMiniGameExample = ({
    title = "Top-down mini game MVP",
}: TopDownMiniGameExampleProps) => {
    const [missionState, setMissionState] = useState<MissionState>("playing");
    const [objectivesDone, setObjectivesDone] = useState<string[]>([]);
    const [timeRemainingMs, setTimeRemainingMs] = useState(ROUND_DURATION_MS);
    const [runNumber, setRunNumber] = useState(1);
    const [sceneSeed, setSceneSeed] = useState(1);

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
        const zoneId = resolveObjectiveZoneId(
            player.position.x,
            player.position.y,
        );

        if (!zoneId) return;

        setObjectivesDone((current) => {
            if (current.includes(zoneId)) {
                return current;
            }

            const next = [...current, zoneId];
            if (next.length >= OBJECTIVE_ZONES.length) {
                setMissionState("won");
            }

            return next;
        });
    };

    const restartMission = () => {
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

        setObjectivesDone([]);
        setTimeRemainingMs(ROUND_DURATION_MS);
        setMissionState("playing");
        setRunNumber((current) => current + 1);
        setSceneSeed((current) => current + 1);
    };

    const missionStatusLabel =
        missionState === "won"
            ? "Extraction complete"
            : missionState === "lost"
              ? "Mission failed"
              : "Infiltration active";

    const missionStance =
        missionState === "won"
            ? "Extract"
            : missionState === "lost"
              ? "Retry"
              : "Stealth";

    const timeSecondsLeft = Math.ceil(timeRemainingMs / 1000);

    const objectiveLookup = useMemo(() => {
        return new Set(objectivesDone);
    }, [objectivesDone]);

    return (
        <section className="um-container um-stack" aria-label={title}>
            <h3 className="um-title">{title}</h3>
            <p className="um-help">
                MVP loop: move through three relay zones before time runs out,
                then restart the run.
            </p>

            <TopDownHUDPreset
                healthValue={missionState === "lost" ? "0/100" : "100/100"}
                minimapValue={`Timer ${timeSecondsLeft}s`}
                objectivesValue={`${objectivesDone.length}/${OBJECTIVE_ZONES.length}`}
                stanceValue={missionStance}
                interactLabel="Scan"
                onInteract={refreshMissionProgress}
            />

            <div className="um-panel um-stack" aria-label="Mini game scene">
                <TopDownCanvas
                    key={sceneSeed}
                    width={320}
                    height={220}
                    worldWidth={340}
                    worldHeight={320}
                    showDebugOutlines={false}
                />
                <TopDownControls
                    onMove={refreshMissionProgress}
                    allowDiagonal={true}
                />
            </div>

            <div className="um-panel um-stack">
                <p className="um-text">Mission status: {missionState}</p>
                <p className="um-text">Status label: {missionStatusLabel}</p>
                <p className="um-text">Run #: {runNumber}</p>
                <ul className="um-list">
                    {OBJECTIVE_ZONES.map((zone) => (
                        <li key={zone.id} className="um-list-item">
                            {objectiveLookup.has(zone.id) ? "✓" : "○"}{" "}
                            {zone.label}
                        </li>
                    ))}
                </ul>
            </div>

            {missionState !== "playing" ? (
                <button
                    type="button"
                    className="um-button um-button--primary"
                    onClick={restartMission}
                >
                    Restart run
                </button>
            ) : null}
        </section>
    );
};

export default TopDownMiniGameExample;
