import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import BossEncounterHUDPresetExample from "@/components/examples/BossEncounterHUDPresetExample";

describe("BossEncounterHUDPresetExample", () => {
    it("updates phase/boss values and applies special cooldown", async () => {
        const user = userEvent.setup();
        render(<BossEncounterHUDPresetExample />);

        expect(screen.getByText("Phase 1")).toBeInTheDocument();
        expect(screen.getByText("Warden")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Advance phase" }));
        expect(screen.getByText("Phase 2")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Toggle boss" }));
        expect(screen.getByText("Overseer")).toBeInTheDocument();

        const specialButton = screen.getByRole("button", { name: "Special" });
        await user.click(specialButton);
        expect(specialButton).toBeDisabled();
    });
});
