import { screen } from "@testing-library/react";
import { expect, vi } from "vitest";
import { HUDSlot } from "@/components/hudSlot";
import { Toggle } from "@/components/toggle";
import { runPrefabContractSuite } from "@/tests/contracts/prefabContractHarness";

runPrefabContractSuite({
    prefabName: "Toggle",
    renderPrefab: (props) => <Toggle {...props} />,
    createInitialProps: () => ({
        checked: false,
        label: "Music",
        onChange: vi.fn(),
    }),
    createUpdatedProps: (initialProps) => ({
        ...initialProps,
        checked: true,
        disabled: true,
    }),
    assertRender: () => {
        const toggle = screen.getByRole("switch", { name: "Music" });
        expect(toggle).toHaveAttribute("data-status", "off");
        expect(toggle).toBeEnabled();
    },
    assertUpdate: () => {
        const toggle = screen.getByRole("switch", { name: "Music" });
        expect(toggle).toHaveAttribute("data-status", "disabled");
        expect(toggle).toBeDisabled();
    },
    inputContract: {
        trigger: async ({ user }) => {
            await user.click(screen.getByRole("switch", { name: "Music" }));
        },
        assert: (_, props) => {
            expect(props.onChange).toHaveBeenCalledTimes(1);
            expect(props.onChange).toHaveBeenCalledWith(true);
        },
    },
});

runPrefabContractSuite({
    prefabName: "HUDSlot",
    renderPrefab: (props) => <HUDSlot {...props} />,
    createInitialProps: () => ({
        label: "Dash",
        value: "Ready",
    }),
    createUpdatedProps: (initialProps) => ({
        ...initialProps,
        cooldownRemainingMs: 1200,
        cooldownTotalMs: 2400,
        showCooldownText: true,
    }),
    assertRender: () => {
        const slot = screen.getByRole("group", { name: "Dash slot" });
        expect(slot).toHaveAttribute("data-status", "ready");
        expect(screen.getByText("Ready")).toBeInTheDocument();
    },
    assertUpdate: () => {
        const slot = screen.getByRole("group", { name: "Dash slot" });
        expect(slot).toHaveAttribute("data-status", "cooldown");
        expect(
            screen.getByRole("progressbar", { name: "Dash cooldown" }),
        ).toBeInTheDocument();
    },
});
