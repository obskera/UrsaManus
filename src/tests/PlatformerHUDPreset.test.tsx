import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PlatformerHUDPreset } from "@/components/hudAnchor";

describe("PlatformerHUDPreset", () => {
    it("renders default platformer slots and jump action", () => {
        render(
            <PlatformerHUDPreset
                healthValue="88/100"
                minimapValue="Stage 1-1"
                coinsValue="21"
                livesValue="3"
            />,
        );

        expect(
            screen.getByRole("region", { name: "Quick HUD layout" }),
        ).toBeInTheDocument();
        expect(screen.getByText("88/100")).toBeInTheDocument();
        expect(screen.getByText("Stage 1-1")).toBeInTheDocument();
        expect(screen.getByText("21")).toBeInTheDocument();
        expect(screen.getByText("3")).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Jump" }),
        ).toBeInTheDocument();
    });

    it("triggers jump callback and supports slot overrides", async () => {
        const user = userEvent.setup();
        const onJump = vi.fn();

        const { rerender } = render(
            <PlatformerHUDPreset
                onJump={onJump}
                topLeftSlot={<span>Custom health</span>}
                bottomRightSlot={<span>Custom action</span>}
            />,
        );

        expect(screen.getByText("Custom health")).toBeInTheDocument();
        expect(screen.getByText("Custom action")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Jump" })).toBeNull();

        rerender(<PlatformerHUDPreset onJump={onJump} />);
        await user.click(screen.getByRole("button", { name: "Jump" }));
        expect(onJump).toHaveBeenCalledTimes(1);
    });
});
