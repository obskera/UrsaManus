import { signalBus } from "@/services/signalBus";

export type CameraVector2 = {
    x: number;
    y: number;
};

export type CameraViewport = {
    width: number;
    height: number;
};

export type CameraBounds = {
    enabled: boolean;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
};

export type CameraDeadZone = {
    width: number;
    height: number;
};

export type CameraLookAhead = {
    x: number;
    y: number;
    smoothing: number;
};

export type CameraShakeLayer = {
    id: string;
    amplitudeX: number;
    amplitudeY: number;
    frequencyHz: number;
    durationMs: number;
    elapsedMs: number;
};

export type CameraTrackKeyframe = {
    atMs: number;
    x: number;
    y: number;
};

export type CameraTrack = {
    id: string;
    keyframes: CameraTrackKeyframe[];
    loop?: boolean;
};

export type CameraTarget = {
    x: number;
    y: number;
    velocityX?: number;
    velocityY?: number;
};

export type CameraV2Snapshot = {
    position: CameraVector2;
    renderPosition: CameraVector2;
    viewport: CameraViewport;
    deadZone: CameraDeadZone;
    lookAhead: CameraLookAhead;
    bounds: CameraBounds;
    trackId: string | null;
    activeShakes: number;
};

export type CameraV2Service = {
    setViewport: (viewport: Partial<CameraViewport>) => void;
    setPosition: (x: number, y: number) => void;
    setBounds: (bounds: Partial<CameraBounds>) => void;
    setDeadZone: (deadZone: Partial<CameraDeadZone>) => void;
    setLookAhead: (lookAhead: Partial<CameraLookAhead>) => void;
    startShake: (input: Omit<CameraShakeLayer, "elapsedMs">) => void;
    playTrack: (track: CameraTrack) => boolean;
    stopTrack: () => boolean;
    update: (deltaMs: number, target?: CameraTarget | null) => CameraV2Snapshot;
    getSnapshot: () => CameraV2Snapshot;
};

export const CAMERA_V2_UPDATED_SIGNAL = "camera:v2:updated";
export const CAMERA_V2_TRACK_STARTED_SIGNAL = "camera:v2:track:started";
export const CAMERA_V2_TRACK_COMPLETED_SIGNAL = "camera:v2:track:completed";
export const CAMERA_V2_SHAKE_STARTED_SIGNAL = "camera:v2:shake:started";
export const CAMERA_V2_SHAKE_COMPLETED_SIGNAL = "camera:v2:shake:completed";

