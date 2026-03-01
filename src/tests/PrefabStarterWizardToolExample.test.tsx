import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import PrefabStarterWizardToolExample from "@/components/examples/PrefabStarterWizardToolExample";

describe("PrefabStarterWizardToolExample", () => {
    it("generates a prefab blueprint from preset mode", async () => {
        const user = userEvent.setup();
        render(<PrefabStarterWizardToolExample />);

        await user.click(
            screen.getByRole("button", { name: "Generate prefab blueprint" }),
        );

        expect(screen.getByRole("status")).toHaveTextContent("Generated");
        expect(
            screen.getByDisplayValue(/um-prefab-blueprint-v1/),
        ).toBeInTheDocument();
        expect(
            screen.getByDisplayValue(/createPrefabAttachmentRuntime/),
        ).toBeInTheDocument();
    });

    it("supports module selection mode and shows generation issues", async () => {
        const user = userEvent.setup();
        render(<PrefabStarterWizardToolExample />);

        await user.selectOptions(
            screen.getByLabelText("Build mode"),
            "selection",
        );
        await user.selectOptions(screen.getByLabelText("Archetype"), "enemy");

        const meleeCheckbox = await screen.findByRole("checkbox", {
            name: "enemy.melee-ability",
        });
        const coreCheckbox = await screen.findByRole("checkbox", {
            name: "enemy.core",
        });
        const pathingCheckbox = await screen.findByRole("checkbox", {
            name: "enemy.pathing",
        });

        if ((coreCheckbox as HTMLInputElement).checked) {
            await user.click(coreCheckbox);
        }
        if ((pathingCheckbox as HTMLInputElement).checked) {
            await user.click(pathingCheckbox);
        }
        if (!(meleeCheckbox as HTMLInputElement).checked) {
            await user.click(meleeCheckbox);
        }

        await user.click(
            screen.getByRole("button", { name: "Generate prefab blueprint" }),
        );

        expect(screen.getByText(/requires/)).toBeInTheDocument();
    });

    it("applies dependency quick-fix suggestions in selection mode", async () => {
        const user = userEvent.setup();
        render(<PrefabStarterWizardToolExample />);

        await user.selectOptions(
            screen.getByLabelText("Build mode"),
            "selection",
        );
        await user.selectOptions(screen.getByLabelText("Archetype"), "enemy");

        const meleeCheckbox = await screen.findByRole("checkbox", {
            name: "enemy.melee-ability",
        });
        const coreCheckbox = await screen.findByRole("checkbox", {
            name: "enemy.core",
        });

        if ((coreCheckbox as HTMLInputElement).checked) {
            await user.click(coreCheckbox);
        }
        if (!(meleeCheckbox as HTMLInputElement).checked) {
            await user.click(meleeCheckbox);
        }

        await user.click(
            screen.getByRole("button", {
                name: "Apply dependency quick-fix",
            }),
        );

        expect(screen.getByRole("status")).toHaveTextContent(
            "Applied quick-fix",
        );
        expect(coreCheckbox).toBeChecked();
    });
});
