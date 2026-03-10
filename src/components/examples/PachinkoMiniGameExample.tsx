import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type PointerEvent as ReactPointerEvent,
} from "react";
import Render, { type RenderableItem } from "@/components/Render/Render";

export type PachinkoMiniGameExampleProps = {
    title?: string;
};

type GamePhase = "start" | "playing" | "ended";

type Pin = {
    x: number;
    y: number;
    radius: number;
};

type Pocket = {
    id: string;
    minX: number;
    maxX: number;
    score: number;
};

type Puck = {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    settled: boolean;
    settledAtMs: number;
    awarded: boolean;
    pocketId: string | null;
};

type PachinkoAtlas = {
    url: string;
    tileSize: number;
    tileWidth: number;
    tileHeight: number;
    tiles: {
        board: [number, number];
        dropZone: [number, number];
        rail: [number, number];
        pin: [number, number];
        puck: [number, number];
        pocketLow: [number, number];
        pocketMid: [number, number];
        pocketHigh: [number, number];
        flash: [number, number];
        panel: [number, number];
        startButton: [number, number];
        ballOn: [number, number];
        ballOff: [number, number];
        scorePip: [number, number];
    };
};

const BOARD_WIDTH = 352;
const BOARD_HEIGHT = 512;
const DROP_ZONE_HEIGHT = 56;
const POCKET_ZONE_HEIGHT = 64;
const POCKET_TRIGGER_Y = BOARD_HEIGHT - POCKET_ZONE_HEIGHT;
const PUCK_RADIUS = 7;
const PUCK_LIFETIME_AFTER_SETTLE_MS = 1400;
const POCKET_FLASH_DURATION_MS = 360;
const TOTAL_BALLS = 10;

const START_BUTTON = {
    minX: 96,
    maxX: 256,
    minY: 224,
    maxY: 288,
};

const GRAVITY_PX_PER_SEC2 = 1300;
const VELOCITY_DAMPING = 0.996;
const PIN_RESTITUTION = 0.74;
const WALL_RESTITUTION = 0.68;
const SUBSTEPS = 2;

const POCKET_SCORES = [25, 100, 250, 500, 250, 100, 25];

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function isInsideStartButton(x: number, y: number): boolean {
    return (
        x >= START_BUTTON.minX &&
        x <= START_BUTTON.maxX &&
        y >= START_BUTTON.minY &&
        y <= START_BUTTON.maxY
    );
}

function createPins(): Pin[] {
    const pins: Pin[] = [];
    const rows = 9;
    const spacingX = 38;
    const spacingY = 36;
    const startY = 92;
    const centerX = BOARD_WIDTH / 2;

    for (let row = 0; row < rows; row += 1) {
        const y = startY + row * spacingY;
        const rowOffset = row % 2 === 0 ? 0 : spacingX / 2;
        const leftMost = centerX - spacingX * 4 + rowOffset;
        const pinCount = 9;

        for (let column = 0; column < pinCount; column += 1) {
            const x = leftMost + column * spacingX;
            if (x < 18 || x > BOARD_WIDTH - 18) {
                continue;
            }

            pins.push({ x, y, radius: 5 });
        }
    }

    return pins;
}

function createPockets(): Pocket[] {
    const pocketCount = POCKET_SCORES.length;
    const baseWidth = Math.floor(BOARD_WIDTH / pocketCount);
    const remainder = BOARD_WIDTH - baseWidth * pocketCount;
    let cursor = 0;

    return POCKET_SCORES.map((score, index) => {
        const width = baseWidth + (index < remainder ? 1 : 0);
        const minX = cursor;
        const maxX = cursor + width;
        cursor = maxX;

        return {
            id: `pocket-${index}`,
            minX,
            maxX,
            score,
        };
    });
}

