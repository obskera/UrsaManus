import {
    signalBus,
    type Handler,
    type Unsubscribe,
} from "@/services/signalBus";

export type PluginId = string;

export type PluginGrantScope = string;

export type PluginCapabilityGrants = {
    renderHooks?: PluginGrantScope[];
    dataRead?: PluginGrantScope[];
    dataWrite?: PluginGrantScope[];
    signalEmit?: PluginGrantScope[];
    signalSubscribe?: PluginGrantScope[];
};

export type PluginManifest = {
    id: PluginId;
    name: string;
    grants?: PluginCapabilityGrants;
};

export type PluginSandboxAction =
    | "register"
    | "unregister"
    | "render-hook"
    | "data-read"
    | "data-write"
    | "signal-emit"
    | "signal-subscribe";

export type PluginSandboxFailureCode =
    | "plugin-not-registered"
    | "scope-denied"
    | "protected-domain"
    | "invalid-id"
    | "invalid-scope";

export type PluginSandboxFailureEvent = {
    pluginId: string;
    action: PluginSandboxAction;
    scope: string;
    code: PluginSandboxFailureCode;
    message: string;
    atMs: number;
};

export type PluginSandboxActionEvent = {
    pluginId: string;
    action: PluginSandboxAction;
    scope: string;
    atMs: number;
};

export type PluginSandboxResult<T = void> =
    | {
          ok: true;
          value: T;
      }
    | {
          ok: false;
          code: PluginSandboxFailureCode;
          message: string;
      };

export type PluginRuntime = {
    pluginId: string;
    canUse: (action: PluginSandboxAction, scope: string) => boolean;
    registerRenderHook: (
        hookId: string,
        hook: () => void,
    ) => PluginSandboxResult<Unsubscribe>;
    readData: <T = unknown>(path: string) => PluginSandboxResult<T | undefined>;
    writeData: (path: string, value: unknown) => PluginSandboxResult<boolean>;
    emitSignal: <TPayload = unknown>(
        signal: string,
        payload: TPayload,
    ) => PluginSandboxResult<boolean>;
    subscribeSignal: <TPayload = unknown>(
        signal: string,
        handler: Handler<TPayload>,
    ) => PluginSandboxResult<Unsubscribe>;
};

export type PluginSandbox = {
    registerPlugin: (manifest: PluginManifest) => PluginSandboxResult<PluginId>;
    unregisterPlugin: (pluginId: PluginId) => boolean;
    listPlugins: () => PluginManifest[];
    getPlugin: (pluginId: PluginId) => PluginManifest | null;
    createRuntime: (pluginId: PluginId) => PluginRuntime;
};

export const PLUGIN_SANDBOX_ACTION_SIGNAL = "plugin:sandbox:action";
export const PLUGIN_SANDBOX_DENIED_SIGNAL = "plugin:sandbox:denied";

const DEFAULT_PROTECTED_WRITE_PREFIXES = [
    "engine.",
    "runtime.",
    "services.",
    "save.",
    "state.",
];

type SandboxDeps = {
    now: () => number;
    emit: <TPayload>(signal: string, payload: TPayload) => void;
    registerRenderHook: (
        pluginId: string,
        hookId: string,
        hook: () => void,
    ) => Unsubscribe;
    readData: <T = unknown>(path: string) => T | undefined;
    writeData: (path: string, value: unknown) => boolean;
    onSignal: <TPayload = unknown>(
        signal: string,
        handler: Handler<TPayload>,
    ) => Unsubscribe;
    emitSignal: <TPayload = unknown>(signal: string, payload: TPayload) => void;
};

function normalizeNow(now: () => number): number {
    const value = now();
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, value);
}

function normalizeScopes(scopes: PluginGrantScope[] | undefined): string[] {
    if (!scopes || scopes.length === 0) {
        return [];
    }

    return scopes
        .map((scope) => scope.trim())
        .filter((scope) => scope.length > 0);
}

