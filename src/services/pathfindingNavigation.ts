import { signalBus } from "@/services/signalBus";

export type NavigationTile = {
    x: number;
    y: number;
};

export type NavigationGridInput = {
    width: number;
    height: number;
    tiles: number[][];
};

export type NavigationWorldConfig = {
    tileWidth: number;
    tileHeight: number;
    originX: number;
    originY: number;
};

export type NavigationQueryOptions = {
    allowDiagonal?: boolean;
    maxIterations?: number;
};

export type NavigationPathResult = {
    found: boolean;
    nodes: NavigationTile[];
    visited: number;
    cost: number;
};

export type NavigationFlowField = {
    goal: NavigationTile;
    costByCell: number[][];
    nextByCell: (NavigationTile | null)[][];
};

export type NavigationSnapshot = {
    width: number;
    height: number;
    walkableTileValues: number[];
    dynamicBlockedCount: number;
    world: NavigationWorldConfig;
};

export type PathfindingNavigationService = {
    setGrid: (input: NavigationGridInput) => void;
    setWalkableTileValues: (values: number[]) => void;
    setWorldConfig: (patch: Partial<NavigationWorldConfig>) => void;
    setDynamicBlocker: (
        tileX: number,
        tileY: number,
        blocked: boolean,
    ) => boolean;
    clearDynamicBlockers: () => void;
    isWalkable: (tileX: number, tileY: number) => boolean;
    worldToTile: (x: number, y: number) => NavigationTile;
    tileToWorld: (
        tileX: number,
        tileY: number,
        anchor?: "top-left" | "center",
    ) => {
        x: number;
        y: number;
    };
    findPath: (
        start: NavigationTile,
        goal: NavigationTile,
        options?: NavigationQueryOptions,
    ) => NavigationPathResult;
    buildFlowField: (
        goal: NavigationTile,
        options?: NavigationQueryOptions,
    ) => NavigationFlowField;
    getNextFlowStep: (
        flowField: NavigationFlowField,
        from: NavigationTile,
    ) => NavigationTile | null;
    getSnapshot: () => NavigationSnapshot;
};

export const NAVIGATION_GRID_UPDATED_SIGNAL = "navigation:grid:updated";
export const NAVIGATION_PATH_RESOLVED_SIGNAL = "navigation:path:resolved";
export const NAVIGATION_FLOW_FIELD_RESOLVED_SIGNAL =
    "navigation:flow-field:resolved";

const DEFAULT_WORLD: NavigationWorldConfig = {
    tileWidth: 16,
    tileHeight: 16,
    originX: 0,
    originY: 0,
};

function normalizeInteger(value: number, fallback: number): number {
    if (!Number.isFinite(value)) {
        return fallback;
    }

    return Math.floor(value);
}

function normalizeDimension(value: number, fallback: number): number {
    if (!Number.isFinite(value) || value <= 0) {
        return fallback;
    }

    return Math.floor(value);
}

function tileKey(tileX: number, tileY: number): string {
    return `${tileX},${tileY}`;
}

function parseTileKey(key: string): NavigationTile {
    const [xText, yText] = key.split(",");
    return {
        x: Number.parseInt(xText, 10),
        y: Number.parseInt(yText, 10),
    };
}

function buildNeighborOffsets(allowDiagonal: boolean): NavigationTile[] {
    const orthogonal = [
        { x: 0, y: -1 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: -1, y: 0 },
    ];

    if (!allowDiagonal) {
        return orthogonal;
    }

    return [
        ...orthogonal,
        { x: -1, y: -1 },
        { x: 1, y: -1 },
        { x: 1, y: 1 },
        { x: -1, y: 1 },
    ];
}

function heuristic(
    from: NavigationTile,
    to: NavigationTile,
    allowDiagonal: boolean,
): number {
    const dx = Math.abs(to.x - from.x);
    const dy = Math.abs(to.y - from.y);

    if (!allowDiagonal) {
        return dx + dy;
    }

    const min = Math.min(dx, dy);
    const max = Math.max(dx, dy);
    return Math.SQRT2 * min + (max - min);
}

