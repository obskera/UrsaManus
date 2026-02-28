import { signalBus } from "@/services/signalBus";

export type ContentDomain = "dialogue" | "quest" | "map" | "editor";

export const CONTENT_HOT_RELOAD_REQUESTED_SIGNAL =
    "content:hot-reload:requested";
export const CONTENT_HOT_RELOAD_APPLIED_SIGNAL = "content:hot-reload:applied";
export const CONTENT_HOT_RELOAD_FAILED_SIGNAL = "content:hot-reload:failed";

export type ContentHotReloadSource = "manual" | "watcher";

export type ContentHotReloadContext = {
    domain: ContentDomain;
    reason?: string;
    source: ContentHotReloadSource;
    changedPath?: string;
};

export type ContentHotReloadHandler = (
    context: ContentHotReloadContext,
) => void | Promise<void>;

export type ContentHotReloadRequestedEvent = {
    domain: ContentDomain;
    reason?: string;
    source: ContentHotReloadSource;
    changedPath?: string;
    atMs: number;
};

export type ContentHotReloadAppliedEvent = {
    domain: ContentDomain;
    reason?: string;
    source: ContentHotReloadSource;
    changedPath?: string;
    atMs: number;
    durationMs: number;
};

export type ContentHotReloadFailedEvent = {
    domain: ContentDomain;
    reason?: string;
    source: ContentHotReloadSource;
    changedPath?: string;
    atMs: number;
    durationMs: number;
    message: string;
};

export type ContentHotReloadErrorCode =
    | "disabled"
    | "missing-domain"
    | "handler-failed";

export type ContentHotReloadResult =
    | {
          ok: true;
          domain: ContentDomain;
          durationMs: number;
      }
    | {
          ok: false;
          domain: ContentDomain | null;
          code: ContentHotReloadErrorCode;
          message: string;
      };

export type ContentHotReloadPipeline = {
    isEnabled: () => boolean;
    setEnabled: (enabled: boolean) => void;
    registerDomain: (
        domain: ContentDomain,
        handler: ContentHotReloadHandler,
    ) => () => void;
    clearDomain: (domain: ContentDomain) => void;
    clearAllDomains: () => void;
    getRegisteredDomains: () => ContentDomain[];
    resolveDomainFromPath: (path: string) => ContentDomain | null;
    requestReload: (
        domain: ContentDomain,
        options?: {
            reason?: string;
            source?: ContentHotReloadSource;
            changedPath?: string;
        },
    ) => Promise<ContentHotReloadResult>;
    requestReloadForPath: (
        path: string,
        options?: {
            reason?: string;
            source?: ContentHotReloadSource;
        },
    ) => Promise<ContentHotReloadResult>;
};

export type CreateContentHotReloadPipelineOptions = {
    enabled?: boolean;
    now?: () => number;
    emit?: <TPayload>(signal: string, payload: TPayload) => void;
};

const DEFAULT_DOMAIN_MATCHERS: Record<ContentDomain, RegExp[]> = {
    dialogue: [/dialogue/i, /conversation/i],
    quest: [/quest/i, /mission/i],
    map: [/map/i, /worldgen/i, /tile/i],
    editor: [/editor/i, /placement/i],
};

function normalizeNow(now: () => number): number {
    const value = now();
    if (!Number.isFinite(value)) {
        return 0;
    }

    return value;
}

function resolveErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }

    return "Unknown hot-reload failure.";
}

export function createContentHotReloadPipeline(
    options: CreateContentHotReloadPipelineOptions = {},
): ContentHotReloadPipeline {
    const now = options.now ?? (() => Date.now());
    const emit =
        options.emit ??
        (<TPayload>(signal: string, payload: TPayload) => {
            signalBus.emit(signal, payload);
        });
    const handlers = new Map<ContentDomain, ContentHotReloadHandler>();

    let enabled = options.enabled ?? true;

    const resolveDomainFromPath = (path: string): ContentDomain | null => {
        const normalized = path.trim();
        if (!normalized) {
            return null;
        }

        for (const [domain, patterns] of Object.entries(
            DEFAULT_DOMAIN_MATCHERS,
        )) {
            if (patterns.some((pattern) => pattern.test(normalized))) {
                return domain as ContentDomain;
            }
        }

        return null;
    };

    const requestReload: ContentHotReloadPipeline["requestReload"] = async (
        domain,
        requestOptions,
    ) => {
        if (!enabled) {
            return {
                ok: false,
                domain,
                code: "disabled",
                message: "Content hot-reload pipeline is disabled.",
            };
        }

        const handler = handlers.get(domain);
        if (!handler) {
            return {
                ok: false,
                domain,
                code: "missing-domain",
                message: `No hot-reload handler registered for domain "${domain}".`,
            };
        }

        const startedAtMs = normalizeNow(now);
        const reason = requestOptions?.reason;
        const source = requestOptions?.source ?? "manual";
        const changedPath = requestOptions?.changedPath;

        emit<ContentHotReloadRequestedEvent>(
            CONTENT_HOT_RELOAD_REQUESTED_SIGNAL,
            {
                domain,
                reason,
                source,
                changedPath,
                atMs: startedAtMs,
            },
        );

        try {
            await handler({
                domain,
                reason,
                source,
                changedPath,
            });
        } catch (error) {
            const durationMs = Math.max(
                0,
                Math.round(normalizeNow(now) - startedAtMs),
            );
            const message = resolveErrorMessage(error);

            emit<ContentHotReloadFailedEvent>(
                CONTENT_HOT_RELOAD_FAILED_SIGNAL,
                {
                    domain,
                    reason,
                    source,
                    changedPath,
                    atMs: startedAtMs,
                    durationMs,
                    message,
                },
            );

            return {
                ok: false,
                domain,
                code: "handler-failed",
                message,
            };
        }

        const durationMs = Math.max(
            0,
            Math.round(normalizeNow(now) - startedAtMs),
        );

        emit<ContentHotReloadAppliedEvent>(CONTENT_HOT_RELOAD_APPLIED_SIGNAL, {
            domain,
            reason,
            source,
            changedPath,
            atMs: startedAtMs,
            durationMs,
        });

        emit<ContentHotReloadAppliedEvent>(`content:refresh:${domain}`, {
            domain,
            reason,
            source,
            changedPath,
            atMs: startedAtMs,
            durationMs,
        });

        return {
            ok: true,
            domain,
            durationMs,
        };
    };

    return {
        isEnabled: () => enabled,
        setEnabled: (nextEnabled) => {
            enabled = nextEnabled;
        },
        registerDomain: (domain, handler) => {
            handlers.set(domain, handler);
            return () => {
                const current = handlers.get(domain);
                if (current === handler) {
                    handlers.delete(domain);
                }
            };
        },
        clearDomain: (domain) => {
            handlers.delete(domain);
        },
        clearAllDomains: () => {
            handlers.clear();
        },
        getRegisteredDomains: () => Array.from(handlers.keys()),
        resolveDomainFromPath,
        requestReload,
        requestReloadForPath: async (path, requestOptions) => {
            const domain = resolveDomainFromPath(path);
            if (!domain) {
                return {
                    ok: false,
                    domain: null,
                    code: "missing-domain",
                    message: `Could not resolve content domain for path "${path}".`,
                };
            }

            return requestReload(domain, {
                reason: requestOptions?.reason,
                source: requestOptions?.source ?? "watcher",
                changedPath: path,
            });
        },
    };
}

export const contentHotReload = createContentHotReloadPipeline({
    enabled:
        typeof import.meta !== "undefined" &&
        !!(import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV,
});