function normalizeManifest(manifest: PluginManifest): PluginManifest | null {
    const id = manifest.id.trim();
    if (!id) {
        return null;
    }

    return {
        id,
        name: manifest.name.trim() || id,
        grants: {
            renderHooks: normalizeScopes(manifest.grants?.renderHooks),
            dataRead: normalizeScopes(manifest.grants?.dataRead),
            dataWrite: normalizeScopes(manifest.grants?.dataWrite),
            signalEmit: normalizeScopes(manifest.grants?.signalEmit),
            signalSubscribe: normalizeScopes(manifest.grants?.signalSubscribe),
        },
    };
}

function scopeMatches(grants: string[] | undefined, target: string): boolean {
    if (!grants || grants.length === 0) {
        return false;
    }

    const normalized = target.trim();
    if (!normalized) {
        return false;
    }

    return grants.some((grant) => {
        if (grant === "*") {
            return true;
        }

        if (grant.endsWith("*")) {
            const prefix = grant.slice(0, -1);
            return normalized.startsWith(prefix);
        }

        return grant === normalized;
    });
}

function protectedWritePath(
    path: string,
    protectedPrefixes: string[],
): boolean {
    const normalizedPath = path.trim();
    if (!normalizedPath) {
        return true;
    }

    return protectedPrefixes.some((prefix) =>
        normalizedPath.startsWith(prefix),
    );
}

