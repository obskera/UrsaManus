import { afterEach, describe, expect, it, vi } from "vitest";
import { signalBus } from "@/services/signalBus";
import {
    PLUGIN_SANDBOX_ACTION_SIGNAL,
    PLUGIN_SANDBOX_DENIED_SIGNAL,
    createPluginSandbox,
} from "@/services/pluginSandbox";

describe("plugin sandbox service", () => {
    afterEach(() => {
        signalBus.clear();
    });

    it("registers plugins and allows granted render/data/signal scopes", () => {
        const registerRenderHook = vi.fn(
            (pluginId: string, hookId: string, hook: () => void) => {
                void pluginId;
                void hookId;
                void hook;
                return () => undefined;
            },
        );
        const readDataMock = vi.fn((path: string) => ({ path }));
        const readData = ((path: string) => readDataMock(path)) as <
            T = unknown,
        >(
            path: string,
        ) => T | undefined;
        const writeData = vi.fn(() => true);
        const emitSignal = vi.fn();
        const onSignal = vi.fn(() => () => undefined);

        const sandbox = createPluginSandbox({
            registerRenderHook,
            readData,
            writeData,
            emitSignal,
            onSignal,
            protectedWritePrefixes: ["engine."],
        });

        const registered = sandbox.registerPlugin({
            id: "mod.weather",
            name: "Weather Mod",
            grants: {
                renderHooks: ["hud.weather.*"],
                dataRead: ["world.weather.*"],
                dataWrite: ["world.weather.*"],
                signalEmit: ["mod.weather:*"],
                signalSubscribe: ["game:tick"],
            },
        });
        expect(registered).toEqual({ ok: true, value: "mod.weather" });

        const runtime = sandbox.createRuntime("mod.weather");

        const hook = runtime.registerRenderHook(
            "hud.weather.overlay",
            () => {},
        );
        expect(hook.ok).toBe(true);
        expect(registerRenderHook).toHaveBeenCalledWith(
            "mod.weather",
            "hud.weather.overlay",
            expect.any(Function),
        );

        const dataReadResult = runtime.readData("world.weather.intensity");
        expect(dataReadResult.ok).toBe(true);
        expect(readDataMock).toHaveBeenCalledWith("world.weather.intensity");

        const writeResult = runtime.writeData("world.weather.intensity", 0.4);
        expect(writeResult).toEqual({ ok: true, value: true });
        expect(writeData).toHaveBeenCalledWith("world.weather.intensity", 0.4);

        const emitResult = runtime.emitSignal("mod.weather:rain-start", {
            intensity: 0.8,
        });
        expect(emitResult).toEqual({ ok: true, value: true });
        expect(emitSignal).toHaveBeenCalledWith("mod.weather:rain-start", {
            intensity: 0.8,
        });

        const subscribeResult = runtime.subscribeSignal("game:tick", () => {});
        expect(subscribeResult.ok).toBe(true);
        expect(onSignal).toHaveBeenCalledWith(
            "game:tick",
            expect.any(Function),
        );
    });

    it("blocks ungranted scopes and emits denied diagnostics", () => {
        const deniedCodes: string[] = [];
        signalBus.on(
            PLUGIN_SANDBOX_DENIED_SIGNAL,
            (event: { code: string }) => {
                deniedCodes.push(event.code);
            },
        );

        const sandbox = createPluginSandbox();
        sandbox.registerPlugin({
            id: "mod.fx",
            name: "FX",
            grants: {
                renderHooks: ["hud.fx.*"],
                dataRead: ["world.fx.*"],
                signalEmit: ["mod.fx:*"],
            },
        });

        const runtime = sandbox.createRuntime("mod.fx");

        const deniedHook = runtime.registerRenderHook(
            "hud.debug.overlay",
            () => {},
        );
        expect(deniedHook.ok).toBe(false);

        const deniedRead = runtime.readData("save.slot.1");
        expect(deniedRead.ok).toBe(false);

        const deniedEmit = runtime.emitSignal("engine:shutdown", null);
        expect(deniedEmit.ok).toBe(false);

        const deniedSubscribe = runtime.subscribeSignal("game:tick", () => {});
        expect(deniedSubscribe.ok).toBe(false);

        expect(deniedCodes).toEqual([
            "scope-denied",
            "scope-denied",
            "scope-denied",
            "scope-denied",
        ]);
    });

    it("rejects writes into protected engine/runtime domains", () => {
        const denied: Array<{ code: string; scope: string }> = [];
        signalBus.on(
            PLUGIN_SANDBOX_DENIED_SIGNAL,
            (event: { code: string; scope: string }) => {
                denied.push({ code: event.code, scope: event.scope });
            },
        );

        const writeData = vi.fn(() => true);
        const sandbox = createPluginSandbox({
            writeData,
            protectedWritePrefixes: ["engine.", "runtime."],
        });

        sandbox.registerPlugin({
            id: "mod.tools",
            name: "Tools",
            grants: {
                dataWrite: ["*"],
            },
        });

        const runtime = sandbox.createRuntime("mod.tools");

        const blocked = runtime.writeData("engine.state", { hp: 10 });
        expect(blocked.ok).toBe(false);
        if (!blocked.ok) {
            expect(blocked.code).toBe("protected-domain");
        }

        const allowed = runtime.writeData("mods.tools.setting", true);
        expect(allowed).toEqual({ ok: true, value: true });
        expect(writeData).toHaveBeenCalledTimes(1);

        expect(denied).toEqual([
            {
                code: "protected-domain",
                scope: "engine.state",
            },
        ]);
    });

    it("tracks register/unregister events and plugin listing", () => {
        const actions: string[] = [];
        signalBus.on(
            PLUGIN_SANDBOX_ACTION_SIGNAL,
            (event: { action: string; pluginId: string; scope: string }) => {
                actions.push(
                    `${event.action}:${event.pluginId}:${event.scope}`,
                );
            },
        );

        const sandbox = createPluginSandbox();
        const invalid = sandbox.registerPlugin({ id: " ", name: "Invalid" });
        expect(invalid.ok).toBe(false);

        sandbox.registerPlugin({
            id: "mod.a",
            name: "Mod A",
            grants: { signalSubscribe: ["game:tick"] },
        });
        sandbox.registerPlugin({
            id: "mod.b",
            name: "Mod B",
            grants: { signalSubscribe: ["game:*"] },
        });

        expect(
            sandbox
                .listPlugins()
                .map((plugin) => plugin.id)
                .sort(),
        ).toEqual(["mod.a", "mod.b"]);
        expect(sandbox.getPlugin("mod.a")?.name).toBe("Mod A");

        const removed = sandbox.unregisterPlugin("mod.a");
        expect(removed).toBe(true);

        const runtime = sandbox.createRuntime("mod.a");
        const denied = runtime.subscribeSignal("game:tick", () => {});
        expect(denied.ok).toBe(false);

        expect(actions).toContain("register:mod.a:mod.a");
        expect(actions).toContain("register:mod.b:mod.b");
        expect(actions).toContain("unregister:mod.a:mod.a");
    });
});
