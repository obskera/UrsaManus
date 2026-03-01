import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import PrefabExampleMatrixExample from "@/components/examples/PrefabExampleMatrixExample";

describe("PrefabExampleMatrixExample", () => {
    it("shows all four variants for each selected domain", async () => {
        const user = userEvent.setup();
        render(<PrefabExampleMatrixExample />);

        expect(
            screen.getByText("Showing 4 variants for player."),
        ).toBeInTheDocument();

        expect(screen.getByText("Player minimal")).toBeInTheDocument();
        expect(screen.getByText("Player full-featured")).toBeInTheDocument();
        expect(screen.getByText("Player override-heavy")).toBeInTheDocument();
        expect(screen.getByText("Player migration/legacy")).toBeInTheDocument();

        await user.selectOptions(
            screen.getByLabelText("Prefab matrix domain"),
            "enemy",
        );

        expect(
            screen.getByText("Showing 4 variants for enemy."),
        ).toBeInTheDocument();
        expect(screen.getByText("Enemy minimal")).toBeInTheDocument();
        expect(screen.getByText("Enemy full-featured")).toBeInTheDocument();
        expect(screen.getByText("Enemy override-heavy")).toBeInTheDocument();
        expect(screen.getByText("Enemy migration/legacy")).toBeInTheDocument();

        await user.selectOptions(
            screen.getByLabelText("Prefab matrix domain"),
            "object",
        );

        expect(
            screen.getByText("Showing 4 variants for object."),
        ).toBeInTheDocument();
        expect(screen.getByText("Object minimal")).toBeInTheDocument();
        expect(screen.getByText("Object full-featured")).toBeInTheDocument();
        expect(screen.getByText("Object override-heavy")).toBeInTheDocument();
        expect(screen.getByText("Object migration/legacy")).toBeInTheDocument();
    });

    it("displays migration status details for migration/legacy variants", () => {
        render(<PrefabExampleMatrixExample />);

        expect(
            screen.getByText(
                /Migration: source v0; requires migration: yes; status: ok/,
            ),
        ).toBeInTheDocument();
    });
});