export function createPluginSandbox(options?: {
    now?: () => number;
    emit?: <TPayload>(signal: string, payload: TPayload) => void;
    registerRenderHook?: (
        pluginId: string,
        hookId: string,
        hook: () => void,
    ) => Unsubscribe;
    readData?: <T = unknown>(path: string) => T | undefined;
    writeData?: (path: string, value: unknown) => boolean;
    onSignal?: <TPayload = unknown>(
        signal: string,
        handler: Handler<TPayload>,
    ) => Unsubscribe;
    emitSignal?: <TPayload = unknown>(
        signal: string,
        payload: TPayload,
    ) => void;
    protectedWritePrefixes?: string[];
}): PluginSandbox {
    const deps: SandboxDeps = {
        now: options?.now ?? (() => Date.now()),
        emit:
            options?.emit ??
            ((signal, payload) => {
                signalBus.emit(signal, payload);
            }),
        registerRenderHook:
            options?.registerRenderHook ??
            (() => {
                return () => undefined;
            }),
        readData: options?.readData ?? (() => undefined),
        writeData: options?.writeData ?? (() => false),
        onSignal:
            options?.onSignal ??
            ((signal, handler) => {
                return signalBus.on(signal, handler);
            }),
        emitSignal:
            options?.emitSignal ??
            ((signal, payload) => {
                signalBus.emit(signal, payload);
            }),
    };

    const protectedPrefixes = (
        options?.protectedWritePrefixes ?? DEFAULT_PROTECTED_WRITE_PREFIXES
    )
        .map((prefix) => prefix.trim())
        .filter((prefix) => prefix.length > 0);

    const manifestsById = new Map<string, PluginManifest>();

    const fail = (
        pluginId: string,
        action: PluginSandboxAction,
        scope: string,
        code: PluginSandboxFailureCode,
        message: string,
    ): PluginSandboxResult<never> => {
        deps.emit<PluginSandboxFailureEvent>(PLUGIN_SANDBOX_DENIED_SIGNAL, {
            pluginId,
            action,
            scope,
            code,
            message,
            atMs: normalizeNow(deps.now),
        });

        return {
            ok: false,
            code,
            message,
        };
    };

    const emitAction = (
        pluginId: string,
        action: PluginSandboxAction,
        scope: string,
    ) => {
        deps.emit<PluginSandboxActionEvent>(PLUGIN_SANDBOX_ACTION_SIGNAL, {
            pluginId,
            action,
            scope,
            atMs: normalizeNow(deps.now),
        });
    };

    const resolvePlugin = (pluginId: string): PluginManifest | null => {
        const normalizedId = pluginId.trim();
        if (!normalizedId) {
            return null;
        }

        return manifestsById.get(normalizedId) ?? null;
    };

    const canUse = (
        plugin: PluginManifest | null,
        action: PluginSandboxAction,
        scope: string,
    ) => {
        if (!plugin) {
            return false;
        }

        const grants = plugin.grants ?? {};

        switch (action) {
            case "render-hook":
                return scopeMatches(grants.renderHooks, scope);
            case "data-read":
                return scopeMatches(grants.dataRead, scope);
            case "data-write":
                return scopeMatches(grants.dataWrite, scope);
            case "signal-emit":
                return scopeMatches(grants.signalEmit, scope);
            case "signal-subscribe":
                return scopeMatches(grants.signalSubscribe, scope);
            default:
                return true;
        }
    };

    const createRuntime: PluginSandbox["createRuntime"] = (pluginId) => {
        const runtimePluginId = pluginId.trim();

        return {
            pluginId: runtimePluginId,
            canUse: (action, scope) => {
                const plugin = resolvePlugin(runtimePluginId);
                return canUse(plugin, action, scope);
            },
            registerRenderHook: (hookId, hook) => {
                const plugin = resolvePlugin(runtimePluginId);
                if (!plugin) {
                    return fail(
                        runtimePluginId,
                        "render-hook",
                        hookId,
                        "plugin-not-registered",
                        `Plugin "${runtimePluginId}" is not registered.`,
                    );
                }

                if (!hookId.trim()) {
                    return fail(
                        runtimePluginId,
                        "render-hook",
                        hookId,
                        "invalid-scope",
                        "Render hook id cannot be empty.",
                    );
                }

                if (!canUse(plugin, "render-hook", hookId)) {
                    return fail(
                        runtimePluginId,
                        "render-hook",
                        hookId,
                        "scope-denied",
                        `Render hook "${hookId}" is not permitted for plugin "${runtimePluginId}".`,
                    );
                }

                const off = deps.registerRenderHook(
                    runtimePluginId,
                    hookId,
                    hook,
                );
                emitAction(runtimePluginId, "render-hook", hookId);
                return { ok: true, value: off };
            },
            readData: <T = unknown>(path: string) => {
                const plugin = resolvePlugin(runtimePluginId);
                if (!plugin) {
                    return fail(
                        runtimePluginId,
                        "data-read",
                        path,
                        "plugin-not-registered",
                        `Plugin "${runtimePluginId}" is not registered.`,
                    );
                }

                if (!path.trim()) {
                    return fail(
                        runtimePluginId,
                        "data-read",
                        path,
                        "invalid-scope",
                        "Data path cannot be empty.",
                    );
                }

                if (!canUse(plugin, "data-read", path)) {
                    return fail(
                        runtimePluginId,
                        "data-read",
                        path,
                        "scope-denied",
                        `Data read path "${path}" is not permitted for plugin "${runtimePluginId}".`,
                    );
                }

                const value = deps.readData<T>(path);
                emitAction(runtimePluginId, "data-read", path);
                return { ok: true, value };
            },
            writeData: (path, value) => {
                const plugin = resolvePlugin(runtimePluginId);
                if (!plugin) {
                    return fail(
                        runtimePluginId,
                        "data-write",
                        path,
                        "plugin-not-registered",
                        `Plugin "${runtimePluginId}" is not registered.`,
                    );
                }

                if (!path.trim()) {
                    return fail(
                        runtimePluginId,
                        "data-write",
                        path,
                        "invalid-scope",
                        "Data path cannot be empty.",
                    );
                }

                if (protectedWritePath(path, protectedPrefixes)) {
                    return fail(
                        runtimePluginId,
                        "data-write",
                        path,
                        "protected-domain",
                        `Write path "${path}" targets a protected runtime domain.`,
                    );
                }

                if (!canUse(plugin, "data-write", path)) {
                    return fail(
                        runtimePluginId,
                        "data-write",
                        path,
                        "scope-denied",
                        `Data write path "${path}" is not permitted for plugin "${runtimePluginId}".`,
                    );
                }

                const applied = deps.writeData(path, value);
                emitAction(runtimePluginId, "data-write", path);
                return { ok: true, value: applied };
            },
            emitSignal: (signal, payload) => {
                const plugin = resolvePlugin(runtimePluginId);
                if (!plugin) {
                    return fail(
                        runtimePluginId,
                        "signal-emit",
                        signal,
                        "plugin-not-registered",
                        `Plugin "${runtimePluginId}" is not registered.`,
                    );
                }

                if (!signal.trim()) {
                    return fail(
                        runtimePluginId,
                        "signal-emit",
                        signal,
                        "invalid-scope",
                        "Signal name cannot be empty.",
                    );
                }

                if (!canUse(plugin, "signal-emit", signal)) {
                    return fail(
                        runtimePluginId,
                        "signal-emit",
                        signal,
                        "scope-denied",
                        `Signal emit scope "${signal}" is not permitted for plugin "${runtimePluginId}".`,
                    );
                }

                deps.emitSignal(signal, payload);
                emitAction(runtimePluginId, "signal-emit", signal);
                return { ok: true, value: true };
            },
            subscribeSignal: (signal, handler) => {
                const plugin = resolvePlugin(runtimePluginId);
                if (!plugin) {
                    return fail(
                        runtimePluginId,
                        "signal-subscribe",
                        signal,
                        "plugin-not-registered",
                        `Plugin "${runtimePluginId}" is not registered.`,
                    );
                }

                if (!signal.trim()) {
                    return fail(
                        runtimePluginId,
                        "signal-subscribe",
                        signal,
                        "invalid-scope",
                        "Signal name cannot be empty.",
                    );
                }

                if (!canUse(plugin, "signal-subscribe", signal)) {
                    return fail(
                        runtimePluginId,
                        "signal-subscribe",
                        signal,
                        "scope-denied",
                        `Signal subscribe scope "${signal}" is not permitted for plugin "${runtimePluginId}".`,
                    );
                }

                const off = deps.onSignal(signal, handler);
                emitAction(runtimePluginId, "signal-subscribe", signal);
                return { ok: true, value: off };
            },
        };
    };

    const registerPlugin: PluginSandbox["registerPlugin"] = (manifest) => {
        const normalized = normalizeManifest(manifest);
        if (!normalized) {
            return {
                ok: false,
                code: "invalid-id",
                message: "Plugin id cannot be empty.",
            };
        }

        manifestsById.set(normalized.id, normalized);
        emitAction(normalized.id, "register", normalized.id);
        return { ok: true, value: normalized.id };
    };

    const unregisterPlugin: PluginSandbox["unregisterPlugin"] = (pluginId) => {
        const normalizedId = pluginId.trim();
        if (!normalizedId) {
            return false;
        }

        const deleted = manifestsById.delete(normalizedId);
        if (deleted) {
            emitAction(normalizedId, "unregister", normalizedId);
        }

        return deleted;
    };

    const listPlugins: PluginSandbox["listPlugins"] = () => {
        return Array.from(manifestsById.values()).map((manifest) => ({
            ...manifest,
            grants: {
                renderHooks: [...(manifest.grants?.renderHooks ?? [])],
                dataRead: [...(manifest.grants?.dataRead ?? [])],
                dataWrite: [...(manifest.grants?.dataWrite ?? [])],
                signalEmit: [...(manifest.grants?.signalEmit ?? [])],
                signalSubscribe: [...(manifest.grants?.signalSubscribe ?? [])],
            },
        }));
    };

    const getPlugin: PluginSandbox["getPlugin"] = (pluginId) => {
        const plugin = resolvePlugin(pluginId);
        if (!plugin) {
            return null;
        }

        return {
            ...plugin,
            grants: {
                renderHooks: [...(plugin.grants?.renderHooks ?? [])],
                dataRead: [...(plugin.grants?.dataRead ?? [])],
                dataWrite: [...(plugin.grants?.dataWrite ?? [])],
                signalEmit: [...(plugin.grants?.signalEmit ?? [])],
                signalSubscribe: [...(plugin.grants?.signalSubscribe ?? [])],
            },
        };
    };

    return {
        registerPlugin,
        unregisterPlugin,
        listPlugins,
        getPlugin,
        createRuntime,
    };
}

export const pluginSandbox = createPluginSandbox();