function createAtlas(): PachinkoAtlas {
    const tileSize = 32;
    const columns = 7;
    const rows = 2;

    if (typeof document === "undefined") {
        return {
            url: "",
            tileSize,
            tileWidth: columns,
            tileHeight: rows,
            tiles: {
                board: [0, 0],
                dropZone: [1, 0],
                rail: [2, 0],
                pin: [3, 0],
                puck: [4, 0],
                pocketLow: [5, 0],
                pocketMid: [6, 0],
                pocketHigh: [0, 1],
                flash: [1, 1],
                panel: [2, 1],
                startButton: [3, 1],
                ballOn: [4, 1],
                ballOff: [5, 1],
                scorePip: [6, 1],
            },
        };
    }

    const canvas = document.createElement("canvas");
    canvas.width = columns * tileSize;
    canvas.height = rows * tileSize;
    const context = canvas.getContext("2d");

    if (!context) {
        return {
            url: "",
            tileSize,
            tileWidth: columns,
            tileHeight: rows,
            tiles: {
                board: [0, 0],
                dropZone: [1, 0],
                rail: [2, 0],
                pin: [3, 0],
                puck: [4, 0],
                pocketLow: [5, 0],
                pocketMid: [6, 0],
                pocketHigh: [0, 1],
                flash: [1, 1],
                panel: [2, 1],
                startButton: [3, 1],
                ballOn: [4, 1],
                ballOff: [5, 1],
                scorePip: [6, 1],
            },
        };
    }

    const drawTile = (
        tileX: number,
        tileY: number,
        draw: (ctx: CanvasRenderingContext2D, x: number, y: number) => void,
    ) => {
        const x = tileX * tileSize;
        const y = tileY * tileSize;
        draw(context, x, y);
    };

    drawTile(0, 0, (ctx, x, y) => {
        ctx.fillStyle = "#0f1320";
        ctx.fillRect(x, y, tileSize, tileSize);
    });

    drawTile(1, 0, (ctx, x, y) => {
        ctx.fillStyle = "#1a2240";
        ctx.fillRect(x, y, tileSize, tileSize);
    });

    drawTile(2, 0, (ctx, x, y) => {
        ctx.fillStyle = "#2c3a66";
        ctx.fillRect(x, y + tileSize / 2 - 2, tileSize, 4);
    });

    drawTile(3, 0, (ctx, x, y) => {
        ctx.clearRect(x, y, tileSize, tileSize);
        ctx.fillStyle = "#90a2d7";
        ctx.beginPath();
        ctx.arc(x + tileSize / 2, y + tileSize / 2, 6, 0, Math.PI * 2);
        ctx.fill();
    });

    drawTile(4, 0, (ctx, x, y) => {
        ctx.clearRect(x, y, tileSize, tileSize);
        ctx.fillStyle = "#f7d27f";
        ctx.beginPath();
        ctx.arc(x + tileSize / 2, y + tileSize / 2, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#1b2133";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x + tileSize / 2, y + tileSize / 2, 9, 0, Math.PI * 2);
        ctx.stroke();
    });

    drawTile(5, 0, (ctx, x, y) => {
        ctx.fillStyle = "#1f2a42";
        ctx.fillRect(x, y, tileSize, tileSize);
        ctx.strokeStyle = "#3a4f8a";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
    });

    drawTile(6, 0, (ctx, x, y) => {
        ctx.fillStyle = "#243452";
        ctx.fillRect(x, y, tileSize, tileSize);
        ctx.strokeStyle = "#4f66a8";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
    });

    drawTile(0, 1, (ctx, x, y) => {
        ctx.fillStyle = "#2a3e63";
        ctx.fillRect(x, y, tileSize, tileSize);
        ctx.strokeStyle = "#6f89d0";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
    });

    drawTile(1, 1, (ctx, x, y) => {
        ctx.fillStyle = "rgba(154, 179, 255, 0.45)";
        ctx.fillRect(x, y, tileSize, tileSize);
    });

    drawTile(2, 1, (ctx, x, y) => {
        ctx.fillStyle = "rgba(12, 18, 34, 0.78)";
        ctx.fillRect(x, y, tileSize, tileSize);
    });

    drawTile(3, 1, (ctx, x, y) => {
        ctx.fillStyle = "#2e4b7e";
        ctx.fillRect(x, y, tileSize, tileSize);
        ctx.strokeStyle = "#8eb3ff";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
    });

    drawTile(4, 1, (ctx, x, y) => {
        ctx.clearRect(x, y, tileSize, tileSize);
        ctx.fillStyle = "#f7d27f";
        ctx.beginPath();
        ctx.arc(x + tileSize / 2, y + tileSize / 2, 7, 0, Math.PI * 2);
        ctx.fill();
    });

    drawTile(5, 1, (ctx, x, y) => {
        ctx.clearRect(x, y, tileSize, tileSize);
        ctx.fillStyle = "#5e6d8c";
        ctx.beginPath();
        ctx.arc(x + tileSize / 2, y + tileSize / 2, 7, 0, Math.PI * 2);
        ctx.fill();
    });

    drawTile(6, 1, (ctx, x, y) => {
        ctx.fillStyle = "#6f89d0";
        ctx.fillRect(x + 8, y + 8, tileSize - 16, tileSize - 16);
    });

    return {
        url: canvas.toDataURL("image/png"),
        tileSize,
        tileWidth: columns,
        tileHeight: rows,
        tiles: {
            board: [0, 0],
            dropZone: [1, 0],
            rail: [2, 0],
            pin: [3, 0],
            puck: [4, 0],
            pocketLow: [5, 0],
            pocketMid: [6, 0],
            pocketHigh: [0, 1],
            flash: [1, 1],
            panel: [2, 1],
            startButton: [3, 1],
            ballOn: [4, 1],
            ballOff: [5, 1],
            scorePip: [6, 1],
        },
    };
}

function createRenderItem(
    atlas: PachinkoAtlas,
    tile: [number, number],
    x: number,
    y: number,
    scaler = 1,
    z = 0,
): RenderableItem {
    return {
        spriteImageSheet: atlas.url,
        spriteSize: atlas.tileSize,
        spriteSheetTileWidth: atlas.tileWidth,
        spriteSheetTileHeight: atlas.tileHeight,
        characterSpriteTiles: [tile],
        scaler,
        position: { x, y, z },
        fps: 1,
    };
}

function pocketTileForScore(
    atlas: PachinkoAtlas,
    score: number,
): [number, number] {
    if (score >= 250) {
        return atlas.tiles.pocketHigh;
    }

    if (score >= 100) {
        return atlas.tiles.pocketMid;
    }

    return atlas.tiles.pocketLow;
}

const PachinkoMiniGameExample = ({
    title = "Pachinko mini game MVP",
}: PachinkoMiniGameExampleProps) => {
    const lastFrameMsRef = useRef<number | null>(null);
    const nextPuckIdRef = useRef(1);

    const [phase, setPhase] = useState<GamePhase>("start");
    const [score, setScore] = useState(0);
    const [ballsRemaining, setBallsRemaining] = useState(TOTAL_BALLS);
    const [pucks, setPucks] = useState<Puck[]>([]);
    const [flashPocketId, setFlashPocketId] = useState<string | null>(null);
    const [flashUntilMs, setFlashUntilMs] = useState(0);

    const pins = useMemo(() => createPins(), []);
    const pockets = useMemo(() => createPockets(), []);
    const atlas = useMemo(() => createAtlas(), []);

    const resolvePocket = useCallback(
        (x: number): Pocket | null => {
            return (
                pockets.find((pocket) => x >= pocket.minX && x < pocket.maxX) ??
                pockets[pockets.length - 1] ??
                null
            );
        },
        [pockets],
    );

    const startNewGame = useCallback(() => {
        nextPuckIdRef.current = 1;
        lastFrameMsRef.current = null;
        setPhase("playing");
        setScore(0);
        setBallsRemaining(TOTAL_BALLS);
        setPucks([]);
        setFlashPocketId(null);
        setFlashUntilMs(0);
    }, []);

    useEffect(() => {
        if (phase !== "playing") {
            return;
        }

        let rafId = 0;

        const tick = (nowMs: number) => {
            if (lastFrameMsRef.current === null) {
                lastFrameMsRef.current = nowMs;
            }

            const deltaMs = clamp(nowMs - lastFrameMsRef.current, 0, 34);
            lastFrameMsRef.current = nowMs;

            if (flashPocketId && nowMs >= flashUntilMs) {
                setFlashPocketId(null);
                setFlashUntilMs(0);
            }

            setPucks((currentPucks) => {
                const mutable = currentPucks.map((puck) => ({ ...puck }));
                const stepSeconds = Math.max(0, deltaMs / 1000 / SUBSTEPS);
                let scoreDelta = 0;
                let landedPocketId: string | null = null;

                for (let substep = 0; substep < SUBSTEPS; substep += 1) {
                    for (const puck of mutable) {
                        if (puck.settled) {
                            continue;
                        }

                        puck.vy += GRAVITY_PX_PER_SEC2 * stepSeconds;
                        puck.vx *= VELOCITY_DAMPING;
                        puck.vy *= VELOCITY_DAMPING;

                        puck.x += puck.vx * stepSeconds;
                        puck.y += puck.vy * stepSeconds;

                        if (puck.x - puck.radius < 2) {
                            puck.x = 2 + puck.radius;
                            puck.vx = Math.abs(puck.vx) * WALL_RESTITUTION;
                        } else if (puck.x + puck.radius > BOARD_WIDTH - 2) {
                            puck.x = BOARD_WIDTH - 2 - puck.radius;
                            puck.vx = -Math.abs(puck.vx) * WALL_RESTITUTION;
                        }

                        for (const pin of pins) {
                            const dx = puck.x - pin.x;
                            const dy = puck.y - pin.y;
                            const minDistance = puck.radius + pin.radius;
                            const distanceSq = dx * dx + dy * dy;

                            if (
                                distanceSq <= 0 ||
                                distanceSq >= minDistance * minDistance
                            ) {
                                continue;
                            }

                            const distance = Math.sqrt(distanceSq);
                            const normalX = dx / distance;
                            const normalY = dy / distance;
                            const overlap = minDistance - distance;

                            puck.x += normalX * overlap;
                            puck.y += normalY * overlap;

                            const normalVelocity =
                                puck.vx * normalX + puck.vy * normalY;
                            if (normalVelocity < 0) {
                                puck.vx -=
                                    (1 + PIN_RESTITUTION) *
                                    normalVelocity *
                                    normalX;
                                puck.vy -=
                                    (1 + PIN_RESTITUTION) *
                                    normalVelocity *
                                    normalY;
                            }
                        }

                        if (puck.y + puck.radius >= POCKET_TRIGGER_Y) {
                            const pocket = resolvePocket(
                                clamp(puck.x, 0, BOARD_WIDTH),
                            );
                            puck.y = POCKET_TRIGGER_Y + 28;
                            puck.vx = 0;
                            puck.vy = 0;
                            puck.settled = true;
                            puck.settledAtMs = nowMs;
                            puck.pocketId = pocket?.id ?? null;

                            if (!puck.awarded && pocket) {
                                puck.awarded = true;
                                scoreDelta += pocket.score;
                                landedPocketId = pocket.id;
                            }
                        }
                    }
                }

                const nextPucks = mutable.filter((puck) => {
                    if (!puck.settled) {
                        return true;
                    }

                    return (
                        nowMs - puck.settledAtMs <=
                        PUCK_LIFETIME_AFTER_SETTLE_MS
                    );
                });

                if (scoreDelta > 0) {
                    setScore((current) => current + scoreDelta);
                }

                if (landedPocketId) {
                    setFlashPocketId(landedPocketId);
                    setFlashUntilMs(nowMs + POCKET_FLASH_DURATION_MS);
                }

                if (
                    ballsRemaining <= 0 &&
                    nextPucks.every((puck) => puck.settled)
                ) {
                    setPhase("ended");
                }

                return nextPucks;
            });

            rafId = window.requestAnimationFrame(tick);
        };

        rafId = window.requestAnimationFrame(tick);

        return () => {
            window.cancelAnimationFrame(rafId);
        };
    }, [
        ballsRemaining,
        flashPocketId,
        flashUntilMs,
        phase,
        pins,
        resolvePocket,
    ]);

    const dropPuckAt = useCallback(
        (xInCanvas: number, yInCanvas: number) => {
            if (phase !== "playing") {
                if (isInsideStartButton(xInCanvas, yInCanvas)) {
                    startNewGame();
                }
                return;
            }

            if (ballsRemaining <= 0) {
                return;
            }

            if (yInCanvas > DROP_ZONE_HEIGHT) {
                return;
            }

            const x = clamp(xInCanvas, 16, BOARD_WIDTH - 16);
            const centerOffset = (x - BOARD_WIDTH / 2) / (BOARD_WIDTH / 2);
            const initialVX = centerOffset * 120 + (Math.random() * 60 - 30);

            const puck: Puck = {
                id: nextPuckIdRef.current,
                x,
                y: DROP_ZONE_HEIGHT - 6,
                vx: initialVX,
                vy: 0,
                radius: PUCK_RADIUS,
                settled: false,
                settledAtMs: 0,
                awarded: false,
                pocketId: null,
            };

            nextPuckIdRef.current += 1;
            setPucks((current) => [...current, puck]);
            setBallsRemaining((current) => Math.max(0, current - 1));
        },
        [ballsRemaining, phase, startNewGame],
    );

    const onBoardPointerDown = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const scaleX = BOARD_WIDTH / rect.width;
            const scaleY = BOARD_HEIGHT / rect.height;
            const x = (event.clientX - rect.left) * scaleX;
            const y = (event.clientY - rect.top) * scaleY;
            dropPuckAt(x, y);
        },
        [dropPuckAt],
    );

    const renderItems = useMemo<RenderableItem[]>(() => {
        const items: RenderableItem[] = [];
        const tileStep = atlas.tileSize;

        for (let y = 0; y < BOARD_HEIGHT; y += tileStep) {
            for (let x = 0; x < BOARD_WIDTH; x += tileStep) {
                items.push(
                    createRenderItem(atlas, atlas.tiles.board, x, y, 1, 0),
                );
            }
        }

        for (let x = 0; x < BOARD_WIDTH; x += tileStep) {
            items.push(
                createRenderItem(atlas, atlas.tiles.dropZone, x, 0, 1, 1),
            );
            items.push(
                createRenderItem(
                    atlas,
                    atlas.tiles.rail,
                    x,
                    DROP_ZONE_HEIGHT - 16,
                    1,
                    2,
                ),
            );
        }

        for (const pocket of pockets) {
            const pocketTile = pocketTileForScore(atlas, pocket.score);
            for (let x = pocket.minX; x < pocket.maxX; x += tileStep) {
                for (
                    let y = POCKET_TRIGGER_Y;
                    y < BOARD_HEIGHT;
                    y += tileStep
                ) {
                    items.push(createRenderItem(atlas, pocketTile, x, y, 1, 1));
                }
            }
        }

        for (const pin of pins) {
            items.push(
                createRenderItem(
                    atlas,
                    atlas.tiles.pin,
                    pin.x - tileStep / 2,
                    pin.y - tileStep / 2,
                    1,
                    3,
                ),
            );
        }

        if (flashPocketId && flashUntilMs > 0) {
            const flashingPocket = pockets.find(
                (pocket) => pocket.id === flashPocketId,
            );
            if (flashingPocket) {
                for (
                    let x = flashingPocket.minX;
                    x < flashingPocket.maxX;
                    x += tileStep
                ) {
                    for (
                        let y = POCKET_TRIGGER_Y;
                        y < BOARD_HEIGHT;
                        y += tileStep
                    ) {
                        items.push(
                            createRenderItem(
                                atlas,
                                atlas.tiles.flash,
                                x,
                                y,
                                1,
                                5,
                            ),
                        );
                    }
                }
            }
        }

        for (const puck of pucks) {
            if (puck.settled) {
                continue;
            }

            items.push(
                createRenderItem(
                    atlas,
                    atlas.tiles.puck,
                    puck.x - tileStep / 2,
                    puck.y - tileStep / 2,
                    1,
                    4,
                ),
            );
        }

        for (let index = 0; index < TOTAL_BALLS; index += 1) {
            const tile =
                index < ballsRemaining
                    ? atlas.tiles.ballOn
                    : atlas.tiles.ballOff;
            const iconX = BOARD_WIDTH - 18 - index * 16;
            items.push(createRenderItem(atlas, tile, iconX, 8, 0.5, 7));
        }

        const scorePips = Math.min(12, Math.floor(score / 100));
        for (let index = 0; index < scorePips; index += 1) {
            items.push(
                createRenderItem(
                    atlas,
                    atlas.tiles.scorePip,
                    10 + index * 10,
                    8,
                    0.35,
                    7,
                ),
            );
        }

        if (phase !== "playing") {
            for (let y = 160; y < 352; y += tileStep) {
                for (let x = 64; x < 296; x += tileStep) {
                    items.push(
                        createRenderItem(atlas, atlas.tiles.panel, x, y, 1, 8),
                    );
                }
            }

            for (
                let y = START_BUTTON.minY;
                y < START_BUTTON.maxY;
                y += tileStep
            ) {
                for (
                    let x = START_BUTTON.minX;
                    x < START_BUTTON.maxX;
                    x += tileStep
                ) {
                    items.push(
                        createRenderItem(
                            atlas,
                            atlas.tiles.startButton,
                            x,
                            y,
                            1,
                            9,
                        ),
                    );
                }
            }
        }

        return items;
    }, [
        atlas,
        ballsRemaining,
        flashPocketId,
        flashUntilMs,
        phase,
        pins,
        pockets,
        pucks,
        score,
    ]);

    return (
        <section className="um-container um-stack" aria-label={title}>
            <div
                className="GameContainer"
                style={{ width: "100%", margin: 0, padding: 0 }}
            >
                <div className="GameSurface">
                    <div className="CanvasPanel">
                        <div
                            className="GameScreen"
                            onPointerDown={onBoardPointerDown}
                            style={{
                                padding: "0.5rem",
                                touchAction: "none",
                                cursor:
                                    phase === "playing"
                                        ? "crosshair"
                                        : "pointer",
                            }}
                        >
                            <Render
                                items={renderItems}
                                width={BOARD_WIDTH}
                                height={BOARD_HEIGHT}
                                cameraX={0}
                                cameraY={0}
                                showDebugOutlines={false}
                                includeEffects={false}
                                enableTransitionEffects={false}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default PachinkoMiniGameExample;
