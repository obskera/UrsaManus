import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import BgmComposerToolExample from "@/components/examples/BgmComposerToolExample";
import { createTileMapPlacementService } from "@/services/tileMapPlacement";

import tileMapGoldenFixture from "./fixtures/tilemap-golden.json";

describe("tool payload golden contracts", () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    it("matches tilemap golden payload fixture", () => {
        const service = createTileMapPlacementService();
        service.setMapBounds({ width: 2, height: 2 });
        service.selectLayer("base");
        service.placeTile(0, 0, 1, "base");
        service.placeTile(1, 1, 2, "base");

        service.addLayer({ id: "collision", select: true });
        service.placeTile(1, 0, 4, "collision");
        service.placeTile(1, 1, 4, "collision");
        service.setLayerLocked("collision", true);

        service.setCollisionProfile({
            solidLayerIds: ["collision"],
            solidTileIds: [4],
            fallbackToVisibleNonZero: false,
        });
        service.addOverlayEntity({
            id: "objective-1",
            name: "Objective Marker",
            type: "object",
            tag: "objective",
            x: 1,
            y: 1,
            roomIndex: 0,
            tileId: 12,
        });
        service.selectLayer("base");

        const actual = JSON.parse(
            service.exportPayload({ pretty: true }),
        ) as unknown;

        expect(actual).toEqual(tileMapGoldenFixture);
    });

    it("matches BGM composer tool UI contract", () => {
        render(<BgmComposerToolExample />);

        expect(
            screen.getByRole("button", { name: "Generate menu music" }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Generate battle music" }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Loop: on" }),
        ).toBeInTheDocument();
    });
});