function toFinite(value: number | undefined, fallback: number): number {
    if (!Number.isFinite(value)) {
        return fallback;
    }

    return value ?? fallback;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function normalizeBounds(bounds: CameraBounds): CameraBounds {
    const minX = Math.min(bounds.minX, bounds.maxX);
    const minY = Math.min(bounds.minY, bounds.maxY);
    const maxX = Math.max(bounds.minX, bounds.maxX);
    const maxY = Math.max(bounds.minY, bounds.maxY);

    return {
        enabled: bounds.enabled,
        minX,
        minY,
        maxX,
        maxY,
    };
}

function sanitizeTrack(track: CameraTrack): CameraTrack | null {
    const id = track.id.trim();
    if (!id || track.keyframes.length === 0) {
        return null;
    }

    const keyframes = track.keyframes
        .map((frame) => ({
            atMs: Math.max(0, Math.floor(toFinite(frame.atMs, 0))),
            x: toFinite(frame.x, 0),
            y: toFinite(frame.y, 0),
        }))
        .sort((left, right) => left.atMs - right.atMs);

    return {
        id,
        keyframes,
        loop: track.loop ?? false,
    };
}

function interpolateTrackPosition(
    track: CameraTrack,
    elapsedMs: number,
): CameraVector2 {
    const frames = track.keyframes;
    if (frames.length === 1) {
        return { x: frames[0].x, y: frames[0].y };
    }

    const first = frames[0];
    const last = frames[frames.length - 1];
    if (elapsedMs <= first.atMs) {
        return { x: first.x, y: first.y };
    }

    if (elapsedMs >= last.atMs) {
        return { x: last.x, y: last.y };
    }

    for (let index = 1; index < frames.length; index += 1) {
        const right = frames[index];
        const left = frames[index - 1];
        if (elapsedMs > right.atMs) {
            continue;
        }

        const span = Math.max(1, right.atMs - left.atMs);
        const t = (elapsedMs - left.atMs) / span;
        return {
            x: left.x + (right.x - left.x) * t,
            y: left.y + (right.y - left.y) * t,
        };
    }

    return { x: last.x, y: last.y };
}

export function createCameraV2Service(options?: {
    emit?: <TPayload>(signal: string, payload: TPayload) => void;
}): CameraV2Service {
    const emit =
        options?.emit ??
        (<TPayload>(signal: string, payload: TPayload) => {
            signalBus.emit(signal, payload);
        });

    const viewport: CameraViewport = { width: 400, height: 300 };
    let position: CameraVector2 = { x: 0, y: 0 };
    let deadZone: CameraDeadZone = { width: 180, height: 120 };
    let lookAhead: CameraLookAhead = { x: 36, y: 20, smoothing: 0.2 };
    let smoothedLookAhead: CameraVector2 = { x: 0, y: 0 };
    let bounds: CameraBounds = normalizeBounds({
        enabled: false,
        minX: 0,
        minY: 0,
        maxX: 500,
        maxY: 500,
    });

    const shakes = new Map<string, CameraShakeLayer>();
    let trackState: {
        track: CameraTrack;
        elapsedMs: number;
    } | null = null;

    const clampPositionToBounds = (next: CameraVector2): CameraVector2 => {
        if (!bounds.enabled) {
            return next;
        }

        const maxX = Math.max(bounds.minX, bounds.maxX - viewport.width);
        const maxY = Math.max(bounds.minY, bounds.maxY - viewport.height);

        return {
            x: clamp(next.x, bounds.minX, maxX),
            y: clamp(next.y, bounds.minY, maxY),
        };
    };

    const resolveFollowPosition = (target: CameraTarget): CameraVector2 => {
        const desiredLookAheadX =
            toFinite(target.velocityX, 0) === 0
                ? 0
                : Math.sign(toFinite(target.velocityX, 0)) * lookAhead.x;
        const desiredLookAheadY =
            toFinite(target.velocityY, 0) === 0
                ? 0
                : Math.sign(toFinite(target.velocityY, 0)) * lookAhead.y;

        const smoothing = clamp(lookAhead.smoothing, 0, 1);
        smoothedLookAhead = {
            x:
                smoothedLookAhead.x +
                (desiredLookAheadX - smoothedLookAhead.x) * smoothing,
            y:
                smoothedLookAhead.y +
                (desiredLookAheadY - smoothedLookAhead.y) * smoothing,
        };

        const followedX = toFinite(target.x, 0) + smoothedLookAhead.x;
        const followedY = toFinite(target.y, 0) + smoothedLookAhead.y;

        const deadZoneWidth = clamp(deadZone.width, 1, viewport.width);
        const deadZoneHeight = clamp(deadZone.height, 1, viewport.height);

        const left = position.x + (viewport.width - deadZoneWidth) / 2;
        const right = left + deadZoneWidth;
        const top = position.y + (viewport.height - deadZoneHeight) / 2;
        const bottom = top + deadZoneHeight;

        let nextX = position.x;
        let nextY = position.y;

        if (followedX < left) {
            nextX = followedX - (viewport.width - deadZoneWidth) / 2;
        } else if (followedX > right) {
            nextX = followedX - (viewport.width + deadZoneWidth) / 2;
        }

        if (followedY < top) {
            nextY = followedY - (viewport.height - deadZoneHeight) / 2;
        } else if (followedY > bottom) {
            nextY = followedY - (viewport.height + deadZoneHeight) / 2;
        }

        return { x: nextX, y: nextY };
    };

    const resolveShakeOffset = (deltaMs: number): CameraVector2 => {
        if (shakes.size === 0) {
            return { x: 0, y: 0 };
        }

        let offsetX = 0;
        let offsetY = 0;

        for (const shake of Array.from(shakes.values())) {
            const nextElapsed = shake.elapsedMs + Math.max(0, deltaMs);
            shake.elapsedMs = nextElapsed;

            const progress = clamp(
                shake.durationMs > 0 ? nextElapsed / shake.durationMs : 1,
                0,
                1,
            );
            const decay = 1 - progress;
            const theta =
                (nextElapsed / 1000) * Math.PI * 2 * shake.frequencyHz;

            offsetX += Math.sin(theta) * shake.amplitudeX * decay;
            offsetY += Math.cos(theta) * shake.amplitudeY * decay;

            if (nextElapsed >= shake.durationMs) {
                shakes.delete(shake.id);
                emit(CAMERA_V2_SHAKE_COMPLETED_SIGNAL, { id: shake.id });
            }
        }

        return { x: offsetX, y: offsetY };
    };

    const buildSnapshot = (deltaMs = 0): CameraV2Snapshot => {
        const shake = resolveShakeOffset(deltaMs);
        const renderPosition = {
            x: position.x + shake.x,
            y: position.y + shake.y,
        };

        return {
            position: { ...position },
            renderPosition,
            viewport: { ...viewport },
            deadZone: { ...deadZone },
            lookAhead: { ...lookAhead },
            bounds: { ...bounds },
            trackId: trackState?.track.id ?? null,
            activeShakes: shakes.size,
        };
    };

    const setViewport = (patch: Partial<CameraViewport>) => {
        viewport.width = Math.max(
            1,
            Math.floor(toFinite(patch.width, viewport.width)),
        );
        viewport.height = Math.max(
            1,
            Math.floor(toFinite(patch.height, viewport.height)),
        );
        position = clampPositionToBounds(position);
    };

    const setPosition = (x: number, y: number) => {
        position = clampPositionToBounds({
            x: toFinite(x, 0),
            y: toFinite(y, 0),
        });
    };

    const setBounds = (patch: Partial<CameraBounds>) => {
        bounds = normalizeBounds({
            enabled:
                typeof patch.enabled === "boolean"
                    ? patch.enabled
                    : bounds.enabled,
            minX: toFinite(patch.minX, bounds.minX),
            minY: toFinite(patch.minY, bounds.minY),
            maxX: toFinite(patch.maxX, bounds.maxX),
            maxY: toFinite(patch.maxY, bounds.maxY),
        });
        position = clampPositionToBounds(position);
    };

    const setDeadZone = (patch: Partial<CameraDeadZone>) => {
        deadZone = {
            width: Math.max(1, toFinite(patch.width, deadZone.width)),
            height: Math.max(1, toFinite(patch.height, deadZone.height)),
        };
    };

    const setLookAhead = (patch: Partial<CameraLookAhead>) => {
        lookAhead = {
            x: Math.max(0, toFinite(patch.x, lookAhead.x)),
            y: Math.max(0, toFinite(patch.y, lookAhead.y)),
            smoothing: clamp(
                toFinite(patch.smoothing, lookAhead.smoothing),
                0,
                1,
            ),
        };
    };

    const startShake = (input: Omit<CameraShakeLayer, "elapsedMs">) => {
        const id = input.id.trim();
        if (!id) {
            return;
        }

        shakes.set(id, {
            id,
            amplitudeX: Math.max(0, toFinite(input.amplitudeX, 0)),
            amplitudeY: Math.max(0, toFinite(input.amplitudeY, 0)),
            frequencyHz: Math.max(0.1, toFinite(input.frequencyHz, 1)),
            durationMs: Math.max(1, Math.floor(toFinite(input.durationMs, 1))),
            elapsedMs: 0,
        });

        emit(CAMERA_V2_SHAKE_STARTED_SIGNAL, { id });
    };

    const playTrack = (track: CameraTrack) => {
        const sanitized = sanitizeTrack(track);
        if (!sanitized) {
            return false;
        }

        trackState = {
            track: sanitized,
            elapsedMs: 0,
        };
        emit(CAMERA_V2_TRACK_STARTED_SIGNAL, { id: sanitized.id });
        return true;
    };

    const stopTrack = () => {
        if (!trackState) {
            return false;
        }

        const id = trackState.track.id;
        trackState = null;
        emit(CAMERA_V2_TRACK_COMPLETED_SIGNAL, { id, stopped: true });
        return true;
    };

    const update = (deltaMs: number, target?: CameraTarget | null) => {
        const clampedDeltaMs = Math.max(0, Math.floor(toFinite(deltaMs, 0)));

        if (trackState) {
            trackState.elapsedMs += clampedDeltaMs;
            const frames = trackState.track.keyframes;
            const trackEndMs = frames[frames.length - 1]?.atMs ?? 0;

            if (trackState.track.loop && trackEndMs > 0) {
                trackState.elapsedMs = trackState.elapsedMs % trackEndMs;
            }

            position = clampPositionToBounds(
                interpolateTrackPosition(
                    trackState.track,
                    trackState.elapsedMs,
                ),
            );

            if (!trackState.track.loop && trackState.elapsedMs >= trackEndMs) {
                const completedTrackId = trackState.track.id;
                trackState = null;
                emit(CAMERA_V2_TRACK_COMPLETED_SIGNAL, {
                    id: completedTrackId,
                    stopped: false,
                });
            }
        } else if (target) {
            position = clampPositionToBounds(resolveFollowPosition(target));
        }

        const snapshot = buildSnapshot(clampedDeltaMs);
        emit(CAMERA_V2_UPDATED_SIGNAL, snapshot);
        return snapshot;
    };

    const getSnapshot = () => {
        return buildSnapshot(0);
    };

    return {
        setViewport,
        setPosition,
        setBounds,
        setDeadZone,
        setLookAhead,
        startShake,
        playTrack,
        stopTrack,
        update,
        getSnapshot,
    };
}

export const cameraV2 = createCameraV2Service();
