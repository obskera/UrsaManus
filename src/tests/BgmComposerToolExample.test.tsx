import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import BgmComposerToolExample from "@/components/examples/BgmComposerToolExample";

describe("BgmComposerToolExample", () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    it("renders generator controls with default status", () => {
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
        expect(
            screen.getByText(
                "Select public files, then generate menu or battle music.",
            ),
        ).toBeInTheDocument();
    });

    it("generates menu track preview and exposes event list", async () => {
        const user = userEvent.setup();
        render(<BgmComposerToolExample />);

        await user.click(
            screen.getByRole("button", { name: "Generate menu music" }),
        );

        expect(screen.getByText(/Playing menu track/)).toBeInTheDocument();
        expect(screen.getByText(/Current track: menu/)).toBeInTheDocument();
    });

    it("toggles loop state label", async () => {
        const user = userEvent.setup();
        render(<BgmComposerToolExample />);

        await user.click(screen.getByRole("button", { name: "Loop: on" }));
        expect(
            screen.getByRole("button", { name: "Loop: off" }),
        ).toBeInTheDocument();
    });

    it("applies file pool presets and updates status", async () => {
        const user = userEvent.setup();
        render(<BgmComposerToolExample />);

        await user.click(
            screen.getByRole("button", { name: "Preset: Menu pool" }),
        );
        expect(screen.getByText(/Applied menu file pool/)).toBeInTheDocument();

        await user.click(
            screen.getByRole("button", { name: "Preset: Battle pool" }),
        );
        expect(
            screen.getByText(/Applied battle file pool/),
        ).toBeInTheDocument();
    });

    it("adds valid custom file path", async () => {
        const user = userEvent.setup();
        render(<BgmComposerToolExample />);

        const input = screen.getByPlaceholderText("/my-sound.wav");
        await user.type(input, "/custom/sound.ogg");
        await user.click(screen.getByRole("button", { name: "Add file path" }));

        expect(
            screen.getByText("Added /custom/sound.ogg to selectable files."),
        ).toBeInTheDocument();
    });

    it("rejects invalid custom file extension", async () => {
        const user = userEvent.setup();
        render(<BgmComposerToolExample />);

        const input = screen.getByPlaceholderText("/my-sound.wav");
        await user.type(input, "/custom/not-audio.txt");
        await user.click(screen.getByRole("button", { name: "Add file path" }));

        expect(
            screen.getByText(
                "Use an audio file extension: .wav, .mp3, .ogg, .m4a, or .aac.",
            ),
        ).toBeInTheDocument();
    });
});