function stepCost(from: NavigationTile, to: NavigationTile): number {
    const dx = Math.abs(to.x - from.x);
    const dy = Math.abs(to.y - from.y);
    return dx === 1 && dy === 1 ? Math.SQRT2 : 1;
}

export function createPathfindingNavigationService(options?: {
    emit?: <TPayload>(signal: string, payload: TPayload) => void;
}): PathfindingNavigationService {
    const emit =
        options?.emit ??
        (<TPayload>(signal: string, payload: TPayload) => {
            signalBus.emit(signal, payload);
        });

    let width = 1;
    let height = 1;
    let tiles: number[][] = [[0]];
    let world: NavigationWorldConfig = { ...DEFAULT_WORLD };
    let walkableTileValues = new Set<number>([0]);
    const dynamicBlocked = new Set<string>();

    const inBounds = (tileX: number, tileY: number) => {
        return tileX >= 0 && tileY >= 0 && tileX < width && tileY < height;
    };

    const normalizeGrid = (input: NavigationGridInput) => {
        const nextWidth = normalizeDimension(input.width, width);
        const nextHeight = normalizeDimension(input.height, height);

        if (input.tiles.length !== nextHeight) {
            throw new Error("tiles height must match grid height");
        }

        for (const row of input.tiles) {
            if (row.length !== nextWidth) {
                throw new Error("tiles width must match grid width");
            }
        }

        return {
            width: nextWidth,
            height: nextHeight,
            tiles: input.tiles.map((row) =>
                row.map((value) => normalizeInteger(value, 1)),
            ),
        };
    };

    const isWalkable = (tileX: number, tileY: number) => {
        if (!inBounds(tileX, tileY)) {
            return false;
        }

        if (dynamicBlocked.has(tileKey(tileX, tileY))) {
            return false;
        }

        return walkableTileValues.has(tiles[tileY][tileX]);
    };

    const setGrid: PathfindingNavigationService["setGrid"] = (input) => {
        const normalized = normalizeGrid(input);
        width = normalized.width;
        height = normalized.height;
        tiles = normalized.tiles;

        for (const key of Array.from(dynamicBlocked)) {
            const position = parseTileKey(key);
            if (!inBounds(position.x, position.y)) {
                dynamicBlocked.delete(key);
            }
        }

        emit(NAVIGATION_GRID_UPDATED_SIGNAL, {
            width,
            height,
            dynamicBlockedCount: dynamicBlocked.size,
        });
    };

    const setWalkableTileValues: PathfindingNavigationService["setWalkableTileValues"] =
        (values) => {
            const normalized = Array.from(
                new Set(values.map((value) => normalizeInteger(value, 0))),
            );

            if (normalized.length === 0) {
                walkableTileValues = new Set([0]);
            } else {
                walkableTileValues = new Set(normalized);
            }

            emit(NAVIGATION_GRID_UPDATED_SIGNAL, {
                width,
                height,
                dynamicBlockedCount: dynamicBlocked.size,
            });
        };

    const setWorldConfig: PathfindingNavigationService["setWorldConfig"] = (
        patch,
    ) => {
        world = {
            tileWidth: normalizeDimension(
                patch.tileWidth ?? world.tileWidth,
                world.tileWidth,
            ),
            tileHeight: normalizeDimension(
                patch.tileHeight ?? world.tileHeight,
                world.tileHeight,
            ),
            originX: Number.isFinite(patch.originX)
                ? (patch.originX ?? world.originX)
                : world.originX,
            originY: Number.isFinite(patch.originY)
                ? (patch.originY ?? world.originY)
                : world.originY,
        };
    };

    const setDynamicBlocker: PathfindingNavigationService["setDynamicBlocker"] =
        (tileX, tileY, blocked) => {
            const normalizedX = normalizeInteger(tileX, -1);
            const normalizedY = normalizeInteger(tileY, -1);

            if (!inBounds(normalizedX, normalizedY)) {
                return false;
            }

            const key = tileKey(normalizedX, normalizedY);
            if (blocked) {
                dynamicBlocked.add(key);
            } else {
                dynamicBlocked.delete(key);
            }

            emit(NAVIGATION_GRID_UPDATED_SIGNAL, {
                width,
                height,
                dynamicBlockedCount: dynamicBlocked.size,
            });

            return true;
        };

    const clearDynamicBlockers = () => {
        if (dynamicBlocked.size === 0) {
            return;
        }

        dynamicBlocked.clear();
        emit(NAVIGATION_GRID_UPDATED_SIGNAL, {
            width,
            height,
            dynamicBlockedCount: dynamicBlocked.size,
        });
    };

    const worldToTile = (x: number, y: number): NavigationTile => {
        const normalizedX = Number.isFinite(x) ? (x ?? 0) : 0;
        const normalizedY = Number.isFinite(y) ? (y ?? 0) : 0;

        return {
            x: Math.floor((normalizedX - world.originX) / world.tileWidth),
            y: Math.floor((normalizedY - world.originY) / world.tileHeight),
        };
    };

    const tileToWorld: PathfindingNavigationService["tileToWorld"] = (
        tileX,
        tileY,
        anchor = "center",
    ) => {
        const normalizedX = normalizeInteger(tileX, 0);
        const normalizedY = normalizeInteger(tileY, 0);

        const baseX = world.originX + normalizedX * world.tileWidth;
        const baseY = world.originY + normalizedY * world.tileHeight;

        if (anchor === "top-left") {
            return {
                x: baseX,
                y: baseY,
            };
        }

        return {
            x: baseX + world.tileWidth / 2,
            y: baseY + world.tileHeight / 2,
        };
    };

    const findPath: PathfindingNavigationService["findPath"] = (
        start,
        goal,
        options = {},
    ) => {
        const normalizedStart = {
            x: normalizeInteger(start.x, 0),
            y: normalizeInteger(start.y, 0),
        };
        const normalizedGoal = {
            x: normalizeInteger(goal.x, 0),
            y: normalizeInteger(goal.y, 0),
        };

        const allowDiagonal = options.allowDiagonal ?? false;
        const maxIterations = normalizeDimension(
            options.maxIterations ?? width * height * 8,
            width * height * 8,
        );

        if (
            !isWalkable(normalizedStart.x, normalizedStart.y) ||
            !isWalkable(normalizedGoal.x, normalizedGoal.y)
        ) {
            const failedResult: NavigationPathResult = {
                found: false,
                nodes: [],
                visited: 0,
                cost: 0,
            };
            emit(NAVIGATION_PATH_RESOLVED_SIGNAL, {
                found: false,
                visited: 0,
                cost: 0,
            });
            return failedResult;
        }

        const neighbors = buildNeighborOffsets(allowDiagonal);
        const openSet = new Set<string>([
            tileKey(normalizedStart.x, normalizedStart.y),
        ]);
        const closedSet = new Set<string>();
        const cameFrom = new Map<string, string>();
        const gScore = new Map<string, number>();
        const fScore = new Map<string, number>();

        const startKey = tileKey(normalizedStart.x, normalizedStart.y);
        const goalKey = tileKey(normalizedGoal.x, normalizedGoal.y);

        gScore.set(startKey, 0);
        fScore.set(
            startKey,
            heuristic(normalizedStart, normalizedGoal, allowDiagonal),
        );

        let iterations = 0;

        while (openSet.size > 0 && iterations < maxIterations) {
            iterations += 1;

            const currentKey = Array.from(openSet).sort((left, right) => {
                const leftF = fScore.get(left) ?? Number.POSITIVE_INFINITY;
                const rightF = fScore.get(right) ?? Number.POSITIVE_INFINITY;
                if (leftF !== rightF) {
                    return leftF - rightF;
                }

                const leftG = gScore.get(left) ?? Number.POSITIVE_INFINITY;
                const rightG = gScore.get(right) ?? Number.POSITIVE_INFINITY;
                if (leftG !== rightG) {
                    return leftG - rightG;
                }

                const leftTile = parseTileKey(left);
                const rightTile = parseTileKey(right);
                if (leftTile.y !== rightTile.y) {
                    return leftTile.y - rightTile.y;
                }

                return leftTile.x - rightTile.x;
            })[0];

            if (currentKey === goalKey) {
                const nodes: NavigationTile[] = [];
                let walkerKey: string | undefined = currentKey;

                while (walkerKey) {
                    const tile = parseTileKey(walkerKey);
                    nodes.push(tile);
                    walkerKey = cameFrom.get(walkerKey);
                }

                nodes.reverse();
                const cost = gScore.get(goalKey) ?? 0;

                const result: NavigationPathResult = {
                    found: true,
                    nodes,
                    visited: closedSet.size + 1,
                    cost,
                };

                emit(NAVIGATION_PATH_RESOLVED_SIGNAL, {
                    found: true,
                    visited: result.visited,
                    cost: result.cost,
                    length: result.nodes.length,
                });
                return result;
            }

            openSet.delete(currentKey);
            closedSet.add(currentKey);

            const current = parseTileKey(currentKey);
            for (const offset of neighbors) {
                const neighbor = {
                    x: current.x + offset.x,
                    y: current.y + offset.y,
                };
                const neighborKey = tileKey(neighbor.x, neighbor.y);

                if (
                    !isWalkable(neighbor.x, neighbor.y) ||
                    closedSet.has(neighborKey)
                ) {
                    continue;
                }

                if (
                    allowDiagonal &&
                    Math.abs(offset.x) === 1 &&
                    Math.abs(offset.y) === 1
                ) {
                    const orthogonalA = isWalkable(
                        current.x + offset.x,
                        current.y,
                    );
                    const orthogonalB = isWalkable(
                        current.x,
                        current.y + offset.y,
                    );
                    if (!orthogonalA || !orthogonalB) {
                        continue;
                    }
                }

                const tentativeScore =
                    (gScore.get(currentKey) ?? Number.POSITIVE_INFINITY) +
                    stepCost(current, neighbor);

                if (
                    tentativeScore >=
                    (gScore.get(neighborKey) ?? Number.POSITIVE_INFINITY)
                ) {
                    continue;
                }

                cameFrom.set(neighborKey, currentKey);
                gScore.set(neighborKey, tentativeScore);
                fScore.set(
                    neighborKey,
                    tentativeScore +
                        heuristic(neighbor, normalizedGoal, allowDiagonal),
                );
                openSet.add(neighborKey);
            }
        }

        const failed: NavigationPathResult = {
            found: false,
            nodes: [],
            visited: closedSet.size,
            cost: 0,
        };

        emit(NAVIGATION_PATH_RESOLVED_SIGNAL, {
            found: false,
            visited: failed.visited,
            cost: 0,
        });

        return failed;
    };

    const buildFlowField: PathfindingNavigationService["buildFlowField"] = (
        goal,
        options = {},
    ) => {
        const normalizedGoal = {
            x: normalizeInteger(goal.x, 0),
            y: normalizeInteger(goal.y, 0),
        };
        const allowDiagonal = options.allowDiagonal ?? false;
        const neighbors = buildNeighborOffsets(allowDiagonal);

        const costByCell = Array.from({ length: height }, () =>
            Array.from({ length: width }, () => Number.POSITIVE_INFINITY),
        );
        const nextByCell = Array.from({ length: height }, () =>
            Array.from({ length: width }, () => null as NavigationTile | null),
        );

        if (isWalkable(normalizedGoal.x, normalizedGoal.y)) {
            const queue: NavigationTile[] = [normalizedGoal];
            costByCell[normalizedGoal.y][normalizedGoal.x] = 0;

            for (let index = 0; index < queue.length; index += 1) {
                const current = queue[index];
                const currentCost = costByCell[current.y][current.x];

                for (const offset of neighbors) {
                    const neighbor = {
                        x: current.x + offset.x,
                        y: current.y + offset.y,
                    };

                    if (!isWalkable(neighbor.x, neighbor.y)) {
                        continue;
                    }

                    if (
                        allowDiagonal &&
                        Math.abs(offset.x) === 1 &&
                        Math.abs(offset.y) === 1
                    ) {
                        const orthogonalA = isWalkable(
                            current.x + offset.x,
                            current.y,
                        );
                        const orthogonalB = isWalkable(
                            current.x,
                            current.y + offset.y,
                        );
                        if (!orthogonalA || !orthogonalB) {
                            continue;
                        }
                    }

                    const nextCost = currentCost + stepCost(current, neighbor);
                    if (nextCost >= costByCell[neighbor.y][neighbor.x]) {
                        continue;
                    }

                    costByCell[neighbor.y][neighbor.x] = nextCost;
                    queue.push(neighbor);
                }
            }

            for (let tileY = 0; tileY < height; tileY += 1) {
                for (let tileX = 0; tileX < width; tileX += 1) {
                    if (!isWalkable(tileX, tileY)) {
                        continue;
                    }

                    const ownCost = costByCell[tileY][tileX];
                    if (!Number.isFinite(ownCost) || ownCost === 0) {
                        continue;
                    }

                    let best: NavigationTile | null = null;
                    let bestCost = ownCost;

                    for (const offset of neighbors) {
                        const neighborX = tileX + offset.x;
                        const neighborY = tileY + offset.y;

                        if (!isWalkable(neighborX, neighborY)) {
                            continue;
                        }

                        const candidateCost = costByCell[neighborY][neighborX];
                        if (!Number.isFinite(candidateCost)) {
                            continue;
                        }

                        if (candidateCost < bestCost) {
                            bestCost = candidateCost;
                            best = {
                                x: neighborX,
                                y: neighborY,
                            };
                        } else if (candidateCost === bestCost && best) {
                            if (
                                neighborY < best.y ||
                                (neighborY === best.y && neighborX < best.x)
                            ) {
                                best = {
                                    x: neighborX,
                                    y: neighborY,
                                };
                            }
                        }
                    }

                    nextByCell[tileY][tileX] = best;
                }
            }
        }

        const field: NavigationFlowField = {
            goal: normalizedGoal,
            costByCell,
            nextByCell,
        };

        emit(NAVIGATION_FLOW_FIELD_RESOLVED_SIGNAL, {
            goal: normalizedGoal,
            width,
            height,
        });

        return field;
    };

    const getNextFlowStep: PathfindingNavigationService["getNextFlowStep"] = (
        flowField,
        from,
    ) => {
        const tileX = normalizeInteger(from.x, -1);
        const tileY = normalizeInteger(from.y, -1);
        if (!inBounds(tileX, tileY)) {
            return null;
        }

        return flowField.nextByCell[tileY][tileX] ?? null;
    };

    const getSnapshot = (): NavigationSnapshot => {
        return {
            width,
            height,
            walkableTileValues: Array.from(walkableTileValues.values()).sort(
                (a, b) => a - b,
            ),
            dynamicBlockedCount: dynamicBlocked.size,
            world: { ...world },
        };
    };

    return {
        setGrid,
        setWalkableTileValues,
        setWorldConfig,
        setDynamicBlocker,
        clearDynamicBlockers,
        isWalkable,
        worldToTile,
        tileToWorld,
        findPath,
        buildFlowField,
        getNextFlowStep,
        getSnapshot,
    };
}

export const pathfindingNavigation = createPathfindingNavigationService();
