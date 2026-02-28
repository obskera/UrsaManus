import { signalBus } from "@/services/signalBus";

export type TimerSignalKind = "once" | "interval" | "cooldown";
export type TimerPhase = "started" | "tick" | "ready" | "blocked" | "cancelled";

export type TimerSignalPayload<T = unknown> = {
    id: string;
    kind: TimerSignalKind;
    phase: TimerPhase;
    nowMs: number;
    startedAtMs: number;
    elapsedMs: number;
    remainingMs: number;
    tick: number;
    data?: T;
};

export type TimerScheduler = {
    setTimeout: typeof globalThis.setTimeout;
    clearTimeout: typeof globalThis.clearTimeout;
    now: () => number;
};

export type TimerControl = {
    id: string;
    kind: TimerSignalKind;
    isRunning: () => boolean;
    isPaused: () => boolean;
    getRemainingMs: () => number;
    pause: () => boolean;
    resume: () => boolean;
    cancel: () => boolean;
};

export type OnceTimerOptions<T = unknown> = {
    id: string;
    delayMs: number;
    signal: string;
    data?: T;
};

export type IntervalTimerOptions<T = unknown> = {
    id: string;
    intervalMs: number;
    signal: string;
    data?: T;
    emitOnStart?: boolean;
};

export type CooldownTimerOptions<T = unknown> = {
    id: string;
    cooldownMs: number;
    signal: string;
    data?: T;
    emitBlocked?: boolean;
};

export type CooldownTimerControl<T = unknown> = TimerControl & {
    trigger: (data?: T) => boolean;
};

type ActiveTimerRecord = {
    id: string;
    cancel: () => void;
};

function clampDuration(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, value);
}

function createDefaultScheduler(): TimerScheduler {
    return {
        setTimeout: globalThis.setTimeout.bind(globalThis),
        clearTimeout: globalThis.clearTimeout.bind(globalThis),
        now: () => Date.now(),
    };
}

