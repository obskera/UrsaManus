import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useAccessibilitySettings } from "@/components/screenController";
import { createAccessibilitySettingsStore } from "@/services/accessibilitySettings";

function HookHarness({
    store,
}: {
    store: ReturnType<typeof createAccessibilitySettingsStore>;
}) {
    const { settings, setSettings, resetSettings } =
        useAccessibilitySettings(store);

    return (
        <div>
            <span data-testid="mode">{settings.controlMode}</span>
            <span data-testid="flash">
                {settings.reducedFlash ? "on" : "off"}
            </span>
            <button
                type="button"
                onClick={() => {
                    setSettings({ controlMode: "toggle", reducedFlash: true });
                }}
            >
                Toggle Mode
            </button>
            <button
                type="button"
                onClick={() => {
                    resetSettings();
                }}
            >
                Reset Mode
            </button>
        </div>
    );
}

describe("useAccessibilitySettings", () => {
    it("reads and updates settings through store hook bindings", () => {
        const store = createAccessibilitySettingsStore({
            storage: null,
        });

        render(<HookHarness store={store} />);

        expect(screen.getByTestId("mode").textContent).toBe("hold");
        expect(screen.getByTestId("flash").textContent).toBe("off");

        fireEvent.click(screen.getByRole("button", { name: "Toggle Mode" }));
        expect(screen.getByTestId("mode").textContent).toBe("toggle");
        expect(screen.getByTestId("flash").textContent).toBe("on");

        fireEvent.click(screen.getByRole("button", { name: "Reset Mode" }));
        expect(screen.getByTestId("mode").textContent).toBe("hold");
        expect(screen.getByTestId("flash").textContent).toBe("off");
    });
});
