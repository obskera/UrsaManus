import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import BgmComposerToolExample from "@/components/examples/BgmComposerToolExample";
import TileMapPlacementToolExample from "@/components/examples/TileMapPlacementToolExample";

describe("tool recovery contract coverage", () => {
    it("TileMapPlacementToolExample exposes recovery controls", () => {
        render(createElement(TileMapPlacementToolExample));

        expect(
            screen.getByRole("button", { name: "Recover autosave" }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Clear autosave" }),
        ).toBeInTheDocument();
        expect(screen.getByText(/Last autosave:/)).toBeInTheDocument();
    });

    it("BgmComposerToolExample exposes recovery controls", () => {
        render(createElement(BgmComposerToolExample));

        expect(
            screen.getByRole("button", { name: "Generate menu music" }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Generate battle music" }),
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                /Select public files, then generate menu or battle music\./,
            ),
        ).toBeInTheDocument();
    });
});