export function createTimerSignals(options?: {
    scheduler?: Partial<TimerScheduler>;
    emit?: <T>(signal: string, payload: T) => void;
}) {
    const baseScheduler = createDefaultScheduler();
    const scheduler: TimerScheduler = {
        ...baseScheduler,
        ...(options?.scheduler ?? {}),
    };
    const emit =
        options?.emit ??
        ((signal: string, payload: unknown) => {
            signalBus.emit(signal, payload);
        });

    const activeTimers = new Map<string, ActiveTimerRecord>();

    function registerTimer(id: string, cancel: () => void) {
        activeTimers.get(id)?.cancel();
        activeTimers.set(id, { id, cancel });
    }

    function unregisterTimer(id: string) {
        activeTimers.delete(id);
    }

    function createOnceTimer<T = unknown>({
        id,
        delayMs,
        signal,
        data,
    }: OnceTimerOptions<T>): TimerControl {
        const durationMs = clampDuration(delayMs);
        const startedAtMs = scheduler.now();
        let remainingMs = durationMs;
        let timeoutHandle: ReturnType<typeof globalThis.setTimeout> | null =
            null;
        let running = false;
        let paused = false;
        let cancelled = false;
        let deadlineMs = startedAtMs + durationMs;

        const emitPayload = (phase: TimerPhase) => {
            const nowMs = scheduler.now();
            emit<TimerSignalPayload<T>>(signal, {
                id,
                kind: "once",
                phase,
                nowMs,
                startedAtMs,
                elapsedMs: nowMs - startedAtMs,
                remainingMs:
                    phase === "tick"
                        ? 0
                        : Math.max(0, Math.round(deadlineMs - nowMs)),
                tick: phase === "tick" ? 1 : 0,
                data,
            });
        };

        const fire = () => {
            if (!running || cancelled) {
                return;
            }

            running = false;
            paused = false;
            timeoutHandle = null;
            remainingMs = 0;
            emitPayload("tick");
            unregisterTimer(id);
        };

        const schedule = (waitMs: number) => {
            running = true;
            paused = false;
            deadlineMs = scheduler.now() + waitMs;
            timeoutHandle = scheduler.setTimeout(fire, waitMs);
        };

        schedule(durationMs);
        emitPayload("started");

        const cancelInternal = (notify: boolean) => {
            if (cancelled || (!running && !paused)) {
                return false;
            }

            cancelled = true;
            running = false;
            paused = false;

            if (timeoutHandle !== null) {
                scheduler.clearTimeout(timeoutHandle);
                timeoutHandle = null;
            }

            if (notify) {
                emitPayload("cancelled");
            }

            unregisterTimer(id);
            return true;
        };

        registerTimer(id, () => {
            cancelInternal(false);
        });

        return {
            id,
            kind: "once",
            isRunning: () => running,
            isPaused: () => paused,
            getRemainingMs: () => Math.max(0, Math.round(remainingMs)),
            pause: () => {
                if (!running || paused || cancelled) {
                    return false;
                }

                const nowMs = scheduler.now();
                remainingMs = Math.max(0, deadlineMs - nowMs);

                if (timeoutHandle !== null) {
                    scheduler.clearTimeout(timeoutHandle);
                    timeoutHandle = null;
                }

                running = false;
                paused = true;
                return true;
            },
            resume: () => {
                if (!paused || cancelled) {
                    return false;
                }

                schedule(Math.max(0, remainingMs));
                return true;
            },
            cancel: () => cancelInternal(true),
        };
    }

    function createIntervalTimer<T = unknown>({
        id,
        intervalMs,
        signal,
        data,
        emitOnStart = false,
    }: IntervalTimerOptions<T>): TimerControl {
        const stepMs = Math.max(1, Math.round(clampDuration(intervalMs)));
        const startedAtMs = scheduler.now();
        let remainingMs = stepMs;
        let timeoutHandle: ReturnType<typeof globalThis.setTimeout> | null =
            null;
        let deadlineMs = startedAtMs + stepMs;
        let tick = 0;
        let running = false;
        let paused = false;
        let cancelled = false;

        const emitPayload = (phase: TimerPhase) => {
            const nowMs = scheduler.now();
            emit<TimerSignalPayload<T>>(signal, {
                id,
                kind: "interval",
                phase,
                nowMs,
                startedAtMs,
                elapsedMs: nowMs - startedAtMs,
                remainingMs:
                    phase === "tick"
                        ? stepMs
                        : Math.max(0, Math.round(deadlineMs - nowMs)),
                tick,
                data,
            });
        };

        const schedule = (waitMs: number) => {
            running = true;
            paused = false;
            deadlineMs = scheduler.now() + waitMs;
            timeoutHandle = scheduler.setTimeout(() => {
                if (!running || cancelled) {
                    return;
                }

                tick += 1;
                emitPayload("tick");
                remainingMs = stepMs;
                schedule(stepMs);
            }, waitMs);
        };

        schedule(stepMs);
        emitPayload("started");

        if (emitOnStart) {
            tick += 1;
            emitPayload("tick");
        }

        const cancelInternal = (notify: boolean) => {
            if (cancelled || (!running && !paused)) {
                return false;
            }

            cancelled = true;
            running = false;
            paused = false;

            if (timeoutHandle !== null) {
                scheduler.clearTimeout(timeoutHandle);
                timeoutHandle = null;
            }

            if (notify) {
                emitPayload("cancelled");
            }

            unregisterTimer(id);
            return true;
        };

        registerTimer(id, () => {
            cancelInternal(false);
        });

        return {
            id,
            kind: "interval",
            isRunning: () => running,
            isPaused: () => paused,
            getRemainingMs: () => Math.max(0, Math.round(remainingMs)),
            pause: () => {
                if (!running || paused || cancelled) {
                    return false;
                }

                const nowMs = scheduler.now();
                remainingMs = Math.max(0, deadlineMs - nowMs);

                if (timeoutHandle !== null) {
                    scheduler.clearTimeout(timeoutHandle);
                    timeoutHandle = null;
                }

                running = false;
                paused = true;
                return true;
            },
            resume: () => {
                if (!paused || cancelled) {
                    return false;
                }

                schedule(Math.max(0, remainingMs));
                return true;
            },
            cancel: () => cancelInternal(true),
        };
    }

    function createCooldownTimer<T = unknown>({
        id,
        cooldownMs,
        signal,
        data,
        emitBlocked = true,
    }: CooldownTimerOptions<T>): CooldownTimerControl<T> {
        const durationMs = clampDuration(cooldownMs);
        let startedAtMs = 0;
        let remainingMs = 0;
        let timeoutHandle: ReturnType<typeof globalThis.setTimeout> | null =
            null;
        let deadlineMs = 0;
        let running = false;
        let paused = false;
        let cancelled = false;
        let tick = 0;

        const emitPayload = (
            phase: TimerPhase,
            overrideData?: T,
            nowMs = scheduler.now(),
        ) => {
            emit<TimerSignalPayload<T>>(signal, {
                id,
                kind: "cooldown",
                phase,
                nowMs,
                startedAtMs,
                elapsedMs: startedAtMs > 0 ? nowMs - startedAtMs : 0,
                remainingMs:
                    phase === "ready"
                        ? 0
                        : Math.max(0, Math.round(deadlineMs - nowMs)),
                tick,
                data: overrideData ?? data,
            });
        };

        const finish = () => {
            if (!running || cancelled) {
                return;
            }

            running = false;
            paused = false;
            timeoutHandle = null;
            remainingMs = 0;
            emitPayload("ready");
        };

        const schedule = (waitMs: number) => {
            running = true;
            paused = false;
            deadlineMs = scheduler.now() + waitMs;
            timeoutHandle = scheduler.setTimeout(finish, waitMs);
        };

        const cancelInternal = (notify: boolean) => {
            if (cancelled || (!running && !paused)) {
                return false;
            }

            cancelled = true;
            running = false;
            paused = false;

            if (timeoutHandle !== null) {
                scheduler.clearTimeout(timeoutHandle);
                timeoutHandle = null;
            }

            if (notify) {
                emitPayload("cancelled");
            }

            unregisterTimer(id);
            return true;
        };

        registerTimer(id, () => {
            cancelInternal(false);
        });

        return {
            id,
            kind: "cooldown",
            isRunning: () => running,
            isPaused: () => paused,
            getRemainingMs: () => {
                if (!running && !paused) {
                    return 0;
                }

                return Math.max(0, Math.round(remainingMs));
            },
            pause: () => {
                if (!running || paused || cancelled) {
                    return false;
                }

                const nowMs = scheduler.now();
                remainingMs = Math.max(0, deadlineMs - nowMs);

                if (timeoutHandle !== null) {
                    scheduler.clearTimeout(timeoutHandle);
                    timeoutHandle = null;
                }

                running = false;
                paused = true;
                return true;
            },
            resume: () => {
                if (!paused || cancelled) {
                    return false;
                }

                schedule(Math.max(0, remainingMs));
                return true;
            },
            cancel: () => cancelInternal(true),
            trigger: (overrideData?: T) => {
                if (running || paused) {
                    if (emitBlocked) {
                        emitPayload("blocked", overrideData);
                    }
                    return false;
                }

                if (cancelled) {
                    cancelled = false;
                }

                tick += 1;
                startedAtMs = scheduler.now();
                remainingMs = durationMs;
                emitPayload("started", overrideData, startedAtMs);
                schedule(durationMs);
                return true;
            },
        };
    }

    function cancelAll() {
        const ids = Array.from(activeTimers.keys());
        for (const id of ids) {
            activeTimers.get(id)?.cancel();
        }
        activeTimers.clear();
    }

    return {
        once: createOnceTimer,
        interval: createIntervalTimer,
        cooldown: createCooldownTimer,
        cancelAll,
        activeCount: () => activeTimers.size,
    };
}

export const timerSignals = createTimerSignals();
