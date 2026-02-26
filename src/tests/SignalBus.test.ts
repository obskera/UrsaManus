import { describe, expect, it, vi } from "vitest";
import { signalBus } from "@/services/SignalBus";

describe("SignalBus", () => {
    it("registers handlers and emits payloads", () => {
        signalBus.clear();
        const handler = vi.fn<(payload: number) => void>();

        signalBus.on<number>("healthChanged", handler);
        signalBus.emit("healthChanged", 50);

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(50);
    });

    it("unsubscribe removes handler", () => {
        signalBus.clear();
        const handler = vi.fn<(payload: string) => void>();

        const unsubscribe = signalBus.on<string>("message", handler);
        unsubscribe();
        signalBus.emit("message", "hello");

        expect(handler).not.toHaveBeenCalled();
    });

    it("off removes only the specified handler", () => {
        signalBus.clear();
        const a = vi.fn<(payload: number) => void>();
        const b = vi.fn<(payload: number) => void>();

        signalBus.on<number>("score", a);
        signalBus.on<number>("score", b);
        signalBus.off<number>("score", a);
        signalBus.emit("score", 99);

        expect(a).not.toHaveBeenCalled();
        expect(b).toHaveBeenCalledWith(99);
    });

    it("clear(signal) clears one signal and clear() clears all", () => {
        signalBus.clear();
        const a = vi.fn<(payload: number) => void>();
        const b = vi.fn<(payload: number) => void>();

        signalBus.on<number>("one", a);
        signalBus.on<number>("two", b);

        signalBus.clear("one");
        signalBus.emit("one", 1);
        signalBus.emit("two", 2);

        expect(a).not.toHaveBeenCalled();
        expect(b).toHaveBeenCalledWith(2);

        signalBus.clear();
        signalBus.emit("two", 3);
        expect(b).toHaveBeenCalledTimes(1);
    });
});
